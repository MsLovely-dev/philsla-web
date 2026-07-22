from datetime import datetime
from typing import Any

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit import record_auth_event
from .permissions import RoleRequiredPermission, require_roles
from .roles import PortalRole, get_security_tier, get_user_role
from .serializers import (
    IdentifierLoginSerializer,
    OtpLoginSerializer,
    AdminAccountRecoveryRequestSerializer,
    PasswordLoginSerializer,
    PasswordRecoveryCompletionSerializer,
    PasswordRecoveryRequestSerializer,
    StaffActivationCompletionSerializer,
    StudentRegistrationActivationSerializer,
    TokenRevocationSerializer,
)
from .services import (
    LoginFlowRejected,
    activate_student_registration_account,
    complete_staff_activation,
    complete_password_recovery,
    request_admin_account_recovery,
    request_password_recovery,
    revoke_current_session,
    revoke_tokens,
    rotate_refresh_token,
    start_identifier_login,
    verify_login_otp,
    verify_login_password,
)
from .throttling import AuthScopedRateThrottle


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


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        "refreshToken",
        refresh_token,
        max_age=settings.AUTH_REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="Strict",
    )


class CurrentSessionView(APIView):
    """Return server-derived identity, role, permission, and scope claims."""

    def get(self, request) -> Response:
        user = request.user
        role = get_user_role(user)

        return Response(
            {
                "user": {
                    "id": str(getattr(user, "id", "")),
                    "email": str(getattr(user, "email", "")),
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
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_identifier"

    def post(self, request) -> Response:
        serializer = IdentifierLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = start_identifier_login(identifier=serializer.validated_data["identifier"])
        except LoginFlowRejected:
            record_auth_event(event="auth.identifier_submitted", outcome="rejected", request=request)
            raise
        record_auth_event(event="auth.identifier_submitted", outcome="accepted", request=request)
        return Response(result, status=202)


class PasswordLoginView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_sensitive"

    def post(self, request) -> Response:
        serializer = PasswordLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = verify_login_password(
                pending_auth_token=serializer.validated_data["pendingAuthToken"],
                password=serializer.validated_data["password"],
            )
        except LoginFlowRejected:
            record_auth_event(event="auth.password_submitted", outcome="rejected", request=request)
            raise
        record_auth_event(event="auth.password_submitted", outcome="accepted", request=request)
        return Response(result, status=202)


class OtpLoginView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_sensitive"

    def post(self, request) -> Response:
        serializer = OtpLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            issue = verify_login_otp(
                otp_pending_auth_token=serializer.validated_data["otpPendingAuthToken"],
                code=serializer.validated_data["code"],
            )
        except LoginFlowRejected:
            record_auth_event(event="auth.otp_submitted", outcome="rejected", request=request)
            raise
        record_auth_event(event="auth.otp_submitted", outcome="accepted", request=request)
        response = Response(
            {
                "accessToken": issue.access_token,
                "tokenType": "Bearer",
                "expiresInSeconds": issue.expires_in_seconds,
                "expiresAt": issue.expires_at,
            },
            status=200,
        )
        _set_refresh_cookie(response, issue.refresh_token)
        return response


class LogoutView(APIView):
    def post(self, request) -> Response:
        revoke_current_session(user=request.user, auth=request.auth)
        response = Response(status=204)
        response.delete_cookie("refreshToken", samesite="Strict")
        return response


class RefreshTokenView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_refresh"

    def post(self, request) -> Response:
        issue = rotate_refresh_token(refresh_token=request.COOKIES.get("refreshToken"))
        record_auth_event(event="auth.token_refresh", outcome="accepted", request=request)
        response = Response(
            {
                "accessToken": issue.access_token,
                "tokenType": "Bearer",
                "expiresInSeconds": issue.expires_in_seconds,
                "expiresAt": issue.expires_at,
            },
            status=200,
        )
        _set_refresh_cookie(response, issue.refresh_token)
        return response


class TokenRevocationView(APIView):
    def post(self, request) -> Response:
        serializer = TokenRevocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        revoke_tokens(user=request.user, scope=serializer.validated_data["scope"])
        return Response(status=204)


class StudentRegistrationActivationView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.ADMISSIONS_REVIEWER, PortalRole.SYSTEM_ADMIN)

    def post(self, request) -> Response:
        serializer = StudentRegistrationActivationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        activate_student_registration_account(
            registration_application_id=serializer.validated_data["registrationApplicationId"],
        )
        return Response(status=201)


class StaffActivationCompletionView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_sensitive"

    def post(self, request) -> Response:
        serializer = StaffActivationCompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record_auth_event(event="auth.staff_activation_complete", outcome="rejected", request=request)
        complete_staff_activation(
            activation_token=serializer.validated_data["activationToken"],
            password=serializer.validated_data["password"],
        )
        return Response(status=204)


class PasswordRecoveryRequestView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_recovery"

    def post(self, request) -> Response:
        serializer = PasswordRecoveryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record_auth_event(event="auth.password_recovery_requested", outcome="accepted", request=request)
        request_password_recovery(identifier=serializer.validated_data["identifier"])
        return Response(
            {
                "detail": "If the account can be recovered, instructions will be sent to the verified email address."
            },
            status=202,
        )


class PasswordRecoveryCompletionView(APIView):
    authentication_classes: list[type] = []
    permission_classes: list[type] = []
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_sensitive"

    def post(self, request) -> Response:
        serializer = PasswordRecoveryCompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record_auth_event(event="auth.password_recovery_completed", outcome="rejected", request=request)
        complete_password_recovery(
            recovery_token=serializer.validated_data["recoveryToken"],
            password=serializer.validated_data["password"],
        )
        return Response(status=204)


class AdminAccountRecoveryRequestView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.SYSTEM_ADMIN)

    def post(self, request) -> Response:
        serializer = AdminAccountRecoveryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request_admin_account_recovery(email=serializer.validated_data["email"], actor=request.user)
        return Response(
            {
                "detail": "If the account can be recovered, instructions will be sent to the verified email address."
            },
            status=202,
        )
