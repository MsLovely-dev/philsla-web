from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.accounts.roles import PortalRole
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


class BulkUploadModelTests(TestCase):
    def test_application_metadata_defaults_to_student_registration(self):
        application = StudentApplication.objects.create(status=ApplicationStatus.SUBMITTED)

        self.assertEqual(application.completion_status, ApplicationCompletionStatus.COMPLETE)
        self.assertEqual(application.submission_source, ApplicationSubmissionSource.STUDENT_REGISTRATION)
        self.assertIsNone(application.submitted_by_user_id)
        self.assertIsNone(application.bulk_upload_batch_id)
        self.assertIsNone(application.bulk_upload_row_number)

    def test_bulk_upload_batch_and_row_result_store_validation_state(self):
        uploader = get_user_model().objects.create_user(username="reviewer", email="reviewer@example.test")
        batch = ApplicationBulkUploadBatch.objects.create(
            template_version="2026-08-06.v1",
            exam_cycle_id="2026",
            status=BulkUploadBatchStatus.VALIDATED,
            uploaded_by_user=uploader,
            performed_by_role_snapshot=PortalRole.ADMISSIONS_REVIEWER.value,
            expires_at=timezone.now(),
            summary_counts={"totalRows": 1, "validRows": 0, "failedRows": 1, "conflictRows": 0, "fieldErrorRows": 1},
        )

        row = ApplicationBulkUploadRowResult.objects.create(
            batch=batch,
            row_number=2,
            status=BulkUploadRowStatus.FIELD_ERROR,
            submitted_lrn="123",
            submitted_email="student@example.test",
            row_snapshot={"firstName": ""},
            errors=[{"field": "firstName", "submittedValue": "", "code": "required", "reason": "First name is required."}],
        )

        self.assertEqual(str(batch.id), batch.public_id)
        self.assertEqual(row.errors[0]["field"], "firstName")
