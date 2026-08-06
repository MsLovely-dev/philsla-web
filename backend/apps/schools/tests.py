from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
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
