from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import apps.accounts.models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_authrefreshsession"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LoginSelfieLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file", models.FileField(upload_to=apps.accounts.models.login_selfie_upload_to)),
                ("content_type", models.CharField(max_length=32)),
                ("size", models.PositiveIntegerField()),
                ("sha256", models.CharField(max_length=64)),
                ("ip_address", models.CharField(blank=True, default="", max_length=45)),
                ("user_agent", models.CharField(blank=True, default="", max_length=512)),
                ("correlation_id", models.CharField(blank=True, default="", max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="login_selfie_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="loginselfielog",
            index=models.Index(fields=["user", "-created_at"], name="accounts_lo_user_id_636e30_idx"),
        ),
        migrations.AddIndex(
            model_name="loginselfielog",
            index=models.Index(fields=["sha256"], name="accounts_lo_sha256_cbe1ce_idx"),
        ),
    ]
