from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0003_fix_existing_owner_nullable_schema"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentapplication",
            name="password_hash",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
