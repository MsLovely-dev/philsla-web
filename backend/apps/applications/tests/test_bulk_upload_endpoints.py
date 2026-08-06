from types import SimpleNamespace

import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework.test import APIClient
from django.test import TestCase

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole
from apps.applications.models import (
    ApplicationBulkUploadBatch,
    ApplicationCompletionStatus,
    ApplicationStatus,
    ApplicationSubmissionSource,
    BulkUploadBatchStatus,
    BulkUploadRowStatus,
    StudentApplication,
)
from apps.applications.tests.test_bulk_upload_service import csv_file, valid_row


def principal(user, role=PortalRole.ADMISSIONS_REVIEWER.value):
    return SimpleNamespace(
        id=user.id,
        user_id=user.id,
        role=role,
        is_authenticated=True,
        is_active=True,
    )


class BulkUploadEndpointTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="reviewer", email="reviewer@example.test")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user))

    def test_reviewer_can_download_template(self):
        response = self.client.get(reverse("applications:bulk-upload-template"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("text/csv"))
        self.assertIn("templateVersion,firstName", response.content.decode())

    def test_reviewer_can_validate_a_correct_csv(self):
        response = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row()])},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["validRows"], 1)
        self.assertTrue(response.data["canConfirm"])

    def test_system_admin_can_validate_a_correct_csv(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))

        response = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row()])},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["validRows"], 1)

    def test_student_and_unauthenticated_users_are_denied(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.STUDENT.value))

        student_response = self.client.get(reverse("applications:bulk-upload-template"))
        self.client.force_authenticate(user=None)
        anonymous_response = self.client.get(reverse("applications:bulk-upload-template"))

        self.assertEqual(student_response.status_code, 403)
        self.assertEqual(anonymous_response.status_code, 401)

    def test_reviewer_can_read_batch_detail_after_validation(self):
        validation = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row()])},
            format="multipart",
        )

        response = self.client.get(reverse("applications:bulk-upload-detail", args=[validation.data["batchId"]]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["batchId"], validation.data["batchId"])
        self.assertEqual(response.data["validRows"], 1)
        self.assertEqual(response.data["rows"][0]["status"], BulkUploadRowStatus.VALID)

    def test_reviewer_can_download_error_csv(self):
        validation = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row(firstName="")])},
            format="multipart",
        )

        response = self.client.get(reverse("applications:bulk-upload-errors", args=[validation.data["batchId"]]))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("text/csv"))
        body = response.content.decode()
        self.assertIn("rowNumber,field,code,reason", body)
        self.assertIn("2,firstName,required", body)

    def test_confirm_imports_valid_rows_as_submitted_pending_completion_applications(self):
        validation = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row()])},
            format="multipart",
        )

        response = self.client.post(reverse("applications:bulk-upload-confirm", args=[validation.data["batchId"]]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["importedRows"], 1)
        application = StudentApplication.objects.get()
        self.assertEqual(application.status, ApplicationStatus.SUBMITTED)
        self.assertEqual(application.completion_status, ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION)
        self.assertEqual(application.submission_source, ApplicationSubmissionSource.ADMISSIONS_BULK_UPLOAD)
        self.assertIsNotNone(application.owner_id)
        self.assertEqual(application.submitted_by_user_id, self.user.id)
        self.assertEqual(application.bulk_upload_row_number, 2)
        self.assertEqual(application.personal["firstName"], "Bulk")
        self.assertEqual(application.school["name"], "Test School")
        account = application.owner
        self.assertEqual(account.email, "bulk.student@example.test")
        self.assertTrue(account.is_active)
        profile = AccountProfile.objects.get(user=account)
        self.assertEqual(profile.role, PortalRole.STUDENT.value)
        self.assertEqual(profile.lrn, "123456789012")
        self.assertTrue(profile.must_change_password)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["bulk.student@example.test"])
        self.assertEqual(mail.outbox[0].subject, "Your PhilSLA student account is active")
        password_match = re.search(r"Temporary password: ([^\s]+)", mail.outbox[0].body)
        self.assertIsNotNone(password_match)
        self.assertTrue(account.check_password(password_match.group(1)))
        self.assertIn("You must change this temporary password on first login.", mail.outbox[0].body)
        self.assertIn("http://localhost:3000/login?activation=bulk&email=bulk.student%40example.test", mail.outbox[0].body)
        self.assertNotIn(f"password={password_match.group(1)}", mail.outbox[0].body)

    def test_confirm_imports_only_valid_rows(self):
        validation = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row(), valid_row(firstName="", email="invalid-row@example.test", lrn="")])},
            format="multipart",
        )

        response = self.client.post(reverse("applications:bulk-upload-confirm", args=[validation.data["batchId"]]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["importedRows"], 1)
        self.assertEqual(StudentApplication.objects.count(), 1)

    def test_confirm_rechecks_final_conflicts_and_rejects_only_newly_conflicting_rows(self):
        validation = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {
                "file": csv_file(
                    [
                        valid_row(),
                        valid_row(email="second.student@example.test", lrn="222222222222"),
                    ]
                )
            },
            format="multipart",
        )
        StudentApplication.objects.create(
            lrn="123456789012",
            exam_cycle_id="2026",
            status=ApplicationStatus.SUBMITTED,
            personal={"email": "late.conflict@example.test"},
        )

        response = self.client.post(reverse("applications:bulk-upload-confirm", args=[validation.data["batchId"]]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["importedRows"], 1)
        self.assertEqual(response.data["conflictRows"], 1)
        self.assertEqual(StudentApplication.objects.count(), 2)

    def test_confirm_is_idempotent(self):
        validation = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row()])},
            format="multipart",
        )

        first = self.client.post(reverse("applications:bulk-upload-confirm", args=[validation.data["batchId"]]))
        second = self.client.post(reverse("applications:bulk-upload-confirm", args=[validation.data["batchId"]]))

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(StudentApplication.objects.count(), 1)
        self.assertEqual(second.data["importedRows"], 1)

    def test_different_reviewer_cannot_confirm_batch_but_system_admin_can(self):
        validation = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row()])},
            format="multipart",
        )
        other_user = get_user_model().objects.create_user(username="other-reviewer", email="other@example.test")
        self.client.force_authenticate(user=principal(other_user, PortalRole.ADMISSIONS_REVIEWER.value))

        denied = self.client.post(reverse("applications:bulk-upload-confirm", args=[validation.data["batchId"]]))
        self.client.force_authenticate(user=principal(other_user, PortalRole.SYSTEM_ADMIN.value))
        allowed = self.client.post(reverse("applications:bulk-upload-confirm", args=[validation.data["batchId"]]))

        self.assertEqual(denied.status_code, 404)
        self.assertEqual(allowed.status_code, 200)

    def test_approval_is_blocked_for_pending_student_completion(self):
        application = StudentApplication.objects.create(
            status=ApplicationStatus.SUBMITTED,
            completion_status=ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION,
            personal={"email": "pending.student@example.test"},
        )

        response = self.client.post(
            reverse("applications:review-decision", args=[application.id]),
            {"decision": "APPROVE", "reason": "Verified."},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("Student completion is pending", response.data["error"]["message"])
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.SUBMITTED)

    def test_imported_application_detail_includes_bulk_upload_metadata(self):
        validation = self.client.post(
            reverse("applications:bulk-upload-validate"),
            {"file": csv_file([valid_row()])},
            format="multipart",
        )
        self.client.post(reverse("applications:bulk-upload-confirm", args=[validation.data["batchId"]]))
        application = StudentApplication.objects.get()

        response = self.client.get(reverse("applications:detail", args=[application.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["completionStatus"], ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION)
        self.assertEqual(response.data["submissionSource"], ApplicationSubmissionSource.ADMISSIONS_BULK_UPLOAD)
        self.assertEqual(response.data["submittedByUserId"], str(self.user.id))
        self.assertEqual(response.data["bulkUploadBatchId"], validation.data["batchId"])
        self.assertEqual(response.data["bulkUploadRowNumber"], 2)

    def test_review_queue_can_filter_pending_student_completion(self):
        pending = StudentApplication.objects.create(
            status=ApplicationStatus.SUBMITTED,
            completion_status=ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION,
        )
        StudentApplication.objects.create(
            status=ApplicationStatus.SUBMITTED,
            completion_status=ApplicationCompletionStatus.COMPLETE,
        )

        response = self.client.get(
            reverse("applications:review-queue"),
            {"status": "PENDING_STUDENT_COMPLETION"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [str(pending.id)])
