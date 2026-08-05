from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from .models import CollegeCourse, University


class UniversityApiTests(APITestCase):
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
            "name": "University of the Philippines Diliman",
            "region": "NCR",
            "city": "Quezon City",
            "presidentRector": "Dr. Angelo A. Jimenez",
            "email": "info@up.edu.ph",
            "phone": "(02) 8981-8500",
            "establishedYear": 1908,
        }

    def test_create_generates_sequential_code_and_lists(self) -> None:
        first = self.client.post(reverse("universities:university_list"), self.payload, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["code"], "UNI-00001")
        self.assertEqual(first.data["classification"], "Public")
        self.assertEqual(first.data["region"], "NCR")
        self.assertEqual(first.data["presidentRector"], "Dr. Angelo A. Jimenez")
        self.assertEqual(first.data["establishedYear"], 1908)
        self.assertEqual(first.data["status"], "Active")

        second = self.client.post(
            reverse("universities:university_list"),
            {**self.payload, "name": "Ateneo de Manila University", "classification": "Private"},
            format="json",
        )
        self.assertEqual(second.status_code, 201)
        self.assertEqual(second.data["code"], "UNI-00002")

        list_response = self.client.get(reverse("universities:university_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 2)

    def test_create_allows_optional_contact_fields_to_be_blank(self) -> None:
        response = self.client.post(
            reverse("universities:university_list"),
            {"classification": "Private", "name": "Silliman University", "region": "Region VII", "city": "Dumaguete"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["presidentRector"], "")
        self.assertEqual(response.data["email"], "")
        self.assertIsNone(response.data["establishedYear"])

    def test_update_and_delete_university(self) -> None:
        created = self.client.post(reverse("universities:university_list"), self.payload, format="json")
        university_id = created.data["id"]
        original_code = created.data["code"]

        updated = self.client.patch(
            reverse("universities:university_detail", kwargs={"university_id": university_id}),
            {"classification": "Private", "city": "Manila", "status": "Inactive"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["classification"], "Private")
        self.assertEqual(updated.data["city"], "Manila")
        self.assertEqual(updated.data["status"], "Inactive")
        self.assertEqual(updated.data["code"], original_code)

        delete_response = self.client.delete(
            reverse("universities:university_detail", kwargs={"university_id": university_id})
        )
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(University.objects.filter(id=university_id).exists())

    def test_invalid_region_choice_is_rejected(self) -> None:
        response = self.client.post(
            reverse("universities:university_list"),
            {**self.payload, "region": "Atlantis"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_unprivileged_role_cannot_manage_universities(self) -> None:
        User = get_user_model()
        student = User.objects.create_user(
            username="student_user",
            email="student@example.test",
            password="Password1!",
        )
        self.client.force_authenticate(student)

        response = self.client.get(reverse("universities:university_list"))
        self.assertEqual(response.status_code, 403)


class CollegeCourseApiTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin",
            email="system.admin@example.test",
            password="Password1!",
        )
        self.client.force_authenticate(self.user)

        self.university = University.objects.create(
            classification="Public",
            name="University of the Philippines Diliman",
            region="NCR",
            city="Quezon City",
        )
        self.course_payload = {
            "collegeName": "College of Engineering",
            "programCode": "BSCS",
            "programName": "Bachelor of Science in Computer Science",
            "degreeType": "Bachelor of Science",
            "majorSpecialization": "Software Engineering",
            "durationYears": 4,
            "totalUnits": 150,
            "cutoffPercentile": 85.0,
        }

    def _list_url(self, university_id=None):
        return reverse(
            "universities:course_list",
            kwargs={"university_id": university_id or self.university.id},
        )

    def _detail_url(self, course_id, university_id=None):
        return reverse(
            "universities:course_detail",
            kwargs={"university_id": university_id or self.university.id, "course_id": course_id},
        )

    def test_create_and_list_courses_scoped_to_university(self) -> None:
        created = self.client.post(self._list_url(), self.course_payload, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["programCode"], "BSCS")
        self.assertEqual(created.data["universityId"], self.university.id)
        self.assertEqual(created.data["universityCode"], self.university.code)
        self.assertEqual(created.data["cutoffPercentile"], 85.0)

        listed = self.client.get(self._list_url())
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

        universities = self.client.get(reverse("universities:university_list"))
        self.assertEqual(universities.status_code, 200)
        matching = next(u for u in universities.data if u["id"] == self.university.id)
        self.assertEqual(matching["courseCount"], 1)

    def test_courses_are_isolated_between_universities(self) -> None:
        self.client.post(self._list_url(), self.course_payload, format="json")
        other = University.objects.create(
            classification="Private", name="Ateneo de Manila University", region="NCR", city="Quezon City"
        )
        listed_other = self.client.get(self._list_url(university_id=other.id))
        self.assertEqual(listed_other.status_code, 200)
        self.assertEqual(len(listed_other.data), 0)

    def test_update_and_delete_course(self) -> None:
        created = self.client.post(self._list_url(), self.course_payload, format="json")
        course_id = created.data["id"]

        updated = self.client.patch(
            self._detail_url(course_id),
            {"programName": "BS Data Science", "totalUnits": 160},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["programName"], "BS Data Science")
        self.assertEqual(updated.data["totalUnits"], 160)

        deleted = self.client.delete(self._detail_url(course_id))
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(CollegeCourse.objects.filter(id=course_id).exists())

    def test_course_under_missing_university_returns_404(self) -> None:
        response = self.client.get(self._list_url(university_id=999999))
        self.assertEqual(response.status_code, 404)

    def test_invalid_degree_type_is_rejected(self) -> None:
        response = self.client.post(
            self._list_url(),
            {**self.course_payload, "degreeType": "Doctorate"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_unprivileged_role_cannot_manage_courses(self) -> None:
        User = get_user_model()
        student = User.objects.create_user(
            username="student_user",
            email="student@example.test",
            password="Password1!",
        )
        self.client.force_authenticate(student)

        response = self.client.get(self._list_url())
        self.assertEqual(response.status_code, 403)


class SeedUniversitiesCommandTests(TestCase):
    def test_seed_command_is_idempotent_and_generates_sequential_codes(self) -> None:
        call_command("seed_universities")

        university_count = University.objects.count()
        course_count = CollegeCourse.objects.count()
        self.assertGreaterEqual(university_count, 5)
        self.assertGreater(course_count, 0)

        codes = list(University.objects.order_by("id").values_list("code", flat=True))
        self.assertEqual(codes[0], "UNI-00001")
        self.assertEqual(codes[-1], f"UNI-{university_count:05d}")

        # Running again must not create duplicates.
        call_command("seed_universities")
        self.assertEqual(University.objects.count(), university_count)
        self.assertEqual(CollegeCourse.objects.count(), course_count)
