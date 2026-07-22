from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuthRefreshSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token_hash", models.CharField(max_length=64, unique=True)),
                ("account", models.JSONField(default=dict)),
                ("expires_at", models.DateTimeField()),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("rotated_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="auth_refresh_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="authrefreshsession",
            index=models.Index(fields=["token_hash"], name="accounts_au_token_h_58615b_idx"),
        ),
        migrations.AddIndex(
            model_name="authrefreshsession",
            index=models.Index(fields=["user", "revoked_at", "expires_at"], name="accounts_au_user_id_c6af79_idx"),
        ),
    ]
