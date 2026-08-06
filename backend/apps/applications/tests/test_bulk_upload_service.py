import csv
from io import StringIO
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole
from apps.applications.bulk_upload import (
    BULK_UPLOAD_COLUMNS,
    BULK_UPLOAD_TEMPLATE_VERSION,
    build_bulk_upload_template_csv,
    validate_bulk_upload_csv,
)
from apps.applications.models import (
    ApplicationBulkUploadBatch,
    ApplicationBulkUploadRowResult,
    ApplicationStatus,
    BulkUploadRowStatus,
    StudentApplication,
)


def actor(user, role=PortalRole.ADMISSIONS_REVIEWER.value):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


def csv_file(rows):
    stream = StringIO()
    writer = csv.DictWriter(stream, fieldnames=BULK_UPLOAD_COLUMNS)
    writer.writeheader()
    for row in rows:
        writer.writerow({column: row.get(column, "") for column in BULK_UPLOAD_COLUMNS})
    return SimpleUploadedFile("bulk.csv", stream.getvalue().encode("utf-8"), content_type="text/csv")


def valid_row(**overrides):
    row = {
        "templateVersion": BULK_UPLOAD_TEMPLATE_VERSION,
        "firstName": "Bulk",
        "middleName": "",
        "lastName": "Learner",
        "suffix": "",
        "dateOfBirth": "2008-05-15",
        "sex": "Female",
        "email": "bulk.student@example.test",
        "mobile": "09171234567",
        "region": "Region IV-A",
        "province": "Batangas",
        "city": "Batangas City",
        "barangay": "Poblacion",
        "street": "Test Street",
        "postalCode": "4200",
        "lrn": "123456789012",
        "schoolId": "301234",
        "schoolName": "Test School",
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
    row.update(overrides)
    return row


class BulkUploadServiceTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="reviewer", email="reviewer@example.test")
        self.actor = actor(self.user)

    def test_template_csv_has_the_active_headers(self):
        rows = list(csv.reader(StringIO(build_bulk_upload_template_csv())))

        self.assertEqual(rows, [BULK_UPLOAD_COLUMNS])

    def test_reviewer_can_validate_a_correct_csv(self):
        result = validate_bulk_upload_csv(uploaded_file=csv_file([valid_row()]), actor=self.actor)

        self.assertEqual(result["status"], "VALIDATED")
        self.assertEqual(result["validRows"], 1)
        self.assertTrue(result["canConfirm"])
        self.assertEqual(ApplicationBulkUploadBatch.objects.count(), 1)
        self.assertEqual(ApplicationBulkUploadRowResult.objects.get().status, BulkUploadRowStatus.VALID)

    def test_validation_denies_an_actor_without_an_allowed_role_before_creating_a_batch(self):
        with self.assertRaises(PermissionDenied):
            validate_bulk_upload_csv(
                uploaded_file=csv_file([valid_row()]),
                actor=actor(self.user, role=PortalRole.STUDENT.value),
            )

        self.assertEqual(ApplicationBulkUploadBatch.objects.count(), 0)

    def test_validation_records_missing_required_fields_as_field_errors(self):
        result = validate_bulk_upload_csv(uploaded_file=csv_file([valid_row(firstName="")]), actor=self.actor)

        self.assertEqual(result["fieldErrorRows"], 1)
        row_result = ApplicationBulkUploadRowResult.objects.get()
        self.assertEqual(row_result.status, BulkUploadRowStatus.FIELD_ERROR)
        self.assertEqual(row_result.errors[0]["field"], "firstName")
        self.assertEqual(row_result.errors[0]["code"], "required")

    def test_validation_rejects_an_invalid_lrn(self):
        result = validate_bulk_upload_csv(uploaded_file=csv_file([valid_row(lrn="123")]), actor=self.actor)

        self.assertEqual(result["fieldErrorRows"], 1)
        self.assertEqual(ApplicationBulkUploadRowResult.objects.get().errors[0]["field"], "lrn")

    def test_validation_rejects_an_invalid_date_of_birth(self):
        result = validate_bulk_upload_csv(uploaded_file=csv_file([valid_row(dateOfBirth="15-05-2008")]), actor=self.actor)

        self.assertEqual(result["fieldErrorRows"], 1)
        self.assertEqual(ApplicationBulkUploadRowResult.objects.get().errors[0]["field"], "dateOfBirth")

    def test_validation_rejects_a_compact_date_of_birth(self):
        result = validate_bulk_upload_csv(uploaded_file=csv_file([valid_row(dateOfBirth="20080515")]), actor=self.actor)

        self.assertEqual(result["fieldErrorRows"], 1)
        self.assertEqual(ApplicationBulkUploadRowResult.objects.get().errors[0]["field"], "dateOfBirth")

    def test_validation_rejects_an_incomplete_optional_preference_pair(self):
        result = validate_bulk_upload_csv(
            uploaded_file=csv_file([valid_row(secondChoiceUniversity="UP Los Banos")]), actor=self.actor
        )

        self.assertEqual(result["fieldErrorRows"], 1)
        self.assertEqual(
            ApplicationBulkUploadRowResult.objects.get().errors[0]["field"], "secondChoiceCourse"
        )

    def test_validation_marks_duplicate_lrn_and_email_in_the_csv_as_conflicts(self):
        result = validate_bulk_upload_csv(uploaded_file=csv_file([valid_row(), valid_row()]), actor=self.actor)

        self.assertEqual(result["validRows"], 1)
        self.assertEqual(result["conflictRows"], 1)
        self.assertEqual(
            ApplicationBulkUploadRowResult.objects.get(row_number=3).status,
            BulkUploadRowStatus.CONFLICT,
        )

    def test_validation_marks_an_existing_application_as_a_conflict(self):
        StudentApplication.objects.create(
            lrn="123456789012",
            exam_cycle_id="2026",
            status=ApplicationStatus.SUBMITTED,
            personal={"email": "existing.application@example.test"},
        )

        result = validate_bulk_upload_csv(
            uploaded_file=csv_file([valid_row(email="existing.application@example.test")]), actor=self.actor
        )

        self.assertEqual(result["conflictRows"], 1)
        self.assertEqual(ApplicationBulkUploadRowResult.objects.get().status, BulkUploadRowStatus.CONFLICT)

    def test_validation_marks_existing_student_accounts_as_conflicts(self):
        account_user = get_user_model().objects.create_user(
            username="student", email="account.student@example.test"
        )
        AccountProfile.objects.create(
            user=account_user,
            role=PortalRole.STUDENT.value,
            lrn="123456789012",
        )

        result = validate_bulk_upload_csv(
            uploaded_file=csv_file([valid_row(email="account.student@example.test")]), actor=self.actor
        )

        self.assertEqual(result["conflictRows"], 1)
        self.assertEqual(ApplicationBulkUploadRowResult.objects.get().status, BulkUploadRowStatus.CONFLICT)

    def test_validation_rejects_unknown_columns(self):
        stream = StringIO()
        writer = csv.DictWriter(stream, fieldnames=[*BULK_UPLOAD_COLUMNS, "unexpectedColumn"])
        writer.writeheader()
        writer.writerow({**valid_row(), "unexpectedColumn": "unexpected"})
        uploaded_file = SimpleUploadedFile("bulk.csv", stream.getvalue().encode("utf-8"), content_type="text/csv")

        result = validate_bulk_upload_csv(uploaded_file=uploaded_file, actor=self.actor)

        self.assertEqual(result["status"], "FAILED")
        self.assertEqual(result["totalRows"], 0)
        self.assertFalse(result["canConfirm"])

    def test_validation_rejects_a_row_with_extra_unnamed_cells(self):
        stream = StringIO()
        writer = csv.DictWriter(stream, fieldnames=BULK_UPLOAD_COLUMNS)
        writer.writeheader()
        writer.writerow(valid_row())
        uploaded_file = SimpleUploadedFile(
            "bulk.csv",
            f"{stream.getvalue().rstrip()},unexpected\\n".encode("utf-8"),
            content_type="text/csv",
        )

        result = validate_bulk_upload_csv(uploaded_file=uploaded_file, actor=self.actor)

        self.assertEqual(result["fieldErrorRows"], 1)
        row_result = ApplicationBulkUploadRowResult.objects.get()
        self.assertEqual(row_result.status, BulkUploadRowStatus.FIELD_ERROR)
        self.assertEqual(row_result.errors[0]["code"], "unexpected_fields")
        self.assertNotIn(None, row_result.row_snapshot)
