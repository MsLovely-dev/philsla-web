from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AccountProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[
                    ("STUDENT", "STUDENT"),
                    ("ADMISSIONS_REVIEWER", "ADMISSIONS_REVIEWER"),
                    ("PROCTOR", "PROCTOR"),
                    ("PROCTOR_ADMIN", "PROCTOR_ADMIN"),
                    ("UNIVERSITY_ADMIN", "UNIVERSITY_ADMIN"),
                    ("TESTING_CENTER_ADMIN", "TESTING_CENTER_ADMIN"),
                    ("EXAM_ADMINISTRATOR", "EXAM_ADMINISTRATOR"),
                    ("SYSTEM_ADMIN", "SYSTEM_ADMIN"),
                    ("CHED_ADMIN", "CHED_ADMIN"),
                    ("DEPED_ADMIN", "DEPED_ADMIN"),
                    ("TESDA_ADMIN", "TESDA_ADMIN"),
                    ("EXECUTIVE", "EXECUTIVE"),
                ], max_length=32)),
                ("lrn", models.CharField(blank=True, max_length=12, null=True, unique=True, verbose_name="LRN")),
                ("api_permissions", models.JSONField(blank=True, default=list)),
                ("scopes", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="account_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["user__email", "user__username"],
            },
        ),
    ]
