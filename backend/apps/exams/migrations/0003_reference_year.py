from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_alter_accountprofile_role"),
        ("exams", "0002_question_bank"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReferenceYear",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.PositiveSmallIntegerField(unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "academic_year",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reference_year",
                        to="exams.academicyear",
                    ),
                ),
            ],
            options={
                "db_table": "reference_years",
                "ordering": ["-year"],
            },
        ),
        migrations.AddField(
            model_name="blueprintversion",
            name="reference_year",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="blueprint_versions",
                to="exams.referenceyear",
            ),
        ),
    ]
