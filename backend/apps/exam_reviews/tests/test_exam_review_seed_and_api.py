from io import StringIO
import hashlib
from decimal import Decimal
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
from apps.exam_reviews.models import ExamReviewAnswerSheet, ExamReviewItem, ExamReviewRecord, ExamReviewStatus
from apps.results.models import (
    CandidateScore,
    ExamSet,
    ExaminationSession,
    RankingPopulation,
    ScoreReleaseStatus,
    ScoreReviewStatus,
)


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
        demo_lrns = list(
            StudentApplication.objects.filter(exam_cycle_id="DEMO-2026")
            .order_by("candidate_id")
            .values_list("lrn", flat=True),
        )
        self.assertEqual(demo_lrns, [f"10900000000{index}" for index in range(1, 8)])
        self.assertEqual(set(ExamReviewRecord.objects.values_list("exam_set_code", flat=True)), {"ES-BP0001"})
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

    def create_score_management_target(self, record, *, session_id="SESSION-HANDOFF"):
        session = ExaminationSession.objects.create(id=session_id, name=f"{session_id} Session")
        population = RankingPopulation.objects.create(
            id=f"POP-{session_id}",
            session=session,
            name="Regular",
        )
        exam_set = ExamSet.objects.create(
            id=f"SET-{session_id}",
            session=session,
            ranking_population=population,
            code=record.exam_set_code,
        )
        return session, population, exam_set

    def test_exam_administrator_can_list_seeded_reviews(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)

        response = self.client.get(reverse("exam_reviews:exam-review-queue"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 7)
        self.assertEqual(response.data[0]["candidateName"], "Demo Candidate 007")
        self.assertEqual(response.data[0]["candidateId"], "PS-DEMO-0007")
        self.assertEqual(response.data[0]["attemptCode"], "DEMO-ATTEMPT-007")
        self.assertNotIn("examItems", response.data[0])
        self.assertNotIn("answers", response.data[0])

    def test_release_creates_score_management_record(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")
        record.application.lrn = "109000000002"
        record.application.save(update_fields=("lrn", "updated_at"))
        session, population, exam_set = self.create_score_management_target(record)

        response = self.client.post(
            reverse("exam_reviews:exam-review-release", args=[record.id])
        )

        self.assertEqual(response.status_code, 200)
        record.refresh_from_db()
        self.assertEqual(record.status, "FINALIZED")
        score = CandidateScore.objects.get(session=session, candidate_id="PS-DEMO-0002")
        self.assertEqual(score.ranking_population, population)
        self.assertEqual(score.exam_set, exam_set)
        self.assertEqual(score.lrn, "109000000002")
        self.assertEqual(score.candidate_name, "Demo Candidate 002")
        self.assertEqual(score.raw_score, 84)
        self.assertEqual(score.max_score, 120)
        self.assertEqual(score.final_score, Decimal("70.00"))
        self.assertEqual(score.review_status, ScoreReviewStatus.APPROVED)
        self.assertEqual(score.release_status, ScoreReleaseStatus.NOT_RELEASED)

    def test_release_conflict_rolls_back_when_score_management_exam_set_is_missing(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")
        record.application.lrn = "109000000002"
        record.application.save(update_fields=("lrn", "updated_at"))

        response = self.client.post(reverse("exam_reviews:exam-review-release", args=[record.id]))

        self.assertEqual(response.status_code, 409)
        self.assertIn("exactly one Score Management Exam Set", response.data["error"]["message"])
        record.refresh_from_db()
        self.assertEqual(record.status, ExamReviewStatus.GRADED)
        self.assertFalse(CandidateScore.objects.exists())

    def test_release_conflict_rolls_back_when_exam_set_match_is_ambiguous(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")
        record.application.lrn = "109000000002"
        record.application.save(update_fields=("lrn", "updated_at"))
        self.create_score_management_target(record, session_id="SESSION-A")
        self.create_score_management_target(record, session_id="SESSION-B")

        response = self.client.post(reverse("exam_reviews:exam-review-release", args=[record.id]))

        self.assertEqual(response.status_code, 409)
        record.refresh_from_db()
        self.assertEqual(record.status, ExamReviewStatus.GRADED)
        self.assertFalse(CandidateScore.objects.exists())

    def test_release_conflict_preserves_processed_score_and_graded_review(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")
        record.application.lrn = "109000000002"
        record.application.save(update_fields=("lrn", "updated_at"))
        session, population, exam_set = self.create_score_management_target(record)
        existing = CandidateScore.objects.create(
            id="EXISTING-HANDOFF-SCORE",
            session=session,
            ranking_population=population,
            exam_set=exam_set,
            candidate_id=record.application.candidate_id,
            lrn=record.application.lrn,
            candidate_name="Original Candidate",
            raw_score=50,
            max_score=100,
            final_score=Decimal("50.00"),
            review_status=ScoreReviewStatus.APPROVED,
            overall_rank=1,
        )

        response = self.client.post(reverse("exam_reviews:exam-review-release", args=[record.id]))

        self.assertEqual(response.status_code, 409)
        record.refresh_from_db()
        existing.refresh_from_db()
        self.assertEqual(record.status, ExamReviewStatus.GRADED)
        self.assertEqual(existing.raw_score, 50)
        self.assertEqual(existing.candidate_name, "Original Candidate")
        self.assertEqual(existing.overall_rank, 1)

    def test_release_conflict_preserves_released_score_and_graded_review(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")
        session, population, exam_set = self.create_score_management_target(record)
        existing = CandidateScore.objects.create(
            id="RELEASED-HANDOFF-SCORE",
            session=session,
            ranking_population=population,
            exam_set=exam_set,
            candidate_id=record.application.candidate_id,
            lrn=record.application.lrn,
            candidate_name="Released Candidate",
            raw_score=50,
            max_score=100,
            final_score=Decimal("50.00"),
            review_status=ScoreReviewStatus.APPROVED,
            release_status=ScoreReleaseStatus.RELEASED,
        )

        response = self.client.post(reverse("exam_reviews:exam-review-release", args=[record.id]))

        self.assertEqual(response.status_code, 409)
        record.refresh_from_db()
        existing.refresh_from_db()
        self.assertEqual(record.status, ExamReviewStatus.GRADED)
        self.assertEqual(existing.release_status, ScoreReleaseStatus.RELEASED)
        self.assertEqual(existing.raw_score, 50)

    def test_release_conflict_rejects_invalid_candidate_identity_without_partial_write(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")
        record.application.lrn = ""
        record.application.save(update_fields=("lrn", "updated_at"))
        self.create_score_management_target(record)

        response = self.client.post(reverse("exam_reviews:exam-review-release", args=[record.id]))

        self.assertEqual(response.status_code, 409)
        self.assertIn("valid 12-digit LRN", response.data["error"]["message"])
        record.refresh_from_db()
        self.assertEqual(record.status, ExamReviewStatus.GRADED)
        self.assertFalse(CandidateScore.objects.exists())

    def test_release_updates_eligible_existing_score_without_duplication(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")
        record.application.lrn = "109000000002"
        record.application.save(update_fields=("lrn", "updated_at"))
        session, population, exam_set = self.create_score_management_target(record)
        existing = CandidateScore.objects.create(
            id="EXISTING-HANDOFF-SCORE",
            session=session,
            ranking_population=population,
            exam_set=exam_set,
            candidate_id=record.application.candidate_id,
            lrn="109000000009",
            candidate_name="Original Candidate",
            raw_score=50,
            max_score=100,
            final_score=Decimal("50.00"),
            review_status=ScoreReviewStatus.PENDING,
        )

        response = self.client.post(reverse("exam_reviews:exam-review-release", args=[record.id]))

        self.assertEqual(response.status_code, 200)
        record.refresh_from_db()
        existing.refresh_from_db()
        self.assertEqual(record.status, ExamReviewStatus.FINALIZED)
        self.assertEqual(CandidateScore.objects.count(), 1)
        self.assertEqual(existing.raw_score, 84)
        self.assertEqual(existing.final_score, Decimal("70.00"))
        self.assertEqual(existing.candidate_name, "Demo Candidate 002")

    def test_student_cannot_list_exam_reviews(self):
        self.authenticate_as(PortalRole.STUDENT.value)

        response = self.client.get(reverse("exam_reviews:exam-review-queue"))

        self.assertEqual(response.status_code, 403)

    def test_exam_administrator_can_read_a_seeded_review_summary(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")

        response = self.client.get(reverse("exam_reviews:exam-review-detail", args=[record.id]))

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
            reverse("exam_reviews:exam-review-item-score", args=[record.id, item.id]),
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
            reverse("exam_reviews:exam-review-item-score", args=[record.id, item.id]),
            {"points": 7},
            format="json",
        )

        self.assertEqual(response.status_code, 409)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(reverse("exam_reviews:exam-review-queue"))

        self.assertEqual(response.status_code, 401)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_can_list_only_synthetic_reviews(self):
        response = self.client.get(reverse("exam_reviews:exam-review-queue"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 7)
        self.assertTrue(all(item["candidateId"].startswith("PS-DEMO-") for item in response.data))

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_authenticated_student_remains_denied_in_local_mode(self):
        self.authenticate_as(PortalRole.STUDENT.value)

        response = self.client.get(reverse("exam_reviews:exam-review-queue"))

        self.assertEqual(response.status_code, 403)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_cannot_read_non_demo_review(self):
        demo_record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
        demo_record.application.exam_cycle_id = "2026"
        demo_record.application.save(update_fields=["exam_cycle_id"])

        response = self.client.get(reverse("exam_reviews:exam-review-detail", args=[demo_record.id]))

        self.assertEqual(response.status_code, 404)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_can_release_a_graded_demo_review(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-002")
        self.create_score_management_target(record)

        response = self.client.post(
            reverse("exam_reviews:exam-review-release", args=[record.id]),
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
            reverse("exam_reviews:exam-review-release", args=[record.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 409)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_review_with_pending_subjective_items_cannot_be_marked_graded(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")

        response = self.client.post(
            reverse("exam_reviews:exam-review-grading-status", args=[record.id]),
            {"status": "GRADED"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("2 subjective items", response.data["error"]["message"])
        record.refresh_from_db()
        self.assertEqual(record.status, ExamReviewStatus.SUBMITTED)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_graded_review_with_pending_subjective_items_cannot_be_released(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
        record.status = ExamReviewStatus.GRADED
        record.save(update_fields=("status", "updated_at"))

        response = self.client.post(
            reverse("exam_reviews:exam-review-release", args=[record.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("2 subjective items", response.data["error"]["message"])
        record.refresh_from_db()
        self.assertEqual(record.status, ExamReviewStatus.GRADED)

    @override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
    def test_local_prototype_session_can_mark_graded_and_return_to_pending(self):
        record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
        record.pending_subjective_items = 0
        record.save(update_fields=("pending_subjective_items", "updated_at"))
        endpoint = reverse("exam_reviews:exam-review-grading-status", args=[record.id])

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
            reverse("exam_reviews:exam-review-grading-status", args=[record.id]),
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
            reverse("exam_reviews:exam-review-answer-sheet-upload", args=[record.id]),
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
            reverse("exam_reviews:exam-review-answer-sheet-upload", args=[record.id]),
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
            reverse("exam_reviews:exam-review-answer-sheet-upload", args=[record.id]),
            {"file": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(ExamReviewAnswerSheet.objects.filter(review=record).count(), 0)
