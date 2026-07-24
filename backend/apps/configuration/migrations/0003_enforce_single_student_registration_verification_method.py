from django.db import migrations


STUDENT_REGISTRATION_MODULE = "student_registration"
STEP_1_REGISTRATION_SECTION = "Step 1 Registration"
VERIFICATION_METHOD_TYPE = "Verification Method"
LRN_METHOD = "Learner Reference Number (LRN)"


def enable_lrn_only(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    methods = ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=VERIFICATION_METHOD_TYPE,
    )
    methods.update(is_enabled=False)
    methods.filter(field_name=LRN_METHOD).update(is_enabled=True)


def enable_all_methods(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=VERIFICATION_METHOD_TYPE,
    ).update(is_enabled=True)


class Migration(migrations.Migration):
    dependencies = [
        ("configuration", "0002_configurablefield_input_options"),
    ]

    operations = [
        migrations.RunPython(enable_lrn_only, enable_all_methods),
    ]
