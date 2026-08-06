from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_password_login_lockout"),
    ]

    operations = [
        migrations.AddField(
            model_name="accountprofile",
            name="must_change_password",
            field=models.BooleanField(default=False),
        ),
    ]
