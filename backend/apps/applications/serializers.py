from rest_framework import serializers

from apps.accounts.serializers import validate_password_policy

from .models import StudentApplication


class ApplicationSerializer(serializers.ModelSerializer):
    coursePreferences = serializers.JSONField(source="course_preferences", required=False)
    reviewStep = serializers.JSONField(source="review_step", required=False)
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    examCycleId = serializers.CharField(source="exam_cycle_id", read_only=True)

    class Meta:
        model = StudentApplication
        fields = (
            "id", "status", "personal", "address", "school", "coursePreferences",
            "reviewStep", "examCycleId", "version", "submittedAt", "createdAt", "updatedAt",
        )
        read_only_fields = ("id", "status", "examCycleId", "version", "submittedAt", "createdAt", "updatedAt")

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
    lrn = serializers.RegexField(
        regex=r"^\d{12}$",
        error_messages={
            "invalid": "Please enter a valid 12-digit LRN.",
            "blank": "Please enter your LRN and Date of Birth.",
            "required": "Please enter your LRN and Date of Birth.",
        },
    )
    dateOfBirth = serializers.DateField(
        error_messages={
            "invalid": "Please enter a valid Date of Birth.",
            "required": "Please enter your LRN and Date of Birth.",
        }
    )


class ApplicationCreateSerializer(ApplicationSerializer):
    verificationToken = serializers.CharField(write_only=True, trim_whitespace=False)
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
