from django.apps import apps
from django.db.models.deletion import PROTECT
from django.test import SimpleTestCase


class ExamReviewModelBoundaryTests(SimpleTestCase):
    def test_exam_review_models_use_their_own_app_and_table_namespace(self):
        app_config = apps.get_app_config("exam_reviews")
        models = list(app_config.get_models())
        self.assertEqual(
            {model.__name__ for model in models},
            {"ExamReviewRecord", "ExamReviewItem", "ExamReviewAnswerSheet"},
        )
        self.assertTrue(
            all(model._meta.db_table.startswith("exam_reviews_") for model in models)
        )
        application_field = app_config.get_model("ExamReviewRecord")._meta.get_field(
            "application"
        )
        self.assertEqual(
            application_field.remote_field.model._meta.label,
            "applications.StudentApplication",
        )
        self.assertIs(application_field.remote_field.on_delete, PROTECT)
