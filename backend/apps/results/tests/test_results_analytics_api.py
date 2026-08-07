from datetime import timedelta
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


class ResultsAnalyticsOverviewApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="results-analytics-admin")
        cls.released_session = cls._create_session("SESSION-RELEASED", "Released examination", ScoreBatchStatus.RESULTS_RELEASED)
        cls._create_released_batch(cls.released_session, "BATCH-RELEASED")
        cls._create_score(cls.released_session, "BAND-LOW", Decimal("59.99"), released=True)
        cls._create_score(cls.released_session, "BAND-60", Decimal("60.00"), released=True)
        cls._create_score(cls.released_session, "BAND-70", Decimal("70.00"), released=True)
        cls._create_score(cls.released_session, "BAND-80", Decimal("80.00"), released=True)
        cls._create_score(cls.released_session, "BAND-90", Decimal("90.00"), released=True)
        cls._create_score(cls.released_session, "BAND-100", Decimal("100.00"), released=True)
        cls._create_score(cls.released_session, "PENDING", Decimal("99.00"), review_status=ScoreReviewStatus.PENDING, released=True)

        cls.unreleased_session = cls._create_session("SESSION-UNRELEASED", "Unreleased examination", ScoreBatchStatus.SCORING_PROCESSED)
        cls._create_released_batch(cls.unreleased_session, "BATCH-UNRELEASED")
        cls._create_score(cls.unreleased_session, "UNRELEASED-SESSION", Decimal("99.00"), released=True)
        cls._create_score(cls.released_session, "UNRELEASED-SCORE", Decimal("99.00"), released=False)

        first_audit = ScoreReleaseAuditLog.objects.create(
            session=cls.released_session,
            processing_batch=ScoreProcessingBatch.objects.get(id="BATCH-RELEASED"),
            released_count=1,
        )
        ScoreReleaseAuditLog.objects.filter(pk=first_audit.pk).update(created_at=timezone.now() - timedelta(days=1))
        cls.latest_audit = ScoreReleaseAuditLog.objects.create(
            session=cls.released_session,
            processing_batch=ScoreProcessingBatch.objects.get(id="BATCH-RELEASED"),
            released_count=6,
        )

    @classmethod
    def _create_session(cls, session_id, name, scoring_status):
        return ExaminationSession.objects.create(
            id=session_id,
            name=name,
            status=ExaminationSessionStatus.CLOSED,
            scoring_status=scoring_status,
        )

    @classmethod
    def _create_released_batch(cls, session, batch_id):
        return ScoreProcessingBatch.objects.create(
            id=batch_id,
            session=session,
            status=ScoreBatchStatus.RESULTS_RELEASED,
            completed_at=timezone.now(),
        )

    @classmethod
    def _create_score(cls, session, score_id, final_score, *, review_status=ScoreReviewStatus.APPROVED, released=False):
        population = RankingPopulation.objects.create(id=f"POP-{score_id}", session=session, name=f"Population {score_id}")
        exam_set = ExamSet.objects.create(id=f"SET-{score_id}", session=session, ranking_population=population, code=f"SET-{score_id}")
        return CandidateScore.objects.create(
            id=f"SCORE-{score_id}",
            session=session,
            ranking_population=population,
            exam_set=exam_set,
            candidate_id=f"CANDIDATE-{score_id}",
            lrn=f"{len(score_id):012d}",
            candidate_name="Synthetic Candidate",
            raw_score=80,
            max_score=100,
            final_score=final_score,
            review_status=review_status,
            release_status=ScoreReleaseStatus.RELEASED if released else ScoreReleaseStatus.NOT_RELEASED,
            released_at=timezone.now() if released else None,
        )

    def setUp(self):
        self.client = APIClient()

    def authenticate_as(self, role):
        self.client.force_authenticate(user=principal(self.user, role))

    def test_authorized_roles_read_exact_released_only_aggregates(self):
        expected_roles = (
            PortalRole.CHED_ADMIN,
            PortalRole.DEPED_ADMIN,
            PortalRole.TESDA_ADMIN,
            PortalRole.EXECUTIVE,
            PortalRole.UNIVERSITY_ADMIN,
            PortalRole.EXAM_ADMINISTRATOR,
            PortalRole.SYSTEM_ADMIN,
        )
        for role in expected_roles:
            with self.subTest(role=role):
                self.authenticate_as(role)
                response = self.client.get(reverse("results:results-analytics-overview"))

                self.assertEqual(response.status_code, 200)
                self.assertCountEqual(response.data, ("releasedCandidates", "releasedSessions", "meanFinalScore", "scoreBands", "sessions"))
                self.assertEqual(response.data["releasedCandidates"], 6)
                self.assertEqual(response.data["releasedSessions"], 1)
                self.assertEqual(response.data["meanFinalScore"], 76.665)
                self.assertEqual(response.data["scoreBands"], [
                    {"label": "0-59.99", "minimum": 0, "maximum": 59.99, "count": 1},
                    {"label": "60-69.99", "minimum": 60, "maximum": 69.99, "count": 1},
                    {"label": "70-79.99", "minimum": 70, "maximum": 79.99, "count": 1},
                    {"label": "80-89.99", "minimum": 80, "maximum": 89.99, "count": 1},
                    {"label": "90-100", "minimum": 90, "maximum": 100, "count": 2},
                ])
                self.assertEqual(response.data["sessions"], [{
                    "sessionId": self.released_session.id,
                    "sessionName": self.released_session.name,
                    "releasedCandidates": 6,
                    "meanFinalScore": 76.665,
                    "releasedAt": self.latest_audit.created_at.isoformat(),
                }])
                self.assert_no_sensitive_fields(response.data)

    def test_overview_returns_zero_safe_empty_aggregates(self):
        self.authenticate_as(PortalRole.EXECUTIVE)
        CandidateScore.objects.update(release_status=ScoreReleaseStatus.NOT_RELEASED)

        response = self.client.get(reverse("results:results-analytics-overview"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["releasedCandidates"], 0)
        self.assertEqual(response.data["releasedSessions"], 0)
        self.assertIsNone(response.data["meanFinalScore"])
        self.assertEqual([band["count"] for band in response.data["scoreBands"]], [0, 0, 0, 0, 0])
        self.assertEqual(response.data["sessions"], [])

    def test_student_and_unauthenticated_callers_are_denied(self):
        self.authenticate_as(PortalRole.STUDENT)
        self.assertEqual(self.client.get(reverse("results:results-analytics-overview")).status_code, 403)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(reverse("results:results-analytics-overview")).status_code, 401)

    def test_overview_has_no_client_filter_or_identity_input(self):
        self.authenticate_as(PortalRole.EXECUTIVE)

        response = self.client.get(
            reverse("results:results-analytics-overview"),
            {"candidateId": "CANDIDATE-BAND-LOW", "sessionId": self.unreleased_session.id, "status": "INVALID"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["releasedCandidates"], 6)
        self.assert_no_sensitive_fields(response.data)

    def test_overview_query_count_is_bounded_independent_of_session_count(self):
        self.authenticate_as(PortalRole.EXECUTIVE)
        for index in range(10):
            session = self._create_session(f"SESSION-EXTRA-{index}", f"Extra examination {index}", ScoreBatchStatus.RESULTS_RELEASED)
            self._create_score(session, f"EXTRA-{index}", Decimal("80.00"), released=True)

        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(reverse("results:results-analytics-overview"))

        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(queries), 5)

    def assert_no_sensitive_fields(self, value):
        prohibited = {"candidateId", "candidateName", "lrn", "answer", "email"}
        if isinstance(value, dict):
            self.assertFalse(prohibited & value.keys())
            for child in value.values():
                self.assert_no_sensitive_fields(child)
        elif isinstance(value, list):
            for child in value:
                self.assert_no_sensitive_fields(child)
