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

    def test_exam_review_item_constraints_use_exam_reviews_namespace(self):
        item_model = apps.get_app_config("exam_reviews").get_model("ExamReviewItem")
        constraint_names = {constraint.name for constraint in item_model._meta.constraints}

        self.assertIn("exam_reviews_item_unique_position", constraint_names)
        self.assertIn("exam_reviews_item_unique_subject_number", constraint_names)
        self.assertNotIn("exam_review_item_unique_position", constraint_names)
        self.assertNotIn("exam_review_item_unique_subject_number", constraint_names)
