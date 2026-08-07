from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.configuration.models import ConfigurableField, ConfigurationAuditLog


def principal(user, role):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


class ConfigurationAuditLogModelTests(TestCase):
    def test_records_before_and_after_json_for_a_field(self):
        field = ConfigurableField.objects.create(
            module="student_registration",
            section="Step 1 Registration",
            field_type="Student Registration Field",
            field_name="Emergency Contact Number",
            input_type="text",
            is_enabled=True,
        )

        log = ConfigurationAuditLog.objects.create(
            field=field,
            field_id_snapshot=field.id,
            action="created",
            actor_user_id="42",
            before_json={},
            after_json={"value": "Emergency Contact Number", "status": True},
        )

        self.assertEqual(ConfigurationAuditLog.objects.get(id=log.id).after_json["value"], "Emergency Contact Number")
        self.assertEqual(list(ConfigurationAuditLog.objects.filter(field_id_snapshot=field.id)), [log])

    def test_survives_deletion_of_the_underlying_field(self):
        field = ConfigurableField.objects.create(
            module="student_registration",
            section="Step 1 Registration",
            field_type="Student Registration Field",
            field_name="Temporary Field",
            input_type="text",
        )
        field_id = field.id
        log = ConfigurationAuditLog.objects.create(
            field=field,
            field_id_snapshot=field_id,
            action="created",
            actor_user_id="42",
            before_json={},
            after_json={"value": "Temporary Field"},
        )

        field.delete()

        refreshed = ConfigurationAuditLog.objects.get(id=log.id)
        self.assertIsNone(refreshed.field_id)
        self.assertEqual(refreshed.field_id_snapshot, field_id)


class ConfigurationAuditLogEndpointBehaviorTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="audit-admin")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))

    def test_create_writes_an_audit_log_row_with_empty_before_and_populated_after(self):
        response = self.client.post(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "section": "Step 1 Registration",
                "type": "Student Registration Field",
                "value": "Emergency Contact Number",
                "fieldSection": "Personal Information",
                "inputType": "text",
                "priority": "High Priority",
                "status": True,
            },
            format="json",
        )

        field_id = response.data["id"]
        log = ConfigurationAuditLog.objects.get(field_id_snapshot=field_id, action="created")
        self.assertEqual(log.before_json, {})
        self.assertEqual(log.after_json["value"], "Emergency Contact Number")
        self.assertEqual(log.actor_user_id, str(self.user.id))

    def test_update_writes_an_audit_log_row_with_populated_before_and_after(self):
        create_response = self.client.post(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "section": "Step 1 Registration",
                "type": "Student Registration Field",
                "value": "Emergency Contact Number",
                "fieldSection": "Personal Information",
                "inputType": "text",
                "priority": "High Priority",
                "status": True,
            },
            format="json",
        )
        field_id = create_response.data["id"]

        self.client.patch(
            reverse("configuration:fields-admin-detail", args=[field_id]),
            {"priority": "Low Priority"},
            format="json",
        )

        log = ConfigurationAuditLog.objects.get(field_id_snapshot=field_id, action="updated")
        self.assertEqual(log.before_json["priority"], "High Priority")
        self.assertEqual(log.after_json["priority"], "Low Priority")

    def test_delete_writes_an_audit_log_row_with_populated_before_and_empty_after(self):
        create_response = self.client.post(
            reverse("configuration:fields-admin"),
            {
                "module": "student_registration",
                "section": "Step 1 Registration",
                "type": "Student Registration Field",
                "value": "Temporary Field",
                "fieldSection": "Personal Information",
                "inputType": "text",
                "priority": "Low Priority",
                "status": True,
            },
            format="json",
        )
        field_id = create_response.data["id"]

        self.client.delete(reverse("configuration:fields-admin-detail", args=[field_id]))

        log = ConfigurationAuditLog.objects.get(field_id_snapshot=field_id, action="deleted")
        self.assertEqual(log.before_json["value"], "Temporary Field")
        self.assertEqual(log.after_json, {})
