import uuid
from secrets import choice

from django.conf import settings
from django.db import models
from django.utils import timezone


CANDIDATE_CODE_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"
MEDIA_ONLY_APPLICATION_FIELDS = {"selfiePhotoUrl"}


def generate_candidate_id(year: int | None = None) -> str:
    registration_year = year or timezone.now().year
    code = "".join(choice(CANDIDATE_CODE_ALPHABET) for _ in range(6))
    return f"PHL-{registration_year}-{code}"


class ApplicationStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    FOR_CORRECTION = "FOR_CORRECTION", "For correction"
    RESUBMITTED = "RESUBMITTED", "Resubmitted"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class ApplicationCompletionStatus(models.TextChoices):
    COMPLETE = "COMPLETE", "Complete"
    PENDING_STUDENT_COMPLETION = "PENDING_STUDENT_COMPLETION", "Pending student completion"


class ApplicationSubmissionSource(models.TextChoices):
    STUDENT_REGISTRATION = "STUDENT_REGISTRATION", "Student registration"
    ADMISSIONS_BULK_UPLOAD = "ADMISSIONS_BULK_UPLOAD", "Admissions bulk upload"


class ApplicationExamStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"


class ExamSlot(models.Model):
    """A bookable exam session a student can self-assign to. Distinct from
    apps.attendance.ExamPermit, which is staff-issued and QR-scan-oriented;
    this is the candidate-facing "pick your own slot" concept, which had no
    backend equivalent anywhere before this model.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam_cycle_id = models.CharField(max_length=64, blank=True, default="")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    test_center = models.CharField(max_length=255)
    room = models.CharField(max_length=255)
    total_slots = models.PositiveIntegerField()
    remaining_slots = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "start_time"]

    def __str__(self) -> str:
        return f"{self.room} - {self.date} {self.start_time}"


class StudentApplication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate_id = models.CharField(max_length=17, unique=True, editable=False)
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
    completion_status = models.CharField(
        max_length=40,
        choices=ApplicationCompletionStatus.choices,
        default=ApplicationCompletionStatus.COMPLETE,
    )
    submission_source = models.CharField(
        max_length=40,
        choices=ApplicationSubmissionSource.choices,
        default=ApplicationSubmissionSource.STUDENT_REGISTRATION,
    )
    submitted_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="submitted_bulk_applications",
        null=True,
        blank=True,
    )
    bulk_upload_batch = models.ForeignKey(
        "ApplicationBulkUploadBatch",
        on_delete=models.PROTECT,
        related_name="imported_applications",
        null=True,
        blank=True,
    )
    bulk_upload_row_number = models.PositiveIntegerField(null=True, blank=True)
    password_hash = models.CharField(max_length=128, blank=True, default="")
    exam_status = models.CharField(max_length=20, choices=ApplicationExamStatus.choices, blank=True, default="")
    assigned_slot = models.ForeignKey(
        "ExamSlot",
        on_delete=models.PROTECT,
        related_name="assigned_applications",
        null=True,
        blank=True,
    )
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

    @property
    def personal(self) -> dict:
        if hasattr(self, "_personal_payload"):
            return self._personal_payload
        if self.pk is None:
            return {}
        try:
            return _with_additional_fields(self, "personal", self.personal_info.to_public_dict())
        except StudentApplicationPersonalInfo.DoesNotExist:
            return _additional_fields(self, "personal")

    @personal.setter
    def personal(self, value: dict) -> None:
        self._personal_payload = dict(value or {})

    @property
    def address(self) -> dict:
        if hasattr(self, "_address_payload"):
            return self._address_payload
        if self.pk is None:
            return {}
        try:
            return _with_additional_fields(self, "address", self.address_info.to_public_dict())
        except StudentApplicationAddress.DoesNotExist:
            return _additional_fields(self, "address")

    @address.setter
    def address(self, value: dict) -> None:
        self._address_payload = dict(value or {})

    @property
    def school(self) -> dict:
        if hasattr(self, "_school_payload"):
            return self._school_payload
        if self.pk is None:
            return {}
        try:
            return _with_additional_fields(self, "school", self.school_info.to_public_dict())
        except StudentApplicationSchoolInfo.DoesNotExist:
            return _additional_fields(self, "school")

    @school.setter
    def school(self, value: dict) -> None:
        self._school_payload = dict(value or {})

    @property
    def course_preferences(self) -> list[dict]:
        if hasattr(self, "_course_preferences_payload"):
            return self._course_preferences_payload
        if self.pk is None:
            return []
        return [preference.to_public_dict() for preference in self.course_preference_rows.all()]

    @course_preferences.setter
    def course_preferences(self, value: list[dict]) -> None:
        self._course_preferences_payload = list(value or [])

    @property
    def review_step(self) -> dict:
        if hasattr(self, "_review_step_payload"):
            return self._review_step_payload
        if self.pk is None:
            return {}
        try:
            return _with_additional_fields(self, "reviewStep", self.review_info.to_public_dict())
        except StudentApplicationReviewInfo.DoesNotExist:
            return _additional_fields(self, "reviewStep")

    @review_step.setter
    def review_step(self, value: dict) -> None:
        self._review_step_payload = dict(value or {})

    def save(self, *args, **kwargs):
        if not self.candidate_id:
            while True:
                candidate_id = generate_candidate_id()
                if not StudentApplication.objects.filter(candidate_id=candidate_id).exists():
                    self.candidate_id = candidate_id
                    break
        super().save(*args, **kwargs)
        self._sync_section_payloads()

    def _sync_section_payloads(self) -> None:
        section_payloads = (
            ("personal", StudentApplicationPersonalInfo, "_personal_payload"),
            ("address", StudentApplicationAddress, "_address_payload"),
            ("school", StudentApplicationSchoolInfo, "_school_payload"),
            ("reviewStep", StudentApplicationReviewInfo, "_review_step_payload"),
        )
        for section, model, attribute_name in section_payloads:
            if hasattr(self, attribute_name):
                payload = getattr(self, attribute_name)
                row, _ = model.objects.get_or_create(application=self)
                row.update_from_public_dict(payload)
                row.save()
                StudentApplicationAdditionalField.sync_section(
                    application=self,
                    section=section,
                    data=payload,
                    known_keys=row.public_keys,
                )
                delattr(self, attribute_name)

        if hasattr(self, "_course_preferences_payload"):
            StudentApplicationCoursePreference.objects.filter(application=self).delete()
            preferences = []
            for index, preference in enumerate(self._course_preferences_payload):
                preference_row = StudentApplicationCoursePreference(application=self, display_order=index)
                preference_row.update_from_public_dict(preference)
                preferences.append(preference_row)
            if preferences:
                StudentApplicationCoursePreference.objects.bulk_create(preferences)
            delattr(self, "_course_preferences_payload")


class StudentApplicationPersonalInfo(models.Model):
    public_keys = {
        "firstName",
        "middleName",
        "lastName",
        "suffix",
        "extensionName",
        "dateOfBirth",
        "sex",
        "email",
        "mobile",
        "identityVerificationStatus",
    }

    application = models.OneToOneField(StudentApplication, on_delete=models.CASCADE, related_name="personal_info")
    first_name = models.CharField(max_length=150, blank=True, default="")
    middle_name = models.CharField(max_length=150, blank=True, default="")
    last_name = models.CharField(max_length=150, blank=True, default="")
    suffix = models.CharField(max_length=50, blank=True, default="")
    date_of_birth = models.CharField(max_length=20, blank=True, default="")
    sex = models.CharField(max_length=30, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    mobile = models.CharField(max_length=30, blank=True, default="")
    identity_verification_status = models.CharField(max_length=40, blank=True, default="")

    def to_public_dict(self) -> dict:
        return {
            "firstName": self.first_name,
            "middleName": self.middle_name,
            "lastName": self.last_name,
            "suffix": self.suffix,
            "dateOfBirth": self.date_of_birth,
            "sex": self.sex,
            "email": self.email,
            "mobile": self.mobile,
            "identityVerificationStatus": self.identity_verification_status,
        }

    def update_from_public_dict(self, data: dict) -> None:
        self.first_name = data.get("firstName", "")
        self.middle_name = data.get("middleName", "")
        self.last_name = data.get("lastName", "")
        self.suffix = data.get("suffix") or data.get("extensionName", "")
        self.date_of_birth = data.get("dateOfBirth", "")
        self.sex = data.get("sex", "")
        self.email = data.get("email", "")
        self.mobile = data.get("mobile", "")
        self.identity_verification_status = data.get("identityVerificationStatus", "")


class StudentApplicationAddress(models.Model):
    public_keys = {"region", "province", "city", "barangay", "street", "postalCode"}

    application = models.OneToOneField(StudentApplication, on_delete=models.CASCADE, related_name="address_info")
    region = models.CharField(max_length=120, blank=True, default="")
    province = models.CharField(max_length=120, blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    barangay = models.CharField(max_length=120, blank=True, default="")
    street = models.CharField(max_length=255, blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")

    def to_public_dict(self) -> dict:
        return {
            "region": self.region,
            "province": self.province,
            "city": self.city,
            "barangay": self.barangay,
            "street": self.street,
            "postalCode": self.postal_code,
        }

    def update_from_public_dict(self, data: dict) -> None:
        self.region = data.get("region", "")
        self.province = data.get("province", "")
        self.city = data.get("city", "")
        self.barangay = data.get("barangay", "")
        self.street = data.get("street", "")
        self.postal_code = data.get("postalCode", "")


class StudentApplicationSchoolInfo(models.Model):
    public_keys = {
        "lrn",
        "schoolId",
        "name",
        "academicTrack",
        "gradeLevel",
        "enrollmentStatus",
        "schoolYear",
        "gwa",
    }

    application = models.OneToOneField(StudentApplication, on_delete=models.CASCADE, related_name="school_info")
    lrn = models.CharField(max_length=12, blank=True, default="")
    school_id = models.CharField(max_length=64, blank=True, default="")
    name = models.CharField(max_length=255, blank=True, default="")
    academic_track = models.CharField(max_length=120, blank=True, default="")
    grade_level = models.CharField(max_length=40, blank=True, default="")
    enrollment_status = models.CharField(max_length=80, blank=True, default="")
    school_year = models.CharField(max_length=20, blank=True, default="")
    gwa = models.CharField(max_length=20, blank=True, default="")

    def to_public_dict(self) -> dict:
        return {
            "lrn": self.lrn,
            "schoolId": self.school_id,
            "name": self.name,
            "academicTrack": self.academic_track,
            "gradeLevel": self.grade_level,
            "enrollmentStatus": self.enrollment_status,
            "schoolYear": self.school_year,
            "gwa": self.gwa,
        }

    def update_from_public_dict(self, data: dict) -> None:
        self.lrn = data.get("lrn", "")
        self.school_id = data.get("schoolId", "")
        self.name = data.get("name", "")
        self.academic_track = data.get("academicTrack", "")
        self.grade_level = data.get("gradeLevel", "")
        self.enrollment_status = data.get("enrollmentStatus", "")
        self.school_year = data.get("schoolYear", "")
        self.gwa = data.get("gwa", "")


class StudentApplicationCoursePreference(models.Model):
    application = models.ForeignKey(StudentApplication, on_delete=models.CASCADE, related_name="course_preference_rows")
    university = models.CharField(max_length=255, blank=True, default="")
    course = models.CharField(max_length=255, blank=True, default="")
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]

    def to_public_dict(self) -> dict:
        return {
            "university": self.university,
            "course": self.course,
        }

    def update_from_public_dict(self, data: dict) -> None:
        self.university = data.get("university", "")
        self.course = data.get("course", "")


class StudentApplicationReviewInfo(models.Model):
    public_keys = {
        "privacyConsent",
        "declarationAccepted",
        "requiresAdmissionsReviewerAttention",
        "attentionReason",
        "reviewerDecision",
        "reviewerReason",
        "requiredCorrections",
        "reviewedBy",
        "reviewedAt",
    }

    application = models.OneToOneField(StudentApplication, on_delete=models.CASCADE, related_name="review_info")
    privacy_consent = models.BooleanField(default=False)
    declaration_accepted = models.BooleanField(default=False)
    requires_admissions_reviewer_attention = models.BooleanField(default=False)
    attention_reason = models.TextField(blank=True, default="")
    reviewer_decision = models.CharField(max_length=40, blank=True, default="")
    reviewer_reason = models.TextField(blank=True, default="")
    required_corrections = models.TextField(blank=True, default="")
    reviewed_by = models.CharField(max_length=80, blank=True, default="")
    reviewed_at = models.CharField(max_length=40, blank=True, default="")

    def to_public_dict(self) -> dict:
        corrections = [item for item in self.required_corrections.splitlines() if item]
        return {
            "privacyConsent": self.privacy_consent,
            "declarationAccepted": self.declaration_accepted,
            "requiresAdmissionsReviewerAttention": self.requires_admissions_reviewer_attention,
            "attentionReason": self.attention_reason,
            "reviewerDecision": self.reviewer_decision,
            "reviewerReason": self.reviewer_reason,
            "requiredCorrections": corrections,
            "reviewedBy": self.reviewed_by,
            "reviewedAt": self.reviewed_at,
        }

    def update_from_public_dict(self, data: dict) -> None:
        self.privacy_consent = data.get("privacyConsent") is True
        self.declaration_accepted = data.get("declarationAccepted") is True
        self.requires_admissions_reviewer_attention = data.get("requiresAdmissionsReviewerAttention") is True
        self.attention_reason = data.get("attentionReason", "")
        self.reviewer_decision = data.get("reviewerDecision", "")
        self.reviewer_reason = data.get("reviewerReason", "")
        corrections = data.get("requiredCorrections", [])
        self.required_corrections = "\n".join(str(item) for item in corrections if str(item).strip())
        self.reviewed_by = data.get("reviewedBy", "")
        self.reviewed_at = data.get("reviewedAt", "")


class StudentApplicationAdditionalField(models.Model):
    application = models.ForeignKey(StudentApplication, on_delete=models.CASCADE, related_name="additional_fields")
    section = models.CharField(max_length=40)
    field_key = models.CharField(max_length=120)
    field_value = models.TextField(blank=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("application", "section", "field_key"),
                name="unique_application_additional_field",
            ),
        ]

    @classmethod
    def sync_section(cls, *, application: StudentApplication, section: str, data: dict, known_keys: set[str]) -> None:
        cls.objects.filter(application=application, section=section).delete()
        rows = [
            cls(application=application, section=section, field_key=key, field_value=str(value))
            for key, value in data.items()
            if key not in known_keys and key not in MEDIA_ONLY_APPLICATION_FIELDS and value not in (None, "")
        ]
        if rows:
            cls.objects.bulk_create(rows)


def _additional_fields(application: StudentApplication, section: str) -> dict:
    return {
        field.field_key: field.field_value
        for field in application.additional_fields.filter(section=section)
    }


def _with_additional_fields(application: StudentApplication, section: str, data: dict) -> dict:
    return {**data, **_additional_fields(application, section)}


class BulkUploadBatchStatus(models.TextChoices):
    UPLOADED = "UPLOADED", "Uploaded"
    VALIDATING = "VALIDATING", "Validating"
    VALIDATED = "VALIDATED", "Validated"
    CONFIRMING = "CONFIRMING", "Confirming"
    COMPLETED = "COMPLETED", "Completed"
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS", "Completed with errors"
    EXPIRED = "EXPIRED", "Expired"
    FAILED = "FAILED", "Failed"


class BulkUploadRowStatus(models.TextChoices):
    VALID = "VALID", "Valid"
    FIELD_ERROR = "FIELD_ERROR", "Field error"
    CONFLICT = "CONFLICT", "Conflict"
    IMPORTED = "IMPORTED", "Imported"
    IMPORT_FAILED = "IMPORT_FAILED", "Import failed"


class ApplicationBulkUploadBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template_version = models.CharField(max_length=40)
    exam_cycle_id = models.CharField(max_length=64)
    status = models.CharField(max_length=40, choices=BulkUploadBatchStatus.choices, default=BulkUploadBatchStatus.UPLOADED)
    uploaded_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="application_bulk_upload_batches",
    )
    performed_by_role_snapshot = models.CharField(max_length=80)
    expires_at = models.DateTimeField()
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    summary_counts = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def public_id(self) -> str:
        return str(self.id)


class ApplicationBulkUploadRowResult(models.Model):
    batch = models.ForeignKey(ApplicationBulkUploadBatch, on_delete=models.CASCADE, related_name="row_results")
    row_number = models.PositiveIntegerField()
    status = models.CharField(max_length=40, choices=BulkUploadRowStatus.choices)
    application = models.ForeignKey(
        StudentApplication,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="bulk_upload_row_results",
    )
    submitted_lrn = models.CharField(max_length=12, blank=True, default="")
    submitted_email = models.EmailField(blank=True, default="")
    row_snapshot = models.JSONField(default=dict, blank=True)
    errors = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["row_number", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=("batch", "row_number"),
                name="unique_bulk_upload_row_number_per_batch",
            ),
        ]


class ApplicationAuditLog(models.Model):
    application = models.ForeignKey(
        StudentApplication,
        on_delete=models.CASCADE,
        related_name="audit_logs",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=80, db_index=True)
    event = models.CharField(max_length=120)
    outcome = models.CharField(max_length=20, db_index=True)
    registration_id = models.CharField(max_length=80, blank=True, default="")
    applicant_id = models.CharField(max_length=80, blank=True, default="")
    account_id = models.CharField(max_length=80, blank=True, default="")
    actor_user_id = models.CharField(max_length=80, blank=True, default="")
    actor_role = models.CharField(max_length=80, blank=True, default="")
    session_id = models.CharField(max_length=120, blank=True, default="")
    ip_address = models.CharField(max_length=45, blank=True, default="")
    user_agent = models.CharField(max_length=512, blank=True, default="")
    correlation_id = models.CharField(max_length=80, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "outcome", "-created_at"]),
            models.Index(fields=["registration_id"]),
        ]


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


def registration_selfie_upload_to(instance, filename):
    extension = ".png" if instance.content_type == "image/png" else ".jpg"
    owner_id = instance.verification_id or instance.application_id or "unlinked"
    return f"private/registration-selfies/{owner_id}/{uuid.uuid4().hex}{extension}"


def registration_attachment_upload_to(instance, filename):
    extensions = {
        "application/pdf": ".pdf",
        "image/png": ".png",
        "image/jpeg": ".jpg",
    }
    owner_id = instance.application_id or instance.registration_session_id or "unlinked"
    extension = extensions.get(instance.content_type, "")
    return f"private/registration-attachments/{owner_id}/{uuid.uuid4().hex}{extension}"


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


class RegistrationSelfieMedia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    verification = models.OneToOneField(
        Step2Verification,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="registration_selfie",
    )
    application = models.OneToOneField(
        StudentApplication,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="registration_selfie",
    )
    file = models.FileField(upload_to=registration_selfie_upload_to)
    content_type = models.CharField(max_length=32)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(verification__isnull=False) | models.Q(application__isnull=False),
                name="registration_selfie_has_owner",
            ),
        ]


class StudentApplicationAdditionalAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        StudentApplication,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="additional_attachments",
    )
    registration_session_id = models.CharField(max_length=120, blank=True, default="")
    section = models.CharField(max_length=40)
    field_key = models.CharField(max_length=120)
    file = models.FileField(upload_to=registration_attachment_upload_to)
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=32)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(application__isnull=False) | ~models.Q(registration_session_id=""),
                name="additional_attachment_has_owner",
            ),
            models.UniqueConstraint(
                fields=("application", "section", "field_key"),
                condition=models.Q(application__isnull=False),
                name="unique_application_additional_attachment",
            ),
            models.UniqueConstraint(
                fields=("registration_session_id", "section", "field_key"),
                condition=~models.Q(registration_session_id=""),
                name="unique_session_additional_attachment",
            ),
        ]
