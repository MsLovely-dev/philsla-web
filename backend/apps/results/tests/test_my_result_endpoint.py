from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationStatus, StudentApplication
from apps.results.models import CandidateScore, ExamSet, ExaminationSession, RankingPopulation, ScoreReleaseStatus


def principal(user, role=PortalRole.STUDENT.value):
    return SimpleNamespace(
        id=user.id,
        user_id=user.id,
        role=role,
        is_authenticated=True,
        is_active=True,
    )


class MyResultViewTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="student", email="student@example.test")
        self.other_user = User.objects.create_user(username="other", email="other@example.test")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user))

        self.session = ExaminationSession.objects.create(id="SESSION-TEST", name="Test Session")
        self.population = RankingPopulation.objects.create(id="POP-TEST", session=self.session, name="Regular")
        self.exam_set = ExamSet.objects.create(
            id="ES-TEST0001", session=self.session, ranking_population=self.population, code="ES-TEST0001",
        )

    def make_application(self, owner, lrn="109000000001"):
        application = StudentApplication(owner=owner, status=ApplicationStatus.APPROVED, lrn=lrn)
        application.personal = {"firstName": "Ana", "lastName": "Cruz", "email": "ana@example.test"}
        application.save()
        return application

    def make_score(self, *, lrn, candidate_id, release_status=ScoreReleaseStatus.RELEASED):
        return CandidateScore.objects.create(
            id=f"SCORE-{candidate_id}",
            session=self.session,
            ranking_population=self.population,
            exam_set=self.exam_set,
            candidate_id=candidate_id,
            lrn=lrn,
            candidate_name="Ana Cruz",
            raw_score=180,
            max_score=200,
            final_score="90.00",
            overall_rank=5,
            percentile="95.0000",
            release_status=release_status,
        )

    def test_returns_own_released_result(self):
        self.make_application(self.user)
        self.make_score(lrn="109000000001", candidate_id="CAND-1")

        response = self.client.get(reverse("results:results-mine"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["candidateId"], "CAND-1")
        self.assertEqual(response.data["finalScore"], 90.0)
        self.assertEqual(response.data["overallRank"], 5)
        self.assertEqual(response.data["releaseStatus"], "RELEASED")

    def test_returns_null_when_not_released(self):
        self.make_application(self.user)
        self.make_score(lrn="109000000001", candidate_id="CAND-1", release_status=ScoreReleaseStatus.NOT_RELEASED)

        response = self.client.get(reverse("results:results-mine"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)

    def test_returns_null_when_no_application(self):
        response = self.client.get(reverse("results:results-mine"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)

    def test_never_returns_another_users_result(self):
        self.make_application(self.other_user, lrn="109000000002")
        self.make_score(lrn="109000000002", candidate_id="CAND-2")
        self.make_application(self.user, lrn="109000000001")

        response = self.client.get(reverse("results:results-mine"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)

    def test_unauthenticated_denied(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("results:results-mine"))

        self.assertEqual(response.status_code, 401)

    def test_wrong_role_denied(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))

        response = self.client.get(reverse("results:results-mine"))

        self.assertEqual(response.status_code, 403)
