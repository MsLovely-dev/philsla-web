from decimal import Decimal
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.results.models import (
    CandidateScore,
    ExaminationSession,
    ExaminationSessionStatus,
    ExamSet,
    RankingPopulation,
    ScoreBatchStatus,
    ScoreProcessingBatch,
    ScoreReleaseAuditLog,
    ScoreReleaseStatus,
    ScoreReviewStatus,
)


def principal(user, role):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


class ResultsReleaseSummaryApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="release-summary-admin")
        cls.ready_session = cls._create_session("SESSION-REGULAR", "Regular examination", ScoreBatchStatus.READY_FOR_PROCESSING)
        cls.processed_session = cls._create_session("SESSION-SPECIAL", "Special examination", ScoreBatchStatus.SCORING_PROCESSED)
        cls.released_session = cls._create_session("SESSION-RELEASED", "Released examination", ScoreBatchStatus.RESULTS_RELEASED)
        cls.open_session = cls._create_session("SESSION-OPEN", "Open examination", ScoreBatchStatus.READY_FOR_PROCESSING, closed=False)

        cls.score = cls._create_score(cls.ready_session, "READY-APPROVED", review_status=ScoreReviewStatus.APPROVED)
        cls._create_score(cls.ready_session, "READY-EXCLUDED", review_status=ScoreReviewStatus.REJECTED)

        processed_batch = ScoreProcessingBatch.objects.create(
            id="BATCH-PROCESSED",
            session=cls.processed_session,
            status=ScoreBatchStatus.SCORING_PROCESSED,
            processed_record_count=2,
            completed_at=timezone.now(),
        )
        cls._create_score(cls.processed_session, "PROCESSED-ONE", review_status=ScoreReviewStatus.APPROVED, processing_batch=processed_batch)
        cls._create_score(cls.processed_session, "PROCESSED-TWO", review_status=ScoreReviewStatus.APPROVED, processing_batch=processed_batch)

        released_batch = ScoreProcessingBatch.objects.create(
            id="BATCH-RELEASED",
            session=cls.released_session,
            status=ScoreBatchStatus.RESULTS_RELEASED,
            processed_record_count=1,
            completed_at=timezone.now(),
        )
        cls._create_score(
            cls.released_session,
            "RELEASED-ONE",
            review_status=ScoreReviewStatus.APPROVED,
            processing_batch=released_batch,
            release_status=ScoreReleaseStatus.RELEASED,
            released_at=timezone.now(),
        )
        ScoreReleaseAuditLog.objects.create(
            session=cls.released_session,
            processing_batch=released_batch,
            released_count=1,
        )
        cls._create_score(cls.open_session, "OPEN-APPROVED", review_status=ScoreReviewStatus.APPROVED)

    @classmethod
    def _create_session(cls, session_id, name, scoring_status, *, closed=True):
        return ExaminationSession.objects.create(
            id=session_id,
            name=name,
            status=ExaminationSessionStatus.CLOSED if closed else ExaminationSessionStatus.OPEN,
            scoring_status=scoring_status,
        )

    @classmethod
    def _create_score(cls, session, score_id, *, review_status, processing_batch=None, release_status=ScoreReleaseStatus.NOT_RELEASED, released_at=None):
        population = RankingPopulation.objects.create(id=f"POP-{score_id}", session=session, name=f"Population {score_id}")
        exam_set = ExamSet.objects.create(id=f"SET-{score_id}", session=session, ranking_population=population, code=f"SET-{score_id}")
        return CandidateScore.objects.create(
            id=f"SCORE-{score_id}",
            session=session,
            ranking_population=population,
            exam_set=exam_set,
            candidate_id=score_id,
            lrn=f"{len(score_id):012d}",
            candidate_name="Synthetic Candidate",
            raw_score=80,
            max_score=100,
            final_score=Decimal("80.00"),
            review_status=review_status,
            processing_batch=processing_batch,
            processed_at=processing_batch.completed_at if processing_batch else None,
            release_status=release_status,
            released_at=released_at,
        )

    def setUp(self):
        self.client = APIClient()

    def authenticate_as(self, role):
        self.client.force_authenticate(user=principal(self.user, role))

    def test_exam_administrator_reads_paginated_release_summary(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)

        response = self.client.get(reverse("results:release-summary"), {"page": 1, "pageSize": 2})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 4)
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(response.data["pageSize"], 2)
        row = response.data["results"][0]
        self.assertCountEqual(
            row,
            (
                "id", "name", "status", "isClosed", "totalCandidates", "approvedScores",
                "excludedScores", "processedScores", "releasedScores", "processedAt",
                "releasedAt", "processingReady", "releaseReady",
            ),
        )
        self.assertFalse({"candidateId", "candidateName", "lrn", "email", "rawScore", "finalScore", "notificationQueuedCount"} & row.keys())

    def test_summary_search_and_status_filters_are_backend_owned(self):
        self.authenticate_as(PortalRole.SYSTEM_ADMIN.value)

        response = self.client.get(
            reverse("results:release-summary"),
            {"search": "special", "status": ScoreBatchStatus.SCORING_PROCESSED},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertTrue(all("special" in row["name"].lower() or "special" in row["id"].lower() for row in response.data["results"]))
        self.assertTrue(all(row["status"] == ScoreBatchStatus.SCORING_PROCESSED for row in response.data["results"]))
        self.assertTrue(response.data["results"][0]["releaseReady"])

    def test_summary_reports_current_service_readiness_rules(self):
        self.authenticate_as(PortalRole.SYSTEM_ADMIN.value)

        response = self.client.get(reverse("results:release-summary"), {"pageSize": 100})

        self.assertEqual(response.status_code, 200)
        rows = {row["id"]: row for row in response.data["results"]}
        self.assertTrue(rows[self.ready_session.id]["processingReady"])
        self.assertFalse(rows[self.open_session.id]["processingReady"])
        self.assertTrue(rows[self.processed_session.id]["releaseReady"])
        self.assertFalse(rows[self.released_session.id]["releaseReady"])
        self.assertEqual(rows[self.released_session.id]["releasedScores"], 1)
        self.assertIsNotNone(rows[self.processed_session.id]["processedAt"])
        self.assertIsNotNone(rows[self.released_session.id]["releasedAt"])

    def test_summary_rejects_invalid_query_parameters_with_validation_envelope(self):
        self.authenticate_as(PortalRole.SYSTEM_ADMIN.value)

        response = self.client.get(reverse("results:release-summary"), {"page": 0, "pageSize": 101, "status": "INVALID"})

        self.assertEqual(response.status_code, 400)
        fields = response.data["error"]["fields"]
        self.assertIn("page", fields)
        self.assertIn("pageSize", fields)
        self.assertIn("status", fields)

    def test_student_and_anonymous_callers_cannot_read_release_summary(self):
        self.authenticate_as(PortalRole.STUDENT.value)
        self.assertEqual(self.client.get(reverse("results:release-summary")).status_code, 403)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(reverse("results:release-summary")).status_code, 401)

    def test_exam_administrator_can_process_and_release_a_ready_session(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)

        processed = self.client.post(
            reverse("results:score-management-process", args=[self.ready_session.id]),
            {"allowReprocessing": False},
            format="json",
        )
        self.assertEqual(processed.status_code, 202)

        released = self.client.post(reverse("results:score-management-release", args=[self.ready_session.id]))
        self.assertEqual(released.status_code, 200)

    def test_exam_administrator_still_cannot_browse_score_management_candidate_data(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)

        self.assertEqual(self.client.get(reverse("results:score-management-batches")).status_code, 403)
        self.assertEqual(
            self.client.get(reverse("results:score-management-results", args=[self.ready_session.id])).status_code,
            403,
        )
        self.assertEqual(
            self.client.get(
                reverse("results:score-management-profile", args=[self.ready_session.id, self.score.candidate_id]),
            ).status_code,
            403,
        )
        self.assertEqual(self.client.get(reverse("results:score-management-export", args=[self.ready_session.id])).status_code, 403)

    def test_student_and_anonymous_callers_cannot_process_or_release_scores(self):
        process_url = reverse("results:score-management-process", args=[self.ready_session.id])
        release_url = reverse("results:score-management-release", args=[self.ready_session.id])

        self.authenticate_as(PortalRole.STUDENT.value)
        self.assertEqual(self.client.post(process_url, {"allowReprocessing": False}, format="json").status_code, 403)
        self.assertEqual(self.client.post(release_url).status_code, 403)

        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(process_url, {"allowReprocessing": False}, format="json").status_code, 401)
        self.assertEqual(self.client.post(release_url).status_code, 401)

    def test_summary_query_count_is_bounded_independent_of_session_count(self):
        self.authenticate_as(PortalRole.SYSTEM_ADMIN.value)
        for index in range(10):
            session = self._create_session(f"SESSION-EXTRA-{index}", f"Extra examination {index}", ScoreBatchStatus.READY_FOR_PROCESSING)
            self._create_score(session, f"EXTRA-{index}", review_status=ScoreReviewStatus.APPROVED)

        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(reverse("results:release-summary"), {"pageSize": 100})

        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(queries), 2)
