from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


STUDENT_REGISTRATION_MODULE = "student_registration"

DEFAULT_FIELDS = [
    ("Step 1 Registration", "Verification Method", "Learner Reference Number (LRN)", "High Priority", "Primary DepEd identifier", 1),
    ("Step 1 Registration", "Verification Method", "PhilSys National ID", "High Priority", "National identity verification", 2),
    ("Step 1 Registration", "Verification Method", "Manual Entry", "High Priority", "Manual high-priority information entry", 3),
    ("Step 1 Registration", "Student Registration Field", "LRN", "High Priority", "Primary identifier", 10),
    ("Step 1 Registration", "Student Registration Field", "Birth Date", "High Priority", "Autopopulated when LRN is verified", 20),
    ("Step 1 Registration", "Student Registration Field", "First Name", "High Priority", "Read-only when supplied by DepEd", 30),
    ("Step 1 Registration", "Student Registration Field", "Middle Name", "High Priority", "Read-only when supplied by DepEd", 40),
    ("Step 1 Registration", "Student Registration Field", "Last Name", "High Priority", "Read-only when supplied by DepEd", 50),
    ("Step 1 Registration", "Student Registration Field", "Extension Name", "Medium Priority", "Only if applicable", 60),
    ("Step 1 Registration", "Student Registration Field", "Sex", "High Priority", "Read-only when supplied by DepEd", 70),
    ("Step 1 Registration", "Student Registration Field", "School ID", "High Priority", "", 80),
    ("Step 1 Registration", "Student Registration Field", "School Name", "High Priority", "", 90),
    ("Step 1 Registration", "Student Registration Field", "Grade Level", "High Priority", "", 100),
    ("Step 1 Registration", "Student Registration Field", "Enrollment Status", "High Priority", "", 110),
    ("Step 1 Registration", "Student Registration Field", "School Year", "High Priority", "", 120),
]


def seed_default_configurable_fields(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    for section, field_type, field_name, priority, remarks, display_order in DEFAULT_FIELDS:
        ConfigurableField.objects.update_or_create(
            module=STUDENT_REGISTRATION_MODULE,
            section=section,
            field_type=field_type,
            field_name=field_name,
            defaults={
                "priority": priority,
                "remarks": remarks,
                "is_enabled": True,
                "display_order": display_order,
            },
        )


def remove_default_configurable_fields(apps, schema_editor):
    ConfigurableField = apps.get_model("configuration", "ConfigurableField")
    ConfigurableField.objects.filter(module=STUDENT_REGISTRATION_MODULE).delete()


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ConfigurableField",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("module", models.CharField(max_length=80)),
                ("section", models.CharField(max_length=80)),
                ("field_type", models.CharField(max_length=80)),
                ("field_name", models.CharField(max_length=120)),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("High Priority", "High Priority"),
                            ("Medium Priority", "Medium Priority"),
                            ("Low Priority", "Low Priority"),
                        ],
                        default="High Priority",
                        max_length=20,
                    ),
                ),
                ("remarks", models.TextField(blank=True, default="")),
                ("is_enabled", models.BooleanField(default=True)),
                ("display_order", models.PositiveSmallIntegerField(default=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="configurable_fields",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["module", "display_order", "field_name"],
            },
        ),
        migrations.AddConstraint(
            model_name="configurablefield",
            constraint=models.UniqueConstraint(
                fields=("module", "section", "field_type", "field_name"),
                name="unique_configurable_field",
            ),
        ),
        migrations.RunPython(seed_default_configurable_fields, remove_default_configurable_fields),
    ]
