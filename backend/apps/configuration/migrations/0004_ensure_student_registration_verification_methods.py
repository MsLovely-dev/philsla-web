from django.db import migrations


STUDENT_REGISTRATION_MODULE = "student_registration"
STEP_1_REGISTRATION_SECTION = "Step 1 Registration"
VERIFICATION_METHOD_TYPE = "Verification Method"

VERIFICATION_METHODS = [
    ("Learner Reference Number (LRN)", "Primary DepEd identifier", 1, True),
    ("PhilSys National ID", "National identity verification", 2, False),
    ("Manual Entry", "Manual high-priority information entry", 3, False),
]


def ensure_methods(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    for field_name, remarks, display_order, is_enabled in VERIFICATION_METHODS:
        ConfigurableField.objects.update_or_create(
            module=STUDENT_REGISTRATION_MODULE,
            section=STEP_1_REGISTRATION_SECTION,
            field_type=VERIFICATION_METHOD_TYPE,
            field_name=field_name,
            defaults={
                "input_type": "text",
                "option_values": [],
                "priority": "High Priority",
                "remarks": remarks,
                "is_enabled": is_enabled,
                "display_order": display_order,
            },
        )
    enabled_methods = ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=VERIFICATION_METHOD_TYPE,
        is_enabled=True,
    ).order_by("display_order", "id")
    keep_enabled = enabled_methods.first()
    if keep_enabled:
        enabled_methods.exclude(id=keep_enabled.id).update(is_enabled=False)


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("configuration", "0003_enforce_single_student_registration_verification_method"),
    ]

    operations = [
        migrations.RunPython(ensure_methods, reverse_noop),
    ]
