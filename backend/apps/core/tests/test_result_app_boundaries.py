from django.apps import apps
from django.conf import settings
from django.test import SimpleTestCase
from django.urls import resolve


class ResultAppBoundaryTests(SimpleTestCase):
    def test_score_management_and_exam_review_have_distinct_app_labels(self):
        self.assertEqual(settings.INSTALLED_APPS.count("apps.results"), 1)
        self.assertEqual(settings.INSTALLED_APPS.count("apps.exam_reviews"), 1)

        results_models = {model.__name__ for model in apps.get_app_config("results").get_models()}
        exam_review_models = {model.__name__ for model in apps.get_app_config("exam_reviews").get_models()}

        self.assertEqual(
            results_models,
            {
                "CandidateScore",
                "ExaminationSession",
                "ExamSet",
                "RankingPopulation",
                "ScoreProcessingBatch",
                "ScoreReleaseAuditLog",
            },
        )
        self.assertEqual(
            exam_review_models,
            {
                "ExamReviewAnswerSheet",
                "ExamReviewItem",
                "ExamReviewRecord",
            },
        )

    def test_exam_review_and_score_management_routes_have_distinct_owners(self):
        exam_match = resolve("/api/v1/results/exam-reviews/")
        score_match = resolve("/api/v1/results/score-management/batches/")

        self.assertEqual(exam_match.namespace, "exam_reviews")
        self.assertEqual(score_match.namespace, "results")
