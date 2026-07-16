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
    password_hash = models.CharField(max_length=128, blank=True, default="")
    version = models.PositiveIntegerField(default=1)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=("lrn", "exam_cycle_id"),
                condition=~models.Q(status=ApplicationStatus.REJECTED) & ~models.Q(lrn=""),
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


class Step2VerificationConfiguration(models.Model):
    require_student_id_verification = models.BooleanField(default=False)
    require_student_id_front = models.BooleanField(default=True)
    require_student_id_back = models.BooleanField(default=True)
    enable_student_id_information_extraction = models.BooleanField(default=False)
    compare_student_name = models.BooleanField(default=False)
    compare_school_name = models.BooleanField(default=False)
    name_match_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=85)
    school_match_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=85)
    enable_facial_comparison = models.BooleanField(default=False)
    facial_similarity_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=85)
    allow_manual_review = models.BooleanField(default=True)
    maximum_verification_attempts = models.PositiveSmallIntegerField(default=5)
    effective_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="step2_configurations")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-effective_date", "-created_at"]

    def snapshot(self) -> dict:
        return {
            "configurationId": self.pk,
            "requireStudentIdVerification": self.require_student_id_verification,
            "requireStudentIdFront": self.require_student_id_front,
            "requireStudentIdBack": self.require_student_id_back,
            "enableStudentIdInformationExtraction": self.enable_student_id_information_extraction,
            "compareStudentName": self.compare_student_name,
            "compareSchoolName": self.compare_school_name,
            "nameMatchThreshold": float(self.name_match_threshold),
            "schoolMatchThreshold": float(self.school_match_threshold),
            "enableFacialComparison": self.enable_facial_comparison,
            "facialReferenceMediaType": IdentityMediaType.STUDENT_ID_FRONT,
            "facialSimilarityThreshold": float(self.facial_similarity_threshold),
            "allowManualReview": self.allow_manual_review,
            "maximumVerificationAttempts": self.maximum_verification_attempts,
            "effectiveDate": self.effective_date.isoformat(),
        }


class Step2VerificationStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    PASSED = "PASSED", "Passed"
    MANUAL_REVIEW = "MANUAL_REVIEW", "Manual review"
    REJECTED = "REJECTED", "Rejected"


class Step2Verification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token_digest = models.CharField(max_length=64, unique=True)
    application = models.OneToOneField(StudentApplication, null=True, blank=True, on_delete=models.CASCADE, related_name="step2_verification")
    lrn = models.CharField(max_length=12)
    lrn_profile = models.JSONField(default=dict)
    configuration_snapshot = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=Step2VerificationStatus.choices, default=Step2VerificationStatus.IN_PROGRESS)
    attempts = models.PositiveSmallIntegerField(default=0)
    results = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class IdentityMediaType(models.TextChoices):
    STUDENT_ID_FRONT = "STUDENT_ID_FRONT", "Student ID front"
    STUDENT_ID_BACK = "STUDENT_ID_BACK", "Student ID back"
    SELFIE = "SELFIE", "Selfie"


def identity_media_upload_to(instance, filename):
    extension = ".png" if instance.content_type == "image/png" else ".jpg"
    return f"private/registration-identity/{instance.verification_id}/{uuid.uuid4().hex}{extension}"


class ApplicationIdentityMedia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    verification = models.ForeignKey(Step2Verification, on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=24, choices=IdentityMediaType.choices)
    file = models.FileField(upload_to=identity_media_upload_to)
    content_type = models.CharField(max_length=32)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("verification", "media_type"), name="unique_step2_media_type")]
