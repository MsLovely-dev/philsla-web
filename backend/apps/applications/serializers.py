from django.urls import reverse
from rest_framework import serializers

from apps.accounts.serializers import validate_password_policy

from .models import (
    ApplicationAuditLog,
    ApplicationBulkUploadBatch,
    ExamSlot,
    IdentityMediaType,
    Step2VerificationConfiguration,
    StudentApplication,
    StudentApplicationAdditionalAttachment,
)


class ExamSlotSerializer(serializers.ModelSerializer):
    startTime = serializers.TimeField(source="start_time", read_only=True)
    endTime = serializers.TimeField(source="end_time", read_only=True)
    testCenter = serializers.CharField(source="test_center", read_only=True)
    totalSlots = serializers.IntegerField(source="total_slots", read_only=True)
    remainingSlots = serializers.IntegerField(source="remaining_slots", read_only=True)

    class Meta:
        model = ExamSlot
        fields = ("id", "date", "startTime", "endTime", "testCenter", "room", "totalSlots", "remainingSlots")
        read_only_fields = fields


class ExamSlotAssignSerializer(serializers.Serializer):
    slotId = serializers.UUIDField()


class ApplicationSerializer(serializers.ModelSerializer):
    personal = serializers.JSONField(required=False)
    address = serializers.JSONField(required=False)
    school = serializers.JSONField(required=False)
    coursePreferences = serializers.JSONField(source="course_preferences", required=False)
    reviewStep = serializers.JSONField(source="review_step", required=False)
    lrnProfile = serializers.SerializerMethodField()
    photoUrl = serializers.SerializerMethodField()
    additionalAttachments = serializers.SerializerMethodField()
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    examCycleId = serializers.CharField(source="exam_cycle_id", read_only=True)
    candidateId = serializers.CharField(source="candidate_id", read_only=True)
    completionStatus = serializers.CharField(source="completion_status", read_only=True)
    submissionSource = serializers.CharField(source="submission_source", read_only=True)
    submittedByUserId = serializers.CharField(source="submitted_by_user_id", read_only=True, allow_null=True)
    bulkUploadBatchId = serializers.CharField(source="bulk_upload_batch_id", read_only=True, allow_null=True)
    bulkUploadRowNumber = serializers.IntegerField(source="bulk_upload_row_number", read_only=True, allow_null=True)
    examStatus = serializers.CharField(source="exam_status", read_only=True)
    assignedSlot = ExamSlotSerializer(source="assigned_slot", read_only=True)

    class Meta:
        model = StudentApplication
        fields = (
            "id", "candidateId", "status", "personal", "address", "school", "coursePreferences",
            "reviewStep", "lrnProfile", "photoUrl", "additionalAttachments", "examCycleId",
            "completionStatus", "submissionSource", "submittedByUserId", "bulkUploadBatchId",
            "bulkUploadRowNumber", "version", "submittedAt", "createdAt", "updatedAt",
            "examStatus", "assignedSlot",
        )
        read_only_fields = (
            "id", "candidateId", "status", "lrnProfile", "photoUrl", "additionalAttachments", "examCycleId",
            "completionStatus", "submissionSource", "submittedByUserId", "bulkUploadBatchId",
            "bulkUploadRowNumber", "version", "submittedAt", "createdAt", "updatedAt",
            "examStatus", "assignedSlot",
        )

    def get_lrnProfile(self, obj):
        verification = getattr(obj, "step2_verification", None)
        if verification is None:
            return {}
        return verification.lrn_profile or {}

    def get_photoUrl(self, obj):
        if hasattr(obj, "registration_selfie"):
            media_type = IdentityMediaType.SELFIE
        else:
            media_type = ""
        verification = getattr(obj, "step2_verification", None)
        if not media_type and verification is not None and hasattr(verification, "registration_selfie"):
            media_type = IdentityMediaType.SELFIE
        elif (
            not media_type
            and verification is not None
            and verification.media.filter(media_type=IdentityMediaType.STUDENT_ID_FRONT).exists()
        ):
            media_type = IdentityMediaType.STUDENT_ID_FRONT
        if not media_type:
            return ""

        url = reverse(
            "applications:identity-media",
            kwargs={"application_id": obj.id, "media_type": media_type},
        )
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url

    def get_additionalAttachments(self, obj):
        request = self.context.get("request")
        attachments = obj.additional_attachments.all()
        return [
            {
                "id": str(attachment.id),
                "section": attachment.section,
                "fieldKey": attachment.field_key,
                "filename": attachment.original_filename,
                "contentType": attachment.content_type,
                "size": attachment.size,
                "url": self._attachment_url(obj, attachment, request),
            }
            for attachment in attachments
        ]

    def _attachment_url(self, application, attachment, request):
        url = reverse(
            "applications:additional-attachment",
            kwargs={"application_id": application.id, "attachment_id": attachment.id},
        )
        return request.build_absolute_uri(url) if request else url

    def validate_personal(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object.")
        return value

    def validate_address(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object.")
        return value

    def validate_school(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object.")
        return value

    def validate_coursePreferences(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be an array.")
        if any(not isinstance(item, dict) for item in value):
            raise serializers.ValidationError("Every preference must be an object.")
        return value

    def validate_reviewStep(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object.")
        return value


class ApplicationUpdateSerializer(ApplicationSerializer):
    version = serializers.IntegerField(min_value=1, write_only=True)

    class Meta(ApplicationSerializer.Meta):
        read_only_fields = ("id", "status", "examCycleId", "submittedAt", "createdAt", "updatedAt")


class ApplicationSubmitSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)


class StudentProfileCompletionSerializer(serializers.Serializer):
    application = serializers.DictField(read_only=True)
    fields = serializers.ListField(child=serializers.DictField(), read_only=True)
    progress = serializers.DictField(read_only=True)


class ApplicationAuditLogSerializer(serializers.ModelSerializer):
    applicationId = serializers.SerializerMethodField()
    candidateId = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)
    sessionId = serializers.CharField(source="session_id", read_only=True)
    ipAddress = serializers.CharField(source="ip_address", read_only=True)
    deviceBrowser = serializers.CharField(source="user_agent", read_only=True)
    registrationId = serializers.CharField(source="registration_id", read_only=True)
    applicantId = serializers.CharField(source="applicant_id", read_only=True)
    accountId = serializers.CharField(source="account_id", read_only=True)
    actor = serializers.CharField(source="actor_user_id", read_only=True)
    actorRole = serializers.CharField(source="actor_role", read_only=True)
    actorDisplay = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationAuditLog
        fields = (
            "id", "action", "event", "outcome", "timestamp", "sessionId",
            "ipAddress", "deviceBrowser", "registrationId", "applicantId",
            "applicationId", "candidateId", "accountId", "actor", "actorRole", "actorDisplay", "correlation_id",
        )
        read_only_fields = fields

    def get_applicationId(self, obj):
        return str(obj.application_id) if obj.application_id else ""

    def get_candidateId(self, obj):
        application = getattr(obj, "application", None)
        return getattr(application, "candidate_id", "") or obj.registration_id

    def get_actorDisplay(self, obj):
        application = self._display_application(obj)
        personal = getattr(application, "personal", {}) if application is not None else {}
        if not isinstance(personal, dict):
            return obj.actor_role or "Student"

        name_parts = [
            personal.get("firstName"),
            personal.get("middleName"),
            personal.get("lastName"),
            personal.get("suffix") or personal.get("extensionName"),
        ]
        display_name = " ".join(str(part).strip() for part in name_parts if str(part or "").strip())
        return display_name or obj.actor_role or "Student"

    def _display_application(self, obj):
        application = getattr(obj, "application", None)
        if application is not None:
            return application
        if not obj.session_id:
            return None
        related_log = (
            ApplicationAuditLog.objects.select_related("application")
            .filter(session_id=obj.session_id, application__isnull=False)
            .order_by("-created_at")
            .first()
        )
        return None if related_log is None else related_log.application


class ReviewerDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("APPROVE", "REQUEST_CORRECTION", "REJECT"))
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    requiredCorrections = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        allow_empty=True,
    )


class BulkUploadValidateSerializer(serializers.Serializer):
    file = serializers.FileField()


class BulkUploadBatchSerializer(serializers.ModelSerializer):
    batchId = serializers.CharField(source="public_id", read_only=True)
    totalRows = serializers.SerializerMethodField()
    validRows = serializers.SerializerMethodField()
    failedRows = serializers.SerializerMethodField()
    conflictRows = serializers.SerializerMethodField()
    fieldErrorRows = serializers.SerializerMethodField()
    canConfirm = serializers.SerializerMethodField()
    rows = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationBulkUploadBatch
        fields = (
            "batchId",
            "status",
            "totalRows",
            "validRows",
            "failedRows",
            "conflictRows",
            "fieldErrorRows",
            "canConfirm",
            "rows",
            "created_at",
            "expires_at",
            "confirmed_at",
            "completed_at",
        )
        read_only_fields = fields

    def get_totalRows(self, obj):
        return obj.summary_counts.get("totalRows", 0)

    def get_validRows(self, obj):
        return obj.summary_counts.get("validRows", 0)

    def get_failedRows(self, obj):
        return obj.summary_counts.get("failedRows", 0)

    def get_conflictRows(self, obj):
        return obj.summary_counts.get("conflictRows", 0)

    def get_fieldErrorRows(self, obj):
        return obj.summary_counts.get("fieldErrorRows", 0)

    def get_canConfirm(self, obj):
        return obj.status == "VALIDATED" and self.get_validRows(obj) > 0

    def get_rows(self, obj):
        return [
            {
                "rowNumber": row.row_number,
                "status": row.status,
                "applicationId": str(row.application_id) if row.application_id else None,
                "errors": row.errors,
            }
            for row in obj.row_results.all()
        ]


class LrnVerificationSerializer(serializers.Serializer):
    VERIFICATION_CATEGORIES = (
        ("email", "Email Address"),
        ("birthday", "Birthday"),
        ("student_id", "Student ID / School Card Number"),
        ("mobile", "Mobile Number"),
        ("mother_name", "Mother's Name"),
    )

    lrn = serializers.RegexField(
        regex=r"^\d{12}$",
        error_messages={
            "invalid": "Please enter a valid 12-digit LRN.",
            "blank": "Please enter your LRN.",
            "required": "Please enter your LRN.",
        },
    )
    verificationCategory = serializers.ChoiceField(choices=VERIFICATION_CATEGORIES, required=False, allow_blank=True)
    verificationValue = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True, max_length=200)


class RegistrationEmailOtpRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class RegistrationEmailOtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    code = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={
            "invalid": "Enter the 6-digit OTP sent to your email address.",
            "blank": "Enter the 6-digit OTP sent to your email address.",
            "required": "Enter the 6-digit OTP sent to your email address.",
        },
    )


class ApplicationCreateSerializer(ApplicationSerializer):
    verificationToken = serializers.CharField(write_only=True, trim_whitespace=False, required=False, allow_blank=True)
    emailVerificationToken = serializers.CharField(write_only=True, trim_whitespace=False, required=False, allow_blank=True)
    submitOnCreate = serializers.BooleanField(write_only=True, required=False, default=False)
    password = serializers.CharField(
        write_only=True,
        required=False,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    class Meta(ApplicationSerializer.Meta):
        fields = ApplicationSerializer.Meta.fields + ("verificationToken", "emailVerificationToken", "submitOnCreate", "password")

    def validate_password(self, value: str) -> str:
        return validate_password_policy(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs.get("submitOnCreate") and not attrs.get("password"):
            raise serializers.ValidationError({"password": ["Password is required before final registration submission."]})
        return attrs


class Step2ConfigurationSerializer(serializers.ModelSerializer):
    requireStudentIdVerification = serializers.BooleanField(source="require_student_id_verification")
    requireStudentIdFront = serializers.BooleanField(source="require_student_id_front")
    requireStudentIdBack = serializers.BooleanField(source="require_student_id_back")
    enableStudentIdInformationExtraction = serializers.BooleanField(source="enable_student_id_information_extraction")
    compareStudentName = serializers.BooleanField(source="compare_student_name")
    compareSchoolName = serializers.BooleanField(source="compare_school_name")
    nameMatchThreshold = serializers.DecimalField(source="name_match_threshold", max_digits=5, decimal_places=2, min_value=0, max_value=100)
    schoolMatchThreshold = serializers.DecimalField(source="school_match_threshold", max_digits=5, decimal_places=2, min_value=0, max_value=100)
    enableFacialComparison = serializers.BooleanField(source="enable_facial_comparison")
    facialReferenceMediaType = serializers.SerializerMethodField()
    facialSimilarityThreshold = serializers.DecimalField(source="facial_similarity_threshold", max_digits=5, decimal_places=2, min_value=0, max_value=100)
    allowManualReview = serializers.BooleanField(source="allow_manual_review")
    maximumVerificationAttempts = serializers.IntegerField(source="maximum_verification_attempts", min_value=1, max_value=20)
    effectiveDate = serializers.DateTimeField(source="effective_date")
    status = serializers.BooleanField(source="is_active")

    class Meta:
        model = Step2VerificationConfiguration
        fields = ("id", "requireStudentIdVerification", "requireStudentIdFront", "requireStudentIdBack",
                  "enableStudentIdInformationExtraction", "compareStudentName", "compareSchoolName",
                  "nameMatchThreshold", "schoolMatchThreshold", "enableFacialComparison", "facialReferenceMediaType",
                  "facialSimilarityThreshold", "allowManualReview", "maximumVerificationAttempts",
                  "effectiveDate", "status", "created_at")
        read_only_fields = ("id", "created_at")

    def get_facialReferenceMediaType(self, obj):
        return IdentityMediaType.STUDENT_ID_FRONT

    def validate(self, attrs):
        attrs = super().validate(attrs)
        require_id = attrs.get("require_student_id_verification", False)
        dependent = ("enable_student_id_information_extraction", "compare_student_name", "compare_school_name", "enable_facial_comparison")
        if not require_id and any(attrs.get(field, False) for field in dependent):
            raise serializers.ValidationError("Student ID processing and comparison must be disabled in Selfie-Only Mode.")
        if require_id and not (attrs.get("require_student_id_front", False) or attrs.get("require_student_id_back", False)):
            raise serializers.ValidationError("At least one Student ID side must be required.")
        if require_id and (not attrs.get("enable_student_id_information_extraction") or not attrs.get("compare_student_name")):
            raise serializers.ValidationError("Student ID mode requires information extraction and Student Name comparison.")
        if (attrs.get("compare_student_name") or attrs.get("compare_school_name")) and not attrs.get("enable_student_id_information_extraction"):
            raise serializers.ValidationError("Student ID information extraction is required for name or school comparison.")
        if attrs.get("enable_facial_comparison") and not attrs.get("require_student_id_front"):
            raise serializers.ValidationError("Student ID front is required for facial comparison.")
        return attrs


class Step2MediaUploadSerializer(serializers.Serializer):
    mediaType = serializers.ChoiceField(choices=(IdentityMediaType.STUDENT_ID_FRONT, IdentityMediaType.STUDENT_ID_BACK))
    file = serializers.FileField()


class RegistrationAttachmentUploadSerializer(serializers.Serializer):
    fieldName = serializers.CharField(max_length=120)
    file = serializers.FileField()


class RegistrationAttachmentSerializer(serializers.ModelSerializer):
    fieldKey = serializers.CharField(source="field_key", read_only=True)
    filename = serializers.CharField(source="original_filename", read_only=True)
    contentType = serializers.CharField(source="content_type", read_only=True)

    class Meta:
        model = StudentApplicationAdditionalAttachment
        fields = ("id", "section", "fieldKey", "filename", "contentType", "size", "created_at")
        read_only_fields = fields


class RegistrationIdentitySelfieUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


class RegistrationIdentitySelfieFaceValidationSerializer(serializers.Serializer):
    file = serializers.FileField()


class Step2ManualDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("PASS", "REJECT"))
    reason = serializers.CharField(max_length=1000)
