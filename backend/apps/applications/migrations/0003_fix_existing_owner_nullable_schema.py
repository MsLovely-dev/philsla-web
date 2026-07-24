import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def make_owner_nullable(apps, schema_editor):
    StudentApplication = apps.get_model("applications", "StudentApplication")
    user_app_label, user_model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(user_app_label, user_model_name)
    old_field = models.ForeignKey(
        User,
        on_delete=django.db.models.deletion.PROTECT,
        related_name="student_applications",
    )
    old_field.set_attributes_from_name("owner")
    old_field.model = StudentApplication

    new_field = models.ForeignKey(
        User,
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.PROTECT,
        related_name="student_applications",
    )
    new_field.set_attributes_from_name("owner")
    new_field.model = StudentApplication

    schema_editor.alter_field(StudentApplication, old_field, new_field, strict=False)


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0002_allow_pre_account_registration"),
    ]

    operations = [
        migrations.RunPython(make_owner_nullable, migrations.RunPython.noop),
    ]
