from io import StringIO
import hashlib
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db.models import Sum
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.applications.models import StudentApplication
from apps.results.models import ExamReviewAnswerSheet, ExamReviewItem, ExamReviewRecord


def principal(user, role: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=user.id,
        user_id=user.id,
        role=role,
        is_authenticated=True,
        is_active=True,
    )


class ExamReviewSeedTests(TestCase):
    def test_seed_is_repeatable_and_does_not_duplicate_rows(self):
        first_output = StringIO()
        second_output = StringIO()

        call_command("seed_exam_reviews", stdout=first_output)
        call_command("seed_exam_reviews", stdout=second_output)

        self.assertEqual(ExamReviewRecord.objects.count(), 7)
        self.assertEqual(StudentApplication.objects.filter(exam_cycle_id="DEMO-2026").count(), 7)
        self.assertEqual(ExamReviewRecord.objects.filter(status="SUBMITTED").count(), 5)
        self.assertEqual(ExamReviewItem.objects.count(), 140)
        self.assertTrue(all(review.review_items.count() == 20 for review in ExamReviewRecord.objects.all()))
        self.assertIn("Created: 7", first_output.getvalue())
        self.assertIn("Updated: 7", second_output.getvalue())

        for review in ExamReviewRecord.objects.all():
            awarded = review.review_items.aggregate(total=Sum("points_awarded"))["total"]
            self.assertEqual(awarded, review.total_score)


@override_settings(STORAGES={"default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}})
class ExamReviewQueueApiTests(TestCase):
    def setUp(self):
        call_command("seed_exam_reviews", stdout=StringIO())
        User = get_user_model()
        self.user = User.objects.create_user(username="exam-review-user")
        self.client = APIClient()

    def authenticate_as(self, role: str) -> None:
        self.client.force_authenticate(user=principal(self.user, role))

    def test_exam_administrator_can_list_seeded_reviews(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)

        response = self.client.get(reverse("results:exam-review-queue"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 7)
        self.assertEqual(response.data[0]["candidateName"], "Demo Candidate 007")
        self.assertEqual(response.data[0]["candidateId"], "PS-DEMO-0007")
        self.assertEqual(response.data[0]["attemptCode"], "DEMO-ATTEMPT-007")
        self.assertNotIn("examItems", response.data[0])
        self.assertNotIn("answers", response.data[0])

    def test_student_cannot_list_exam_reviews(self):
        self.authenticate_as(PortalRole.STUDENT.value)

        response = self.client.get(reverse("results:exam-review-queue"))

        self.assertEqual(response.status_code, 403)

    def test_exam_administrator_can_read_a_seeded_review_summary(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")

        response = self.client.get(reverse("results:exam-review-detail", args=[record.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["candidateName"], "Demo Candidate 001")
        self.assertEqual(response.data["pendingSubjectiveItems"], 2)
        self.assertEqual(len(response.data["examItems"]), 20)
        self.assertEqual(response.data["examItems"][0]["subject"], "MATH")
        self.assertEqual(response.data["examItems"][0]["itemNumber"], 1)
        self.assertEqual(response.data["examItems"][0]["question"], "Solve for x in the equation: 3x + 7 = 22.")
        self.assertEqual(response.data["examItems"][0]["answerOptions"], ["x = 3", "x = 4", "x = 5", "x = 6"])
        self.assertEqual(response.data["examItems"][0]["studentAnswer"], "x = 5")
        self.assertEqual(response.data["examItems"][0]["responseSeconds"], 45)
        self.assertIn("question", response.data["examItems"][0])
        self.assertIn("studentAnswer", response.data["examItems"][0])
        self.assertIn("expectedAnswer", response.data["examItems"][0])
        self.assertEqual(
            sum(item["reviewStatus"] == "PENDING_REVIEW" for item in response.data["examItems"]),
            2,
        )

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_can_save_a_subjective_official_score(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
        item = record.review_items.get(subject="ENGLISH", item_number=5)

        response = self.client.post(
            reverse("results:exam-review-item-score", args=[record.id, item.id]),
            {"points": 8},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totalScore"], 84)
        self.assertEqual(response.data["pendingSubjectiveItems"], 1)
        updated_item = next(candidate for candidate in response.data["examItems"] if candidate["id"] == str(item.id))
        self.assertEqual(updated_item["pointsAwarded"], 8)
        self.assertEqual(updated_item["reviewStatus"], "GRADED")

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_released_review_rejects_subjective_rescoring(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-003")
        item = record.review_items.get(subject="MATH", item_number=5)

        response = self.client.post(
            reverse("results:exam-review-item-score", args=[record.id, item.id]),
            {"points": 7},
            format="json",
        )

        self.assertEqual(response.status_code, 409)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(reverse("results:exam-review-queue"))

        self.assertEqual(response.status_code, 401)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_can_list_only_synthetic_reviews(self):
        response = self.client.get(reverse("results:exam-review-queue"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 7)
        self.assertTrue(all(item["candidateId"].startswith("PS-DEMO-") for item in response.data))

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_authenticated_student_remains_denied_in_local_mode(self):
        self.authenticate_as(PortalRole.STUDENT.value)

        response = self.client.get(reverse("results:exam-review-queue"))

        self.assertEqual(response.status_code, 403)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_cannot_read_non_demo_review(self):
        demo_record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
        demo_record.application.exam_cycle_id = "2026"
        demo_record.application.save(update_fields=["exam_cycle_id"])

        response = self.client.get(reverse("results:exam-review-detail", args=[demo_record.id]))

        self.assertEqual(response.status_code, 404)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_can_release_a_graded_demo_review(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")

        response = self.client.post(
            reverse("results:exam-review-release", args=[record.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "FINALIZED")
        record.refresh_from_db()
        self.assertEqual(record.status, "FINALIZED")
        self.assertEqual(record.reviewed_by, "LOCAL_PROTOTYPE")
        self.assertIsNotNone(record.reviewed_at)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_pending_demo_review_cannot_be_released(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")

        response = self.client.post(
            reverse("results:exam-review-release", args=[record.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 409)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_can_mark_graded_and_return_to_pending(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
        endpoint = reverse("results:exam-review-grading-status", args=[record.id])

        graded_response = self.client.post(endpoint, {"status": "GRADED"}, format="json")

        self.assertEqual(graded_response.status_code, 200)
        self.assertEqual(graded_response.data["status"], "GRADED")
        self.assertEqual(graded_response.data["reviewedBy"], "LOCAL_PROTOTYPE")
        self.assertIsNotNone(graded_response.data["reviewedAt"])

        pending_response = self.client.post(endpoint, {"status": "SUBMITTED"}, format="json")

        self.assertEqual(pending_response.status_code, 200)
        self.assertEqual(pending_response.data["status"], "SUBMITTED")
        self.assertEqual(pending_response.data["reviewedBy"], "")
        self.assertIsNone(pending_response.data["reviewedAt"])

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_released_review_grading_status_is_locked(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-003")

        response = self.client.post(
            reverse("results:exam-review-grading-status", args=[record.id]),
            {"status": "SUBMITTED"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        record.refresh_from_db()
        self.assertEqual(record.status, "FINALIZED")

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_can_upload_a_valid_pdf_answer_sheet(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
        content = b"%PDF-1.4\nsynthetic test answer sheet"
        upload = SimpleUploadedFile("answer-sheet.pdf", content, content_type="application/pdf")

        response = self.client.post(
            reverse("results:exam-review-answer-sheet-upload", args=[record.id]),
            {"file": upload, "templateSource": "HANDWRITTEN_OCR"},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["answerSheet"]["contentType"], "application/pdf")
        self.assertEqual(response.data["answerSheet"]["size"], len(content))
        self.assertEqual(response.data["answerSheet"]["templateSource"], "HANDWRITTEN_OCR")
        answer_sheet = ExamReviewAnswerSheet.objects.get(review=record)
        self.assertEqual(answer_sheet.template_source, "HANDWRITTEN_OCR")
        self.assertEqual(answer_sheet.sha256, hashlib.sha256(content).hexdigest())
        self.assertEqual(answer_sheet.uploaded_by, "LOCAL_PROTOTYPE")
        self.assertNotIn("answer-sheet.pdf", answer_sheet.file.name)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_invalid_answer_sheet_bytes_are_rejected(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
        upload = SimpleUploadedFile("answer-sheet.pdf", b"not a real PDF", content_type="application/pdf")

        response = self.client.post(
            reverse("results:exam-review-answer-sheet-upload", args=[record.id]),
            {"file": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(ExamReviewAnswerSheet.objects.filter(review=record).count(), 0)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_released_review_cannot_accept_an_answer_sheet(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-003")
        upload = SimpleUploadedFile("answer-sheet.pdf", b"%PDF-1.4\nsynthetic", content_type="application/pdf")

        response = self.client.post(
            reverse("results:exam-review-answer-sheet-upload", args=[record.id]),
            {"file": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(ExamReviewAnswerSheet.objects.filter(review=record).count(), 0)
