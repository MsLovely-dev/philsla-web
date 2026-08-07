from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase


class ResultMigrationBoundaryTests(SimpleTestCase):
    databases = {"default"}

    def test_results_and_exam_reviews_have_independent_leaf_nodes(self):
        leaves = MigrationExecutor(connection).loader.graph.leaf_nodes()

        self.assertIn(
            ("results", "0008_alter_scorereleasenotification_status"),
            leaves,
        )
        self.assertIn(("exam_reviews", "0001_initial"), leaves)
        self.assertEqual(sum(app == "results" for app, _ in leaves), 1)
        self.assertEqual(sum(app == "exam_reviews" for app, _ in leaves), 1)
