import hashlib
import secrets

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.accounts.services import activate_student_registration_account

from .models import ApplicationStatus, StudentApplication
from .registry import RegistryUnavailable, get_lrn_registry


class ApplicationConflict(APIException):
    status_code = 409
    default_code = "conflict"
    default_detail = "The application could not be changed."


EDITABLE_STATUSES = {ApplicationStatus.DRAFT, ApplicationStatus.FOR_CORRECTION}
REVIEWABLE_STATUSES = {ApplicationStatus.SUBMITTED, ApplicationStatus.RESUBMITTED, ApplicationStatus.FOR_CORRECTION}
LRN_ATTEMPT_PREFIX = "registration:lrn-attempt:"
LRN_PROOF_PREFIX = "registration:lrn-proof:"


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


def verify_lrn(*, lrn: str, date_of_birth) -> dict:
    attempt_key = _lrn_attempt_key(lrn)
    attempts = int(cache.get(attempt_key, 0))
    if attempts >= settings.LRN_MAX_FAILED_ATTEMPTS:
        raise LrnCooldown

    try:
        record = get_lrn_registry().find(lrn=lrn, date_of_birth=date_of_birth)
    except RegistryUnavailable as exc:
        raise LrnRegistryUnavailable from exc

    if record is None:
        attempts += 1
        cache.set(attempt_key, attempts, settings.LRN_FAILED_ATTEMPT_WINDOW_MINUTES * 60)
        if attempts >= settings.LRN_MAX_FAILED_ATTEMPTS:
            raise LrnCooldown
        raise LrnVerificationRejected("We couldn't verify this LRN and Date of Birth. Please check and try again.")

    if record.grade_level != "Grade 12" or not record.is_recognized_school:
        raise LrnVerificationRejected(
            "Our records show you are not currently enrolled in Grade 12. You are not eligible to register at this time."
        )

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
    token = secrets.token_urlsafe(32)
    profile = {
        "lrn": record.lrn,
        "dateOfBirth": record.date_of_birth.isoformat(),
        "firstName": record.first_name,
        "middleName": record.middle_name,
        "lastName": record.last_name,
        "schoolName": record.school_name,
        "gradeLevel": record.grade_level,
    }
    cache.set(f"{LRN_PROOF_PREFIX}{token}", profile, settings.LRN_VERIFICATION_TTL_MINUTES * 60)
    return {"verificationToken": token, "expiresInSeconds": settings.LRN_VERIFICATION_TTL_MINUTES * 60, "profile": profile}


def _lrn_attempt_key(lrn: str) -> str:
    digest = hashlib.sha256(f"{settings.SECRET_KEY}:{lrn}".encode()).hexdigest()
    return f"{LRN_ATTEMPT_PREFIX}{digest}"


@transaction.atomic
def create_draft(*, owner=None, verification_token: str, data: dict, submit_on_create: bool = False) -> StudentApplication:
    verified = cache.get(f"{LRN_PROOF_PREFIX}{verification_token}")
    if verified is None:
        raise LrnVerificationRejected("LRN verification has expired. Please verify your LRN and Date of Birth again.")
    password = data.pop("password", "")
    personal = dict(data.get("personal", {}))
    school = dict(data.get("school", {}))
    personal.update({key: verified[key] for key in ("firstName", "middleName", "lastName", "dateOfBirth")})
    school.update({"lrn": verified["lrn"], "name": verified["schoolName"], "gradeLevel": verified["gradeLevel"]})
    data.update(personal=personal, school=school)
    try:
        owner_id = None if owner is None else getattr(owner, "user_id", owner.id)
        application = StudentApplication.objects.create(
            owner_id=owner_id,
            lrn=verified["lrn"],
            exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
            password_hash=make_password(password) if password else "",
            **data,
        )
        if submit_on_create:
            _validate_complete(application)
            application.status = ApplicationStatus.SUBMITTED
            application.version += 1
            application.submitted_at = timezone.now()
            application.save(update_fields=["status", "version", "submitted_at", "updated_at"])
    except IntegrityError as exc:
        if "unique_active_lrn_per_exam_cycle" in str(exc):
            raise ApplicationConflict("This LRN already has an existing application. View status.") from exc
        raise
    cache.delete(f"{LRN_PROOF_PREFIX}{verification_token}")
    return application


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
        activate_student_registration_account(registration_application_id=str(application.id), actor=actor)
        application.refresh_from_db()
    elif decision == "REJECT" and application.password_hash:
        application.password_hash = ""
        application.save(update_fields=["password_hash", "updated_at"])
    return application
