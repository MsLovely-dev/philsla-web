import re

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from rest_framework import serializers


LRN_PATTERN = re.compile(r"^\d{12}$")
OTP_PATTERN = re.compile(r"^\d{6}$")
PASSWORD_SPECIAL_PATTERN = re.compile(r"[^A-Za-z0-9]")


def _is_email(value: str) -> bool:
    try:
        validate_email(value)
    except DjangoValidationError:
        return False
    return True


class IdentifierLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "Please enter your LRN or email address.",
            "required": "Please enter your LRN or email address.",
        },
    )

    def validate_identifier(self, value: str) -> str:
        if LRN_PATTERN.fullmatch(value) or _is_email(value):
            return value
        raise serializers.ValidationError("Enter a valid LRN or email address.")


class PasswordLoginSerializer(serializers.Serializer):
    pendingAuthToken = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "Your session has expired. Please start again.",
            "required": "Your session has expired. Please start again.",
        },
    )
    password = serializers.CharField(
        trim_whitespace=False,
        error_messages={
            "blank": "Please enter your password.",
            "required": "Please enter your password.",
        },
    )


class OtpLoginSerializer(serializers.Serializer):
    otpPendingAuthToken = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "Your session has expired. Please start again.",
            "required": "Your session has expired. Please start again.",
        },
    )
    code = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "Please enter the 6-digit code sent to your email.",
            "required": "Please enter the 6-digit code sent to your email.",
        },
    )

    def validate_code(self, value: str) -> str:
        if OTP_PATTERN.fullmatch(value):
            return value
        raise serializers.ValidationError("Please enter the 6-digit code sent to your email.")


class TokenRevocationSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=("current", "all"), default="current", required=False)


def validate_password_policy(value: str) -> str:
    if len(value) < 8:
        raise serializers.ValidationError("Password must be at least 8 characters long.")
    if not any(character.isupper() for character in value):
        raise serializers.ValidationError("Password must include at least one uppercase letter.")
    if not any(character.islower() for character in value):
        raise serializers.ValidationError("Password must include at least one lowercase letter.")
    if not any(character.isdigit() for character in value):
        raise serializers.ValidationError("Password must include at least one number.")
    if PASSWORD_SPECIAL_PATTERN.search(value) is None:
        raise serializers.ValidationError("Password must include at least one special character.")
    return value


class StudentRegistrationActivationSerializer(serializers.Serializer):
    registrationApplicationId = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "Registration application ID is required.",
            "required": "Registration application ID is required.",
        },
    )


class StaffActivationCompletionSerializer(serializers.Serializer):
    activationToken = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "This activation link has expired. Please request a new one from your administrator.",
            "required": "This activation link has expired. Please request a new one from your administrator.",
        },
    )
    password = serializers.CharField(
        trim_whitespace=False,
        error_messages={
            "blank": "Please enter your password.",
            "required": "Please enter your password.",
        },
    )
    confirmPassword = serializers.CharField(
        trim_whitespace=False,
        error_messages={
            "blank": "Please confirm your password.",
            "required": "Please confirm your password.",
        },
    )

    def validate_password(self, value: str) -> str:
        return validate_password_policy(value)

    def validate(self, attrs: dict[str, str]) -> dict[str, str]:
        if attrs["password"] != attrs["confirmPassword"]:
            raise serializers.ValidationError({"confirmPassword": "Passwords do not match."})
        return attrs


class PasswordRecoveryRequestSerializer(IdentifierLoginSerializer):
    pass


class PasswordRecoveryCompletionSerializer(serializers.Serializer):
    recoveryToken = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "This recovery link has expired. Please request a new one.",
            "required": "This recovery link has expired. Please request a new one.",
        },
    )
    password = serializers.CharField(
        trim_whitespace=False,
        error_messages={
            "blank": "Please enter your password.",
            "required": "Please enter your password.",
        },
    )
    confirmPassword = serializers.CharField(
        trim_whitespace=False,
        error_messages={
            "blank": "Please confirm your password.",
            "required": "Please confirm your password.",
        },
    )

    def validate_password(self, value: str) -> str:
        return validate_password_policy(value)

    def validate(self, attrs: dict[str, str]) -> dict[str, str]:
        if attrs["password"] != attrs["confirmPassword"]:
            raise serializers.ValidationError({"confirmPassword": "Passwords do not match."})
        return attrs


class AdminAccountRecoveryRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(
        error_messages={
            "blank": "Enter a valid email address.",
            "invalid": "Enter a valid email address.",
            "required": "Enter a valid email address.",
        }
    )
