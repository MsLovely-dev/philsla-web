from rest_framework import serializers

from apps.accounts.serializers import validate_password_policy

from .models import (
    IdentityMediaType,
    Step2VerificationConfiguration,
    StudentApplication,
)


class ApplicationSerializer(serializers.ModelSerializer):
    coursePreferences = serializers.JSONField(source="course_preferences", required=False)
    reviewStep = serializers.JSONField(source="review_step", required=False)
    lrnProfile = serializers.SerializerMethodField()
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    examCycleId = serializers.CharField(source="exam_cycle_id", read_only=True)

    class Meta:
        model = StudentApplication
        fields = (
            "id", "status", "personal", "address", "school", "coursePreferences",
            "reviewStep", "lrnProfile", "examCycleId", "version", "submittedAt", "createdAt", "updatedAt",
        )
        read_only_fields = ("id", "status", "lrnProfile", "examCycleId", "version", "submittedAt", "createdAt", "updatedAt")

    def get_lrnProfile(self, obj):
        verification = getattr(obj, "step2_verification", None)
        if verification is None:
            return {}
        return verification.lrn_profile or {}

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


class ReviewerDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("APPROVE", "REQUEST_CORRECTION", "REJECT"))
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    requiredCorrections = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        allow_empty=True,
    )


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


class ApplicationCreateSerializer(ApplicationSerializer):
    verificationToken = serializers.CharField(write_only=True, trim_whitespace=False, required=False, allow_blank=True)
    submitOnCreate = serializers.BooleanField(write_only=True, required=False, default=False)
    password = serializers.CharField(
        write_only=True,
        required=False,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    class Meta(ApplicationSerializer.Meta):
        fields = ApplicationSerializer.Meta.fields + ("verificationToken", "submitOnCreate", "password")

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


class RegistrationIdentitySelfieUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


class RegistrationIdentitySelfieFaceValidationSerializer(serializers.Serializer):
    file = serializers.FileField()


class Step2ManualDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("PASS", "REJECT"))
    reason = serializers.CharField(max_length=1000)
