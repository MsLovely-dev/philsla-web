from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.configuration.models import CollegeCourse, University


MODULE_38_PERMISSIONS = [
    "MOD_38_READ",
    "MOD_38_WRITE",
    "MOD_38_EDIT",
    "MOD_38_DELETE",
]


def principal(user, role, *, permissions=None, scopes=None):
    return SimpleNamespace(
        id=user.id,
        user_id=user.id,
        role=role,
        permissions=MODULE_38_PERMISSIONS if permissions is None else permissions,
        scopes={} if scopes is None else scopes,
        is_authenticated=True,
        is_active=True,
    )


def university_payload(**overrides):
    payload = {
        "code": "UP-DIL",
        "name": "University of the Philippines Diliman",
        "classification": "Public",
        "region": "NCR - National Capital Region",
        "city": "Quezon City",
        "presidentRector": "University President",
        "email": "info@example.test",
        "phone": "(02) 0000-0000",
        "establishedYear": 1908,
        "status": "Active",
    }
    payload.update(overrides)
    return payload


def course_payload(**overrides):
    payload = {
        "collegeName": "College of Engineering",
        "programCode": "BSCS",
        "programName": "Bachelor of Science in Computer Science",
        "degreeType": "Bachelor of Science",
        "majorSpecialization": "General",
        "durationYears": 4,
        "totalUnits": 150,
        "cutoffPercentile": 85,
        "status": "Active",
    }
    payload.update(overrides)
    return payload


class UniversityRegistryEndpointTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="university-registry-admin")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))
        self.list_url = reverse("configuration:universities-admin")

    def create_university(self, **overrides) -> dict:
        response = self.client.post(self.list_url, university_payload(**overrides), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_system_admin_can_create_and_read_paginated_universities(self):
        created = self.create_university()
        self.create_university(code="ADMU", name="Ateneo de Manila University", classification="Private", city="Manila")

        response = self.client.get(self.list_url, {"pageSize": 1, "search": "Quezon"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], created["id"])
        self.assertEqual(response.data["results"][0]["presidentRector"], "University President")
        self.assertEqual(response.data["results"][0]["establishedYear"], 1908)
        self.assertEqual(response.data["results"][0]["courseCount"], 0)
        self.assertEqual(response.data["results"][0]["version"], 1)
        self.assertEqual(response.data["summary"], {
            "totalUniversities": 2,
            "publicUniversities": 1,
            "privateUniversities": 1,
            "totalDegreeCourses": 0,
        })

    def test_backend_validates_university_fields_and_unique_code(self):
        self.create_university()

        duplicate = self.client.post(self.list_url, university_payload(name="Another Campus"), format="json")
        future_year = self.client.post(
            self.list_url,
            university_payload(code="FUTURE", establishedYear=date.today().year + 1),
            format="json",
        )

        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("code", duplicate.data["error"]["fields"])
        self.assertEqual(future_year.status_code, 400)
        self.assertIn("establishedYear", future_year.data["error"]["fields"])

    def test_update_requires_current_version_and_rejects_stale_changes(self):
        created = self.create_university()
        detail_url = reverse("configuration:universities-admin-detail", args=[created["id"]])

        updated = self.client.patch(detail_url, {"city": "Manila", "expectedVersion": 1}, format="json")
        stale = self.client.patch(detail_url, {"city": "Pasay", "expectedVersion": 1}, format="json")
        missing = self.client.patch(detail_url, {"city": "Makati"}, format="json")

        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["city"], "Manila")
        self.assertEqual(updated.data["version"], 2)
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.data["error"]["code"], "CONFLICT")
        self.assertEqual(missing.status_code, 400)
        self.assertIn("expectedVersion", missing.data["error"]["fields"])

    def test_course_crud_uses_the_parent_university_and_updates_course_count(self):
        university = self.create_university()
        course_list_url = reverse("configuration:university-courses-admin", args=[university["id"]])

        created = self.client.post(course_list_url, course_payload(), format="json")
        duplicate = self.client.post(course_list_url, course_payload(programName="Duplicate"), format="json")

        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["universityId"], university["id"])
        self.assertEqual(created.data["universityCode"], university["code"])
        self.assertEqual(created.data["cutoffPercentile"], 85.0)
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("programCode", duplicate.data["error"]["fields"])

        detail_url = reverse(
            "configuration:university-courses-admin-detail",
            args=[university["id"], created.data["id"]],
        )
        updated = self.client.patch(
            detail_url,
            {"totalUnits": 160, "expectedVersion": created.data["version"]},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["totalUnits"], 160)

        listed = self.client.get(course_list_url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data["count"], 1)

        university_detail = self.client.get(
            reverse("configuration:universities-admin-detail", args=[university["id"]]),
        )
        self.assertEqual(university_detail.data["courseCount"], 1)

        deleted = self.client.delete(f"{detail_url}?version={updated.data['version']}")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(CollegeCourse.objects.filter(id=created.data["id"]).exists())

    def test_deleting_a_university_cascades_to_its_courses(self):
        university = self.create_university()
        course_response = self.client.post(
            reverse("configuration:university-courses-admin", args=[university["id"]]),
            course_payload(),
            format="json",
        )

        detail_url = reverse("configuration:universities-admin-detail", args=[university["id"]])
        response = self.client.delete(f"{detail_url}?version={university['version']}")

        self.assertEqual(course_response.status_code, 201)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(University.objects.filter(id=university["id"]).exists())
        self.assertFalse(CollegeCourse.objects.filter(id=course_response.data["id"]).exists())

    def test_authentication_role_permission_and_university_scope_are_enforced(self):
        university = self.create_university()
        other = self.create_university(code="ADMU", name="Ateneo de Manila University", classification="Private")

        unauthenticated = APIClient().get(self.list_url)
        self.client.force_authenticate(user=principal(self.user, PortalRole.STUDENT.value))
        wrong_role = self.client.get(self.list_url)
        self.client.force_authenticate(
            user=principal(
                self.user,
                PortalRole.ADMISSIONS_REVIEWER.value,
                permissions=[],
            ),
        )
        denied_permission = self.client.get(self.list_url)

        university_admin = principal(
            self.user,
            PortalRole.UNIVERSITY_ADMIN.value,
            permissions=["MOD_38_READ", "MOD_38_WRITE", "MOD_38_EDIT"],
            scopes={"universityIds": [university["id"]]},
        )
        self.client.force_authenticate(user=university_admin)
        create_university_response = self.client.post(
            self.list_url,
            university_payload(code="NEW", name="New University"),
            format="json",
        )
        assigned_course = self.client.post(
            reverse("configuration:university-courses-admin", args=[university["id"]]),
            course_payload(),
            format="json",
        )
        unassigned_course = self.client.post(
            reverse("configuration:university-courses-admin", args=[other["id"]]),
            course_payload(),
            format="json",
        )

        self.assertEqual(unauthenticated.status_code, 401)
        self.assertEqual(wrong_role.status_code, 403)
        self.assertEqual(wrong_role.data["error"]["code"], "PERMISSION_DENIED")
        self.assertEqual(denied_permission.status_code, 403)
        self.assertEqual(create_university_response.status_code, 403)
        self.assertEqual(assigned_course.status_code, 201)
        self.assertEqual(unassigned_course.status_code, 403)

    def test_university_admin_reads_only_assigned_university_records(self):
        assigned = self.create_university()
        unassigned = self.create_university(code="ADMU", name="Ateneo de Manila University", classification="Private")
        assigned_course = self.client.post(
            reverse("configuration:university-courses-admin", args=[assigned["id"]]),
            course_payload(),
            format="json",
        ).data
        unassigned_course = self.client.post(
            reverse("configuration:university-courses-admin", args=[unassigned["id"]]),
            course_payload(programCode="BSIT", programName="Bachelor of Science in Information Technology"),
            format="json",
        ).data

        self.client.force_authenticate(
            user=principal(
                self.user,
                PortalRole.UNIVERSITY_ADMIN.value,
                permissions=["MOD_38_READ"],
                scopes={"universityIds": [assigned["id"]]},
            ),
        )

        listed = self.client.get(self.list_url)
        assigned_detail = self.client.get(reverse("configuration:universities-admin-detail", args=[assigned["id"]]))
        unassigned_detail = self.client.get(reverse("configuration:universities-admin-detail", args=[unassigned["id"]]))
        assigned_courses = self.client.get(reverse("configuration:university-courses-admin", args=[assigned["id"]]))
        unassigned_courses = self.client.get(reverse("configuration:university-courses-admin", args=[unassigned["id"]]))
        assigned_course_detail = self.client.get(
            reverse("configuration:university-courses-admin-detail", args=[assigned["id"], assigned_course["id"]]),
        )
        unassigned_course_detail = self.client.get(
            reverse("configuration:university-courses-admin-detail", args=[unassigned["id"], unassigned_course["id"]]),
        )

        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data["count"], 1)
        self.assertEqual([item["id"] for item in listed.data["results"]], [assigned["id"]])
        self.assertEqual(assigned_detail.status_code, 200)
        self.assertEqual(unassigned_detail.status_code, 403)
        self.assertEqual(assigned_courses.status_code, 200)
        self.assertEqual(unassigned_courses.status_code, 403)
        self.assertEqual(assigned_course_detail.status_code, 200)
        self.assertEqual(unassigned_course_detail.status_code, 403)

    def test_update_integrity_errors_return_conflict_responses(self):
        university = self.create_university()
        university_detail_url = reverse("configuration:universities-admin-detail", args=[university["id"]])
        course_list_url = reverse("configuration:university-courses-admin", args=[university["id"]])
        course = self.client.post(course_list_url, course_payload(), format="json").data
        course_detail_url = reverse(
            "configuration:university-courses-admin-detail",
            args=[university["id"], course["id"]],
        )

        with patch.object(University, "save", side_effect=IntegrityError):
            university_response = self.client.patch(
                university_detail_url,
                {"code": "RACE", "expectedVersion": university["version"]},
                format="json",
            )
        with patch.object(CollegeCourse, "save", side_effect=IntegrityError):
            course_response = self.client.patch(
                course_detail_url,
                {"programCode": "RACE", "expectedVersion": course["version"]},
                format="json",
            )

        self.assertEqual(university_response.status_code, 409)
        self.assertEqual(university_response.data["error"]["code"], "CONFLICT")
        self.assertEqual(course_response.status_code, 409)
        self.assertEqual(course_response.data["error"]["code"], "CONFLICT")
