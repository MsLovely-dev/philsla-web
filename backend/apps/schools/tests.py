from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from .models import School


class SchoolApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin",
            email="system.admin@example.test",
            password="Password1!",
        )
        self.client.force_authenticate(self.user)

        self.payload = {
            "classification": "Public",
            "name": "Philippine Science High School - Main Campus",
            "examineeCapacity": 1200,
            "region": "NCR",
        }

    def test_rejects_zero_capacity(self) -> None:
        response = self.client.post(
            reverse("schools:school_list"),
            {**self.payload, "name": "Zero Cap School", "examineeCapacity": 0},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(School.objects.filter(name="Zero Cap School").exists())

    def test_rejects_capacity_above_max(self) -> None:
        response = self.client.post(
            reverse("schools:school_list"),
            {**self.payload, "name": "Huge Cap School", "examineeCapacity": 1_000_000},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(School.objects.filter(name="Huge Cap School").exists())

    def test_create_generates_sequential_code_and_lists(self) -> None:
        first = self.client.post(reverse("schools:school_list"), self.payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["code"], "SCH-00001")
        self.assertEqual(first.data["classification"], "Public")
        self.assertEqual(first.data["examineeCapacity"], 1200)
        self.assertEqual(first.data["region"], "NCR")

        second = self.client.post(
            reverse("schools:school_list"),
            {**self.payload, "name": "Manila Science High School", "region": "Region III"},
            format="json",
        )
        self.assertEqual(second.status_code, 201)
        self.assertEqual(second.data["code"], "SCH-00002")

        list_response = self.client.get(reverse("schools:school_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 2)

    def test_update_and_delete_school(self) -> None:
        created = self.client.post(reverse("schools:school_list"), self.payload, format="json")
        school_id = created.data["id"]
        original_code = created.data["code"]

        updated = self.client.patch(
            reverse("schools:school_detail", kwargs={"school_id": school_id}),
            {"classification": "Private", "examineeCapacity": 800},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["classification"], "Private")
        self.assertEqual(updated.data["examineeCapacity"], 800)
        self.assertEqual(updated.data["code"], original_code)

        delete_response = self.client.delete(reverse("schools:school_detail", kwargs={"school_id": school_id}))
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(School.objects.filter(id=school_id).exists())

    def test_invalid_region_choice_is_rejected(self) -> None:
        response = self.client.post(
            reverse("schools:school_list"),
            {**self.payload, "region": "Atlantis"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_duplicate_name_in_same_region_is_rejected(self) -> None:
        first = self.client.post(reverse("schools:school_list"), self.payload, format="json")
        self.assertEqual(first.status_code, 201)

        # Same name in a different case, same region -> rejected (case-insensitive).
        duplicate = self.client.post(
            reverse("schools:school_list"),
            {**self.payload, "name": self.payload["name"].upper()},
            format="json",
        )
        self.assertContains(duplicate, "already exists", status_code=400)

    def test_same_name_is_allowed_in_a_different_region(self) -> None:
        first = self.client.post(reverse("schools:school_list"), self.payload, format="json")
        self.assertEqual(first.status_code, 201)

        other_region = self.client.post(
            reverse("schools:school_list"),
            {**self.payload, "region": "Region III"},
            format="json",
        )
        self.assertEqual(other_region.status_code, 201)

    def test_update_into_a_duplicate_name_is_rejected(self) -> None:
        self.client.post(reverse("schools:school_list"), self.payload, format="json")
        second = self.client.post(
            reverse("schools:school_list"),
            {**self.payload, "name": "Manila Science High School"},
            format="json",
        )
        second_id = second.data["id"]

        # Renaming the second school onto the first's name (same region) -> rejected.
        collision = self.client.patch(
            reverse("schools:school_detail", kwargs={"school_id": second_id}),
            {"name": self.payload["name"]},
            format="json",
        )
        self.assertContains(collision, "already exists", status_code=400)

    def test_status_defaults_to_active_and_can_be_set(self) -> None:
        default_school = self.client.post(reverse("schools:school_list"), self.payload, format="json")
        self.assertEqual(default_school.status_code, 201)
        self.assertEqual(default_school.data["status"], "Active")

        inactive = self.client.post(
            reverse("schools:school_list"),
            {**self.payload, "name": "Inactive Campus", "status": "Inactive"},
            format="json",
        )
        self.assertEqual(inactive.status_code, 201)
        self.assertEqual(inactive.data["status"], "Inactive")


class SchoolListQueryTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin", email="system.admin@example.test", password="Password1!"
        )
        self.client.force_authenticate(self.user)
        for index in range(25):
            School.objects.create(
                classification="Public" if index % 2 == 0 else "Private",
                name=f"School {index:02d}",
                examinee_capacity=1000 + index,
                region="NCR" if index < 20 else "Region VII",
                status="Active" if index % 3 else "Inactive",
            )
        self.url = reverse("schools:school_list")

    def test_paginates_with_default_page_size_20(self) -> None:
        first = self.client.get(self.url, {"page": 1})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["count"], 25)
        self.assertEqual(len(first.data["results"]), 20)
        second = self.client.get(self.url, {"page": 2})
        self.assertEqual(len(second.data["results"]), 5)

    def test_returns_plain_array_without_pagination_params(self) -> None:
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 25)

    def test_search_matches_name_and_code(self) -> None:
        response = self.client.get(self.url, {"page": 1, "search": "School 07"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "School 07")

    def test_classification_region_status_filters(self) -> None:
        private = self.client.get(self.url, {"page": 1, "pageSize": 100, "classification": "Private"})
        self.assertTrue(all(item["classification"] == "Private" for item in private.data["results"]))
        region = self.client.get(self.url, {"page": 1, "pageSize": 100, "region": "Region VII"})
        self.assertEqual(region.data["count"], 5)
        inactive = self.client.get(self.url, {"page": 1, "pageSize": 100, "status": "Inactive"})
        self.assertTrue(all(item["status"] == "Inactive" for item in inactive.data["results"]))

    def test_ordering_descending_by_name(self) -> None:
        response = self.client.get(self.url, {"page": 1, "pageSize": 100, "ordering": "-name"})
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names, sorted(names, reverse=True))

    def test_list_includes_registry_wide_summary(self) -> None:
        response = self.client.get(self.url, {"page": 1})
        summary = response.data["summary"]
        self.assertEqual(summary["total"], 25)
        self.assertEqual(summary["public"] + summary["private"], 25)
        self.assertEqual(summary["totalCapacity"], sum(1000 + i for i in range(25)))
        filtered = self.client.get(self.url, {"page": 1, "classification": "Public"})
        self.assertEqual(filtered.data["summary"]["total"], 25)

    def test_export_streams_filtered_csv_with_selected_columns(self) -> None:
        response = self.client.get(
            reverse("schools:school_export"),
            {"classification": "Public", "columns": "code,name"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv")
        content = b"".join(response.streaming_content).decode()
        lines = [line for line in content.splitlines() if line]
        self.assertEqual(lines[0], "Code,Name")
        self.assertEqual(len(lines) - 1, 13)  # 13 Public schools

    def test_export_neutralizes_formula_injection(self) -> None:
        School.objects.create(
            classification="Public", name="=cmd Attack School", examinee_capacity=100, region="BARMM"
        )
        response = self.client.get(reverse("schools:school_export"), {"columns": "name"})
        content = b"".join(response.streaming_content).decode()
        self.assertIn("'=cmd Attack School", content)

    def test_unprivileged_role_cannot_manage_schools(self) -> None:
        User = get_user_model()
        student = User.objects.create_user(
            username="student_user",
            email="student@example.test",
            password="Password1!",
        )
        self.client.force_authenticate(student)

        response = self.client.get(reverse("schools:school_list"))
        self.assertEqual(response.status_code, 403)


class SchoolImportApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin", email="system.admin@example.test", password="Password1!"
        )
        self.client.force_authenticate(self.user)
        self.url = reverse("schools:school_import")

    def _row(self, **overrides) -> dict:
        row = {"classification": "Public", "name": "School A", "examineeCapacity": 500, "region": "NCR"}
        row.update(overrides)
        return row

    def test_imports_all_rows_atomically(self) -> None:
        response = self.client.post(
            self.url,
            {"rows": [self._row(name="School A"), self._row(name="School B", classification="Private")]},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["created"], 2)
        self.assertEqual(School.objects.count(), 2)
        self.assertEqual(sorted(School.objects.values_list("code", flat=True)), ["SCH-00001", "SCH-00002"])

    def test_one_invalid_row_rolls_back_the_whole_batch(self) -> None:
        response = self.client.post(
            self.url,
            {"rows": [self._row(name="Good School"), self._row(name="Bad School", examineeCapacity=0)]},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(School.objects.count(), 0)
        rows = response.data["error"]["meta"]["rows"]
        self.assertEqual([r["row"] for r in rows], [1])
        self.assertIn("examineeCapacity", rows[0]["fields"])

    def test_accepts_region_display_label(self) -> None:
        response = self.client.post(
            self.url, {"rows": [self._row(region="National Capital Region (NCR)")]}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(School.objects.get().region, "NCR")

    def test_rejects_duplicate_name_region_within_file(self) -> None:
        response = self.client.post(
            self.url, {"rows": [self._row(name="Dup School"), self._row(name="Dup School")]}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(School.objects.count(), 0)

    @override_settings(MAINTENANCE_IMPORT_MAX_ROWS=2)
    def test_rejects_batch_over_row_cap(self) -> None:
        response = self.client.post(
            self.url, {"rows": [self._row(name=f"School {i}") for i in range(3)]}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(School.objects.count(), 0)

    def test_unprivileged_role_cannot_import(self) -> None:
        User = get_user_model()
        student = User.objects.create_user(
            username="student_user", email="student@example.test", password="Password1!"
        )
        self.client.force_authenticate(student)
        response = self.client.post(self.url, {"rows": [self._row()]}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(School.objects.count(), 0)


class SeedSchoolsCommandTests(TestCase):
    def test_seed_command_is_idempotent_and_generates_sequential_codes(self) -> None:
        call_command("seed_schools")

        self.assertEqual(School.objects.count(), 15)
        codes = list(School.objects.order_by("id").values_list("code", flat=True))
        self.assertEqual(codes[0], "SCH-00001")
        self.assertEqual(codes[-1], "SCH-00015")

        # Running again must not create duplicates.
        call_command("seed_schools")
        self.assertEqual(School.objects.count(), 15)
