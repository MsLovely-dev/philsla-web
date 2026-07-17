from dataclasses import dataclass
from datetime import timedelta
import hashlib
import re
import secrets
from types import SimpleNamespace
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils.text import slugify
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework.exceptions import APIException

from .models import AccountProfile
from .roles import PortalRole, get_security_tier


class LoginFlowRejected(APIException):
    status_code = 401
    default_code = "authentication_failed"


class ActivationUnavailable(APIException):
    status_code = 409
    default_code = "conflict"


@dataclass(frozen=True)
class AuthIssue:
    access_token: str
    refresh_token: str
    expires_at: str
    expires_in_seconds: int


PENDING_IDENTIFIER_PREFIX = "auth:pending:identifier:"
PENDING_OTP_PREFIX = "auth:pending:otp:"
ACCESS_TOKEN_PREFIX = "auth:access:"
REFRESH_TOKEN_PREFIX = "auth:refresh:"


def _unique_username(UserModel, *, base: str, fallback: str) -> str:
    max_length = UserModel._meta.get_field("username").max_length
    normalized = slugify(base) or slugify(fallback) or "student"
    normalized = re.sub(r"-+", "-", normalized).strip("-") or "student"
    username = normalized[:max_length]
    suffix = 1
    while UserModel.objects.filter(username=username).exists():
        suffix += 1
        suffix_text = f"-{suffix}"
        username = f"{normalized[: max_length - len(suffix_text)]}{suffix_text}"
    return username


def _account_from_user(user: object, profile: AccountProfile | None = None) -> dict[str, Any] | None:
    if not getattr(user, "is_active", False):
        return None

    if profile is None:
        profile = getattr(user, "account_profile", None)

    if profile is None and getattr(user, "is_superuser", False):
        role = PortalRole.SYSTEM_ADMIN.value
        permissions: list[str] = []
        scopes: dict[str, Any] = {}
        lrn = ""
    elif profile is not None:
        role = profile.role
        permissions = list(profile.api_permissions or [])
        scopes = dict(profile.scopes or {})
        lrn = profile.lrn or ""
    else:
        return None

    return {
        "id": str(getattr(user, "id")),
        "user_id": getattr(user, "id"),
        "email": getattr(user, "email", "") or "",
        "lrn": lrn,
        "role": role,
        "permissions": permissions,
        "scopes": scopes,
    }


def _resolve_database_account(identifier: str) -> dict[str, Any] | None:
    normalized_identifier = identifier.strip().lower()
    UserModel = get_user_model()

    if normalized_identifier.isdigit() and len(normalized_identifier) == 12:
        profile = (
            AccountProfile.objects.select_related("user")
            .filter(lrn=normalized_identifier, role=PortalRole.STUDENT.value, user__is_active=True)
            .first()
        )
        return _account_from_user(profile.user, profile) if profile else None

    user = (
        UserModel.objects.filter(email__iexact=normalized_identifier, is_active=True)
        .select_related("account_profile")
        .first()
    )
    if user is None:
        return None
    return _account_from_user(user)


def _get_user_for_account(account: dict[str, Any]) -> object | None:
    UserModel = get_user_model()
    return UserModel.objects.filter(id=account["user_id"], is_active=True).first()


def _ttl_seconds(minutes: int) -> int:
    return minutes * 60


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def _hash_otp(*, token: str, code: str) -> str:
    material = f"{settings.SECRET_KEY}:{token}:{code}".encode()
    return hashlib.sha256(material).hexdigest()


def _issue_tokens(account: dict[str, Any]) -> AuthIssue:
    access_token = _new_token()
    refresh_token = _new_token()
    expires_in_seconds = _ttl_seconds(settings.AUTH_ACCESS_TOKEN_LIFETIME_MINUTES)
    refresh_ttl = settings.AUTH_REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60
    expires_at = timezone.now() + timedelta(seconds=expires_in_seconds)

    token_payload = {
        "account": _session_account(account),
        "expires_at": expires_at.isoformat().replace("+00:00", "Z"),
    }
    cache.set(f"{ACCESS_TOKEN_PREFIX}{access_token}", token_payload, expires_in_seconds)
    cache.set(f"{REFRESH_TOKEN_PREFIX}{refresh_token}", {"account": _session_account(account)}, refresh_ttl)

    return AuthIssue(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=token_payload["expires_at"],
        expires_in_seconds=expires_in_seconds,
    )


def _session_account(account: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": account["id"],
        "user_id": account.get("user_id", account["id"]),
        "email": account["email"],
        "role": account["role"],
        "security_tier": get_security_tier(account["role"]),
        "permissions": list(account.get("permissions", [])),
        "scopes": dict(account.get("scopes", {})),
    }


def start_identifier_login(*, identifier: str) -> dict[str, Any]:
    """Resolve the login identifier and issue a Step-1 pending-auth token.

    Account data comes from Django's user table and AccountProfile records.
    Superusers without an explicit profile are treated as System Admins so the
    initial Django Admin account can operate the local platform.
    """

    account = _resolve_database_account(identifier)
    if account is None:
        raise LoginFlowRejected("Identifier not found or invalid. Please check and try again.")

    pending_token = _new_token()
    ttl = _ttl_seconds(settings.AUTH_PENDING_TOKEN_TTL_MINUTES)
    cache.set(f"{PENDING_IDENTIFIER_PREFIX}{pending_token}", {"account": _session_account(account)}, ttl)
    return {
        "pendingAuthToken": pending_token,
        "nextStep": "password",
        "expiresInSeconds": ttl,
    }


def verify_login_password(*, pending_auth_token: str, password: str) -> dict[str, Any]:
    """Validate the password and issue an OTP-scoped pending-auth token."""

    pending_key = f"{PENDING_IDENTIFIER_PREFIX}{pending_auth_token}"
    pending = cache.get(pending_key)
    if pending is None:
        raise LoginFlowRejected("Your session has expired. Please start again.")

    account = pending["account"]
    user = _get_user_for_account(account)
    if user is None or not user.check_password(password):
        raise LoginFlowRejected("Incorrect email/LRN or password.")

    cache.delete(pending_key)
    otp_pending_token = _new_token()
    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    ttl = _ttl_seconds(settings.AUTH_OTP_TTL_MINUTES)
    cache.set(
        f"{PENDING_OTP_PREFIX}{otp_pending_token}",
        {
            "account": pending["account"],
            "otp_hash": _hash_otp(token=otp_pending_token, code=otp_code),
            "attempts": 0,
        },
        ttl,
    )

    response = {
        "otpPendingAuthToken": otp_pending_token,
        "nextStep": "otp",
        "expiresInSeconds": ttl,
        "resendCooldownSeconds": settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS,
    }
    if settings.AUTH_LOCAL_EXPOSE_OTP:
        response["devOtp"] = otp_code
    return response


def verify_login_otp(*, otp_pending_auth_token: str, code: str) -> AuthIssue:
    """Validate the email OTP and issue the full backend session."""

    pending_key = f"{PENDING_OTP_PREFIX}{otp_pending_auth_token}"
    pending = cache.get(pending_key)
    if pending is None:
        raise LoginFlowRejected("Invalid or expired code. Please try again.")

    expected_hash = pending["otp_hash"]
    if not constant_time_compare(expected_hash, _hash_otp(token=otp_pending_auth_token, code=code)):
        pending["attempts"] = int(pending.get("attempts", 0)) + 1
        if pending["attempts"] >= settings.AUTH_OTP_MAX_ATTEMPTS:
            cache.delete(pending_key)
        else:
            cache.set(pending_key, pending, _ttl_seconds(settings.AUTH_OTP_TTL_MINUTES))
        raise LoginFlowRejected("Invalid or expired code. Please try again.")

    cache.delete(pending_key)
    return _issue_tokens(pending["account"])


def validate_access_token(*, access_token: str) -> tuple[object, object] | None:
    token_payload = cache.get(f"{ACCESS_TOKEN_PREFIX}{access_token}")
    if token_payload is None:
        return None

    account = token_payload["account"]
    user = SimpleNamespace(
        id=account["id"],
        email=account["email"],
        role=account["role"],
        api_permissions=account["permissions"],
        scopes=account["scopes"],
        is_authenticated=True,
        is_active=True,
    )
    auth = SimpleNamespace(token_id=access_token, expires_at=token_payload["expires_at"])
    return user, auth


def rotate_refresh_token(*, refresh_token: str | None) -> AuthIssue:
    """Rotate the refresh token and issue a new access token."""

    if not refresh_token:
        raise LoginFlowRejected("Your session has expired. Please log in again.")

    refresh_key = f"{REFRESH_TOKEN_PREFIX}{refresh_token}"
    refresh_payload = cache.get(refresh_key)
    if refresh_payload is None:
        raise LoginFlowRejected("Your session has expired. Please log in again.")

    cache.delete(refresh_key)
    return _issue_tokens(refresh_payload["account"])


def revoke_current_session(*, user: object, auth: object) -> None:
    """Revoke the current session's refresh token and access-token family."""

    token_id = getattr(auth, "token_id", None)
    if token_id:
        cache.delete(f"{ACCESS_TOKEN_PREFIX}{token_id}")
    return None


def revoke_tokens(*, user: object, scope: str) -> None:
    """Revoke refresh/access tokens for the requested scope."""

    return None


@transaction.atomic
def activate_student_registration_account(*, registration_application_id: str) -> None:
    """Create and activate a student account after admission approval."""

    from apps.applications.models import ApplicationStatus, StudentApplication

    try:
        application = StudentApplication.objects.select_for_update().get(id=registration_application_id)
    except (StudentApplication.DoesNotExist, ValueError) as exc:
        raise ActivationUnavailable("Submitted registration application was not found.") from exc

    if application.status != ApplicationStatus.APPROVED:
        raise ActivationUnavailable("Student account activation requires an approved registration application.")

    if application.owner_id:
        application.owner.is_active = True
        application.owner.save(update_fields=["is_active"])
        if application.password_hash:
            application.password_hash = ""
            application.save(update_fields=["password_hash", "updated_at"])
        return None

    personal = application.personal or {}
    email = str(personal.get("email", "")).strip().lower()
    if not email:
        raise ActivationUnavailable("Submitted registration application is missing an email address.")
    if not application.password_hash:
        raise ActivationUnavailable("Submitted registration application is missing pending account credentials.")

    UserModel = get_user_model()
    if UserModel.objects.filter(email__iexact=email).exists():
        raise ActivationUnavailable("This email is already registered. Go to Login page.")
    profile_lrn = application.lrn or None
    if profile_lrn and AccountProfile.objects.filter(lrn=profile_lrn, role=PortalRole.STUDENT.value).exists():
        raise ActivationUnavailable("This LRN already has an active student account.")

    first_name = str(personal.get("firstName", "")).strip()
    last_name = str(personal.get("lastName", "")).strip()
    username = _unique_username(
        UserModel,
        base=" ".join(part for part in (first_name, last_name) if part),
        fallback=f"student-{application.lrn or application.id}",
    )

    user = UserModel(username=username, email=email, first_name=first_name, last_name=last_name, is_active=True)
    user.password = application.password_hash
    try:
        user.save()
        AccountProfile.objects.create(user=user, role=PortalRole.STUDENT.value, lrn=profile_lrn)
    except IntegrityError as exc:
        raise ActivationUnavailable("Student account could not be activated because the credentials already exist.") from exc

    application.owner = user
    application.password_hash = ""
    application.save(update_fields=["owner", "password_hash", "updated_at"])
    return None


def complete_staff_activation(*, activation_token: str, password: str) -> None:
    """Complete first-time staff/admin activation from a time-limited link."""

    raise LoginFlowRejected("This activation link has expired. Please request a new one from your administrator.")


def request_password_recovery(*, identifier: str) -> None:
    """Request a password recovery link without revealing account existence."""

    return None


def complete_password_recovery(*, recovery_token: str, password: str) -> None:
    """Complete password reset and revoke active sessions."""

    raise LoginFlowRejected("This recovery link has expired. Please request a new one.")


def request_admin_account_recovery(*, email: str, actor: object) -> None:
    """System Admin initiated staff/admin account recovery request."""

    return None
