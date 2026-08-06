# Removes the superseded university registry from the configuration app.
# The authoritative university/course registry lives in apps.universities
# (mounted at /api/v1/universities/); these tables were never consumed.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("configuration", "0007_university_collegecourse_and_more"),
    ]

    operations = [
        migrations.DeleteModel(name="CollegeCourse"),
        migrations.DeleteModel(name="University"),
    ]
