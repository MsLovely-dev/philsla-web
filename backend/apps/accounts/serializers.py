import re

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from rest_framework import serializers


LRN_PATTERN = re.compile(r"^\d{12}$")
OTP_PATTERN = re.compile(r"^\d{6}$")


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
