import uuid

from django.conf import settings
from django.db import models


class ApplicationStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    FOR_CORRECTION = "FOR_CORRECTION", "For correction"
    RESUBMITTED = "RESUBMITTED", "Resubmitted"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class StudentApplication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="student_applications",
        null=True,
        blank=True,
    )
    lrn = models.CharField("LRN", max_length=12, blank=True, default="")
    exam_cycle_id = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(max_length=20, choices=ApplicationStatus.choices, default=ApplicationStatus.DRAFT)
    personal = models.JSONField(default=dict, blank=True)
    address = models.JSONField(default=dict, blank=True)
    school = models.JSONField(default=dict, blank=True)
    course_preferences = models.JSONField(default=list, blank=True)
    review_step = models.JSONField(default=dict, blank=True)
    version = models.PositiveIntegerField(default=1)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=("lrn", "exam_cycle_id"),
                condition=~models.Q(status=ApplicationStatus.REJECTED),
                name="unique_active_lrn_per_exam_cycle",
            ),
            models.UniqueConstraint(
                fields=("owner", "exam_cycle_id"),
                condition=models.Q(owner__isnull=False) & ~models.Q(status=ApplicationStatus.REJECTED),
                name="unique_active_owner_per_exam_cycle",
            ),
        ]

    def can_be_accessed_by(self, user: object, action: str) -> bool:
        if self.owner_id is None:
            return False
        return str(self.owner_id) == str(getattr(user, "user_id", getattr(user, "id", "")))
