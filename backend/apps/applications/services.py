import base64
import binascii
import hashlib
import re
import secrets
import unicodedata
from datetime import datetime, timedelta
from difflib import SequenceMatcher

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.http import Http404
from django.utils.crypto import constant_time_compare
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.attendance.services import issue_or_update_exam_permit
from apps.configuration.models import ConfigurableField, ConfigurableFieldPriority

from .identity_verification import (
    DocumentRecognitionUnavailable,
    SelfieFaceValidationFailed,
    SelfieFaceValidationUnavailable,
    get_selfie_face_validator,
    get_student_id_recognizer,
)
from .models import (ApplicationCompletionStatus, ApplicationExamStatus, ApplicationIdentityMedia, ApplicationStatus,
                     ExamSlot, IdentityMediaType,
                     RegistrationSelfieMedia,
                     Step2Verification, Step2VerificationConfiguration,
                     Step2VerificationStatus, StudentApplication,
                     StudentApplicationAdditionalAttachment)
from .registry import RegistryUnavailable, get_lrn_registry


class ApplicationConflict(APIException):
    status_code = 409
    default_code = "conflict"
    default_detail = "The application could not be changed."


EDITABLE_STATUSES = {ApplicationStatus.DRAFT, ApplicationStatus.FOR_CORRECTION}
REVIEWABLE_STATUSES = {ApplicationStatus.SUBMITTED, ApplicationStatus.RESUBMITTED, ApplicationStatus.FOR_CORRECTION}
LRN_ATTEMPT_PREFIX = "registration:lrn-attempt:"
LRN_CLIENT_ATTEMPT_PREFIX = "registration:lrn-client-attempt:"
LRN_PROOF_PREFIX = "registration:lrn-proof:"
LRN_VERIFICATION_CATEGORIES = {"email", "birthday", "student_id", "mobile", "mother_name"}
REGISTRATION_EMAIL_OTP_PREFIX = "registration:email-otp:"
REGISTRATION_EMAIL_VERIFIED_PREFIX = "registration:email-verified:"
REGISTRATION_SELFIE_DATA_URL_FIELD = "selfiePhotoUrl"
REGISTRATION_ATTACHMENT_ALLOWED_TYPES = {
    "application/pdf": b"%PDF",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/jpeg": b"\xff\xd8\xff",
}
STUDENT_REGISTRATION_MODULE = "student_registration"
STEP_1_REGISTRATION_SECTION = "Step 1 Registration"
STUDENT_REGISTRATION_FIELD_TYPE = "Student Registration Field"
ADDITIONAL_HIGH_PRIORITY_FIELDS_KEY = "additionalHighPriorityFields"
PWD_FIELD_NAMES = {"PWD Type", "Condition", "PWD ID Number", "PWD ID Attachment", "Accommodation Needed"}
OPTIONAL_IDENTITY_FIELD_NAMES = {"Middle Name", "Extension Name"}
STEP1_CONFIG_FIELD_PAYLOAD_KEYS = {
    "LRN": ("school", "lrn"),
    "Birth Date": ("personal", "dateOfBirth"),
    "First Name": ("personal", "firstName"),
    "Middle Name": ("personal", "middleName"),
    "Last Name": ("personal", "lastName"),
    "Extension Name": ("personal", "suffix"),
    "Sex": ("personal", "sex"),
    "School ID": ("school", "schoolId"),
    "School Name": ("school", "name"),
    "Grade Level": ("school", "gradeLevel"),
    "Enrollment Status": ("school", "enrollmentStatus"),
    "School Year": ("school", "schoolYear"),
    "PWD": ("personal", "isPwd"),
    "PWD Type": ("personal", "pwdType"),
    "Condition": ("personal", "pwdCondition"),
    "PWD ID Number": ("personal", "pwdIdNumber"),
    "PWD ID Attachment": ("personal", "pwdIdFilename"),
    "Accommodation Needed": ("personal", "pwdAccommodation"),
}


class LrnVerificationRejected(APIException):
    status_code = 400
    default_code = "lrn_verification_failed"


class LrnRegistryUnavailable(APIException):
    status_code = 503
    default_code = "lrn_registry_unavailable"
    default_detail = "We're unable to verify your LRN right now. Please try again in a few minutes."


class LrnCooldown(APIException):
    status_code = 429
    default_code = "lrn_cooldown"
    default_detail = "Too many attempts. Please wait 15 minutes and try again."

    def __init__(self, retry_after_seconds: int | None = None):
        super().__init__(self.default_detail)
        self.error_meta = {
            "retryAfterSeconds": retry_after_seconds or settings.LRN_FAILED_ATTEMPT_WINDOW_MINUTES * 60,
        }


class RegistrationEmailOtpRejected(APIException):
    status_code = 400
    default_code = "registration_email_otp_failed"
    default_detail = "Invalid or expired code. Please try again."


class RegistrationEmailOtpCooldown(APIException):
    status_code = 429
    default_code = "registration_email_otp_cooldown"
    default_detail = "Please wait before requesting another OTP."

    def __init__(self, retry_after_seconds: int | None = None):
        super().__init__(self.default_detail)
        self.error_meta = {"retryAfterSeconds": retry_after_seconds or settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS}


class RegistrationEmailDeliveryUnavailable(APIException):
    status_code = 503
    default_code = "registration_email_delivery_unavailable"
    default_detail = "We're unable to send the OTP right now. Please try again in a few minutes."


def _registration_email_otp_plain_message(*, code: str) -> str:
    return (
        f"Your PhilSLA registration verification code is {code}. "
        f"This code expires in {settings.AUTH_OTP_TTL_MINUTES} minutes. "
        "If you did not request this code, you can ignore this email."
    )


def _registration_email_otp_html_message(*, code: str) -> str:
    return f"""\
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;background:#ffffff;border:1px solid #d9dde5;border-radius:20px;">
            <tr>
              <td style="padding:46px 48px 28px;text-align:center;">
                <div style="display:inline-block;text-align:left;">
                  <div style="font-size:72px;line-height:0.9;font-weight:800;letter-spacing:0;font-family:Arial Black,Arial,Helvetica,sans-serif;">
                    <span style="color:#18345c;">Phil</span><span style="color:#a5162d;">SLA</span>
                  </div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">
                    <tr>
                      <td width="34%" style="height:8px;background:#18345c;font-size:0;line-height:0;">&nbsp;</td>
                      <td width="33%" style="height:8px;background:#dfb52d;font-size:0;line-height:0;">&nbsp;</td>
                      <td width="33%" style="height:8px;background:#a5162d;font-size:0;line-height:0;">&nbsp;</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 50px 36px;font-size:14px;line-height:1.6;text-align:left;">
                <p style="margin:0 0 18px;">Dear PhilSLA User,</p>
                <p style="margin:0 0 24px;">
                  Your PhilSLA registration verification code is:
                </p>
                <p style="margin:0 0 8px;font-size:14px;text-transform:uppercase;">Email Code:</p>
                <p style="margin:0 0 28px;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:1px;color:#1f2937;">{code}</p>
                <p style="margin:0 0 20px;">
                  This code expires in {settings.AUTH_OTP_TTL_MINUTES} minutes. If you did not request this code, you can ignore this email.
                </p>
                <p style="margin:0 0 28px;">
                  Best regards,<br>
                  The PhilSLA Team
                </p>
                <p style="margin:0;text-align:center;font-size:12px;color:#374151;">&copy; PhilSLA 2026</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _send_registration_email_otp(*, email: str, code: str) -> None:
    plain_message = _registration_email_otp_plain_message(code=code)
    email_message = EmailMultiAlternatives(
        subject="Your PhilSLA registration verification code",
        body=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    email_message.attach_alternative(
        _registration_email_otp_html_message(code=code),
        "text/html",
    )
    email_message.send(fail_silently=False)


def request_registration_email_otp(*, email: str) -> dict:
    normalized_email = _normalize_email(email)
    key = _registration_email_otp_key(normalized_email)
    now = timezone.now()
    state = cache.get(key)
    if isinstance(state, dict):
        last_sent_at = _parse_cached_datetime(state.get("last_sent_at"))
        if last_sent_at is not None:
            seconds_since_last_send = int((now - last_sent_at).total_seconds())
            if seconds_since_last_send < settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS:
                raise RegistrationEmailOtpCooldown(settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS - seconds_since_last_send)

    code = f"{secrets.randbelow(1_000_000):06d}"
    nonce = secrets.token_urlsafe(16)
    expires_at = now + timedelta(minutes=settings.AUTH_OTP_TTL_MINUTES)
    state = {
        "otp_hash": _hash_registration_email_otp(email=normalized_email, code=code, nonce=nonce),
        "nonce": nonce,
        "attempts": 0,
        "expires_at": expires_at.isoformat(),
        "last_sent_at": now.isoformat(),
    }
    cache.set(key, state, settings.AUTH_OTP_TTL_MINUTES * 60)
    try:
        _send_registration_email_otp(email=normalized_email, code=code)
    except Exception as exc:
        cache.delete(key)
        raise RegistrationEmailDeliveryUnavailable from exc

    return {
        "email": normalized_email,
        "expiresInSeconds": settings.AUTH_OTP_TTL_MINUTES * 60,
        "resendCooldownSeconds": settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS,
    }


def verify_registration_email_otp(*, email: str, code: str) -> dict:
    normalized_email = _normalize_email(email)
    key = _registration_email_otp_key(normalized_email)
    state = cache.get(key)
    if not isinstance(state, dict):
        raise RegistrationEmailOtpRejected

    attempts = int(state.get("attempts", 0))
    expected_hash = str(state.get("otp_hash", ""))
    nonce = str(state.get("nonce", ""))
    submitted_hash = _hash_registration_email_otp(email=normalized_email, code=code, nonce=nonce)
    if not expected_hash or not constant_time_compare(expected_hash, submitted_hash):
        attempts += 1
        if attempts >= settings.AUTH_OTP_MAX_ATTEMPTS:
            cache.delete(key)
        else:
            state["attempts"] = attempts
            cache.set(key, state, _registration_otp_seconds_left(state))
        raise RegistrationEmailOtpRejected

    cache.delete(key)
    verification_token = secrets.token_urlsafe(32)
    verified_key = _registration_email_verified_key(verification_token)
    cache.set(
        verified_key,
        {"email": normalized_email, "verified_at": timezone.now().isoformat()},
        settings.AUTH_PENDING_TOKEN_TTL_MINUTES * 60,
    )
    return {
        "email": normalized_email,
        "verified": True,
        "emailVerificationToken": verification_token,
        "expiresInSeconds": settings.AUTH_PENDING_TOKEN_TTL_MINUTES * 60,
    }


def verify_lrn(*, lrn: str, verification_category: str = "", verification_value: str = "", client_identifier: str = "") -> dict:
    category_key = verification_category or "unspecified"
    attempt_key = _lrn_attempt_key(lrn, category_key)
    client_attempt_key = _lrn_client_attempt_key(client_identifier, category_key) if client_identifier else ""
    attempt_state = _get_lrn_attempt_state(attempt_key)
    client_attempt_state = _get_lrn_attempt_state(client_attempt_key) if client_attempt_key else {"attempts": 0, "cooldown_expires_at": None}
    attempts = attempt_state["attempts"]
    if attempts >= settings.LRN_MAX_FAILED_ATTEMPTS:
        raise LrnCooldown(_lrn_cooldown_seconds_left(attempt_state))
    if client_attempt_state["attempts"] >= settings.LRN_MAX_FAILED_ATTEMPTS:
        raise LrnCooldown(_lrn_cooldown_seconds_left(client_attempt_state))

    try:
        record = get_lrn_registry().find(lrn=lrn)
    except RegistryUnavailable as exc:
        raise LrnRegistryUnavailable from exc

    if record is None:
        attempt_state, client_attempt_state = _record_failed_lrn_attempts(
            attempt_key=attempt_key,
            attempts=attempts,
            client_attempt_key=client_attempt_key,
            client_attempts=client_attempt_state["attempts"],
        )
        attempts = attempt_state["attempts"]
        if attempts >= settings.LRN_MAX_FAILED_ATTEMPTS or client_attempt_state["attempts"] >= settings.LRN_MAX_FAILED_ATTEMPTS:
            raise LrnCooldown(_lrn_cooldown_seconds_left(_max_lrn_cooldown_state(attempt_state, client_attempt_state)))
        raise LrnVerificationRejected("We couldn't verify this LRN. Please check and try again.")

    current_grade12_enrollment_confirmed = record.grade_level == "Grade 12" and record.is_recognized_school

    if verification_category or verification_value:
        if not verification_category or not verification_value:
            raise LrnVerificationRejected("Select a verification category and enter the registered information for this LRN.")
        if verification_category not in LRN_VERIFICATION_CATEGORIES or not _lrn_registered_value_matches(record, verification_category, verification_value):
            attempt_state, client_attempt_state = _record_failed_lrn_attempts(
                attempt_key=attempt_key,
                attempts=attempts,
                client_attempt_key=client_attempt_key,
                client_attempts=client_attempt_state["attempts"],
            )
            attempts = attempt_state["attempts"]
            if attempts >= settings.LRN_MAX_FAILED_ATTEMPTS or client_attempt_state["attempts"] >= settings.LRN_MAX_FAILED_ATTEMPTS:
                raise LrnCooldown(_lrn_cooldown_seconds_left(_max_lrn_cooldown_state(attempt_state, client_attempt_state)))
            raise LrnVerificationRejected("The entered information does not match the official LRN record.")

    existing = StudentApplication.objects.filter(
        lrn=lrn,
        exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
        status__in=(
            ApplicationStatus.DRAFT,
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.FOR_CORRECTION,
            ApplicationStatus.RESUBMITTED,
            ApplicationStatus.APPROVED,
        ),
    ).exists()
    if existing:
        raise ApplicationConflict("This LRN already has an existing application. View status.")

    cache.delete(attempt_key)
    if client_attempt_key:
        cache.delete(client_attempt_key)
    token = secrets.token_urlsafe(32)
    profile = {
        "lrn": record.lrn,
        "dateOfBirth": record.date_of_birth.isoformat(),
        "firstName": record.first_name,
        "middleName": record.middle_name,
        "lastName": record.last_name,
        "extensionName": record.extension_name,
        "sex": record.sex,
        "schoolId": record.school_id,
        "schoolName": record.school_name,
        "gradeLevel": record.grade_level,
        "enrollmentStatus": record.enrollment_status,
        "schoolYear": record.school_year,
        "identityVerified": True,
        "currentGrade12EnrollmentConfirmed": current_grade12_enrollment_confirmed,
        "requiresAdmissionsReviewerAttention": not current_grade12_enrollment_confirmed,
    }
    cache.set(f"{LRN_PROOF_PREFIX}{token}", profile, settings.LRN_VERIFICATION_TTL_MINUTES * 60)
    configuration = active_step2_configuration()
    Step2Verification.objects.create(
        token_digest=_token_digest(token), lrn=lrn, lrn_profile=profile,
        configuration_snapshot=configuration,
        expires_at=timezone.now() + timedelta(minutes=settings.LRN_VERIFICATION_TTL_MINUTES),
    )
    return {"verificationToken": token, "expiresInSeconds": settings.LRN_VERIFICATION_TTL_MINUTES * 60, "profile": profile, "step2": configuration}


def _lrn_registered_value_matches(record, category: str, value: str) -> bool:
    if category == "birthday":
        return value.strip() == record.date_of_birth.isoformat()
    if category == "email":
        return value.strip().lower() == record.email.lower()
    if category == "student_id":
        return _normalized_identity_text(value) == _normalized_identity_text(record.school_id)
    if category == "mobile":
        return re.sub(r"\D", "", value) == re.sub(r"\D", "", record.mobile_number)
    if category == "mother_name":
        return _normalized_identity_text(value) == _normalized_identity_text(record.mother_maiden_full_name)
    return False


def _token_digest(token: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}:{token}".encode()).hexdigest()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _registration_email_otp_key(email: str) -> str:
    digest = hashlib.sha256(f"{settings.SECRET_KEY}:registration-email-otp:{email}".encode()).hexdigest()
    return f"{REGISTRATION_EMAIL_OTP_PREFIX}{digest}"


def _registration_email_verified_key(token: str) -> str:
    return f"{REGISTRATION_EMAIL_VERIFIED_PREFIX}{_token_digest(token)}"


def _hash_registration_email_otp(*, email: str, code: str, nonce: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}:{email}:{code}:{nonce}".encode()).hexdigest()


def _parse_cached_datetime(value) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(str(value))
    return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed


def _registration_otp_seconds_left(state: dict) -> int:
    expires_at = _parse_cached_datetime(state.get("expires_at"))
    if expires_at is None:
        return settings.AUTH_OTP_TTL_MINUTES * 60
    return max(1, int((expires_at - timezone.now()).total_seconds()))


def active_step2_configuration() -> dict:
    config = Step2VerificationConfiguration.objects.filter(is_active=True, effective_date__lte=timezone.now()).first()
    if config:
        return config.snapshot()
    return {
        "configurationId": None, "requireStudentIdVerification": False,
        "requireStudentIdFront": False, "requireStudentIdBack": False,
        "enableStudentIdInformationExtraction": False, "compareStudentName": False,
        "compareSchoolName": False, "nameMatchThreshold": 85,
        "schoolMatchThreshold": 85, "enableFacialComparison": False,
        "facialReferenceMediaType": IdentityMediaType.STUDENT_ID_FRONT,
        "facialSimilarityThreshold": 85, "allowManualReview": True,
        "maximumVerificationAttempts": 5, "effectiveDate": None,
    }


def get_step2_verification(token: str) -> Step2Verification:
    verification = Step2Verification.objects.filter(token_digest=_token_digest(token)).first()
    if verification is None or verification.expires_at <= timezone.now():
        raise LrnVerificationRejected("Registration verification has expired. Please verify your LRN again.")
    return verification


def serialize_step2(verification: Step2Verification) -> dict:
    present = list(verification.media.values_list("media_type", flat=True))
    if hasattr(verification, "registration_selfie"):
        present.append(IdentityMediaType.SELFIE)
    return {"id": str(verification.id), "status": verification.status, "attempts": verification.attempts,
            "configuration": verification.configuration_snapshot, "uploadedMedia": present,
            "results": verification.results}


def _validated_image_content_type(uploaded_file) -> str:
    if uploaded_file.size > settings.STEP2_MAX_IMAGE_BYTES:
        raise ValidationError({"file": ["Image must not exceed 5 MB."]})
    header = uploaded_file.read(16)
    uploaded_file.seek(0)
    content_type = "image/png" if header.startswith(b"\x89PNG\r\n\x1a\n") else "image/jpeg" if header.startswith(b"\xff\xd8\xff") else ""
    if not content_type:
        raise ValidationError({"file": ["Only valid JPEG and PNG images are accepted."]})
    return content_type


def _pop_registration_selfie_data_url(data: dict) -> str:
    personal = dict(data.get("personal", {}))
    selfie_data_url = str(personal.pop(REGISTRATION_SELFIE_DATA_URL_FIELD, "") or "")
    data["personal"] = personal
    return selfie_data_url


def _registration_selfie_for_owner(*, verification: Step2Verification | None, application: StudentApplication | None):
    if application is not None:
        existing_selfie = getattr(application, "registration_selfie", None)
        if existing_selfie is not None:
            return existing_selfie
    if verification is not None:
        return getattr(verification, "registration_selfie", None)
    return None


def _link_registration_selfie_to_application(*, verification: Step2Verification, application: StudentApplication) -> None:
    existing_selfie = getattr(verification, "registration_selfie", None)
    if existing_selfie is not None and existing_selfie.application_id != application.id:
        existing_selfie.application = application
        existing_selfie.save(update_fields=["application"])


def _store_registration_selfie_data_url(
    *,
    data_url: str,
    verification: Step2Verification | None = None,
    application: StudentApplication | None = None,
) -> None:
    if not data_url:
        return
    if verification is None and application is None:
        raise ValidationError({"personal": [f"{REGISTRATION_SELFIE_DATA_URL_FIELD} cannot be stored without an application."]})
    prefix, separator, encoded = data_url.partition(",")
    if separator != "," or ";base64" not in prefix:
        raise ValidationError({"personal": [f"{REGISTRATION_SELFIE_DATA_URL_FIELD} must be a base64 image data URL."]})
    content_type = prefix.removeprefix("data:").split(";", 1)[0]
    if content_type not in {"image/jpeg", "image/png"}:
        raise ValidationError({"personal": [f"{REGISTRATION_SELFIE_DATA_URL_FIELD} must be a JPEG or PNG image."]})
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValidationError({"personal": [f"{REGISTRATION_SELFIE_DATA_URL_FIELD} contains invalid base64 data."]}) from exc
    if len(image_bytes) > settings.STEP2_MAX_IMAGE_BYTES:
        raise ValidationError({"personal": [f"{REGISTRATION_SELFIE_DATA_URL_FIELD} must not exceed 5 MB."]})
    if content_type == "image/png" and not image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValidationError({"personal": [f"{REGISTRATION_SELFIE_DATA_URL_FIELD} must contain a valid PNG image."]})
    if content_type == "image/jpeg" and not image_bytes.startswith(b"\xff\xd8\xff"):
        raise ValidationError({"personal": [f"{REGISTRATION_SELFIE_DATA_URL_FIELD} must contain a valid JPEG image."]})

    existing_selfie = _registration_selfie_for_owner(verification=verification, application=application)
    if existing_selfie is not None:
        existing_selfie.file.delete(save=False)
        existing_selfie.delete()

    extension = "png" if content_type == "image/png" else "jpg"
    RegistrationSelfieMedia.objects.create(
        verification=verification,
        application=application,
        file=ContentFile(image_bytes, name=f"registration-selfie.{extension}"),
        content_type=content_type,
        size=len(image_bytes),
        sha256=hashlib.sha256(image_bytes).hexdigest(),
    )


def _validate_selfie_face_image(*, uploaded_file) -> dict:
    content_type = _validated_image_content_type(uploaded_file)
    try:
        result = get_selfie_face_validator().validate(image_file=uploaded_file, content_type=content_type)
    except SelfieFaceValidationUnavailable as exc:
        raise ValidationError({"file": ["Server-side selfie face validation is not configured."]}) from exc
    except SelfieFaceValidationFailed as exc:
        raise ValidationError({"file": [str(exc)]}) from exc
    return {
        "faceDetected": True,
        "faceCount": result.face_count,
        "confidence": result.confidence,
        "boundingBox": result.bounding_box,
        "faceCovered": result.face_covered,
        "checks": result.checks,
    }


def validate_registration_selfie_face(*, token: str, uploaded_file) -> dict:
    get_step2_verification(token)
    return _validate_selfie_face_image(uploaded_file=uploaded_file)


def validate_manual_registration_selfie_face(*, uploaded_file) -> dict:
    return _validate_selfie_face_image(uploaded_file=uploaded_file)


def _normalized_identity_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", normalized).split())


def _similarity(left: str, right: str) -> float:
    return round(SequenceMatcher(None, _normalized_identity_text(left), _normalized_identity_text(right)).ratio() * 100, 2)


def _process_student_id_information(verification: Step2Verification) -> None:
    configuration = verification.configuration_snapshot
    front = verification.media.get(media_type=IdentityMediaType.STUDENT_ID_FRONT)
    back = verification.media.filter(media_type=IdentityMediaType.STUDENT_ID_BACK).first()
    try:
        extracted = get_student_id_recognizer().extract(front_file=front.file, back_file=back.file if back else None)
    except DocumentRecognitionUnavailable:
        verification.status = (Step2VerificationStatus.MANUAL_REVIEW
                               if configuration.get("allowManualReview") else Step2VerificationStatus.REJECTED)
        verification.results = {"phase": "STUDENT_ID_INFORMATION", "code": "DOCUMENT_RECOGNITION_UNAVAILABLE"}
        return

    profile = verification.lrn_profile
    lrn_name = " ".join(filter(None, (profile.get("firstName"), profile.get("middleName"), profile.get("lastName"))))
    name_score = _similarity(extracted.student_name, lrn_name)
    school_score = _similarity(extracted.school_name, profile.get("schoolName", ""))
    name_passed = name_score >= float(configuration.get("nameMatchThreshold", 85))
    school_passed = not configuration.get("compareSchoolName") or school_score >= float(configuration.get("schoolMatchThreshold", 85))
    verification.results = {
        "phase": "STUDENT_ID_INFORMATION",
        "extractedStudentName": extracted.student_name,
        "extractedSchoolName": extracted.school_name,
        "lrnStudentName": lrn_name,
        "lrnSchoolName": profile.get("schoolName", ""),
        "nameMatchScore": name_score,
        "schoolMatchScore": school_score,
        "nameComparisonPassed": name_passed,
        "schoolComparisonPassed": school_passed,
        "informationComparisonPassed": name_passed and school_passed,
    }
    if not (name_passed and school_passed):
        verification.status = (Step2VerificationStatus.MANUAL_REVIEW
                               if configuration.get("allowManualReview") else Step2VerificationStatus.REJECTED)
    else:
        verification.status = Step2VerificationStatus.IN_PROGRESS


@transaction.atomic
def upload_step2_media(*, token: str, media_type: str, uploaded_file, step1_identity_selfie: bool = False) -> Step2Verification:
    verification = get_step2_verification(token)
    configuration = verification.configuration_snapshot
    is_step1_identity_selfie_upload = step1_identity_selfie and media_type == IdentityMediaType.SELFIE
    can_recover_step1_selfie_attempt_limit = (
        is_step1_identity_selfie_upload
        and verification.status == Step2VerificationStatus.REJECTED
        and verification.results.get("code") == "MAXIMUM_ATTEMPTS_REACHED"
    )
    can_replace_pre_submission_selfie = (
        verification.status == Step2VerificationStatus.PASSED
        and media_type == IdentityMediaType.SELFIE
        and verification.application_id is None
    )
    if (verification.status == Step2VerificationStatus.REJECTED and not can_recover_step1_selfie_attempt_limit) or (
        verification.status == Step2VerificationStatus.PASSED and not can_replace_pre_submission_selfie
    ):
        raise ApplicationConflict("Step 2 can no longer be changed.")
    if not is_step1_identity_selfie_upload and verification.attempts >= int(configuration.get("maximumVerificationAttempts", 5)):
        verification.status = (Step2VerificationStatus.MANUAL_REVIEW
                               if configuration.get("allowManualReview") else Step2VerificationStatus.REJECTED)
        verification.results = {"code": "MAXIMUM_ATTEMPTS_REACHED"}
        verification.save()
        raise ApplicationConflict("Maximum identity verification attempts reached.")
    allowed = {IdentityMediaType.SELFIE} if is_step1_identity_selfie_upload else set()
    if configuration.get("requireStudentIdVerification"):
        if configuration.get("requireStudentIdFront"): allowed.add(IdentityMediaType.STUDENT_ID_FRONT)
        if configuration.get("requireStudentIdBack"): allowed.add(IdentityMediaType.STUDENT_ID_BACK)
    if media_type not in allowed:
        raise ValidationError({"mediaType": ["This image is not required by the applied Step 2 configuration."]})
    content_type = _validated_image_content_type(uploaded_file)
    selfie_face_result = None
    if media_type == IdentityMediaType.SELFIE:
        try:
            selfie_face_result = get_selfie_face_validator().validate(image_file=uploaded_file, content_type=content_type)
        except SelfieFaceValidationUnavailable as exc:
            raise ValidationError({"file": ["Server-side selfie face validation is not configured."]}) from exc
        except SelfieFaceValidationFailed as exc:
            raise ValidationError({"file": [str(exc)]}) from exc
    digest = hashlib.sha256()
    for chunk in uploaded_file.chunks(): digest.update(chunk)
    uploaded_file.seek(0)
    if is_step1_identity_selfie_upload:
        existing_selfie = getattr(verification, "registration_selfie", None)
        if existing_selfie is not None:
            existing_selfie.file.delete(save=False)
            existing_selfie.delete()
        RegistrationSelfieMedia.objects.create(
            verification=verification,
            application=verification.application,
            file=uploaded_file,
            content_type=content_type,
            size=uploaded_file.size,
            sha256=digest.hexdigest(),
        )
    else:
        for existing_media in ApplicationIdentityMedia.objects.filter(verification=verification, media_type=media_type):
            existing_media.file.delete(save=False)
            existing_media.delete()
        ApplicationIdentityMedia.objects.create(
            verification=verification,
            media_type=media_type,
            file=uploaded_file,
            content_type=content_type,
            size=uploaded_file.size,
            sha256=digest.hexdigest(),
        )
    if not is_step1_identity_selfie_upload:
        verification.attempts += 1
    required_id_media = set()
    if configuration.get("requireStudentIdVerification"):
        if configuration.get("requireStudentIdFront"): required_id_media.add(IdentityMediaType.STUDENT_ID_FRONT)
        if configuration.get("requireStudentIdBack"): required_id_media.add(IdentityMediaType.STUDENT_ID_BACK)
    present = set(verification.media.values_list("media_type", flat=True))
    if hasattr(verification, "registration_selfie"):
        present.add(IdentityMediaType.SELFIE)
    if is_step1_identity_selfie_upload and IdentityMediaType.SELFIE in present:
        verification.status = Step2VerificationStatus.PASSED
        verification.completed_at = timezone.now()
        verification.results = {
            "selfieSubmitted": True,
            "mode": "SELFIE_ONLY",
            "serverFaceValidation": {
                "provider": settings.STEP1_SELFIE_FACE_PROVIDER,
                "faceCount": selfie_face_result.face_count if selfie_face_result else 0,
                "confidence": selfie_face_result.confidence if selfie_face_result else 0,
                "boundingBox": selfie_face_result.bounding_box if selfie_face_result else {},
                "faceCovered": selfie_face_result.face_covered if selfie_face_result else False,
                "checks": selfie_face_result.checks if selfie_face_result else {},
            },
        }
    elif configuration.get("requireStudentIdVerification") and required_id_media <= present:
        _process_student_id_information(verification)
    verification.save()
    return verification


@transaction.atomic
def decide_step2_manual_review(*, verification_id, decision: str, reason: str, actor) -> Step2Verification:
    verification = Step2Verification.objects.select_for_update().get(id=verification_id)
    if verification.status != Step2VerificationStatus.MANUAL_REVIEW:
        raise ApplicationConflict("Only a pending manual review can receive this decision.")
    if decision == "PASS" and verification.results.get("phase") == "STUDENT_ID_INFORMATION":
        verification.status = Step2VerificationStatus.IN_PROGRESS
        verification.results = {**verification.results, "informationComparisonPassed": True}
    else:
        verification.status = Step2VerificationStatus.PASSED if decision == "PASS" else Step2VerificationStatus.REJECTED
        verification.completed_at = timezone.now()
    verification.results = {**verification.results, "manualDecision": decision, "manualReason": reason,
                            "manualReviewedBy": str(getattr(actor, "user_id", getattr(actor, "id", "")))}
    verification.save()
    return verification


def _lrn_attempt_key(lrn: str, verification_category: str) -> str:
    digest = hashlib.sha256(f"{settings.SECRET_KEY}:{lrn}:{verification_category}".encode()).hexdigest()
    return f"{LRN_ATTEMPT_PREFIX}{digest}"


def _lrn_client_attempt_key(client_identifier: str, verification_category: str) -> str:
    digest = hashlib.sha256(f"{settings.SECRET_KEY}:{client_identifier}:{verification_category}".encode()).hexdigest()
    return f"{LRN_CLIENT_ATTEMPT_PREFIX}{digest}"


def _get_lrn_attempt_state(attempt_key: str) -> dict:
    if not attempt_key:
        return {"attempts": 0, "cooldown_expires_at": None}
    cached = cache.get(attempt_key)
    if isinstance(cached, dict):
        return {
            "attempts": int(cached.get("attempts", 0)),
            "cooldown_expires_at": cached.get("cooldown_expires_at"),
        }
    return {"attempts": int(cached or 0), "cooldown_expires_at": None}


def _record_failed_lrn_attempt(attempt_key: str, attempts: int) -> dict:
    window_seconds = settings.LRN_FAILED_ATTEMPT_WINDOW_MINUTES * 60
    state = {
        "attempts": attempts + 1,
        "cooldown_expires_at": (timezone.now() + timedelta(seconds=window_seconds)).isoformat(),
    }
    cache.set(attempt_key, state, window_seconds)
    return state


def _record_failed_lrn_attempts(*, attempt_key: str, attempts: int, client_attempt_key: str = "", client_attempts: int = 0) -> tuple[dict, dict]:
    attempt_state = _record_failed_lrn_attempt(attempt_key, attempts)
    client_attempt_state = (
        _record_failed_lrn_attempt(client_attempt_key, client_attempts)
        if client_attempt_key else {"attempts": 0, "cooldown_expires_at": None}
    )
    return attempt_state, client_attempt_state


def _max_lrn_cooldown_state(*states: dict) -> dict:
    return max(states, key=_lrn_cooldown_seconds_left)


def _lrn_cooldown_seconds_left(attempt_state: dict) -> int:
    fallback_seconds = settings.LRN_FAILED_ATTEMPT_WINDOW_MINUTES * 60
    expires_at = attempt_state.get("cooldown_expires_at")
    if not expires_at:
        return fallback_seconds

    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if timezone.is_naive(expires_at):
        expires_at = timezone.make_aware(expires_at)

    seconds_left = int((expires_at - timezone.now()).total_seconds())
    return max(1, min(fallback_seconds, seconds_left))


@transaction.atomic
def create_draft(
    *,
    owner=None,
    verification_token: str = "",
    email_verification_token: str = "",
    data: dict,
    submit_on_create: bool = False,
    registration_session_id: str = "",
) -> StudentApplication:
    password = data.pop("password", "")
    selfie_data_url = _pop_registration_selfie_data_url(data)
    personal = dict(data.get("personal", {}))
    school = dict(data.get("school", {}))

    step2 = None
    if verification_token:
        verified = cache.get(f"{LRN_PROOF_PREFIX}{verification_token}")
        if verified is None:
            raise LrnVerificationRejected("Registration verification has expired. Please verify your LRN or enter the required information manually.")
        step2 = get_step2_verification(verification_token)
        personal.update(
            {
                "firstName": verified["firstName"],
                "middleName": verified["middleName"],
                "lastName": verified["lastName"],
                "suffix": verified.get("extensionName", ""),
                "dateOfBirth": verified["dateOfBirth"],
                "sex": verified.get("sex", ""),
                "identityVerificationStatus": "VERIFIED",
            }
        )
        school.update(
            {
                "lrn": verified["lrn"],
                "schoolId": verified.get("schoolId", ""),
                "name": verified["schoolName"],
                "gradeLevel": verified["gradeLevel"],
                "enrollmentStatus": verified.get("enrollmentStatus", ""),
                "schoolYear": verified.get("schoolYear", ""),
            }
        )
        review_step = dict(data.get("review_step", {}))
        if verified.get("requiresAdmissionsReviewerAttention"):
            review_step.update(
                {
                    "requiresAdmissionsReviewerAttention": True,
                    "attentionReason": "Identity-source enrollment information does not confirm current Grade 12 enrollment.",
                }
            )
            data["review_step"] = review_step
    else:
        personal.setdefault("identityVerificationStatus", "MANUAL_PENDING")

    data.update(personal=personal, school=school)
    _flatten_step1_dynamic_fields(data)
    try:
        if submit_on_create:
            _validate_registration_email_verification(email_verification_token=email_verification_token, email=str(personal.get("email", "")))
            _validate_registration_account_creation(
                data,
                password,
                require_valid_lrn=bool(verification_token),
                registration_session_id=registration_session_id,
            )
        owner_id = None if owner is None else getattr(owner, "user_id", owner.id)
        indexed_lrn = str(school.get("lrn", "")) if verification_token else ""
        application = StudentApplication.objects.create(
            owner_id=owner_id,
            lrn=indexed_lrn,
            exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
            password_hash=make_password(password) if password else "",
            **data,
        )
        if step2 is not None:
            step2.application = application
            step2.save(update_fields=["application", "updated_at"])
            _link_registration_selfie_to_application(verification=step2, application=application)
            _store_registration_selfie_data_url(verification=step2, application=application, data_url=selfie_data_url)
        else:
            _store_registration_selfie_data_url(application=application, data_url=selfie_data_url)
        if registration_session_id:
            _link_registration_attachments_to_application(
                registration_session_id=registration_session_id,
                application=application,
            )
        if submit_on_create:
            application.status = ApplicationStatus.SUBMITTED
            application.version += 1
            application.submitted_at = timezone.now()
            application.save(update_fields=["status", "version", "submitted_at", "updated_at"])
    except IntegrityError as exc:
        if "unique_active_lrn_per_exam_cycle" in str(exc) or "applications_studentapplication.lrn" in str(exc):
            raise ApplicationConflict("This LRN already has an existing application. View status.") from exc
        raise
    if verification_token:
        cache.delete(f"{LRN_PROOF_PREFIX}{verification_token}")
    if submit_on_create and email_verification_token:
        cache.delete(_registration_email_verified_key(email_verification_token))
    return application


def _validate_registration_email_verification(*, email_verification_token: str, email: str) -> None:
    if not email_verification_token:
        raise ValidationError({"emailVerificationToken": ["Email OTP verification is required before registration submission."]})
    verified = cache.get(_registration_email_verified_key(email_verification_token))
    if not isinstance(verified, dict) or verified.get("email") != _normalize_email(email):
        raise ValidationError({"emailVerificationToken": ["Email OTP verification has expired. Please verify your email again."]})


def _validate_registration_account_creation(
    data: dict,
    password: str,
    *,
    require_valid_lrn: bool = True,
    registration_session_id: str = "",
) -> None:
    personal = data.get("personal", {})
    school = data.get("school", {})
    required = {
        "personal": ("firstName", "lastName", "dateOfBirth", "sex", "email", "mobile"),
        "school": ("schoolId", "name", "gradeLevel", "enrollmentStatus", "schoolYear"),
    }
    errors = {}
    for section, fields in required.items():
        payload = personal if section == "personal" else school
        missing = [field for field in fields if payload.get(field) in (None, "")]
        if missing:
            errors[section] = [f"Missing required field: {field}." for field in missing]
    lrn = str(school.get("lrn", ""))
    if require_valid_lrn and lrn and (len(lrn) != 12 or not lrn.isdigit()):
        errors.setdefault("school", []).append("LRN must be exactly 12 numeric digits.")
    if not password:
        errors["password"] = ["Password is required before account creation."]
    _validate_step1_configured_fields(
        data,
        errors,
        require_lrn=require_valid_lrn,
        registration_session_id=registration_session_id,
    )
    if errors:
        raise ValidationError(errors)


def _flatten_step1_dynamic_fields(data: dict) -> None:
    personal = dict(data.get("personal", {}))
    additional_fields = personal.pop(ADDITIONAL_HIGH_PRIORITY_FIELDS_KEY, {})
    if isinstance(additional_fields, dict):
        for key, value in additional_fields.items():
            if key not in personal:
                personal[key] = value
    data["personal"] = personal


def _validate_step1_configured_fields(
    data: dict,
    errors: dict,
    *,
    require_lrn: bool = True,
    registration_session_id: str = "",
    application: StudentApplication | None = None,
) -> None:
    for field in _active_step1_registration_fields():
        section, key = _payload_location_for_config_field(field)
        payload = data.get(section, {})
        value = payload.get(key)
        if field.field_name not in STEP1_CONFIG_FIELD_PAYLOAD_KEYS and _is_blank_step1_value(value):
            alternate_section = "school" if section == "personal" else "personal"
            value = data.get(alternate_section, {}).get(key)
        if field.field_name in OPTIONAL_IDENTITY_FIELD_NAMES:
            continue
        if field.field_name == "LRN" and not require_lrn:
            continue
        if _is_pwd_dependent_field(field) and not _truthy_step1_value(data.get("personal", {}).get("isPwd")):
            continue
        if field.input_type == "file":
            if field.priority == ConfigurableFieldPriority.HIGH and not _registration_attachment_exists(
                field=field,
                registration_session_id=registration_session_id,
                application=application,
            ):
                errors.setdefault(section, []).append(f"Missing required attachment: {field.field_name}.")
            continue
        if field.priority == ConfigurableFieldPriority.HIGH and _is_blank_step1_value(value):
            errors.setdefault(section, []).append(f"Missing required field: {field.field_name}.")
            continue
        if field.input_type == "dropdown" and not _is_blank_step1_value(value) and str(value) not in field.option_values:
            errors.setdefault(section, []).append(f"Invalid value for {field.field_name}.")


def _active_step1_registration_fields():
    return ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=STUDENT_REGISTRATION_FIELD_TYPE,
        is_enabled=True,
    )


def _payload_location_for_config_field(field: ConfigurableField) -> tuple[str, str]:
    if field.field_name in STEP1_CONFIG_FIELD_PAYLOAD_KEYS:
        return STEP1_CONFIG_FIELD_PAYLOAD_KEYS[field.field_name]
    return "personal", field.field_name


def _is_pwd_dependent_field(field: ConfigurableField) -> bool:
    return field.field_section == "PWD Information" and field.field_name in PWD_FIELD_NAMES


def _is_blank_step1_value(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, dict):
        return not value
    return value == ""


def _truthy_step1_value(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {"yes", "true", "1", "on"}


@transaction.atomic
def update_draft(*, application_id, owner, expected_version: int, data: dict) -> StudentApplication:
    application = _locked_owned(application_id=application_id, owner=owner)
    if application.status not in EDITABLE_STATUSES:
        raise ApplicationConflict("Only draft or correction-requested applications may be edited.")
    _check_version(application, expected_version)
    selfie_data_url = _pop_registration_selfie_data_url(data) if "personal" in data else ""
    if "personal" in data:
        _flatten_step1_dynamic_fields(data)
    for field, value in data.items():
        setattr(application, field, value)
    application.version += 1
    application.save()
    if selfie_data_url:
        verification = getattr(application, "step2_verification", None)
        _store_registration_selfie_data_url(
            verification=verification,
            application=application,
            data_url=selfie_data_url,
        )
    return application


@transaction.atomic
def submit_application(*, application_id, owner, expected_version: int) -> StudentApplication:
    application = _locked_owned(application_id=application_id, owner=owner)
    if application.status not in EDITABLE_STATUSES:
        raise ApplicationConflict("The application is not in a submittable state.")
    _check_version(application, expected_version)
    _validate_complete(application)
    application.status = (
        ApplicationStatus.RESUBMITTED
        if application.status == ApplicationStatus.FOR_CORRECTION
        else ApplicationStatus.SUBMITTED
    )
    application.version += 1
    application.submitted_at = timezone.now()
    application.save(update_fields=["status", "version", "submitted_at", "updated_at"])
    return application


def _locked_owned(*, application_id, owner) -> StudentApplication:
    owner_id = getattr(owner, "user_id", owner.id)
    return StudentApplication.objects.select_for_update().get(id=application_id, owner_id=owner_id)


def _check_version(application: StudentApplication, expected_version: int) -> None:
    if application.version != expected_version:
        raise ApplicationConflict("The application was changed by another request. Reload and try again.")


def get_my_application(*, owner) -> StudentApplication | None:
    owner_id = getattr(owner, "user_id", owner.id)
    return (
        StudentApplication.objects.exclude(status=ApplicationStatus.DRAFT)
        .filter(owner_id=owner_id)
        .order_by("-updated_at")
        .first()
    )


@transaction.atomic
def assign_exam_slot(*, owner, slot_id) -> StudentApplication:
    """Atomically assigns the caller's own approved, unscheduled application to an
    exam slot. `select_for_update()` on the slot row is what makes the capacity
    check safe under concurrent requests: the second of two simultaneous
    assignment attempts for the last seat blocks until the first transaction
    commits, then re-reads `remaining_slots` and correctly finds it exhausted.
    """
    owner_id = getattr(owner, "user_id", owner.id)
    application = (
        StudentApplication.objects.select_for_update()
        .exclude(status=ApplicationStatus.DRAFT)
        .filter(owner_id=owner_id)
        .order_by("-updated_at")
        .first()
    )
    if application is None:
        raise Http404("No application found for this account.")
    if application.status != ApplicationStatus.APPROVED:
        raise ApplicationConflict("Application is not approved yet.")
    if application.assigned_slot_id:
        raise ApplicationConflict("An exam slot is already assigned.")

    try:
        slot = ExamSlot.objects.select_for_update().get(id=slot_id)
    except ExamSlot.DoesNotExist as exc:
        raise Http404("Exam slot not found.") from exc
    if slot.remaining_slots <= 0:
        raise ApplicationConflict("This exam slot is full.")

    slot.remaining_slots -= 1
    slot.save(update_fields=["remaining_slots"])
    application.assigned_slot = slot
    application.exam_status = ApplicationExamStatus.SCHEDULED
    application.save(update_fields=["assigned_slot", "exam_status"])

    issue_or_update_exam_permit(application=application, slot=slot)

    return application


def _validate_complete(application: StudentApplication) -> None:
    required = {
        "personal": ("firstName", "lastName", "dateOfBirth", "email", "mobile"),
        "address": ("region", "province", "city", "barangay", "street", "postalCode"),
        "school": ("lrn", "name", "academicTrack", "gradeLevel", "gwa"),
    }
    errors = {}
    if hasattr(application, "step2_verification") and application.step2_verification.status != Step2VerificationStatus.PASSED:
        errors["step2"] = ["Identity verification is required."]
    for section, fields in required.items():
        payload = getattr(application, section)
        missing = [field for field in fields if payload.get(field) in (None, "")]
        if missing:
            errors[section] = [f"Missing required field: {field}." for field in missing]
    _validate_step1_configured_fields(
        {"personal": application.personal, "school": application.school},
        errors,
        application=application,
    )
    lrn = str(application.school.get("lrn", ""))
    if lrn and (len(lrn) != 12 or not lrn.isdigit()):
        errors.setdefault("school", []).append("LRN must be exactly 12 numeric digits.")
    if not application.course_preferences:
        errors["coursePreferences"] = ["At least one course preference is required."]
    elif any(not item.get("university") or not item.get("course") for item in application.course_preferences):
        errors["coursePreferences"] = ["Every preference requires university and course."]
    if application.review_step.get("privacyConsent") is not True or application.review_step.get("declarationAccepted") is not True:
        errors["reviewStep"] = ["Privacy consent and declaration acceptance are required."]
    if errors:
        raise ValidationError(errors)


def _registration_attachment_exists(
    *,
    field: ConfigurableField,
    registration_session_id: str = "",
    application: StudentApplication | None = None,
) -> bool:
    query = StudentApplicationAdditionalAttachment.objects.filter(
        section=field.field_section,
        field_key=field.field_name,
    )
    if application is not None:
        return query.filter(application=application).exists()
    if registration_session_id:
        return query.filter(registration_session_id=registration_session_id).exists()
    return False


def upload_registration_attachment(*, registration_session_id: str, field_name: str, uploaded_file) -> StudentApplicationAdditionalAttachment:
    if not registration_session_id:
        raise ValidationError({"registrationSessionId": ["Registration session is required before uploading an attachment."]})
    field = ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=STUDENT_REGISTRATION_FIELD_TYPE,
        field_name=field_name,
        input_type="file",
        is_enabled=True,
    ).first()
    if field is None:
        raise ValidationError({"fieldName": ["This attachment field is not configured or is inactive."]})

    content_type = _validated_registration_attachment_content_type(uploaded_file)
    digest = hashlib.sha256()
    for chunk in uploaded_file.chunks():
        digest.update(chunk)
    uploaded_file.seek(0)

    existing = StudentApplicationAdditionalAttachment.objects.filter(
        registration_session_id=registration_session_id,
        application__isnull=True,
        section=field.field_section,
        field_key=field.field_name,
    ).first()
    if existing is not None:
        existing.file.delete(save=False)
        existing.delete()

    return StudentApplicationAdditionalAttachment.objects.create(
        registration_session_id=registration_session_id,
        section=field.field_section,
        field_key=field.field_name,
        file=uploaded_file,
        original_filename=getattr(uploaded_file, "name", "")[:255] or field.field_name,
        content_type=content_type,
        size=uploaded_file.size,
        sha256=digest.hexdigest(),
    )


def _validated_registration_attachment_content_type(uploaded_file) -> str:
    if uploaded_file.size > settings.REGISTRATION_ATTACHMENT_MAX_BYTES:
        raise ValidationError({"file": ["Attachment must not exceed 5 MB."]})
    header = uploaded_file.read(16)
    uploaded_file.seek(0)
    content_type = str(getattr(uploaded_file, "content_type", "") or "")
    expected_signature = REGISTRATION_ATTACHMENT_ALLOWED_TYPES.get(content_type)
    if expected_signature is None or not header.startswith(expected_signature):
        raise ValidationError({"file": ["Only valid PDF, JPEG, and PNG attachments are accepted."]})
    return content_type


def _link_registration_attachments_to_application(*, registration_session_id: str, application: StudentApplication) -> None:
    for attachment in StudentApplicationAdditionalAttachment.objects.filter(
        registration_session_id=registration_session_id,
        application__isnull=True,
    ):
        existing = StudentApplicationAdditionalAttachment.objects.filter(
            application=application,
            section=attachment.section,
            field_key=attachment.field_key,
        ).first()
        if existing is not None:
            existing.file.delete(save=False)
            existing.delete()
        attachment.application = application
        attachment.save(update_fields=["application"])


@transaction.atomic
def decide_application(
    *,
    application_id,
    actor,
    decision: str,
    reason: str = "",
    required_corrections: list[str] | None = None,
) -> StudentApplication:
    application = StudentApplication.objects.select_for_update().get(id=application_id)
    if application.status not in REVIEWABLE_STATUSES:
        raise ApplicationConflict("Only submitted applications can receive a reviewer decision.")

    if decision == "APPROVE":
        if application.completion_status == ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION:
            raise ApplicationConflict("Student completion is pending for this bulk-uploaded application.")
        application.status = ApplicationStatus.APPROVED
    elif decision == "REQUEST_CORRECTION":
        application.status = ApplicationStatus.FOR_CORRECTION
    elif decision == "REJECT":
        application.status = ApplicationStatus.REJECTED
    else:
        raise ValidationError({"decision": ["Unsupported reviewer decision."]})

    review_step = dict(application.review_step or {})
    review_step.update(
        {
            "reviewerDecision": decision,
            "reviewerReason": reason,
            "requiredCorrections": required_corrections or [],
            "reviewedBy": str(getattr(actor, "user_id", getattr(actor, "id", ""))),
            "reviewedAt": timezone.now().isoformat(),
        }
    )
    application.review_step = review_step
    application.version += 1
    application.save(update_fields=["status", "version", "updated_at"])
    if decision == "APPROVE":
        from apps.accounts.services import activate_student_registration_account

        activate_student_registration_account(registration_application_id=str(application.id))
        application.refresh_from_db()
    if decision == "REJECT" and application.password_hash:
        application.password_hash = ""
        application.save(update_fields=["password_hash", "updated_at"])
    return application
