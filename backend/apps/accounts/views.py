from datetime import datetime
from typing import Any

from rest_framework.response import Response
from rest_framework.views import APIView

from .roles import get_security_tier, get_user_role
from .serializers import IdentifierLoginSerializer, OtpLoginSerializer, PasswordLoginSerializer, TokenRevocationSerializer
from .services import (
    revoke_current_session,
    revoke_tokens,
    rotate_refresh_token,
    start_identifier_login,
    verify_login_otp,
    verify_login_password,
)


def _json_datetime(value: object) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, str):
        return value
    return None


def _string_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, (list, tuple, set, frozenset)):
        return sorted(str(item) for item in value)
    return []


def _scope_claims(value: object) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


class CurrentSessionView(APIView):
    """Return server-derived identity, role, permission, and scope claims."""

    def get(self, request) -> Response:
        user = request.user
        role = get_user_role(user)

        return Response(
            {
                "user": {
                    "id": str(getattr(user, "id", "")),
                    "role": role,
                    "securityTier": get_security_tier(role),
                    "permissions": _string_list(getattr(user, "api_permissions", None)),
                    "scopes": _scope_claims(getattr(user, "scopes", None)),
                },
                "session": {
                    "authenticated": True,
                    "expiresAt": _json_datetime(getattr(request.auth, "expires_at", None)),
                },
            }
        )


class IdentifierLoginView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []

    def post(self, request) -> Response:
        serializer = IdentifierLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        start_identifier_login(identifier=serializer.validated_data["identifier"])
        return Response(status=202)


class PasswordLoginView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []

    def post(self, request) -> Response:
        serializer = PasswordLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        verify_login_password(
            pending_auth_token=serializer.validated_data["pendingAuthToken"],
            password=serializer.validated_data["password"],
        )
        return Response(status=202)


class OtpLoginView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []

    def post(self, request) -> Response:
        serializer = OtpLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        verify_login_otp(
            otp_pending_auth_token=serializer.validated_data["otpPendingAuthToken"],
            code=serializer.validated_data["code"],
        )
        return Response(status=200)


class LogoutView(APIView):
    def post(self, request) -> Response:
        revoke_current_session(user=request.user, auth=request.auth)
        response = Response(status=204)
        response.delete_cookie("refreshToken", samesite="Strict")
        return response


class RefreshTokenView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []

    def post(self, request) -> Response:
        rotate_refresh_token(refresh_token=request.COOKIES.get("refreshToken"))
        return Response(status=200)


class TokenRevocationView(APIView):
    def post(self, request) -> Response:
        serializer = TokenRevocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        revoke_tokens(user=request.user, scope=serializer.validated_data["scope"])
        return Response(status=204)
