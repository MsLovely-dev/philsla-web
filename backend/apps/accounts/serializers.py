import re

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from rest_framework import serializers

from .models import AccountProfile
from .roles import PortalRole

LRN_PATTERN = re.compile(r"^\d{12}$")
OTP_PATTERN = re.compile(r"^\d{6}$")
PASSWORD_SPECIAL_PATTERN = re.compile(r"[^A-Za-z0-9]")
ADMIN_MANAGED_ROLES = tuple((role.value, role.value) for role in PortalRole if role != PortalRole.STUDENT)


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


class LoginSelfieSerializer(serializers.Serializer):
    selfiePendingAuthToken = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "Your selfie verification session has expired. Please start again.",
            "required": "Your selfie verification session has expired. Please start again.",
        },
    )
    file = serializers.FileField(
        error_messages={
            "blank": "Capture a selfie before continuing.",
            "required": "Capture a selfie before continuing.",
        },
    )

    def validate_file(self, value):
        content_type = getattr(value, "content_type", "")
        if content_type not in {"image/jpeg", "image/png"}:
            raise serializers.ValidationError("Selfie image must be a JPEG or PNG file.")
        if getattr(value, "size", 0) <= 0:
            raise serializers.ValidationError("Capture a selfie before continuing.")
        return value


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


class AdminUserAccountSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    fullName = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.ChoiceField(choices=ADMIN_MANAGED_ROLES, read_only=True)
    moduleAccess = serializers.ListField(child=serializers.CharField(), read_only=True)
    isActive = serializers.BooleanField(read_only=True)
    createdAt = serializers.DateTimeField(read_only=True)
    updatedAt = serializers.DateTimeField(read_only=True)


class AdminUserAccountWriteSerializer(serializers.Serializer):
    fullName = serializers.CharField(
        trim_whitespace=True,
        max_length=150,
        error_messages={
            "blank": "Full name is required.",
            "required": "Full name is required.",
        },
    )
    email = serializers.EmailField(
        error_messages={
            "blank": "Enter a valid email address.",
            "invalid": "Enter a valid email address.",
            "required": "Enter a valid email address.",
        }
    )
    role = serializers.ChoiceField(
        choices=ADMIN_MANAGED_ROLES,
        error_messages={
            "invalid_choice": "Select a supported staff or administrator role.",
            "required": "Role is required.",
        },
    )
    moduleAccess = serializers.ListField(
        child=serializers.CharField(trim_whitespace=True, max_length=80),
        required=False,
        allow_empty=True,
    )
    isActive = serializers.BooleanField(required=False)

    def validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        queryset = get_user_model().objects.filter(email__iexact=normalized)
        instance = self.context.get("user")
        if instance is not None:
            queryset = queryset.exclude(id=instance.id)
        if queryset.exists():
            raise serializers.ValidationError("This email is already assigned to an account.")
        return normalized

    def validate_moduleAccess(self, value: list[str]) -> list[str]:
        modules: list[str] = []
        seen: set[str] = set()
        for item in value:
            normalized = re.sub(r"\s+", "_", item.strip().upper())
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            modules.append(normalized)
        return modules


def serialize_admin_user_account(user: object, profile: AccountProfile | None = None) -> dict[str, object]:
    if profile is None:
        profile = getattr(user, "account_profile")

    full_name = str(getattr(user, "get_full_name")()).strip()
    return {
        "id": str(getattr(user, "id")),
        "fullName": full_name or getattr(user, "username", ""),
        "email": getattr(user, "email", "") or "",
        "role": profile.role,
        "moduleAccess": list(profile.api_permissions or []),
        "isActive": bool(getattr(user, "is_active", False)),
        "createdAt": getattr(user, "date_joined", None),
        "updatedAt": profile.updated_at,
    }
