from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0005_step2verification_step2verificationconfiguration_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="studentapplication",
            name="unique_active_lrn_per_exam_cycle",
        ),
        migrations.AddConstraint(
            model_name="studentapplication",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("status", "REJECTED"),
                    _negated=True,
                )
                & models.Q(("lrn", ""), _negated=True),
                fields=("lrn", "exam_cycle_id"),
                name="unique_active_lrn_per_exam_cycle",
            ),
        ),
    ]
