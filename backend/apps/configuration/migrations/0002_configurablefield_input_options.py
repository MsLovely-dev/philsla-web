from django.db import migrations, models


STUDENT_REGISTRATION_MODULE = "student_registration"

FIELD_INPUT_DEFAULTS = {
    "Birth Date": ("date", []),
    "Sex": ("dropdown", ["Male", "Female"]),
    "Grade Level": ("dropdown", ["Grade 11", "Grade 12"]),
    "Enrollment Status": ("dropdown", ["Enrolled", "Graduated", "Pending"]),
}


def seed_input_options(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    ConfigurableField.objects.filter(module=STUDENT_REGISTRATION_MODULE).update(input_type="text", option_values=[])
    for field_name, (input_type, option_values) in FIELD_INPUT_DEFAULTS.items():
        ConfigurableField.objects.filter(
            module=STUDENT_REGISTRATION_MODULE,
            section="Step 1 Registration",
            field_name=field_name,
        ).update(input_type=input_type, option_values=option_values)


def clear_input_options(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    ConfigurableField.objects.filter(module=STUDENT_REGISTRATION_MODULE).update(input_type="text", option_values=[])


class Migration(migrations.Migration):
    dependencies = [
        ("configuration", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="configurablefield",
            name="input_type",
            field=models.CharField(default="text", max_length=40),
        ),
        migrations.AddField(
            model_name="configurablefield",
            name="option_values",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(seed_input_options, clear_input_options),
    ]
