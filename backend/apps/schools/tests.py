from django.contrib.auth import get_user_model
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
