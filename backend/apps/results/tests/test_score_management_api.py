from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.results.models import CandidateScore, ScoreReleaseStatus
from apps.results.services import REGULAR_SESSION_ID, seed_score_management_data


def principal(user, role):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


class ScoreManagementApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_score_management_data(candidate_count=120, seed=2027)
        cls.user = get_user_model().objects.create_user(username="score-management-admin")

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))

    def test_admin_can_list_seeded_score_batches(self):
        response = self.client.get(reverse("results:score-management-batches"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        batch = response.data["results"][0]
        self.assertEqual(batch["id"], REGULAR_SESSION_ID)
        self.assertEqual(batch["status"], "READY_FOR_PROCESSING")
        self.assertEqual(batch["totalCandidates"], 120)
        self.assertEqual(batch["processedCount"], 0)
        self.assertEqual(batch["processingProgress"], 0)

    def test_batch_list_does_not_fetch_historical_processing_batches_separately(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")
        self.client.post(
            reverse("results:score-management-process", args=[REGULAR_SESSION_ID]),
            {"allowReprocessing": True},
            format="json",
        )

        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(reverse("results:score-management-batches"))

        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(queries), 2)

    def test_admin_can_process_batch_and_read_persisted_ranked_results(self):
        process = self.client.post(
            reverse("results:score-management-process", args=[REGULAR_SESSION_ID]),
            {"allowReprocessing": False},
            format="json",
        )

        self.assertEqual(process.status_code, 202)
        self.assertEqual(process.data["status"], "SCORING_PROCESSED")
        self.assertEqual(process.data["processedCount"], 114)
        self.assertEqual(process.data["excludedCount"], 6)
        self.assertEqual(process.data["processingProgress"], 100)
        self.assertIn("processingBatchId", process.data)

        results = self.client.get(
            reverse("results:score-management-results", args=[REGULAR_SESSION_ID]),
            {"pageSize": 5},
        )

        self.assertEqual(results.status_code, 200)
        self.assertEqual(results.data["count"], 114)
        self.assertEqual(len(results.data["results"]), 5)
        first = results.data["results"][0]
        self.assertEqual(first["overallRank"], 1)
        self.assertEqual(first["releaseStatus"], ScoreReleaseStatus.NOT_RELEASED)
        self.assertIn("percentile", first)
        self.assertTrue(CandidateScore.objects.filter(session_id=REGULAR_SESSION_ID, overall_rank__isnull=False).exists())

        batches = self.client.get(reverse("results:score-management-batches"))
        batch = batches.data["results"][0]
        self.assertEqual(batch["status"], "SCORING_PROCESSED")
        self.assertEqual(batch["processedCount"], 114)
        self.assertEqual(batch["processingProgress"], 100)
        self.assertIsNotNone(batch["processedAt"])
        self.assertTrue(batch["processedBy"])

    def test_release_requires_processed_scores(self):
        response = self.client.post(reverse("results:score-management-release", args=[REGULAR_SESSION_ID]))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Scores must be processed before release.")

    def test_process_rejects_invalid_reprocessing_flag(self):
        response = self.client.post(
            reverse("results:score-management-process", args=[REGULAR_SESSION_ID]),
            {"allowReprocessing": "sometimes"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_results_rejects_invalid_pagination(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.get(
            reverse("results:score-management-results", args=[REGULAR_SESSION_ID]),
            {"page": "zero", "pageSize": "many"},
        )

        self.assertEqual(response.status_code, 400)

    def test_results_sorting_is_backend_driven(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.get(
            reverse("results:score-management-results", args=[REGULAR_SESSION_ID]),
            {"pageSize": 10, "sortKey": "finalScore", "sortDirection": "asc"},
        )

        self.assertEqual(response.status_code, 200)
        scores = [row["finalScore"] for row in response.data["results"]]
        self.assertEqual(scores, sorted(scores))

    def test_results_can_sort_by_candidate_id(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.get(
            reverse("results:score-management-results", args=[REGULAR_SESSION_ID]),
            {"pageSize": 10, "sortKey": "candidateId", "sortDirection": "desc"},
        )

        self.assertEqual(response.status_code, 200)
        candidate_ids = [row["candidateId"] for row in response.data["results"]]
        self.assertEqual(candidate_ids, sorted(candidate_ids, reverse=True))

    def test_results_can_search_by_candidate_identifier(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.get(
            reverse("results:score-management-results", args=[REGULAR_SESSION_ID]),
            {"search": "PHL-2027-000001", "pageSize": 10},
        )

        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.data["count"], 0)
        self.assertTrue(all("PHL-2027-000001" in row["candidateId"] for row in response.data["results"]))

    def test_results_identifier_search_uses_prefix_matching(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.get(
            reverse("results:score-management-results", args=[REGULAR_SESSION_ID]),
            {"search": "000001", "pageSize": 10},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_results_can_filter_by_release_status(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.get(
            reverse("results:score-management-results", args=[REGULAR_SESSION_ID]),
            {"releaseStatus": ScoreReleaseStatus.NOT_RELEASED, "pageSize": 10},
        )

        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.data["count"], 0)
        self.assertTrue(all(row["releaseStatus"] == ScoreReleaseStatus.NOT_RELEASED for row in response.data["results"]))

    def test_reprocessing_requires_explicit_flag(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        blocked = self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")
        allowed = self.client.post(
            reverse("results:score-management-process", args=[REGULAR_SESSION_ID]),
            {"allowReprocessing": True},
            format="json",
        )

        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(blocked.data["detail"], "session has already been processed")
        self.assertEqual(allowed.status_code, 202)

    def test_release_persists_after_processing(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.post(reverse("results:score-management-release", args=[REGULAR_SESSION_ID]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "RESULTS_RELEASED")
        self.assertEqual(response.data["releasedCount"], 114)
        self.assertFalse(
            CandidateScore.objects.filter(
                session_id=REGULAR_SESSION_ID,
                release_status=ScoreReleaseStatus.NOT_RELEASED,
                overall_rank__isnull=False,
            ).exists(),
        )

    def test_reprocessing_rejects_released_results(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")
        self.client.post(reverse("results:score-management-release", args=[REGULAR_SESSION_ID]))

        with CaptureQueriesContext(connection) as queries:
            response = self.client.post(
                reverse("results:score-management-process", args=[REGULAR_SESSION_ID]),
                {"allowReprocessing": True},
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "released results cannot be reprocessed")
        self.assertFalse(any("results_candidatescore" in query["sql"].lower() for query in queries))
        self.assertEqual(
            CandidateScore.objects.filter(
                session_id=REGULAR_SESSION_ID,
                release_status=ScoreReleaseStatus.RELEASED,
                overall_rank__isnull=False,
            ).count(),
            114,
        )

    def test_admin_can_export_processed_scores_as_csv(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.get(reverse("results:score-management-export", args=[REGULAR_SESSION_ID]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv")
        content = b"".join(response.streaming_content).decode("utf-8")
        self.assertTrue(content.startswith("candidate_id,candidate_name,exam_set_id,raw_score,max_score,final_score,percentile,overall_rank,release_status"))
        self.assertIn("PHL-2027-", content)

    def test_student_cannot_access_score_management(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.STUDENT.value))

        response = self.client.get(reverse("results:score-management-batches"))

        self.assertEqual(response.status_code, 403)
