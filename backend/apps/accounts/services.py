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
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils.text import slugify
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework.exceptions import APIException

from .default_permissions import module_access_or_role_default
from .models import AccountProfile, AuthRefreshSession
from .roles import PortalRole, get_security_tier, get_user_role


class LoginFlowRejected(APIException):
    status_code = 401
    default_code = "authentication_failed"


class ActivationUnavailable(APIException):
    status_code = 409
    default_code = "conflict"


class AccountManagementConflict(APIException):
    status_code = 409
    default_code = "conflict"


@dataclass(frozen=True)
class AuthIssue:
    access_token: str
    refresh_token: str
    expires_at: str
    expires_in_seconds: int
    user_id: object


PENDING_IDENTIFIER_PREFIX = "auth:pending:identifier:"
PENDING_OTP_PREFIX = "auth:pending:otp:"
PENDING_STAFF_ACTIVATION_PREFIX = "auth:pending:staff-activation:"
ACCESS_TOKEN_PREFIX = "auth:access:"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


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


def _split_full_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split()
    if len(parts) <= 1:
        return full_name.strip(), ""
    return " ".join(parts[:-1]), parts[-1]


def _account_from_user(user: object, profile: AccountProfile | None = None) -> dict[str, Any] | None:
    if not getattr(user, "is_active", False):
        return None

    if profile is None:
        try:
            profile = getattr(user, "account_profile", None)
        except AccountProfile.DoesNotExist:
            profile = None

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


def _resolve_database_account_by_user_id(user_id: object) -> dict[str, Any] | None:
    user = (
        get_user_model()
        .objects.filter(id=user_id, is_active=True)
        .select_related("account_profile")
        .first()
    )
    if user is None:
        return None
    return _account_from_user(user)


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
    refresh_expires_at = timezone.now() + timedelta(seconds=refresh_ttl)
    session_account = _session_account(account)
    refresh_session = AuthRefreshSession.objects.create(
        user_id=session_account["user_id"],
        token_hash=_hash_token(refresh_token),
        account=session_account,
        expires_at=refresh_expires_at,
    )

    token_payload = {
        "account": session_account,
        "expires_at": expires_at.isoformat().replace("+00:00", "Z"),
        "refresh_session_id": refresh_session.id,
    }
    cache.set(f"{ACCESS_TOKEN_PREFIX}{access_token}", token_payload, expires_in_seconds)

    return AuthIssue(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=token_payload["expires_at"],
        expires_in_seconds=expires_in_seconds,
        user_id=session_account["user_id"],
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


def resolve_authenticated_account(user: object) -> dict[str, Any] | None:
    """Resolve server-side identity claims for bearer or Django-session users."""

    account = _account_from_user(user)
    if account is not None:
        return _session_account(account)

    role = get_user_role(user)
    if role is None or not getattr(user, "is_authenticated", False) or not getattr(user, "is_active", False):
        return None

    return {
        "id": str(getattr(user, "id", "")),
        "user_id": getattr(user, "id", ""),
        "email": getattr(user, "email", "") or "",
        "role": role,
        "security_tier": get_security_tier(role),
        "permissions": list(getattr(user, "api_permissions", []) or []),
        "scopes": dict(getattr(user, "scopes", {}) or {}),
    }


def list_admin_user_accounts(*, search: str = "", role: str = "") -> list[tuple[object, AccountProfile]]:
    """Return non-student accounts managed from System Admin user settings."""

    queryset = (
        AccountProfile.objects.select_related("user")
        .exclude(role=PortalRole.STUDENT.value)
        .filter(user__is_active=True)
        .order_by("user__first_name", "user__last_name", "user__email")
    )
    normalized_search = search.strip()
    if normalized_search:
        queryset = queryset.filter(
            Q(user__first_name__icontains=normalized_search)
            | Q(user__last_name__icontains=normalized_search)
            | Q(user__email__icontains=normalized_search)
            | Q(role__icontains=normalized_search)
        )
    normalized_role = role.strip().upper()
    if normalized_role:
        queryset = queryset.filter(role=normalized_role)

    return [(profile.user, profile) for profile in queryset]


@transaction.atomic
def create_admin_user_account(
    *,
    full_name: str,
    email: str,
    role: str,
    module_access: list[str],
    is_active: bool = True,
) -> tuple[object, AccountProfile]:
    UserModel = get_user_model()
    if UserModel.objects.filter(email__iexact=email).exists():
        raise AccountManagementConflict("This email is already assigned to an account.")

    first_name, last_name = _split_full_name(full_name)
    user = UserModel.objects.create(
        username=_unique_username(UserModel, base=email.split("@", 1)[0], fallback=full_name),
        email=email,
        first_name=first_name,
        last_name=last_name,
        is_active=is_active,
        is_staff=role == PortalRole.SYSTEM_ADMIN.value,
    )
    user.set_unusable_password()
    user.save(update_fields=["password"])
    profile = AccountProfile.objects.create(
        user=user,
        role=role,
        api_permissions=module_access_or_role_default(role, module_access),
    )
    return user, profile


@transaction.atomic
def update_admin_user_account(
    *,
    user_id: str,
    full_name: str,
    email: str,
    role: str,
    module_access: list[str],
    is_active: bool,
) -> tuple[object, AccountProfile]:
    UserModel = get_user_model()
    try:
        user = UserModel.objects.select_for_update().select_related("account_profile").get(id=user_id)
        profile = user.account_profile
    except (UserModel.DoesNotExist, AccountProfile.DoesNotExist, ValueError) as exc:
        raise AccountManagementConflict("The selected account could not be found.") from exc

    if profile.role == PortalRole.STUDENT.value:
        raise AccountManagementConflict("Student accounts cannot be managed from User & Role Settings.")

    first_name, last_name = _split_full_name(full_name)
    user.email = email
    user.first_name = first_name
    user.last_name = last_name
    user.is_active = is_active
    user.is_staff = role == PortalRole.SYSTEM_ADMIN.value
    user.save(update_fields=["email", "first_name", "last_name", "is_active", "is_staff"])

    profile.role = role
    profile.api_permissions = module_access_or_role_default(role, module_access)
    profile.save(update_fields=["role", "api_permissions", "updated_at"])
    return user, profile


@transaction.atomic
def deactivate_admin_user_account(*, user_id: str, actor: object) -> None:
    UserModel = get_user_model()
    if str(getattr(actor, "id", "")) == str(user_id):
        raise AccountManagementConflict("You cannot deactivate your own account.")

    try:
        user = UserModel.objects.select_for_update().select_related("account_profile").get(id=user_id)
        profile = user.account_profile
    except (UserModel.DoesNotExist, AccountProfile.DoesNotExist, ValueError) as exc:
        raise AccountManagementConflict("The selected account could not be found.") from exc

    if profile.role == PortalRole.STUDENT.value:
        raise AccountManagementConflict("Student accounts cannot be managed from User & Role Settings.")

    user.is_active = False
    user.save(update_fields=["is_active"])
    return None


def start_identifier_login(*, identifier: str) -> dict[str, Any]:
    """Resolve the login identifier and issue a Step-1 pending-auth token.

    Account data comes from Django's user table and AccountProfile records.
    Superusers without an explicit profile are treated as System Admins so the
    initial Django Admin account can operate the local platform.
    """

    account = _resolve_database_account(identifier)
    if account is None:
        raise LoginFlowRejected("Identifier not found or invalid. Please check and try again.")

    user = _get_user_for_account(account)
    if user is not None and account["role"] != PortalRole.STUDENT.value and not user.has_usable_password():
        activation_token = _new_token()
        ttl = _ttl_seconds(settings.AUTH_PENDING_TOKEN_TTL_MINUTES)
        cache.set(
            f"{PENDING_STAFF_ACTIVATION_PREFIX}{activation_token}",
            {"user_id": str(getattr(user, "id"))},
            ttl,
        )
        return {
            "activationToken": activation_token,
            "nextStep": "activation",
            "expiresInSeconds": ttl,
        }

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
    try:
        send_mail(
            subject="Your PhilSA login verification code",
            message=(
                f"Your PhilSA login verification code is {otp_code}. "
                f"This code expires in {settings.AUTH_OTP_TTL_MINUTES} minutes. "
                "If you did not request this code, reset your password or contact support."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[account["email"]],
            fail_silently=False,
        )
    except Exception as exc:
        cache.delete(f"{PENDING_OTP_PREFIX}{otp_pending_token}")
        raise LoginFlowRejected("We could not send the email verification code. Please try again.") from exc

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

    account = _resolve_database_account_by_user_id(token_payload["account"]["user_id"]) or token_payload["account"]
    user = SimpleNamespace(
        id=account["id"],
        email=account["email"],
        role=account["role"],
        api_permissions=account["permissions"],
        scopes=account["scopes"],
        is_authenticated=True,
        is_active=True,
    )
    auth = SimpleNamespace(
        token_id=access_token,
        expires_at=token_payload["expires_at"],
        refresh_session_id=token_payload.get("refresh_session_id"),
    )
    return user, auth


@transaction.atomic
def rotate_refresh_token(*, refresh_token: str | None) -> AuthIssue:
    """Rotate the refresh token and issue a new access token."""

    if not refresh_token:
        raise LoginFlowRejected("Your session has expired. Please log in again.")

    refresh_session = (
        AuthRefreshSession.objects.select_for_update()
        .filter(token_hash=_hash_token(refresh_token), revoked_at__isnull=True, expires_at__gt=timezone.now())
        .first()
    )
    if refresh_session is None:
        raise LoginFlowRejected("Your session has expired. Please log in again.")

    refresh_session.revoked_at = timezone.now()
    refresh_session.rotated_at = refresh_session.revoked_at
    refresh_session.save(update_fields=["revoked_at", "rotated_at"])
    account = _resolve_database_account_by_user_id(refresh_session.user_id) or refresh_session.account
    return _issue_tokens(account)


def revoke_current_session(*, user: object, auth: object) -> None:
    """Revoke the current session's refresh token and access-token family."""

    token_id = getattr(auth, "token_id", None)
    if token_id:
        cache.delete(f"{ACCESS_TOKEN_PREFIX}{token_id}")
    refresh_session_id = getattr(auth, "refresh_session_id", None)
    if refresh_session_id:
        AuthRefreshSession.objects.filter(id=refresh_session_id, revoked_at__isnull=True).update(revoked_at=timezone.now())
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

    pending_key = f"{PENDING_STAFF_ACTIVATION_PREFIX}{activation_token}"
    pending = cache.get(pending_key)
    if pending is None:
        raise LoginFlowRejected("This activation link has expired. Please request a new one from your administrator.")

    UserModel = get_user_model()
    try:
        user = UserModel.objects.select_related("account_profile").get(id=pending["user_id"], is_active=True)
        profile = user.account_profile
    except (UserModel.DoesNotExist, AccountProfile.DoesNotExist, ValueError) as exc:
        cache.delete(pending_key)
        raise LoginFlowRejected("This activation link has expired. Please request a new one from your administrator.") from exc

    if profile.role == PortalRole.STUDENT.value or user.has_usable_password():
        cache.delete(pending_key)
        raise LoginFlowRejected("This activation link has expired. Please request a new one from your administrator.")

    user.set_password(password)
    user.save(update_fields=["password"])
    cache.delete(pending_key)


def request_password_recovery(*, identifier: str) -> None:
    """Request a password recovery link without revealing account existence."""

    return None


def complete_password_recovery(*, recovery_token: str, password: str) -> None:
    """Complete password reset and revoke active sessions."""

    raise LoginFlowRejected("This recovery link has expired. Please request a new one.")


def request_admin_account_recovery(*, email: str, actor: object) -> None:
    """System Admin initiated staff/admin account recovery request."""

    return None
