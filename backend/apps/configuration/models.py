from django.conf import settings
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
