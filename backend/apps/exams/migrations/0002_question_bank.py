from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_passwordrecoverytoken"),
        ("exams", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Competency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(blank=True, default="", max_length=50)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("topic", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="competencies", to="exams.topic")),
            ],
            options={
                "db_table": "competencies",
                "ordering": ["topic__name", "name"],
                "constraints": [
                    models.UniqueConstraint(fields=("topic", "name"), name="unique_competency_per_topic"),
                ],
            },
        ),
        migrations.CreateModel(
            name="Tag",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "tags",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Question",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("question_code", models.CharField(max_length=50, unique=True)),
                (
                    "difficulty",
                    models.CharField(
                        choices=[("easy", "Easy"), ("moderate", "Moderate"), ("difficult", "Difficult")],
                        max_length=20,
                    ),
                ),
                ("question_text", models.TextField()),
                ("explanation", models.TextField(blank=True, default="")),
                ("points", models.DecimalField(decimal_places=2, default=Decimal("1.00"), max_digits=8)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("pending_review", "Pending review"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("retired", "Retired"),
                            ("archived", "Archived"),
                        ],
                        default="draft",
                        max_length=32,
                    ),
                ),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("retired_at", models.DateTimeField(blank=True, null=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="approved_questions",
                        to="accounts.accountprofile",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="created_questions",
                        to="accounts.accountprofile",
                    ),
                ),
                (
                    "competency",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="questions",
                        to="exams.competency",
                    ),
                ),
                (
                    "question_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="questions",
                        to="exams.questiontype",
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="reviewed_questions",
                        to="accounts.accountprofile",
                    ),
                ),
                (
                    "subject",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="questions",
                        to="exams.subject",
                    ),
                ),
                (
                    "topic",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="questions",
                        to="exams.topic",
                    ),
                ),
            ],
            options={
                "db_table": "questions",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="QuestionChoice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("option_label", models.CharField(blank=True, default="", max_length=10)),
                ("option_text", models.TextField()),
                ("is_correct", models.BooleanField(default=False)),
                ("display_order", models.PositiveIntegerField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="choices",
                        to="exams.question",
                    ),
                ),
            ],
            options={
                "db_table": "question_choices",
                "ordering": ["display_order", "created_at"],
                "constraints": [
                    models.UniqueConstraint(fields=("question", "display_order"), name="unique_question_choice_display_order"),
                ],
            },
        ),
        migrations.CreateModel(
            name="QuestionAnswer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("answer_text", models.TextField()),
                ("is_case_sensitive", models.BooleanField(default=False)),
                ("is_primary_answer", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="answers",
                        to="exams.question",
                    ),
                ),
            ],
            options={
                "db_table": "question_answers",
                "ordering": ["-is_primary_answer", "created_at"],
            },
        ),
        migrations.CreateModel(
            name="EssayRubric",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("criterion", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("maximum_points", models.DecimalField(decimal_places=2, max_digits=8)),
                ("display_order", models.PositiveIntegerField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rubrics",
                        to="exams.question",
                    ),
                ),
            ],
            options={
                "db_table": "essay_rubrics",
                "ordering": ["display_order", "created_at"],
                "constraints": [
                    models.UniqueConstraint(fields=("question", "display_order"), name="unique_question_rubric_display_order"),
                ],
            },
        ),
        migrations.CreateModel(
            name="QuestionAttachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("original_filename", models.CharField(max_length=255)),
                ("stored_filename", models.CharField(max_length=255)),
                ("file_path", models.CharField(max_length=500)),
                ("mime_type", models.CharField(max_length=100)),
                ("file_size_bytes", models.BigIntegerField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attachments",
                        to="exams.question",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="question_attachments",
                        to="accounts.accountprofile",
                    ),
                ),
            ],
            options={
                "db_table": "question_attachments",
            },
        ),
        migrations.CreateModel(
            name="QuestionTag",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="exams.question",
                    ),
                ),
                (
                    "tag",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="exams.tag",
                    ),
                ),
            ],
            options={
                "db_table": "question_tags",
                "constraints": [
                    models.UniqueConstraint(fields=("question", "tag"), name="unique_question_tag"),
                ],
            },
        ),
        migrations.CreateModel(
            name="QuestionWorkflowHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "previous_status",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("draft", "Draft"),
                            ("pending_review", "Pending review"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("retired", "Retired"),
                            ("archived", "Archived"),
                        ],
                        max_length=32,
                        null=True,
                    ),
                ),
                (
                    "new_status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("pending_review", "Pending review"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("retired", "Retired"),
                            ("archived", "Archived"),
                        ],
                        max_length=32,
                    ),
                ),
                ("action", models.CharField(max_length=50)),
                ("remarks", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "initiated_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="question_workflow_actions",
                        to="accounts.accountprofile",
                    ),
                ),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workflow_history",
                        to="exams.question",
                    ),
                ),
            ],
            options={
                "db_table": "question_workflow_history",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddField(
            model_name="question",
            name="tags",
            field=models.ManyToManyField(blank=True, related_name="questions", through="exams.QuestionTag", to="exams.tag"),
        ),
    ]
