from decimal import Decimal

from django.db import models


class ExamType(models.TextChoices):
    SCHOLARSHIP = "scholarship", "Scholarship"
    ADMISSION = "admission", "Admission"
    CERTIFICATION = "certification", "Certification"
    QUALIFYING = "qualifying", "Qualifying"
    LICENSURE = "licensure", "Licensure"
    OTHER = "other", "Other"


class BlueprintStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    ACADEMIC_REVIEW = "academic_review", "Academic review"
    REVISION_REQUIRED = "revision_required", "Revision required"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    PUBLISHED = "published", "Published"
    RETIRED = "retired", "Retired"
    ARCHIVED = "archived", "Archived"


class DifficultyLevel(models.TextChoices):
    EASY = "easy", "Easy"
    MODERATE = "moderate", "Moderate"
    DIFFICULT = "difficult", "Difficult"


class Agency(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=150, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class BlueprintCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class AcademicYear(models.Model):
    name = models.CharField(max_length=20, unique=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-name"]

    def __str__(self) -> str:
        return self.name


class Subject(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Topic(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="topics")
    code = models.CharField(max_length=50, blank=True, default="")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["subject__name", "name"]
        constraints = [models.UniqueConstraint(fields=("subject", "name"), name="unique_topic_per_subject")]

    def __str__(self) -> str:
        return f"{self.subject.name}: {self.name}"


class QuestionType(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class QuestionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_REVIEW = "pending_review", "Pending review"
    FOR_CORRECTION = "for_correction", "For correction"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    RETIRED = "retired", "Retired"
    ARCHIVED = "archived", "Archived"


class Competency(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.PROTECT, related_name="competencies")
    code = models.CharField(max_length=50, blank=True, default="")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "competencies"
        ordering = ["topic__name", "name"]
        constraints = [models.UniqueConstraint(fields=("topic", "name"), name="unique_competency_per_topic")]

    def __str__(self) -> str:
        return f"{self.topic.name}: {self.name}"


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tags"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Question(models.Model):
    question_code = models.CharField(max_length=50, unique=True)
    question_type = models.ForeignKey(QuestionType, on_delete=models.PROTECT, related_name="questions")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="questions")
    topic = models.ForeignKey(Topic, on_delete=models.PROTECT, related_name="questions", null=True, blank=True)
    competency = models.ForeignKey(Competency, on_delete=models.PROTECT, related_name="questions", null=True, blank=True)
    difficulty = models.CharField(max_length=20, choices=DifficultyLevel.choices)
    question_text = models.TextField()
    explanation = models.TextField(blank=True, default="")
    points = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("1.00"))
    status = models.CharField(max_length=32, choices=QuestionStatus.choices, default=QuestionStatus.DRAFT)
    created_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="created_questions")
    reviewed_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="reviewed_questions",
        null=True,
        blank=True,
    )
    approved_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="approved_questions",
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    retired_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    tags = models.ManyToManyField(Tag, related_name="questions", through="QuestionTag", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "questions"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.question_code


class QuestionChoice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    option_label = models.CharField(max_length=10, blank=True, default="")
    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "question_choices"
        ordering = ["display_order", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=("question", "display_order"), name="unique_question_choice_display_order"),
        ]

    def __str__(self) -> str:
        return f"{self.question.question_code} / {self.display_order}"


class QuestionAnswer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    answer_text = models.TextField()
    is_case_sensitive = models.BooleanField(default=False)
    is_primary_answer = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "question_answers"
        ordering = ["-is_primary_answer", "created_at"]

    def __str__(self) -> str:
        return f"{self.question.question_code} answer"


class EssayRubric(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="rubrics")
    criterion = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    maximum_points = models.DecimalField(max_digits=8, decimal_places=2)
    display_order = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "essay_rubrics"
        ordering = ["display_order", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=("question", "display_order"), name="unique_question_rubric_display_order"),
        ]

    def __str__(self) -> str:
        return f"{self.question.question_code} / {self.criterion}"


class QuestionAttachment(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="attachments")
    original_filename = models.CharField(max_length=255)
    stored_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    mime_type = models.CharField(max_length=100)
    file_size_bytes = models.BigIntegerField()
    uploaded_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="question_attachments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "question_attachments"

    def __str__(self) -> str:
        return self.original_filename


class QuestionTag(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)

    class Meta:
        db_table = "question_tags"
        constraints = [
            models.UniqueConstraint(fields=("question", "tag"), name="unique_question_tag"),
        ]

    def __str__(self) -> str:
        return f"{self.question.question_code} / {self.tag.name}"


class QuestionWorkflowHistory(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="workflow_history")
    previous_status = models.CharField(max_length=32, choices=QuestionStatus.choices, null=True, blank=True)
    new_status = models.CharField(max_length=32, choices=QuestionStatus.choices)
    action = models.CharField(max_length=50)
    remarks = models.TextField(blank=True, default="")
    initiated_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="question_workflow_actions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "question_workflow_history"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.question.question_code}: {self.action}"


class ExamBlueprint(models.Model):
    spec_code = models.CharField(max_length=50, unique=True)
    exam_type = models.CharField(max_length=20, choices=ExamType.choices, default=ExamType.ADMISSION)
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="exam_blueprints")
    category = models.ForeignKey(BlueprintCategory, on_delete=models.PROTECT, related_name="exam_blueprints")
    current_version_number = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("1.00"))
    cloned_from_blueprint = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="clones",
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="created_blueprints")
    is_archived = models.BooleanField(default=False)
    archived_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="archived_blueprints",
        null=True,
        blank=True,
    )
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.spec_code


class BlueprintVersion(models.Model):
    blueprint = models.ForeignKey(ExamBlueprint, on_delete=models.CASCADE, related_name="versions")
    version_number = models.DecimalField(max_digits=6, decimal_places=2)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="blueprint_versions")
    effective_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=BlueprintStatus.choices, default=BlueprintStatus.DRAFT)
    shuffle_questions = models.BooleanField(default=True)
    shuffle_choices = models.BooleanField(default=True)
    active_items_only = models.BooleanField(default=True)
    shared_stimulus_required = models.BooleanField(default=False)
    shared_stimulus_min_count = models.PositiveIntegerField(default=0)
    shared_stimulus_questions_per_stimulus = models.PositiveIntegerField(default=0)
    max_item_reuse_count = models.PositiveIntegerField(default=0)
    version_compatibility = models.CharField(max_length=30, default=">= 1.0")
    created_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="created_blueprint_versions")
    approved_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="approved_blueprint_versions",
        null=True,
        blank=True,
    )
    published_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="published_blueprint_versions",
        null=True,
        blank=True,
    )
    retired_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="retired_blueprint_versions",
        null=True,
        blank=True,
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    retired_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-version_number", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=("blueprint", "version_number"), name="unique_blueprint_version_number"),
        ]

    def __str__(self) -> str:
        return f"{self.blueprint.spec_code} v{self.version_number}"


class BlueprintSection(models.Model):
    blueprint_version = models.ForeignKey(BlueprintVersion, on_delete=models.CASCADE, related_name="sections")
    section_number = models.PositiveIntegerField()
    section_name = models.CharField(max_length=255)
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="blueprint_sections")
    item_count = models.PositiveIntegerField()
    total_marks = models.DecimalField(max_digits=8, decimal_places=2)
    passing_score = models.DecimalField(max_digits=8, decimal_places=2)
    time_limit_minutes = models.PositiveIntegerField()
    instructions = models.TextField(blank=True, default="")
    display_order = models.PositiveIntegerField()
    cognitive_levels = models.JSONField(default=dict, blank=True)
    competencies = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "section_number"]
        constraints = [
            models.UniqueConstraint(fields=("blueprint_version", "section_number"), name="unique_blueprint_section_number"),
            models.UniqueConstraint(fields=("blueprint_version", "display_order"), name="unique_blueprint_section_display_order"),
        ]

    def __str__(self) -> str:
        return f"{self.blueprint_version} / Section {self.section_number}"


class BlueprintSectionTopic(models.Model):
    blueprint_section = models.ForeignKey(BlueprintSection, on_delete=models.CASCADE, related_name="topic_requirements")
    topic = models.ForeignKey(Topic, on_delete=models.PROTECT, related_name="blueprint_section_requirements")
    required_item_count = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("blueprint_section", "topic"), name="unique_blueprint_section_topic"),
        ]


class BlueprintDifficultyDistribution(models.Model):
    blueprint_section = models.ForeignKey(BlueprintSection, on_delete=models.CASCADE, related_name="difficulty_requirements")
    difficulty = models.CharField(max_length=20, choices=DifficultyLevel.choices)
    required_item_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("blueprint_section", "difficulty"), name="unique_blueprint_section_difficulty"),
        ]


class BlueprintQuestionTypeDistribution(models.Model):
    blueprint_section = models.ForeignKey(BlueprintSection, on_delete=models.CASCADE, related_name="question_type_requirements")
    question_type = models.ForeignKey(QuestionType, on_delete=models.PROTECT, related_name="blueprint_requirements")
    required_item_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("blueprint_section", "question_type"), name="unique_blueprint_section_question_type"),
        ]


class BlueprintWorkflowHistory(models.Model):
    blueprint_version = models.ForeignKey(BlueprintVersion, on_delete=models.CASCADE, related_name="workflow_history")
    previous_status = models.CharField(max_length=32, choices=BlueprintStatus.choices, null=True, blank=True)
    new_status = models.CharField(max_length=32, choices=BlueprintStatus.choices)
    action = models.CharField(max_length=50)
    remarks = models.TextField(blank=True, default="")
    initiated_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="blueprint_workflow_actions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ExamSetStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACADEMIC_REVIEW = "academic_review", "Academic review"
    REVISION_REQUIRED = "revision_required", "Revision required"
    APPROVED = "approved", "Approved"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class SelectionMethod(models.TextChoices):
    MANUAL = "manual", "Manual"
    AUTOMATIC = "automatic", "Automatic"


class ValidationResult(models.TextChoices):
    PASSED = "passed", "Passed"
    WARNING = "warning", "Warning"
    FAILED = "failed", "Failed"


class ExamSet(models.Model):
    blueprint_version = models.ForeignKey(BlueprintVersion, on_delete=models.PROTECT, related_name="exam_sets")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="exam_sets")
    exam_code = models.CharField(max_length=60, unique=True)
    title = models.CharField(max_length=255)
    examination_period = models.CharField(max_length=150, blank=True, default="")
    exam_type = models.CharField(max_length=20, choices=ExamType.choices, blank=True, default=ExamType.ADMISSION)
    instructions = models.TextField(blank=True, default="")
    duration_minutes = models.PositiveIntegerField()
    status = models.CharField(max_length=32, choices=ExamSetStatus.choices, default=ExamSetStatus.DRAFT)
    cloned_from_exam_set = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="clones",
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="created_exam_sets")
    approved_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="approved_exam_sets",
        null=True,
        blank=True,
    )
    published_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="published_exam_sets",
        null=True,
        blank=True,
    )
    archived_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="archived_exam_sets",
        null=True,
        blank=True,
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exam_sets"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.exam_code


class ExamSetQuestion(models.Model):
    exam_set = models.ForeignKey(ExamSet, on_delete=models.CASCADE, related_name="items")
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="exam_set_items")
    blueprint_section = models.ForeignKey(
        BlueprintSection,
        on_delete=models.PROTECT,
        related_name="exam_set_items",
        null=True,
        blank=True,
    )
    display_order = models.PositiveIntegerField()
    points = models.DecimalField(max_digits=8, decimal_places=2)
    selection_method = models.CharField(max_length=20, choices=SelectionMethod.choices, default=SelectionMethod.MANUAL)
    selected_by = models.ForeignKey(
        "accounts.AccountProfile",
        on_delete=models.PROTECT,
        related_name="selected_exam_set_questions",
        null=True,
        blank=True,
    )
    selected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exam_set_questions"
        ordering = ["display_order", "selected_at"]
        constraints = [
            models.UniqueConstraint(fields=("exam_set", "question"), name="unique_exam_set_question"),
            models.UniqueConstraint(fields=("exam_set", "display_order"), name="unique_exam_set_question_display_order"),
        ]

    def __str__(self) -> str:
        return f"{self.exam_set.exam_code} / {self.display_order}"


class ExamSetQuestionReplacement(models.Model):
    exam_set = models.ForeignKey(ExamSet, on_delete=models.CASCADE, related_name="replacements")
    exam_set_question = models.ForeignKey(ExamSetQuestion, on_delete=models.CASCADE, related_name="replacements")
    old_question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="replaced_in_exam_sets")
    new_question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="replacement_questions")
    reason = models.TextField(blank=True, default="")
    replaced_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="exam_set_replacements")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exam_set_question_replacements"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.exam_set.exam_code}: replacement"


class ExamSetAssemblyRun(models.Model):
    exam_set = models.ForeignKey(ExamSet, on_delete=models.CASCADE, related_name="assembly_runs")
    algorithm_version = models.CharField(max_length=30, blank=True, default="")
    status = models.CharField(max_length=30)
    selected_item_count = models.PositiveIntegerField(default=0)
    rejected_item_count = models.PositiveIntegerField(default=0)
    initiated_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="exam_set_assembly_runs")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "exam_set_assembly_runs"
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"{self.exam_set.exam_code} assembly run"


class ExamSetAssemblyRunItem(models.Model):
    assembly_run = models.ForeignKey(ExamSetAssemblyRun, on_delete=models.CASCADE, related_name="items")
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="assembly_run_items")
    was_selected = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exam_set_assembly_run_items"
        constraints = [
            models.UniqueConstraint(fields=("assembly_run", "question"), name="unique_exam_set_assembly_run_item"),
        ]

    def __str__(self) -> str:
        return f"{self.assembly_run.exam_set.exam_code} / {self.question.question_code}"


class ExamSetValidationResult(models.Model):
    exam_set = models.ForeignKey(ExamSet, on_delete=models.CASCADE, related_name="validation_results")
    validation_code = models.CharField(max_length=50)
    validation_name = models.CharField(max_length=150)
    result = models.CharField(max_length=20, choices=ValidationResult.choices)
    expected_value = models.CharField(max_length=255, blank=True, default="")
    actual_value = models.CharField(max_length=255, blank=True, default="")
    message = models.TextField(blank=True, default="")
    validated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exam_set_validation_results"
        ordering = ["-validated_at"]

    def __str__(self) -> str:
        return f"{self.exam_set.exam_code}: {self.validation_code}"


class ExamSetWorkflowHistory(models.Model):
    exam_set = models.ForeignKey(ExamSet, on_delete=models.CASCADE, related_name="workflow_history")
    previous_status = models.CharField(max_length=32, choices=ExamSetStatus.choices, null=True, blank=True)
    new_status = models.CharField(max_length=32, choices=ExamSetStatus.choices)
    action = models.CharField(max_length=50)
    remarks = models.TextField(blank=True, default="")
    initiated_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="exam_set_workflow_actions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exam_set_workflow_history"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.exam_set.exam_code}: {self.action}"


def blueprint_version_sort_key(version: Decimal) -> tuple[int, int]:
    major, minor = str(version).split(".")
    return int(major), int(minor[:2].ljust(2, "0"))
