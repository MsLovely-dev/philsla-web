from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from rest_framework.throttling import SimpleRateThrottle

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

    def test_duplicate_name_in_same_region_is_rejected(self) -> None:
        first = self.client.post(reverse("universities:university_list"), self.payload, format="json")
        self.assertEqual(first.status_code, 201)

        # Same name (different case) in the same region -> rejected (case-insensitive).
        duplicate = self.client.post(
            reverse("universities:university_list"),
            {**self.payload, "name": self.payload["name"].upper()},
            format="json",
        )
        self.assertContains(duplicate, "already exists", status_code=400)

    def test_same_name_is_allowed_in_a_different_region(self) -> None:
        first = self.client.post(reverse("universities:university_list"), self.payload, format="json")
        self.assertEqual(first.status_code, 201)

        other_region = self.client.post(
            reverse("universities:university_list"),
            {**self.payload, "region": "Region III"},
            format="json",
        )
        self.assertEqual(other_region.status_code, 201)

    def test_update_into_a_duplicate_name_is_rejected(self) -> None:
        self.client.post(reverse("universities:university_list"), self.payload, format="json")
        second = self.client.post(
            reverse("universities:university_list"),
            {**self.payload, "name": "Ateneo de Manila University"},
            format="json",
        )
        second_id = second.data["id"]

        collision = self.client.patch(
            reverse("universities:university_detail", kwargs={"university_id": second_id}),
            {"name": self.payload["name"]},
            format="json",
        )
        self.assertContains(collision, "already exists", status_code=400)

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

    def test_free_form_degree_type_is_accepted(self) -> None:
        # degree_type is a free string field (no enum), so any value is stored as-is.
        response = self.client.post(
            self._list_url(),
            {**self.course_payload, "degreeType": "Doctor of Philosophy"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["degreeType"], "Doctor of Philosophy")

    def test_degree_type_is_blank_when_omitted(self) -> None:
        # No default: omitting degreeType leaves it blank rather than forcing a value.
        payload = {key: value for key, value in self.course_payload.items() if key != "degreeType"}
        response = self.client.post(self._list_url(), payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["degreeType"], "")

    def test_duplicate_program_code_in_same_university_is_rejected(self) -> None:
        first = self.client.post(self._list_url(), self.course_payload, format="json")
        self.assertEqual(first.status_code, 201)

        # Same program code (different case) under the same university -> rejected.
        duplicate = self.client.post(
            self._list_url(),
            {**self.course_payload, "programCode": self.course_payload["programCode"].lower()},
            format="json",
        )
        self.assertContains(duplicate, "already exists", status_code=400)

    def test_same_program_code_is_allowed_in_a_different_university(self) -> None:
        self.client.post(self._list_url(), self.course_payload, format="json")
        other = University.objects.create(
            classification="Private",
            name="Ateneo de Manila University",
            region="NCR",
            city="Quezon City",
        )
        response = self.client.post(
            self._list_url(university_id=other.id), self.course_payload, format="json"
        )
        self.assertEqual(response.status_code, 201)

    def test_update_into_a_duplicate_program_code_is_rejected(self) -> None:
        self.client.post(self._list_url(), self.course_payload, format="json")
        second = self.client.post(
            self._list_url(),
            {**self.course_payload, "programCode": "BSIT", "programName": "BS Information Technology"},
            format="json",
        )
        second_id = second.data["id"]

        collision = self.client.patch(
            self._detail_url(second_id),
            {"programCode": self.course_payload["programCode"]},
            format="json",
        )
        self.assertContains(collision, "already exists", status_code=400)

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
        call_command("seed_university_registry")

        university_count = University.objects.count()
        course_count = CollegeCourse.objects.count()
        self.assertGreaterEqual(university_count, 5)
        self.assertGreater(course_count, 0)

        codes = list(University.objects.order_by("id").values_list("code", flat=True))
        self.assertEqual(codes[0], "UNI-00001")
        self.assertEqual(codes[-1], f"UNI-{university_count:05d}")

        # Running again must not create duplicates.
        call_command("seed_university_registry")
        self.assertEqual(University.objects.count(), university_count)
        self.assertEqual(CollegeCourse.objects.count(), course_count)


class MaintenanceValidationTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin", email="system.admin@example.test", password="Password1!"
        )
        self.client.force_authenticate(self.user)
        self.university = University.objects.create(
            classification="Public", name="UP Diliman", region="NCR", city="Quezon City"
        )

    def _course(self, **overrides):
        return {
            "collegeName": "College of Engineering",
            "programCode": "BSCS",
            "programName": "Bachelor of Science in Computer Science",
            "degreeType": "Bachelor of Science",
            "durationYears": 4,
            "totalUnits": 150,
            "cutoffPercentile": 85.0,
            **overrides,
        }

    def test_rejects_future_established_year(self) -> None:
        response = self.client.post(
            reverse("universities:university_list"),
            {"classification": "Public", "name": "Future University", "region": "NCR", "city": "QC",
             "establishedYear": timezone.now().year + 1},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(University.objects.filter(name="Future University").exists())

    def test_rejects_cutoff_percentile_above_100(self) -> None:
        url = reverse("universities:course_list", kwargs={"university_id": self.university.id})
        response = self.client.post(url, self._course(cutoffPercentile=150), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(CollegeCourse.objects.filter(university=self.university).count(), 0)

    def test_rejects_duration_years_above_max(self) -> None:
        url = reverse("universities:course_list", kwargs={"university_id": self.university.id})
        response = self.client.post(url, self._course(durationYears=99), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(CollegeCourse.objects.filter(university=self.university).count(), 0)


class MaintenanceWriteThrottleTests(APITestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin", email="system.admin@example.test", password="Password1!"
        )
        self.client.force_authenticate(self.user)

    def tearDown(self) -> None:
        cache.clear()

    def test_write_requests_are_throttled_after_the_limit(self) -> None:
        url = reverse("universities:university_list")
        # DRF captures THROTTLE_RATES as a class attribute at import, so patch the
        # shared rate dict rather than relying on override_settings.
        with patch.dict(SimpleRateThrottle.THROTTLE_RATES, {"maintenance_write": "1/min"}):
            first = self.client.post(
                url, {"classification": "Public", "name": "Uni A", "region": "NCR", "city": "QC"}, format="json"
            )
            second = self.client.post(
                url, {"classification": "Public", "name": "Uni B", "region": "NCR", "city": "QC"}, format="json"
            )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 429)

    def test_read_requests_are_never_throttled(self) -> None:
        url = reverse("universities:university_list")
        with patch.dict(SimpleRateThrottle.THROTTLE_RATES, {"maintenance_write": "1/min"}):
            self.assertEqual(self.client.get(url).status_code, 200)
            self.assertEqual(self.client.get(url).status_code, 200)
            self.assertEqual(self.client.get(url).status_code, 200)


class UniversityListQueryTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_superuser(
            username="system_admin", email="system.admin@example.test", password="Password1!"
        )
        self.client.force_authenticate(self.user)
        for index in range(25):
            University.objects.create(
                classification="Public" if index % 2 == 0 else "Private",
                name=f"University {index:02d}",
                region="NCR" if index < 20 else "Region VII",
                city="Quezon City",
                status="Active" if index % 3 else "Inactive",
            )
        self.url = reverse("universities:university_list")

    def test_paginates_with_default_page_size_20(self) -> None:
        first = self.client.get(self.url, {"page": 1})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["count"], 25)
        self.assertEqual(len(first.data["results"]), 20)
        self.assertIsNotNone(first.data["next"])
        second = self.client.get(self.url, {"page": 2})
        self.assertEqual(len(second.data["results"]), 5)

    def test_returns_plain_array_without_pagination_params(self) -> None:
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 25)

    def test_search_matches_name_code_city(self) -> None:
        response = self.client.get(self.url, {"page": 1, "search": "University 01"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "University 01")

    def test_classification_region_status_filters(self) -> None:
        public = self.client.get(self.url, {"page": 1, "pageSize": 100, "classification": "Public"})
        self.assertTrue(all(item["classification"] == "Public" for item in public.data["results"]))
        region = self.client.get(self.url, {"page": 1, "pageSize": 100, "region": "Region VII"})
        self.assertEqual(region.data["count"], 5)
        inactive = self.client.get(self.url, {"page": 1, "pageSize": 100, "status": "Inactive"})
        self.assertTrue(all(item["status"] == "Inactive" for item in inactive.data["results"]))

    def test_ordering_descending_by_name(self) -> None:
        response = self.client.get(self.url, {"page": 1, "pageSize": 100, "ordering": "-name"})
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names, sorted(names, reverse=True))
