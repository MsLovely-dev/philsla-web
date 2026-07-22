from django.db import migrations


STUDENT_REGISTRATION_MODULE = "student_registration"
STEP_1_REGISTRATION_SECTION = "Step 1 Registration"
STUDENT_REGISTRATION_FIELD_TYPE = "Student Registration Field"

PWD_TYPES = [
    "Psychosocial disability",
    "Disability due to chronic illness",
    "Learning disability",
    "Intellectual disability",
    "Mental disability",
    "Visual disability",
    "Physical/orthopedic disability",
    "Speech impairment",
    "Deaf / hard-of-hearing",
    "Cancer and rare diseases",
]

PWD_CONDITIONS = [
    "Bipolar disorder",
    "Depression",
    "Schizophrenia",
    "ADHD",
    "Epilepsy",
    "Other long-term mental/behavioral condition",
    "Orthopedic disability from cancer",
    "Blindness from diabetes",
    "Dialysis",
    "Heart disorder",
    "Severe cancer",
    "Other disability arising from a chronic disease",
    "Dyslexia",
    "Dysgraphia",
    "Similar learning disability",
    "Cognitive impairment affecting adaptive functioning",
    "Broader mental impairment classification used in the NCDA list",
    "Blindness",
    "Low vision",
    "Functional visual limitation certified by an ophthalmologist",
    "Mobility impairment",
    "Missing limb",
    "Other physical/orthopedic disability",
    "Communication disorder",
    "Deaf",
    "Hard-of-hearing",
    "Other hearing impairment",
    "Cancer",
    "Rare disease",
]

PWD_FIELDS = [
    ("PWD", "checkbox", [], "Low Priority", "Shows the PWD declaration section before selfie capture", 130),
    ("PWD Type", "dropdown", PWD_TYPES, "High Priority", "Required when PWD is checked", 131),
    ("Condition", "dropdown", PWD_CONDITIONS, "High Priority", "Required when PWD is checked", 132),
    ("PWD ID Number", "text", [], "High Priority", "Required when PWD is checked", 133),
    ("PWD ID Attachment", "file", [], "High Priority", "Required when PWD is checked", 134),
    ("Accommodation Needed", "textarea", [], "High Priority", "Required when PWD is checked", 135),
]


def seed_pwd_registration_fields(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    for field_name, input_type, option_values, priority, remarks, display_order in PWD_FIELDS:
        ConfigurableField.objects.update_or_create(
            module=STUDENT_REGISTRATION_MODULE,
            section=STEP_1_REGISTRATION_SECTION,
            field_type=STUDENT_REGISTRATION_FIELD_TYPE,
            field_name=field_name,
            defaults={
                "field_section": "PWD Information",
                "input_type": input_type,
                "option_values": option_values,
                "priority": priority,
                "remarks": remarks,
                "is_enabled": True,
                "display_order": display_order,
            },
        )


def remove_pwd_registration_fields(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=STUDENT_REGISTRATION_FIELD_TYPE,
        field_name__in=[field_name for field_name, *_ in PWD_FIELDS],
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("configuration", "0005_configurablefield_field_section"),
    ]

    operations = [
        migrations.RunPython(seed_pwd_registration_fields, remove_pwd_registration_fields),
    ]
