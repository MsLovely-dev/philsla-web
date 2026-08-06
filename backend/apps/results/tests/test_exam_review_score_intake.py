from decimal import Decimal
from uuid import uuid4

from django.test import TestCase
from django.utils import timezone

from apps.results.models import (
    CandidateScore,
    ExamSet,
    ExaminationSession,
    RankingPopulation,
    ScoreBatchStatus,
    ScoreProcessingBatch,
    ScoreReleaseStatus,
    ScoreReviewStatus,
)
from apps.results.services import ExamReviewScoreInput, ScoreIntakeConflict, accept_exam_review_score


class ExamReviewScoreIntakeTests(TestCase):
    def setUp(self):
        self.session = ExaminationSession.objects.create(id="SESSION-2026", name="2026 Examination")
        self.population = RankingPopulation.objects.create(
            id="POP-2026",
            session=self.session,
            name="Regular Examination",
        )
        self.exam_set = ExamSet.objects.create(
            id="RESULTS-SET-2026-A",
            session=self.session,
            ranking_population=self.population,
            code="SET-2026-A",
        )

    def payload(self, **overrides):
        values = {
            "review_id": uuid4(),
            "exam_set_code": "SET-2026-A",
            "candidate_id": "PHL-2026-ABC123",
            "lrn": "109000000001",
            "candidate_name": "Ada M. Lovelace",
            "raw_score": 83,
            "max_score": 120,
        }
        values.update(overrides)
        return ExamReviewScoreInput(**values)

    def test_accepts_exam_review_score_into_matching_score_management_exam_set(self):
        review_id = uuid4()

        score = accept_exam_review_score(payload=self.payload(review_id=review_id))

        self.assertEqual(score.id, f"EXAM-REVIEW-{review_id}")
        self.assertEqual(score.session, self.session)
        self.assertEqual(score.ranking_population, self.population)
        self.assertEqual(score.exam_set, self.exam_set)
        self.assertEqual(score.candidate_id, "PHL-2026-ABC123")
        self.assertEqual(score.lrn, "109000000001")
        self.assertEqual(score.candidate_name, "Ada M. Lovelace")
        self.assertEqual(score.raw_score, 83)
        self.assertEqual(score.max_score, 120)
        self.assertEqual(score.final_score, Decimal("69.17"))
        self.assertEqual(score.review_status, ScoreReviewStatus.APPROVED)
        self.assertEqual(score.release_status, ScoreReleaseStatus.NOT_RELEASED)
        self.assertEqual(CandidateScore.objects.count(), 1)

    def test_updates_an_existing_unprocessed_candidate_score_without_duplication(self):
        existing = CandidateScore.objects.create(
            id="EXISTING-SCORE",
            session=self.session,
            ranking_population=self.population,
            exam_set=self.exam_set,
            candidate_id="PHL-2026-ABC123",
            lrn="109000000000",
            candidate_name="Old Name",
            raw_score=40,
            max_score=100,
            final_score=Decimal("40.00"),
            review_status=ScoreReviewStatus.PENDING,
        )

        score = accept_exam_review_score(
            payload=self.payload(lrn="109000000009", candidate_name="Updated Name", raw_score=91, max_score=120),
        )

        self.assertEqual(score.id, existing.id)
        self.assertEqual(CandidateScore.objects.count(), 1)
        score.refresh_from_db()
        self.assertEqual(score.lrn, "109000000009")
        self.assertEqual(score.candidate_name, "Updated Name")
        self.assertEqual(score.raw_score, 91)
        self.assertEqual(score.max_score, 120)
        self.assertEqual(score.final_score, Decimal("75.83"))
        self.assertEqual(score.review_status, ScoreReviewStatus.APPROVED)

    def test_rejects_missing_or_ambiguous_exam_set_without_writing(self):
        with self.assertRaisesRegex(ScoreIntakeConflict, "exactly one"):
            accept_exam_review_score(payload=self.payload(exam_set_code="MISSING"))

        other_session = ExaminationSession.objects.create(id="SESSION-OTHER", name="Other")
        other_population = RankingPopulation.objects.create(id="POP-OTHER", session=other_session, name="Other")
        ExamSet.objects.create(
            id="RESULTS-SET-OTHER",
            session=other_session,
            ranking_population=other_population,
            code="SET-2026-A",
        )

        with self.assertRaisesRegex(ScoreIntakeConflict, "exactly one"):
            accept_exam_review_score(payload=self.payload())

        self.assertFalse(CandidateScore.objects.exists())

    def test_rejects_a_processed_session_without_changing_existing_score(self):
        existing = CandidateScore.objects.create(
            id="EXISTING-SCORE",
            session=self.session,
            ranking_population=self.population,
            exam_set=self.exam_set,
            candidate_id="PHL-2026-ABC123",
            lrn="109000000001",
            candidate_name="Original Name",
            raw_score=50,
            max_score=100,
            final_score=Decimal("50.00"),
            review_status=ScoreReviewStatus.APPROVED,
            overall_rank=1,
        )
        self.session.scoring_status = ScoreBatchStatus.SCORING_PROCESSED
        self.session.save(update_fields=("scoring_status", "updated_at"))

        with self.assertRaisesRegex(ScoreIntakeConflict, "processing"):
            accept_exam_review_score(payload=self.payload(raw_score=99, max_score=100))

        existing.refresh_from_db()
        self.assertEqual(existing.raw_score, 50)
        self.assertEqual(existing.candidate_name, "Original Name")
        self.assertEqual(existing.overall_rank, 1)

    def test_rejects_processed_and_released_sessions(self):
        for status in (ScoreBatchStatus.SCORING_PROCESSED, ScoreBatchStatus.RESULTS_RELEASED):
            with self.subTest(status=status):
                self.session.scoring_status = status
                self.session.save(update_fields=("scoring_status", "updated_at"))

                with self.assertRaisesRegex(ScoreIntakeConflict, "processing"):
                    accept_exam_review_score(payload=self.payload())

                self.assertFalse(CandidateScore.objects.exists())

    def test_rejects_every_existing_processing_or_release_marker(self):
        batch = ScoreProcessingBatch.objects.create(id="BATCH-HANDOFF", session=self.session)
        protected_values = (
            {"overall_rank": 1},
            {"percentile": Decimal("99.0000")},
            {"processing_batch": batch},
            {"processed_at": timezone.now()},
            {"released_at": timezone.now()},
            {"release_status": ScoreReleaseStatus.RELEASED},
        )

        for marker in protected_values:
            with self.subTest(marker=tuple(marker)):
                CandidateScore.objects.all().delete()
                existing = CandidateScore.objects.create(
                    id="EXISTING-SCORE",
                    session=self.session,
                    ranking_population=self.population,
                    exam_set=self.exam_set,
                    candidate_id="PHL-2026-ABC123",
                    lrn="109000000001",
                    candidate_name="Original Name",
                    raw_score=50,
                    max_score=100,
                    final_score=Decimal("50.00"),
                    review_status=ScoreReviewStatus.APPROVED,
                    **marker,
                )

                with self.assertRaisesRegex(ScoreIntakeConflict, "processing or release"):
                    accept_exam_review_score(payload=self.payload(raw_score=99, max_score=100))

                existing.refresh_from_db()
                self.assertEqual(existing.raw_score, 50)
                self.assertEqual(existing.candidate_name, "Original Name")

    def test_rejects_invalid_identity_and_score_values_without_writing(self):
        invalid_payloads = (
            self.payload(candidate_id=""),
            self.payload(lrn=""),
            self.payload(lrn="123"),
            self.payload(candidate_name=""),
            self.payload(raw_score=-1),
            self.payload(max_score=0),
            self.payload(raw_score=121, max_score=120),
            self.payload(raw_score=32768, max_score=32768),
        )

        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(ScoreIntakeConflict):
                    accept_exam_review_score(payload=payload)

        self.assertFalse(CandidateScore.objects.exists())
