from django.db import migrations, models


STUDENT_REGISTRATION_MODULE = "student_registration"
STEP_1_REGISTRATION_SECTION = "Step 1 Registration"
VERIFICATION_METHOD_TYPE = "Verification Method"

PERSONAL_FIELDS = {
    "Birth Date",
    "First Name",
    "Middle Name",
    "Last Name",
    "Extension Name",
    "Sex",
}
SCHOOL_FIELDS = {
    "School ID",
    "School Name",
    "Grade Level",
    "Enrollment Status",
    "School Year",
}


def populate_field_sections(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=VERIFICATION_METHOD_TYPE,
    ).update(field_section="Learner Archive Registry Verification")
    ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_name__in=PERSONAL_FIELDS,
    ).update(field_section="Personal Information")
    ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_name__in=SCHOOL_FIELDS,
    ).update(field_section="School Information")


def reset_field_sections(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    ConfigurableField.objects.filter(module=STUDENT_REGISTRATION_MODULE).update(field_section="Personal Information")


class Migration(migrations.Migration):

    dependencies = [
        ("configuration", "0004_ensure_student_registration_verification_methods"),
    ]

    operations = [
        migrations.AddField(
            model_name="configurablefield",
            name="field_section",
            field=models.CharField(default="Personal Information", max_length=80),
        ),
        migrations.RunPython(populate_field_sections, reset_field_sections),
    ]
