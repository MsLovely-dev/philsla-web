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


def blueprint_version_sort_key(version: Decimal) -> tuple[int, int]:
    major, minor = str(version).split(".")
    return int(major), int(minor[:2].ljust(2, "0"))
