import csv
from datetime import date, timedelta
from io import StringIO

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole, get_user_role
from apps.applications.models import (
    ApplicationBulkUploadBatch,
    ApplicationBulkUploadRowResult,
    ApplicationCompletionStatus,
    ApplicationStatus,
    ApplicationSubmissionSource,
    BulkUploadBatchStatus,
    BulkUploadRowStatus,
    StudentApplication,
)


BULK_UPLOAD_TEMPLATE_VERSION = "2026-08-06.v1"
BULK_UPLOAD_COLUMNS = [
    "templateVersion",
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "dateOfBirth",
    "sex",
    "email",
    "mobile",
    "region",
    "province",
    "city",
    "barangay",
    "street",
    "postalCode",
    "lrn",
    "schoolId",
    "schoolName",
    "academicTrack",
    "gradeLevel",
    "enrollmentStatus",
    "schoolYear",
    "gwa",
    "firstChoiceUniversity",
    "firstChoiceCourse",
    "secondChoiceUniversity",
    "secondChoiceCourse",
    "thirdChoiceUniversity",
    "thirdChoiceCourse",
    "privacyConsent",
    "declarationAccepted",
]

REQUIRED_COLUMNS = frozenset(
    {
        "templateVersion",
        "firstName",
        "lastName",
        "dateOfBirth",
        "sex",
        "email",
        "mobile",
        "region",
        "province",
        "city",
        "barangay",
        "street",
        "postalCode",
        "schoolId",
        "schoolName",
        "gradeLevel",
        "enrollmentStatus",
        "schoolYear",
        "firstChoiceUniversity",
        "firstChoiceCourse",
        "privacyConsent",
        "declarationAccepted",
    }
)


def build_bulk_upload_template_csv() -> str:
    stream = StringIO()
    writer = csv.DictWriter(stream, fieldnames=BULK_UPLOAD_COLUMNS)
    writer.writeheader()
    writer.writerow(
        {
            "templateVersion": BULK_UPLOAD_TEMPLATE_VERSION,
            "firstName": "Sample",
            "middleName": "Test",
            "lastName": "Student",
            "suffix": "",
            "dateOfBirth": "2008-05-15",
            "sex": "Female",
            "email": "sample.student@example.test",
            "mobile": "09171234567",
            "region": "Region IV-A",
            "province": "Batangas",
            "city": "Batangas City",
            "barangay": "Poblacion",
            "street": "Sample Street",
            "postalCode": "4200",
            "lrn": "123456789012",
            "schoolId": "301234",
            "schoolName": "Sample National High School",
            "academicTrack": "STEM",
            "gradeLevel": "Grade 12",
            "enrollmentStatus": "Enrolled",
            "schoolYear": "2026-2027",
            "gwa": "92.5",
            "firstChoiceUniversity": "UP Diliman",
            "firstChoiceCourse": "BS Physics",
            "secondChoiceUniversity": "",
            "secondChoiceCourse": "",
            "thirdChoiceUniversity": "",
            "thirdChoiceCourse": "",
            "privacyConsent": "true",
            "declarationAccepted": "true",
        }
    )
    return stream.getvalue()


def validate_bulk_upload_csv(*, uploaded_file, actor) -> dict:
    actor_role = _require_bulk_upload_role(actor)
    batch = ApplicationBulkUploadBatch.objects.create(
        template_version=BULK_UPLOAD_TEMPLATE_VERSION,
        exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
        status=BulkUploadBatchStatus.VALIDATING,
        uploaded_by_user_id=getattr(actor, "user_id", getattr(actor, "id")),
        performed_by_role_snapshot=actor_role,
        expires_at=timezone.now() + timedelta(days=1),
    )

    try:
        rows = _read_csv_rows(uploaded_file)
    except ValueError:
        return _finish_failed_batch(batch)

    seen_lrns = set()
    seen_emails = set()
    row_results = []
    for row_number, submitted_row in enumerate(rows, start=2):
        extra_values = submitted_row.get(None, [])
        row = {column: (submitted_row.get(column) or "").strip() for column in BULK_UPLOAD_COLUMNS}
        row["email"] = row["email"].lower()
        field_errors = _field_errors(row)
        if extra_values:
            field_errors.append(
                _error("row", "", "unexpected_fields", "Row contains more values than the CSV header.")
            )
        conflict_errors = [] if field_errors else _conflict_errors(row, seen_lrns, seen_emails)
        status = BulkUploadRowStatus.FIELD_ERROR if field_errors else (
            BulkUploadRowStatus.CONFLICT if conflict_errors else BulkUploadRowStatus.VALID
        )
        row_results.append(
            ApplicationBulkUploadRowResult(
                batch=batch,
                row_number=row_number,
                status=status,
                submitted_lrn=row["lrn"],
                submitted_email=row["email"],
                row_snapshot=row,
                errors=field_errors or conflict_errors,
            )
        )

    with transaction.atomic():
        ApplicationBulkUploadRowResult.objects.bulk_create(row_results)
        return _finish_validated_batch(batch, row_results)


def confirm_bulk_upload_batch(*, batch_id, actor) -> dict:
    actor_role = _require_bulk_upload_role(actor)
    actor_user_id = getattr(actor, "user_id", getattr(actor, "id"))
    now = timezone.now()
    with transaction.atomic():
        batch = ApplicationBulkUploadBatch.objects.select_for_update().get(id=batch_id)
        if actor_role != PortalRole.SYSTEM_ADMIN.value and str(batch.uploaded_by_user_id) != str(actor_user_id):
            raise PermissionDenied("Only the uploader or a system administrator can confirm this batch.")
        if batch.status in {BulkUploadBatchStatus.COMPLETED, BulkUploadBatchStatus.COMPLETED_WITH_ERRORS}:
            return _response(batch, batch.summary_counts)
        if batch.status in {BulkUploadBatchStatus.FAILED, BulkUploadBatchStatus.EXPIRED}:
            raise ValueError("This bulk upload batch cannot be confirmed.")
        if batch.expires_at <= now:
            batch.status = BulkUploadBatchStatus.EXPIRED
            batch.save(update_fields=["status", "updated_at"])
            raise ValueError("This bulk upload batch has expired.")
        if batch.status != BulkUploadBatchStatus.VALIDATED:
            raise ValueError("Only validated bulk upload batches can be confirmed.")

        batch.status = BulkUploadBatchStatus.CONFIRMING
        batch.confirmed_at = now
        batch.save(update_fields=["status", "confirmed_at", "updated_at"])

    valid_rows = ApplicationBulkUploadRowResult.objects.filter(
        batch_id=batch_id,
        status=BulkUploadRowStatus.VALID,
    ).order_by("row_number", "id")
    for row_result in valid_rows:
        _confirm_row(row_result=row_result, actor_user_id=actor_user_id)

    with transaction.atomic():
        batch = ApplicationBulkUploadBatch.objects.select_for_update().get(id=batch_id)
        imported_rows = batch.row_results.filter(status=BulkUploadRowStatus.IMPORTED).count()
        conflict_rows = batch.row_results.filter(status=BulkUploadRowStatus.CONFLICT).count()
        field_error_rows = batch.row_results.filter(status=BulkUploadRowStatus.FIELD_ERROR).count()
        import_failed_rows = batch.row_results.filter(status=BulkUploadRowStatus.IMPORT_FAILED).count()
        batch.status = (
            BulkUploadBatchStatus.COMPLETED
            if conflict_rows + field_error_rows + import_failed_rows == 0
            else BulkUploadBatchStatus.COMPLETED_WITH_ERRORS
        )
        batch.completed_at = timezone.now()
        batch.summary_counts = _summary_counts(
            imported_rows,
            conflict_rows,
            field_error_rows + import_failed_rows,
            imported_rows=imported_rows,
        )
        batch.save(update_fields=["status", "completed_at", "summary_counts", "updated_at"])
        return _response(batch, batch.summary_counts)


def _confirm_row(*, row_result: ApplicationBulkUploadRowResult, actor_user_id) -> None:
    with transaction.atomic():
        row_result = ApplicationBulkUploadRowResult.objects.select_for_update().get(id=row_result.id)
        if row_result.status != BulkUploadRowStatus.VALID:
            return
        row = row_result.row_snapshot
        conflict_errors = _final_conflict_errors(row)
        if conflict_errors:
            row_result.status = BulkUploadRowStatus.CONFLICT
            row_result.errors = conflict_errors
            row_result.save(update_fields=["status", "errors", "updated_at"])
            return

        application = StudentApplication.objects.create(
            owner=None,
            lrn=row.get("lrn", ""),
            exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
            status=ApplicationStatus.SUBMITTED,
            completion_status=ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION,
            submission_source=ApplicationSubmissionSource.ADMISSIONS_BULK_UPLOAD,
            submitted_by_user_id=actor_user_id,
            bulk_upload_batch=row_result.batch,
            bulk_upload_row_number=row_result.row_number,
            submitted_at=timezone.now(),
            password_hash="",
            personal=_personal_payload(row),
            address=_address_payload(row),
            school=_school_payload(row),
            course_preferences=_course_preferences_payload(row),
            review_step={
                "privacyConsent": True,
                "declarationAccepted": True,
                "requiresAdmissionsReviewerAttention": False,
            },
        )
        row_result.status = BulkUploadRowStatus.IMPORTED
        row_result.application = application
        row_result.save(update_fields=["status", "application", "updated_at"])


def _read_csv_rows(uploaded_file) -> list[dict]:
    name = getattr(uploaded_file, "name", "")
    content_type = getattr(uploaded_file, "content_type", "")
    allowed_content_types = {"", "text/csv", "application/csv", "application/vnd.ms-excel"}
    if not name.lower().endswith(".csv") or content_type not in allowed_content_types:
        raise ValueError("Only CSV files are accepted.")

    try:
        text = uploaded_file.read().decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError("CSV must be UTF-8 encoded.") from error
    if not text.strip():
        raise ValueError("CSV file is empty.")

    reader = csv.DictReader(StringIO(text))
    if reader.fieldnames != BULK_UPLOAD_COLUMNS:
        raise ValueError("CSV headers do not match the active template.")
    return list(reader)


def _field_errors(row: dict) -> list[dict]:
    errors = []
    for field in REQUIRED_COLUMNS:
        if not row[field]:
            errors.append(_error(field, row[field], "required", "This field is required."))

    if row["templateVersion"] and row["templateVersion"] != BULK_UPLOAD_TEMPLATE_VERSION:
        errors.append(
            _error(
                "templateVersion",
                row["templateVersion"],
                "stale_template",
                f"Use the current template version. Example: {BULK_UPLOAD_TEMPLATE_VERSION}.",
            )
        )
    if row["dateOfBirth"]:
        try:
            if not _has_yyyy_mm_dd_format(row["dateOfBirth"]):
                raise ValueError
            date.fromisoformat(row["dateOfBirth"])
        except ValueError:
            errors.append(_error("dateOfBirth", row["dateOfBirth"], "invalid_date", "Use YYYY-MM-DD. Example: 2008-05-15."))
    if row["lrn"] and (not row["lrn"].isdigit() or len(row["lrn"]) != 12):
        errors.append(_error("lrn", row["lrn"], "invalid_lrn", "LRN must be exactly 12 numeric digits. Example: 123456789012."))
    if row["email"]:
        try:
            validate_email(row["email"])
        except ValidationError:
            errors.append(_error("email", row["email"], "invalid_email", "Enter a valid email address."))
    for field in ("privacyConsent", "declarationAccepted"):
        if row[field].lower() != "true":
            errors.append(_error(field, row[field], "must_be_true", "This value must be true."))
    for university_field, course_field in (
        ("secondChoiceUniversity", "secondChoiceCourse"),
        ("thirdChoiceUniversity", "thirdChoiceCourse"),
    ):
        if bool(row[university_field]) != bool(row[course_field]):
            missing_field = course_field if row[university_field] else university_field
            errors.append(_error(missing_field, row[missing_field], "incomplete_preference", "University and course are required together."))
    return errors


def _require_bulk_upload_role(actor) -> str:
    if not getattr(actor, "is_authenticated", False) or not getattr(actor, "is_active", False):
        raise PermissionDenied("Authenticated active admissions access is required.")
    role = get_user_role(actor)
    if role not in {PortalRole.ADMISSIONS_REVIEWER.value, PortalRole.SYSTEM_ADMIN.value}:
        raise PermissionDenied("Admissions reviewer or system administrator access is required.")
    return role


def _has_yyyy_mm_dd_format(value: str) -> bool:
    return len(value) == 10 and value[4] == "-" and value[7] == "-" and value.replace("-", "").isdigit()


def _conflict_errors(row: dict, seen_lrns: set, seen_emails: set) -> list[dict]:
    errors = []
    lrn = row["lrn"]
    email = row["email"]
    if lrn:
        if lrn in seen_lrns:
            errors.append(_error("lrn", lrn, "duplicate_lrn", "LRN is duplicated in this CSV."))
        elif StudentApplication.objects.filter(
            lrn=lrn,
            exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
        ).exclude(status=ApplicationStatus.REJECTED).exists():
            errors.append(_error("lrn", lrn, "existing_application_lrn", "LRN already has an active application."))
        elif AccountProfile.objects.filter(lrn=lrn, role=PortalRole.STUDENT.value).exists():
            errors.append(_error("lrn", lrn, "existing_account_lrn", "LRN already has a student account."))
        seen_lrns.add(lrn)

    if email:
        if email in seen_emails:
            errors.append(_error("email", email, "duplicate_email", "Email is duplicated in this CSV."))
        elif StudentApplication.objects.filter(personal_info__email__iexact=email).exists():
            errors.append(_error("email", email, "existing_application_email", "Email already has an application."))
        elif get_user_model().objects.filter(email__iexact=email).exists():
            errors.append(_error("email", email, "existing_account_email", "Email already has an account."))
        seen_emails.add(email)
    return errors


def _final_conflict_errors(row: dict) -> list[dict]:
    errors = []
    lrn = row.get("lrn", "")
    email = row.get("email", "")
    if lrn:
        if StudentApplication.objects.filter(
            lrn=lrn,
            exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
        ).exclude(status=ApplicationStatus.REJECTED).exists():
            errors.append(_error("lrn", lrn, "existing_application_lrn", "LRN already has an active application."))
        elif AccountProfile.objects.filter(lrn=lrn, role=PortalRole.STUDENT.value).exists():
            errors.append(_error("lrn", lrn, "existing_account_lrn", "LRN already has a student account."))
    if email:
        if StudentApplication.objects.filter(personal_info__email__iexact=email).exists():
            errors.append(_error("email", email, "existing_application_email", "Email already has an application."))
        elif get_user_model().objects.filter(email__iexact=email).exists():
            errors.append(_error("email", email, "existing_account_email", "Email already has an account."))
    return errors


def _personal_payload(row: dict) -> dict:
    return {
        "firstName": row.get("firstName", ""),
        "middleName": row.get("middleName", ""),
        "lastName": row.get("lastName", ""),
        "suffix": row.get("suffix", ""),
        "dateOfBirth": row.get("dateOfBirth", ""),
        "sex": row.get("sex", ""),
        "email": row.get("email", ""),
        "mobile": row.get("mobile", ""),
        "identityVerificationStatus": "MANUAL_PENDING",
    }


def _address_payload(row: dict) -> dict:
    return {
        "region": row.get("region", ""),
        "province": row.get("province", ""),
        "city": row.get("city", ""),
        "barangay": row.get("barangay", ""),
        "street": row.get("street", ""),
        "postalCode": row.get("postalCode", ""),
    }


def _school_payload(row: dict) -> dict:
    return {
        "lrn": row.get("lrn", ""),
        "schoolId": row.get("schoolId", ""),
        "name": row.get("schoolName", ""),
        "academicTrack": row.get("academicTrack", ""),
        "gradeLevel": row.get("gradeLevel", ""),
        "enrollmentStatus": row.get("enrollmentStatus", ""),
        "schoolYear": row.get("schoolYear", ""),
        "gwa": row.get("gwa", ""),
    }


def _course_preferences_payload(row: dict) -> list[dict]:
    preferences = [
        {"university": row.get("firstChoiceUniversity", ""), "course": row.get("firstChoiceCourse", "")},
    ]
    for university_field, course_field in (
        ("secondChoiceUniversity", "secondChoiceCourse"),
        ("thirdChoiceUniversity", "thirdChoiceCourse"),
    ):
        if row.get(university_field) and row.get(course_field):
            preferences.append({"university": row[university_field], "course": row[course_field]})
    return preferences


def _error(field: str, submitted_value: str, code: str, reason: str) -> dict:
    return {"field": field, "submittedValue": submitted_value, "code": code, "reason": reason}


def _finish_failed_batch(batch: ApplicationBulkUploadBatch) -> dict:
    batch.status = BulkUploadBatchStatus.FAILED
    batch.summary_counts = _summary_counts(0, 0, 0)
    batch.save(update_fields=["status", "summary_counts", "updated_at"])
    return _response(batch, batch.summary_counts)


def _finish_validated_batch(batch: ApplicationBulkUploadBatch, row_results: list) -> dict:
    valid_rows = sum(row.status == BulkUploadRowStatus.VALID for row in row_results)
    conflict_rows = sum(row.status == BulkUploadRowStatus.CONFLICT for row in row_results)
    field_error_rows = sum(row.status == BulkUploadRowStatus.FIELD_ERROR for row in row_results)
    batch.status = BulkUploadBatchStatus.VALIDATED
    batch.summary_counts = _summary_counts(valid_rows, conflict_rows, field_error_rows)
    batch.save(update_fields=["status", "summary_counts", "updated_at"])
    return _response(batch, batch.summary_counts)


def _summary_counts(valid_rows: int, conflict_rows: int, field_error_rows: int, *, imported_rows: int = 0) -> dict:
    return {
        "totalRows": valid_rows + conflict_rows + field_error_rows,
        "validRows": valid_rows,
        "failedRows": conflict_rows + field_error_rows,
        "conflictRows": conflict_rows,
        "fieldErrorRows": field_error_rows,
        "importedRows": imported_rows,
        "rejectedRows": conflict_rows + field_error_rows,
    }


def _response(batch: ApplicationBulkUploadBatch, summary_counts: dict) -> dict:
    return {
        "batchId": batch.public_id,
        "status": batch.status,
        **summary_counts,
        "canConfirm": batch.status == BulkUploadBatchStatus.VALIDATED and summary_counts["validRows"] > 0,
    }
