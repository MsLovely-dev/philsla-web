import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="studentapplication",
            name="unique_active_owner_per_exam_cycle",
        ),
        migrations.AlterField(
            model_name="studentapplication",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="student_applications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="studentapplication",
            constraint=models.UniqueConstraint(
                condition=models.Q(("owner__isnull", False), models.Q(("status", "REJECTED"), _negated=True)),
                fields=("owner", "exam_cycle_id"),
                name="unique_active_owner_per_exam_cycle",
            ),
        ),
    ]
