from django.db import IntegrityError
from django.test import TestCase

from apps.results.models import CandidateScore, ExamSet, RankingPopulation
from apps.results.services import REGULAR_SESSION_ID, ScoreProcessingError, process_score_session, seed_score_management_data


class ScoreManagementModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_score_management_data(candidate_count=1, seed=2027)

    def test_candidate_score_rejects_raw_score_above_max_score(self):
        baseline = CandidateScore.objects.get(session_id=REGULAR_SESSION_ID)

        with self.assertRaises(IntegrityError):
            CandidateScore.objects.create(
                id="SCORE-INVALID-RAW",
                session=baseline.session,
                ranking_population=baseline.ranking_population,
                exam_set=baseline.exam_set,
                candidate_id="PHL-INVALID-RAW",
                lrn="109999999999",
                candidate_name="Invalid Score",
                raw_score=201,
                max_score=200,
                final_score=100,
                review_status=baseline.review_status,
            )

    def test_candidate_score_has_indexes_for_large_result_queries(self):
        index_fields = {tuple(index.fields) for index in CandidateScore._meta.indexes}

        self.assertIn(("session", "review_status", "candidate_id"), index_fields)
        self.assertIn(("session", "review_status", "lrn"), index_fields)
        self.assertIn(("session", "review_status", "candidate_name"), index_fields)
        self.assertIn(("session", "review_status", "release_status", "overall_rank"), index_fields)
        self.assertIn(("session", "review_status", "final_score"), index_fields)

    def test_processing_rejects_score_whose_exam_set_population_does_not_match_score_population(self):
        baseline = CandidateScore.objects.get(session_id=REGULAR_SESSION_ID)
        other_population = RankingPopulation.objects.create(
            id="POP-MISMATCH",
            session=baseline.session,
            name="Mismatched Population",
        )
        mismatched_exam_set = ExamSet.objects.create(
            id="ES-MISMATCH",
            session=baseline.session,
            ranking_population=other_population,
            code="ES-MISMATCH",
        )
        baseline.exam_set = mismatched_exam_set
        baseline.save(update_fields=["exam_set"])

        with self.assertRaisesMessage(ScoreProcessingError, "candidate score exam set does not match ranking population"):
            process_score_session(session_id=REGULAR_SESSION_ID, processed_by=None, allow_reprocessing=True)
