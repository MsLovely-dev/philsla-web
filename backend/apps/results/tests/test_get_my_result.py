from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.applications.models import ApplicationStatus, StudentApplication
from apps.results import services as results_services
from apps.results.models import CandidateScore, ExamSet, ExaminationSession, RankingPopulation, ScoreReleaseStatus


class GetMyResultTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(username="stu1", email="stu1@example.test")
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

    def make_score(self, *, lrn, candidate_id="CAND-1", release_status=ScoreReleaseStatus.RELEASED):
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

    def test_returns_released_score_matched_by_lrn(self):
        self.make_application(self.owner)
        score = self.make_score(lrn="109000000001")

        result = results_services.get_my_result(owner=self.owner)

        self.assertEqual(result, score)

    def test_returns_none_when_score_not_released(self):
        self.make_application(self.owner)
        self.make_score(lrn="109000000001", release_status=ScoreReleaseStatus.NOT_RELEASED)

        result = results_services.get_my_result(owner=self.owner)

        self.assertIsNone(result)

    def test_returns_none_when_no_application(self):
        other_owner = get_user_model().objects.create_user(username="stu2", email="stu2@example.test")

        result = results_services.get_my_result(owner=other_owner)

        self.assertIsNone(result)

    def test_returns_none_when_application_has_no_lrn(self):
        self.make_application(self.owner, lrn="")
        self.make_score(lrn="109000000001")

        result = results_services.get_my_result(owner=self.owner)

        self.assertIsNone(result)
