import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class ConfigurableFieldPriority(models.TextChoices):
    HIGH = "High Priority", "High Priority"
    MEDIUM = "Medium Priority", "Medium Priority"
    LOW = "Low Priority", "Low Priority"


class ConfigurableField(models.Model):
    module = models.CharField(max_length=80)
    section = models.CharField(max_length=80)
    field_type = models.CharField(max_length=80)
    field_name = models.CharField(max_length=120)
    field_section = models.CharField(max_length=80, default="Personal Information")
    input_type = models.CharField(max_length=40, default="text")
    option_values = models.JSONField(default=list, blank=True)
    priority = models.CharField(
        max_length=20,
        choices=ConfigurableFieldPriority.choices,
        default=ConfigurableFieldPriority.HIGH,
    )
    remarks = models.TextField(blank=True, default="")
    is_enabled = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=100)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="configurable_fields",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["module", "display_order", "field_name"]
        constraints = [
            models.UniqueConstraint(
                fields=("module", "section", "field_type", "field_name"),
                name="unique_configurable_field",
            )
        ]

    def __str__(self) -> str:
        return f"{self.module} - {self.section} - {self.field_name}"


class UniversityClassification(models.TextChoices):
    PUBLIC = "Public", "Public"
    PRIVATE = "Private", "Private"


class RegistryStatus(models.TextChoices):
    ACTIVE = "Active", "Active"
    INACTIVE = "Inactive", "Inactive"


class DegreeType(models.TextChoices):
    BACHELOR_OF_SCIENCE = "Bachelor of Science", "Bachelor of Science"
    BACHELOR_OF_ARTS = "Bachelor of Arts", "Bachelor of Arts"
    BACHELOR_OF_FINE_ARTS = "Bachelor of Fine Arts", "Bachelor of Fine Arts"
    ASSOCIATE = "Associate", "Associate"


class University(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=255)
    classification = models.CharField(max_length=20, choices=UniversityClassification.choices)
    region = models.CharField(max_length=120)
    city = models.CharField(max_length=120)
    president_rector = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=40, blank=True, default="")
    established_year = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=RegistryStatus.choices, default=RegistryStatus.ACTIVE)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_universities",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "code"]
        indexes = [
            models.Index(fields=("classification", "status")),
            models.Index(fields=("region", "city")),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class CollegeCourse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name="college_courses")
    college_name = models.CharField(max_length=255)
    program_code = models.CharField(max_length=40)
    program_name = models.CharField(max_length=255)
    degree_type = models.CharField(max_length=40, choices=DegreeType.choices)
    major_specialization = models.CharField(max_length=255, blank=True, default="")
    duration_years = models.PositiveSmallIntegerField(
        validators=(MinValueValidator(1), MaxValueValidator(6)),
    )
    total_units = models.PositiveSmallIntegerField(
        validators=(MinValueValidator(1), MaxValueValidator(500)),
    )
    cutoff_percentile = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=(MinValueValidator(0), MaxValueValidator(100)),
    )
    status = models.CharField(max_length=20, choices=RegistryStatus.choices, default=RegistryStatus.ACTIVE)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_college_courses",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["college_name", "program_code", "program_name"]
        constraints = [
            models.UniqueConstraint(
                fields=("university", "program_code"),
                name="unique_university_program_code",
            ),
        ]
        indexes = [
            models.Index(fields=("university", "status")),
            models.Index(fields=("university", "college_name")),
        ]

    def __str__(self) -> str:
        return f"{self.university.code} - {self.program_code}"
