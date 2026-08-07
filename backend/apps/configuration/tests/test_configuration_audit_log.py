from django.test import TestCase

from apps.configuration.models import ConfigurableField, ConfigurationAuditLog


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
