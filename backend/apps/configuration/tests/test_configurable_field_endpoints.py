from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.configuration.models import ConfigurableField


def principal(user, role):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


class ConfigurableFieldEndpointTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="configurable-field-admin")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))

    def test_public_registration_reads_enabled_seeded_fields(self):
        response = APIClient().get(reverse("configuration:fields-public"), {"module": "student_registration"})

        self.assertEqual(response.status_code, 200)
        field_names = {item["value"] for item in response.data}
        self.assertIn("LRN", field_names)
        self.assertIn("Birth Date", field_names)
        self.assertIn("Learner Reference Number (LRN)", field_names)
        self.assertNotIn("PhilSys National ID", field_names)
        self.assertNotIn("Manual Entry", field_names)
        self.assertTrue(all(item["module"] == "student_registration" for item in response.data))
        self.assertTrue(all(item["section"] == "Step 1 Registration" for item in response.data))
        grade_level = next(item for item in response.data if item["value"] == "Grade Level")
        self.assertEqual(grade_level["fieldSection"], "School Information")
        self.assertEqual(grade_level["inputType"], "dropdown")
        self.assertEqual(grade_level["optionValues"], ["Grade 11", "Grade 12"])

    def test_admin_registration_reads_all_predefined_verification_methods(self):
        response = self.client.get(reverse("configuration:fields-admin"), {"module": "student_registration"})

        self.assertEqual(response.status_code, 200)
        methods = {item["value"]: item for item in response.data if item["type"] == "Verification Method"}
        self.assertEqual(
            set(methods),
            {"Learner Reference Number (LRN)", "PhilSys National ID", "Manual Entry"},
        )
        self.assertTrue(methods["Learner Reference Number (LRN)"]["status"])
        self.assertFalse(methods["PhilSys National ID"]["status"])
        self.assertFalse(methods["Manual Entry"]["status"])

    def test_admin_registration_fields_support_opt_in_pagination_and_type_filter(self):
        response = self.client.get(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "type": "Student Registration Field",
                "page": 1,
                "pageSize": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 18)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertTrue(all(item["type"] == "Student Registration Field" for item in response.data["results"]))

    def test_admin_registration_fields_support_search_and_filters(self):
        response = self.client.get(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "type": "Student Registration Field",
                "search": "school",
                "status": "true",
                "priority": "High Priority",
                "inputType": "text",
                "page": 1,
                "pageSize": 10,
            },
        )

        self.assertEqual(response.status_code, 200)
        values = {item["value"] for item in response.data["results"]}
        self.assertEqual(values, {"School ID", "School Name", "School Year"})
        self.assertTrue(all(item["status"] for item in response.data["results"]))
        self.assertTrue(all(item["priority"] == "High Priority" for item in response.data["results"]))
        self.assertTrue(all(item["inputType"] == "text" for item in response.data["results"]))

    def test_admin_can_create_registration_field_and_public_reads_it(self):
        response = self.client.post(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "section": "Step 1 Registration",
                "type": "Student Registration Field",
                "value": "Guardian Contact Number",
                "fieldSection": "Personal Information",
                "inputType": "text",
                "optionValues": [],
                "priority": "High Priority",
                "remarks": "Required when not returned by LRN details.",
                "status": True,
                "display_order": 130,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["fieldSection"], "Personal Information")
        public = APIClient().get(reverse("configuration:fields-public"), {"module": "student_registration"})
        self.assertIn("Guardian Contact Number", {item["value"] for item in public.data})

    def test_admin_can_create_dropdown_field_options(self):
        response = self.client.post(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "section": "Step 1 Registration",
                "type": "Student Registration Field",
                "value": "Applicant Grade Level",
                "fieldSection": "School Information",
                "inputType": "dropdown",
                "optionValues": ["Grade 11", "Grade 12"],
                "priority": "High Priority",
                "remarks": "",
                "status": True,
                "display_order": 131,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["fieldSection"], "School Information")
        self.assertEqual(response.data["inputType"], "dropdown")
        self.assertEqual(response.data["optionValues"], ["Grade 11", "Grade 12"])

    def test_admin_can_create_file_registration_field(self):
        response = self.client.post(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "section": "Step 1 Registration",
                "type": "Student Registration Field",
                "value": "Guardian Consent Attachment",
                "fieldSection": "Additional Information",
                "inputType": "file",
                "optionValues": [],
                "priority": "High Priority",
                "remarks": "",
                "status": True,
                "display_order": 132,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["inputType"], "file")

    def test_admin_cannot_create_custom_verification_method(self):
        response = self.client.post(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "section": "Step 1 Registration",
                "type": "Verification Method",
                "value": "Other ID",
                "inputType": "text",
                "optionValues": [],
                "priority": "High Priority",
                "remarks": "",
                "status": True,
                "display_order": 4,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_admin_cannot_create_duplicate_verification_method(self):
        response = self.client.post(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "section": "Step 1 Registration",
                "type": "Verification Method",
                "value": "Manual Entry",
                "inputType": "text",
                "optionValues": [],
                "priority": "High Priority",
                "remarks": "",
                "status": False,
                "display_order": 4,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["fields"]["value"][0], "This registration method already exists.")

    def test_admin_cannot_rename_verification_method_to_duplicate(self):
        lrn = ConfigurableField.objects.get(module="student_registration", field_name="Learner Reference Number (LRN)")

        response = self.client.patch(
            reverse("configuration:fields-admin-detail", args=[lrn.id]),
            {"value": "Manual Entry"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["fields"]["value"][0], "This registration method already exists.")
        lrn.refresh_from_db()
        self.assertEqual(lrn.field_name, "Learner Reference Number (LRN)")

    def test_admin_can_disable_field_and_public_hides_it(self):
        field = ConfigurableField.objects.get(module="student_registration", field_name="School Year")

        response = self.client.patch(
            reverse("configuration:fields-admin-detail", args=[field.id]),
            {"status": False},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        public = APIClient().get(reverse("configuration:fields-public"), {"module": "student_registration"})
        self.assertNotIn("School Year", {item["value"] for item in public.data})

    def test_enabling_one_verification_method_disables_other_methods(self):
        manual = ConfigurableField.objects.get(module="student_registration", field_name="Manual Entry")

        response = self.client.patch(
            reverse("configuration:fields-admin-detail", args=[manual.id]),
            {"status": True},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        lrn = ConfigurableField.objects.get(module="student_registration", field_name="Learner Reference Number (LRN)")
        philsys = ConfigurableField.objects.get(module="student_registration", field_name="PhilSys National ID")
        manual.refresh_from_db()
        self.assertFalse(lrn.is_enabled)
        self.assertFalse(philsys.is_enabled)
        self.assertTrue(manual.is_enabled)

    def test_philsys_verification_method_is_locked(self):
        philsys = ConfigurableField.objects.get(module="student_registration", field_name="PhilSys National ID")

        response = self.client.patch(
            reverse("configuration:fields-admin-detail", args=[philsys.id]),
            {"status": True},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        philsys.refresh_from_db()
        self.assertFalse(philsys.is_enabled)

    def test_last_enabled_verification_method_cannot_be_disabled(self):
        lrn = ConfigurableField.objects.get(module="student_registration", field_name="Learner Reference Number (LRN)")

        response = self.client.patch(
            reverse("configuration:fields-admin-detail", args=[lrn.id]),
            {"status": False},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        lrn.refresh_from_db()
        self.assertTrue(lrn.is_enabled)

    def test_predefined_verification_method_cannot_be_deleted(self):
        lrn = ConfigurableField.objects.get(module="student_registration", field_name="Learner Reference Number (LRN)")

        response = self.client.delete(reverse("configuration:fields-admin-detail", args=[lrn.id]))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["fields"]["type"][0], "Predefined registration methods cannot be deleted.")
        self.assertTrue(ConfigurableField.objects.filter(id=lrn.id).exists())

    def test_inactive_predefined_verification_method_cannot_be_deleted(self):
        manual = ConfigurableField.objects.get(module="student_registration", field_name="Manual Entry")

        response = self.client.delete(reverse("configuration:fields-admin-detail", args=[manual.id]))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["fields"]["type"][0], "Predefined registration methods cannot be deleted.")
        self.assertTrue(ConfigurableField.objects.filter(id=manual.id).exists())

    def test_active_predefined_verification_method_cannot_be_deleted_when_another_method_is_active(self):
        lrn = ConfigurableField.objects.get(module="student_registration", field_name="Learner Reference Number (LRN)")
        ConfigurableField.objects.filter(module="student_registration", field_name="Manual Entry").update(is_enabled=True)

        response = self.client.delete(reverse("configuration:fields-admin-detail", args=[lrn.id]))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["fields"]["type"][0], "Predefined registration methods cannot be deleted.")
        self.assertTrue(ConfigurableField.objects.filter(id=lrn.id).exists())

    def test_student_cannot_manage_configurable_fields(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.STUDENT.value))

        response = self.client.get(reverse("configuration:fields-admin"))

        self.assertEqual(response.status_code, 403)
