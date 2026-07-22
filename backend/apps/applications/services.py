import hashlib
import re
import secrets
import unicodedata
from datetime import datetime, timedelta
from difflib import SequenceMatcher

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from .identity_verification import (
    DocumentRecognitionUnavailable,
    SelfieFaceValidationFailed,
    SelfieFaceValidationUnavailable,
    get_selfie_face_validator,
    get_student_id_recognizer,
)
from .models import (ApplicationIdentityMedia, ApplicationStatus, IdentityMediaType,
                     Step2Verification, Step2VerificationConfiguration,
                     Step2VerificationStatus, StudentApplication)
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


def validate_registration_selfie_face(*, token: str, uploaded_file) -> dict:
    get_step2_verification(token)
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
    }


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
    for existing_media in ApplicationIdentityMedia.objects.filter(verification=verification, media_type=media_type):
        existing_media.file.delete(save=False)
        existing_media.delete()
    ApplicationIdentityMedia.objects.create(verification=verification, media_type=media_type, file=uploaded_file,
                                            content_type=content_type, size=uploaded_file.size, sha256=digest.hexdigest())
    if not is_step1_identity_selfie_upload:
        verification.attempts += 1
    required_id_media = set()
    if configuration.get("requireStudentIdVerification"):
        if configuration.get("requireStudentIdFront"): required_id_media.add(IdentityMediaType.STUDENT_ID_FRONT)
        if configuration.get("requireStudentIdBack"): required_id_media.add(IdentityMediaType.STUDENT_ID_BACK)
    present = set(verification.media.values_list("media_type", flat=True))
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
def create_draft(*, owner=None, verification_token: str = "", data: dict, submit_on_create: bool = False) -> StudentApplication:
    password = data.pop("password", "")
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
    try:
        if submit_on_create:
            _validate_registration_account_creation(data, password, require_valid_lrn=bool(verification_token))
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
    return application


def _validate_registration_account_creation(data: dict, password: str, *, require_valid_lrn: bool = True) -> None:
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
    if errors:
        raise ValidationError(errors)


@transaction.atomic
def update_draft(*, application_id, owner, expected_version: int, data: dict) -> StudentApplication:
    application = _locked_owned(application_id=application_id, owner=owner)
    if application.status not in EDITABLE_STATUSES:
        raise ApplicationConflict("Only draft or correction-requested applications may be edited.")
    _check_version(application, expected_version)
    for field, value in data.items():
        setattr(application, field, value)
    application.version += 1
    application.save()
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
    application.save(update_fields=["status", "review_step", "version", "updated_at"])
    if decision == "APPROVE":
        from apps.accounts.services import activate_student_registration_account

        activate_student_registration_account(registration_application_id=str(application.id))
        application.refresh_from_db()
    if decision == "REJECT" and application.password_hash:
        application.password_hash = ""
        application.save(update_fields=["password_hash", "updated_at"])
    return application
