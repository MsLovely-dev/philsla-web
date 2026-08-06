from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import hashlib
import re
import secrets
import time
from types import SimpleNamespace
from typing import Any
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils.text import slugify
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.utils.dateparse import parse_datetime
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from .audit import record_auth_event
from .models import (
    AccountProfile,
    AuthRefreshSession,
    LoginSelfieLog,
    PasswordLoginLockout,
    PasswordRecoveryToken,
)
from .permission_codes import (
    default_role_permission_codes,
    ensure_account_assignment,
    replace_account_permission_differences,
    replace_role_permissions,
    resolve_account_permission_codes,
)
from .roles import PortalRole, get_security_tier, get_user_role, normalize_role


class LoginFlowRejected(APIException):
    status_code = 401
    default_code = "authentication_failed"


class LoginOtpCooldown(APIException):
    status_code = 429
    default_code = "otp_cooldown"

    def __init__(self, detail: str | None = None, *, retry_after_seconds: int | None = None) -> None:
        super().__init__(detail)
        self.error_meta = {"retryAfterSeconds": retry_after_seconds} if retry_after_seconds is not None else {}


class LoginOtpRateLimited(APIException):
    status_code = 429
    default_code = "otp_rate_limited"

    def __init__(self, detail: str | None = None, *, retry_after_seconds: int | None = None) -> None:
        super().__init__(detail or "Please wait before requesting another code.")
        self.error_meta = {"retryAfterSeconds": retry_after_seconds} if retry_after_seconds is not None else {}


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
PENDING_SELFIE_PREFIX = "auth:pending:selfie:"
PENDING_STAFF_ACTIVATION_PREFIX = "auth:pending:staff-activation:"
JWT_ACCESS_TOKEN_BLOCKLIST_PREFIX = "auth:jwt:blocklist:access:"
JWT_USER_REVOKED_AT_PREFIX = "auth:jwt:revoked-at:user:"
OTP_ACCOUNT_RATE_PREFIX = "auth:otp-rate:account:"
OTP_IP_RATE_PREFIX = "auth:otp-rate:ip:"
OTP_IP_CONFIRMED_ABUSE_PREFIX = "auth:otp-ip-confirmed-abuse:"
PASSWORD_RECOVERY_LINK_PATH = "/reset-password"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _access_blocklist_key(token: str) -> str:
    return f"{JWT_ACCESS_TOKEN_BLOCKLIST_PREFIX}{_hash_token(token)}"


def _user_revoked_at_key(user_id: object) -> str:
    return f"{JWT_USER_REVOKED_AT_PREFIX}{user_id}"


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
        permissions = resolve_account_permission_codes(profile)
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


def _json_expiration(token: AccessToken | RefreshToken) -> str:
    expires_at = datetime.fromtimestamp(token["exp"], tz=UTC)
    return expires_at.isoformat().replace("+00:00", "Z")


def _issue_access_jwt(*, account: dict[str, Any], refresh_session_id: int) -> str:
    token = AccessToken()
    token["user_id"] = str(account["user_id"])
    token["account_id"] = str(account["id"])
    token["refresh_session_id"] = refresh_session_id
    return str(token)


def _issue_refresh_jwt(*, account: dict[str, Any], refresh_session_id: int) -> str:
    token = RefreshToken()
    token["user_id"] = str(account["user_id"])
    token["refresh_session_id"] = refresh_session_id
    return str(token)


def _decode_access_jwt(access_token: str) -> AccessToken | None:
    try:
        return AccessToken(access_token)
    except TokenError:
        return None


def _decode_refresh_jwt(refresh_token: str) -> RefreshToken | None:
    try:
        return RefreshToken(refresh_token)
    except TokenError:
        return None


def _hash_otp(*, token: str, code: str) -> str:
    material = f"{settings.SECRET_KEY}:{token}:{code}".encode()
    return hashlib.sha256(material).hexdigest()


def _login_otp_plain_message(*, code: str) -> str:
    return (
        f"Your PhilSLA login verification code is {code}. "
        f"This code expires in {settings.AUTH_OTP_TTL_MINUTES} minutes. "
        "If you did not request this code, reset your password or contact support."
    )


def _login_otp_html_message(*, code: str) -> str:
    return f"""\
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;background:#ffffff;border:1px solid #d9dde5;border-radius:20px;">
            <tr>
              <td style="padding:46px 48px 28px;text-align:center;">
                <div style="display:inline-block;text-align:left;">
                  <div style="font-size:72px;line-height:0.9;font-weight:800;letter-spacing:0;font-family:Arial Black,Arial,Helvetica,sans-serif;">
                    <span style="color:#18345c;">Phil</span><span style="color:#a5162d;">SLA</span>
                  </div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">
                    <tr>
                      <td width="34%" style="height:8px;background:#18345c;font-size:0;line-height:0;">&nbsp;</td>
                      <td width="33%" style="height:8px;background:#dfb52d;font-size:0;line-height:0;">&nbsp;</td>
                      <td width="33%" style="height:8px;background:#a5162d;font-size:0;line-height:0;">&nbsp;</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 50px 36px;font-size:14px;line-height:1.6;text-align:left;">
                <p style="margin:0 0 18px;">Dear PhilSLA User,</p>
                <p style="margin:0 0 24px;">
                  Your PhilSLA login verification code is:
                </p>
                <p style="margin:0 0 24px;">
                  This code expires in {settings.AUTH_OTP_TTL_MINUTES} minutes. If you did not request this code, reset your password or contact support.
                </p>
                <p style="margin:0 0 8px;font-size:14px;text-transform:uppercase;">Email Code:</p>
                <p style="margin:0;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:1px;color:#1f2937;">{code}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _send_login_otp(*, email: str, code: str) -> None:
    email_message = EmailMultiAlternatives(
        subject="Your PhilSLA login verification code",
        body=_login_otp_plain_message(code=code),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    email_message.attach_alternative(_login_otp_html_message(code=code), "text/html")
    email_message.send(fail_silently=False)


def _frontend_url(path: str, query: dict[str, str]) -> str:
    base = str(settings.FRONTEND_BASE_URL).rstrip("/")
    normalized_path = path if path.startswith("/") else f"/{path}"
    return f"{base}{normalized_path}?{urlencode(query)}"


def _password_recovery_plain_message(*, reset_url: str) -> str:
    return (
        "Use this PhilSLA password recovery link to set a new password: "
        f"{reset_url} "
        f"This link expires in {settings.AUTH_PASSWORD_RECOVERY_TTL_MINUTES} minutes. "
        "If you did not request this change, you can ignore this email."
    )


def _password_recovery_html_message(*, reset_url: str) -> str:
    return f"""\
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #d9dde5;border-radius:18px;">
            <tr>
              <td style="padding:36px 42px 18px;text-align:center;">
                <div style="font-size:46px;line-height:1;font-weight:800;font-family:Arial Black,Arial,Helvetica,sans-serif;">
                  <span style="color:#18345c;">Phil</span><span style="color:#a5162d;">SLA</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 42px 40px;font-size:14px;line-height:1.6;text-align:left;">
                <p style="margin:0 0 18px;">Dear PhilSLA User,</p>
                <p style="margin:0 0 22px;">A password recovery request was made for your account.</p>
                <p style="margin:0 0 26px;">
                  <a href="{reset_url}" style="display:inline-block;background:#a5162d;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">
                    Reset Password
                  </a>
                </p>
                <p style="margin:0 0 12px;">This link expires in {settings.AUTH_PASSWORD_RECOVERY_TTL_MINUTES} minutes.</p>
                <p style="margin:0;">If you did not request this change, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _send_password_recovery_link(*, email: str, reset_url: str) -> None:
    email_message = EmailMultiAlternatives(
        subject="Reset your PhilSLA password",
        body=_password_recovery_plain_message(reset_url=reset_url),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    email_message.attach_alternative(_password_recovery_html_message(reset_url=reset_url), "text/html")
    email_message.send(fail_silently=False)


def _parse_cached_datetime(value: object):
    if not isinstance(value, str):
        return None
    parsed = parse_datetime(value)
    if parsed is None:
        return None
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _seconds_until(value: object, *, fallback_seconds: int = 0) -> int:
    expires_at = _parse_cached_datetime(value)
    if expires_at is None:
        return fallback_seconds
    return max(0, int((expires_at - timezone.now()).total_seconds()))


def _otp_seconds_left(state: dict[str, Any]) -> int:
    return _seconds_until(
        state.get("otp_expires_at") or state.get("expires_at"),
        fallback_seconds=_ttl_seconds(settings.AUTH_OTP_TTL_MINUTES),
    )


def _session_seconds_left(state: dict[str, Any]) -> int:
    inactivity_seconds = _seconds_until(
        state.get("inactivity_expires_at"),
        fallback_seconds=_ttl_seconds(settings.AUTH_PENDING_INACTIVITY_TTL_MINUTES),
    )
    absolute_seconds = _seconds_until(
        state.get("absolute_expires_at"),
        fallback_seconds=_ttl_seconds(settings.AUTH_PENDING_ABSOLUTE_TTL_MINUTES),
    )
    return min(inactivity_seconds, absolute_seconds)


def _absolute_seconds_left(state: dict[str, Any]) -> int:
    return _seconds_until(
        state.get("absolute_expires_at"),
        fallback_seconds=_ttl_seconds(settings.AUTH_PENDING_ABSOLUTE_TTL_MINUTES),
    )


def _active_otp_seconds_left(state: dict[str, Any]) -> int:
    return min(_session_seconds_left(state), _otp_seconds_left(state))


def _cache_seconds_for_otp_state(state: dict[str, Any]) -> int:
    return max(1, _absolute_seconds_left(state))


def _safe_account_rate_key(account: dict[str, Any]) -> str:
    account_id = str(account.get("user_id") or account.get("id") or "")
    return hashlib.sha256(f"{settings.SECRET_KEY}:otp-account:{account_id}".encode()).hexdigest()


def _client_ip(request: object | None) -> str:
    if request is None:
        return ""
    meta = getattr(request, "META", {})
    forwarded_for = str(meta.get("HTTP_X_FORWARDED_FOR", "")).split(",", 1)[0].strip()
    return forwarded_for or str(meta.get("REMOTE_ADDR", "")).strip()


def _safe_ip_rate_key(ip_address: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}:otp-ip:{ip_address}".encode()).hexdigest()


def _rolling_hits(state: dict[str, Any], field: str, *, now_ts: float, window_seconds: int) -> list[float]:
    values = state.get(field, [])
    if not isinstance(values, list):
        return []
    cutoff = now_ts - window_seconds
    return [float(value) for value in values if isinstance(value, (int, float)) and float(value) > cutoff]


def _max_otp_backoff_seconds() -> int:
    configured = list(settings.AUTH_OTP_BACKOFF_SECONDS)
    return max(configured) if configured else 0


def _backoff_seconds_for_violation(violation_count: int) -> int:
    configured = list(settings.AUTH_OTP_BACKOFF_SECONDS)
    if not configured:
        return 0
    index = min(max(violation_count - 1, 0), len(configured) - 1)
    return int(configured[index])


def _check_account_otp_request_limit(*, account: dict[str, Any]) -> None:
    now_ts = timezone.now().timestamp()
    key = f"{OTP_ACCOUNT_RATE_PREFIX}{_safe_account_rate_key(account)}"
    state = cache.get(key) or {}
    if not isinstance(state, dict):
        state = {}

    backoff_until = float(state.get("backoff_until") or 0)
    if backoff_until > now_ts:
        raise LoginOtpRateLimited(retry_after_seconds=max(1, int(backoff_until - now_ts)))

    window_hits = _rolling_hits(
        state,
        "window_hits",
        now_ts=now_ts,
        window_seconds=settings.AUTH_OTP_ACCOUNT_WINDOW_SECONDS,
    )
    daily_hits = _rolling_hits(
        state,
        "daily_hits",
        now_ts=now_ts,
        window_seconds=settings.AUTH_OTP_ACCOUNT_DAILY_SECONDS,
    )

    if len(window_hits) >= settings.AUTH_OTP_ACCOUNT_WINDOW_LIMIT or len(daily_hits) >= settings.AUTH_OTP_ACCOUNT_DAILY_LIMIT:
        violation_count = int(state.get("violation_count") or 0) + 1
        backoff_seconds = _backoff_seconds_for_violation(violation_count)
        state.update(
            {
                "window_hits": window_hits,
                "daily_hits": daily_hits,
                "violation_count": violation_count,
                "backoff_until": now_ts + backoff_seconds,
            }
        )
        cache.set(key, state, settings.AUTH_OTP_ACCOUNT_DAILY_SECONDS + _max_otp_backoff_seconds())
        raise LoginOtpRateLimited(retry_after_seconds=backoff_seconds)

    state.update(
        {
            "window_hits": [*window_hits, now_ts],
            "daily_hits": [*daily_hits, now_ts],
            "backoff_until": 0,
            "violation_count": int(state.get("violation_count") or 0),
        }
    )
    cache.set(key, state, settings.AUTH_OTP_ACCOUNT_DAILY_SECONDS + _max_otp_backoff_seconds())


def _reset_account_otp_escalation(*, account: dict[str, Any]) -> None:
    key = f"{OTP_ACCOUNT_RATE_PREFIX}{_safe_account_rate_key(account)}"
    state = cache.get(key)
    if not isinstance(state, dict):
        return
    state["backoff_until"] = 0
    state["violation_count"] = 0
    cache.set(key, state, settings.AUTH_OTP_ACCOUNT_DAILY_SECONDS + _max_otp_backoff_seconds())


def _monitor_ip_otp_request(*, request: object | None) -> None:
    ip_address = _client_ip(request)
    if not ip_address:
        return

    safe_ip_key = _safe_ip_rate_key(ip_address)
    if settings.AUTH_OTP_IP_BLOCKING_ENABLED and cache.get(f"{OTP_IP_CONFIRMED_ABUSE_PREFIX}{safe_ip_key}"):
        raise LoginOtpRateLimited(
            "Please wait before requesting another code.",
            retry_after_seconds=settings.AUTH_OTP_IP_CONFIRMED_ABUSE_BLOCK_SECONDS,
        )

    now_ts = timezone.now().timestamp()
    key = f"{OTP_IP_RATE_PREFIX}{safe_ip_key}"
    state = cache.get(key) or {}
    if not isinstance(state, dict):
        state = {}

    window_hits = [
        *_rolling_hits(state, "window_hits", now_ts=now_ts, window_seconds=15 * 60),
        now_ts,
    ]
    daily_hits = [
        *_rolling_hits(state, "daily_hits", now_ts=now_ts, window_seconds=24 * 60 * 60),
        now_ts,
    ]
    risk_score = 0
    if len(window_hits) > settings.AUTH_OTP_IP_WINDOW_ALERT_THRESHOLD:
        risk_score += 1
    if len(daily_hits) > settings.AUTH_OTP_IP_DAILY_ALERT_THRESHOLD:
        risk_score += 1

    cache.set(key, {"window_hits": window_hits, "daily_hits": daily_hits, "risk_score": risk_score}, 24 * 60 * 60)

    if risk_score:
        record_auth_event(
            event="auth.otp_ip_threshold_exceeded",
            outcome="alerted",
            request=request,
            metadata={
                "riskScore": risk_score,
                "windowHits": len(window_hits),
                "dailyHits": len(daily_hits),
            },
        )
        if settings.AUTH_OTP_IP_HIGH_RISK_DELAY_SECONDS > 0:
            time.sleep(min(settings.AUTH_OTP_IP_HIGH_RISK_DELAY_SECONDS, 3))


def _record_otp_request(*, account: dict[str, Any], request: object | None) -> None:
    _monitor_ip_otp_request(request=request)
    _check_account_otp_request_limit(account=account)


def _issue_tokens(account: dict[str, Any]) -> AuthIssue:
    expires_in_seconds = _ttl_seconds(settings.AUTH_ACCESS_TOKEN_LIFETIME_MINUTES)
    refresh_ttl = settings.AUTH_REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60
    refresh_expires_at = timezone.now() + timedelta(seconds=refresh_ttl)
    session_account = _session_account(account)
    refresh_session = AuthRefreshSession.objects.create(
        user_id=session_account["user_id"],
        token_hash=_hash_token(_new_token()),
        account=session_account,
        expires_at=refresh_expires_at,
    )
    access_token = _issue_access_jwt(account=session_account, refresh_session_id=refresh_session.id)
    refresh_token = _issue_refresh_jwt(account=session_account, refresh_session_id=refresh_session.id)
    refresh_session.token_hash = _hash_token(refresh_token)
    refresh_session.save(update_fields=["token_hash"])

    return AuthIssue(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=_json_expiration(AccessToken(access_token)),
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
        "permissions": list(getattr(user, "permissions", []) or []),
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


def _serialize_admin_role(role: str) -> dict[str, object]:
    return {
        "id": role,
        "name": role,
        "moduleAccess": default_role_permission_codes(role),
        "assignedUserCount": AccountProfile.objects.filter(role=role, user__is_active=True).count(),
    }


def list_admin_roles() -> list[dict[str, object]]:
    """Return staff/admin role baselines managed from System Admin role settings."""

    return [_serialize_admin_role(role.value) for role in PortalRole if role != PortalRole.STUDENT]


@transaction.atomic
def update_admin_role_permissions(
    *,
    role: str,
    module_access: list[str],
    scope: str,
    selected_user_ids: list[str] | None = None,
) -> dict[str, object]:
    """Update a role baseline or apply role-shaped permissions to assigned users."""

    normalized_role = normalize_role(role)
    if normalized_role is None or normalized_role == PortalRole.STUDENT.value:
        raise serializers.ValidationError({"role": "Select a supported staff or administrator role."})

    account_profile_ids: list[int] | None = None
    if scope == "selected_users":
        selected_ids = {str(user_id).strip() for user_id in selected_user_ids or [] if str(user_id).strip()}
        if not selected_ids:
            raise serializers.ValidationError({"selectedUserIds": "Select at least one user for this role update."})

        try:
            selected_profiles = list(
                AccountProfile.objects.select_related("user").filter(
                    user_id__in=selected_ids,
                    user__is_active=True,
                    role=normalized_role,
                )
            )
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError({"selectedUserIds": "Select valid users assigned to this role."}) from exc

        matched_user_ids = {str(profile.user_id) for profile in selected_profiles}
        if matched_user_ids != selected_ids:
            raise serializers.ValidationError({"selectedUserIds": "Selected users must be active users assigned to this role."})
        account_profile_ids = [profile.id for profile in selected_profiles]

    replace_role_permissions(
        normalized_role,
        module_access,
        scope=scope,
        account_profile_ids=account_profile_ids,
    )
    return _serialize_admin_role(normalized_role)


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
    profile = AccountProfile.objects.create(user=user, role=role)
    ensure_account_assignment(profile)
    if module_access:
        replace_account_permission_differences(profile, module_access)
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
    profile.save(update_fields=["role", "updated_at"])
    assignment = ensure_account_assignment(profile)
    if assignment.role != role:
        assignment.role = role
        assignment.save(update_fields=["role", "updated_at"])
    replace_account_permission_differences(profile, module_access)
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


def _password_matches_and_updates_lockout(
    *,
    user: object,
    password: str,
    request: object | None,
) -> bool:
    '''Verify a password while serializing its durable attempt state.'''

    now = timezone.now()
    password_matches = user.check_password(password)
    became_locked = False

    with transaction.atomic():
        state, _ = PasswordLoginLockout.objects.select_for_update().get_or_create(user=user)
        lockout_is_active = state.locked_until is not None and state.locked_until > now

        if lockout_is_active:
            password_accepted = False
        else:
            attempt_window = timedelta(minutes=settings.AUTH_PASSWORD_LOCKOUT_MINUTES)
            lockout_expired = state.locked_until is not None
            window_expired = (
                state.window_started_at is not None
                and state.window_started_at + attempt_window <= now
            )
            if lockout_expired or window_expired:
                state.failed_attempts = 0
                state.window_started_at = None
                state.locked_until = None

            if password_matches:
                state.delete()
                password_accepted = True
            else:
                if state.window_started_at is None:
                    state.window_started_at = now
                state.failed_attempts += 1
                if state.failed_attempts >= settings.AUTH_PASSWORD_MAX_ATTEMPTS:
                    state.locked_until = now + timedelta(minutes=settings.AUTH_PASSWORD_LOCKOUT_MINUTES)
                    became_locked = True
                state.save(
                    update_fields=[
                        'failed_attempts',
                        'window_started_at',
                        'locked_until',
                        'updated_at',
                    ]
                )
                password_accepted = False

    if became_locked:
        record_auth_event(
            event='auth.lockout',
            outcome='enforced',
            request=request,
            user=user,
        )
    return password_accepted


def verify_login_password(*, pending_auth_token: str, password: str, request: object | None = None) -> dict[str, Any]:
    """Validate the password and issue an OTP-scoped pending-auth token."""

    pending_key = f"{PENDING_IDENTIFIER_PREFIX}{pending_auth_token}"
    pending = cache.get(pending_key)
    if pending is None:
        raise LoginFlowRejected("Your session has expired. Please start again.")

    account = pending["account"]
    user = _get_user_for_account(account)
    if user is None or not _password_matches_and_updates_lockout(
        user=user,
        password=password,
        request=request,
    ):
        raise LoginFlowRejected("Incorrect email/LRN or password.")

    _record_otp_request(account=account, request=request)

    cache.delete(pending_key)
    otp_pending_token = _new_token()
    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    now = timezone.now()
    inactivity_expires_at = now + timedelta(minutes=settings.AUTH_PENDING_INACTIVITY_TTL_MINUTES)
    absolute_expires_at = now + timedelta(minutes=settings.AUTH_PENDING_ABSOLUTE_TTL_MINUTES)
    otp_expires_at = min(now + timedelta(minutes=settings.AUTH_OTP_TTL_MINUTES), absolute_expires_at)
    pending_otp_state = {
        "account": pending["account"],
        "otp_hash": _hash_otp(token=otp_pending_token, code=otp_code),
        "attempts": 0,
        "resends": 0,
        "created_at": now.isoformat(),
        "last_activity_at": now.isoformat(),
        "last_sent_at": now.isoformat(),
        "inactivity_expires_at": inactivity_expires_at.isoformat(),
        "absolute_expires_at": absolute_expires_at.isoformat(),
        "otp_expires_at": otp_expires_at.isoformat(),
    }
    cache.set(
        f"{PENDING_OTP_PREFIX}{otp_pending_token}",
        pending_otp_state,
        _cache_seconds_for_otp_state(pending_otp_state),
    )
    try:
        _send_login_otp(email=account["email"], code=otp_code)
    except Exception as exc:
        cache.delete(f"{PENDING_OTP_PREFIX}{otp_pending_token}")
        raise LoginFlowRejected("We could not send the email verification code. Please try again.") from exc

    response = {
        "otpPendingAuthToken": otp_pending_token,
        "nextStep": "otp",
        "expiresInSeconds": _active_otp_seconds_left(pending_otp_state),
        "resendCooldownSeconds": settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS,
    }
    if settings.AUTH_LOCAL_EXPOSE_OTP:
        response["devOtp"] = otp_code
    return response


def resend_login_otp(*, otp_pending_auth_token: str, request: object | None = None) -> dict[str, Any]:
    """Rotate and resend the email OTP for an active OTP pending-auth token."""

    pending_key = f"{PENDING_OTP_PREFIX}{otp_pending_auth_token}"
    pending = cache.get(pending_key)
    if pending is None:
        raise LoginFlowRejected("Invalid or expired code. Please try again.")

    session_ttl = _session_seconds_left(pending)
    if session_ttl <= 0:
        cache.delete(pending_key)
        raise LoginFlowRejected("Invalid or expired code. Please try again.")

    remaining_absolute_seconds = _absolute_seconds_left(pending)
    if remaining_absolute_seconds < settings.AUTH_OTP_MIN_RESEND_REMAINING_SECONDS:
        raise LoginFlowRejected("Verification code expired. Please start login again to request a new code.")

    if int(pending.get("resends", 0)) >= settings.AUTH_OTP_MAX_RESENDS:
        raise LoginOtpRateLimited("You have reached the maximum number of code resends for this login attempt.")

    last_sent_at = _parse_cached_datetime(pending.get("last_sent_at"))
    if last_sent_at is not None:
        seconds_since_last_send = int((timezone.now() - last_sent_at).total_seconds())
        if seconds_since_last_send < settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS:
            retry_after = settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS - seconds_since_last_send
            raise LoginOtpCooldown(
                f"Please wait {retry_after} seconds before requesting another code.",
                retry_after_seconds=retry_after,
            )

    _record_otp_request(account=pending["account"], request=request)

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    now = timezone.now()
    absolute_expires_at = _parse_cached_datetime(pending.get("absolute_expires_at")) or now
    inactivity_expires_at = now + timedelta(minutes=settings.AUTH_PENDING_INACTIVITY_TTL_MINUTES)
    otp_expires_at = min(now + timedelta(minutes=settings.AUTH_OTP_TTL_MINUTES), absolute_expires_at)
    updated_pending = {
        **pending,
        "otp_hash": _hash_otp(token=otp_pending_auth_token, code=otp_code),
        "attempts": 0,
        "resends": int(pending.get("resends", 0)) + 1,
        "last_activity_at": now.isoformat(),
        "last_sent_at": now.isoformat(),
        "inactivity_expires_at": inactivity_expires_at.isoformat(),
        "otp_expires_at": otp_expires_at.isoformat(),
    }
    cache.set(pending_key, updated_pending, _cache_seconds_for_otp_state(updated_pending))
    try:
        _send_login_otp(email=pending["account"]["email"], code=otp_code)
    except Exception as exc:
        cache.set(pending_key, pending, _cache_seconds_for_otp_state(pending))
        raise LoginFlowRejected("We could not send the email verification code. Please try again.") from exc

    response = {
        "otpPendingAuthToken": otp_pending_auth_token,
        "nextStep": "otp",
        "expiresInSeconds": _active_otp_seconds_left(updated_pending),
        "resendCooldownSeconds": settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS,
    }
    if settings.AUTH_LOCAL_EXPOSE_OTP:
        response["devOtp"] = otp_code
    return response


def verify_login_otp(*, otp_pending_auth_token: str, code: str) -> dict[str, Any]:
    """Validate the email OTP and issue a selfie-scoped pending-auth token."""

    pending_key = f"{PENDING_OTP_PREFIX}{otp_pending_auth_token}"
    pending = cache.get(pending_key)
    if pending is None:
        raise LoginFlowRejected("Invalid or expired code. Please try again.")

    ttl = _active_otp_seconds_left(pending)
    if ttl <= 0:
        cache.delete(pending_key)
        raise LoginFlowRejected("Invalid or expired code. Please try again.")

    expected_hash = pending["otp_hash"]
    if not constant_time_compare(expected_hash, _hash_otp(token=otp_pending_auth_token, code=code)):
        pending["attempts"] = int(pending.get("attempts", 0)) + 1
        if pending["attempts"] >= settings.AUTH_OTP_MAX_ATTEMPTS:
            cache.delete(pending_key)
        else:
            cache.set(pending_key, pending, _cache_seconds_for_otp_state(pending))
        raise LoginFlowRejected("Invalid or expired code. Please try again.")

    cache.delete(pending_key)
    _reset_account_otp_escalation(account=pending["account"])
    selfie_pending_token = _new_token()
    ttl = _ttl_seconds(settings.AUTH_PENDING_TOKEN_TTL_MINUTES)
    cache.set(f"{PENDING_SELFIE_PREFIX}{selfie_pending_token}", {"account": pending["account"]}, ttl)
    return {
        "selfiePendingAuthToken": selfie_pending_token,
        "nextStep": "selfie",
        "expiresInSeconds": ttl,
    }


def complete_login_selfie(
    *,
    selfie_pending_auth_token: str,
    image_file,
    request: object | None = None,
) -> AuthIssue:
    """Persist the login selfie evidence and issue the full backend session."""

    pending_key = f"{PENDING_SELFIE_PREFIX}{selfie_pending_auth_token}"
    pending = cache.get(pending_key)
    if pending is None:
        raise LoginFlowRejected("Your selfie verification session has expired. Please start again.")

    account = pending["account"]
    user = _get_user_for_account(account)
    if user is None:
        cache.delete(pending_key)
        raise LoginFlowRejected("Your selfie verification session has expired. Please start again.")

    digest = hashlib.sha256()
    for chunk in image_file.chunks():
        digest.update(chunk)
    image_file.seek(0)

    LoginSelfieLog.objects.create(
        user=user,
        file=image_file,
        content_type=getattr(image_file, "content_type", "") or "application/octet-stream",
        size=getattr(image_file, "size", 0),
        sha256=digest.hexdigest(),
        ip_address=str(getattr(request, "META", {}).get("REMOTE_ADDR", ""))[:45] if request is not None else "",
        user_agent=str(getattr(request, "META", {}).get("HTTP_USER_AGENT", ""))[:512] if request is not None else "",
        correlation_id=str(getattr(request, "correlation_id", ""))[:80] if request is not None else "",
    )
    cache.delete(pending_key)
    return _issue_tokens(account)


def validate_access_token(*, access_token: str) -> tuple[object, object] | None:
    token = _decode_access_jwt(access_token)
    if token is None:
        return None
    if cache.get(_access_blocklist_key(access_token)):
        return None
    revoked_at = cache.get(_user_revoked_at_key(token["user_id"]))
    if revoked_at is not None and int(token["iat"]) <= int(revoked_at):
        return None

    account = _resolve_database_account_by_user_id(token["user_id"])
    if account is None:
        return None
    user = SimpleNamespace(
        id=account["id"],
        email=account["email"],
        role=account["role"],
        permissions=account["permissions"],
        scopes=account["scopes"],
        is_authenticated=True,
        is_active=True,
    )
    auth = SimpleNamespace(
        token_id=access_token,
        expires_at=_json_expiration(token),
        refresh_session_id=token.get("refresh_session_id"),
    )
    return user, auth


@transaction.atomic
def rotate_refresh_token(*, refresh_token: str | None) -> AuthIssue:
    """Rotate the refresh token and issue a new access token."""

    if not refresh_token:
        raise LoginFlowRejected("Your session has expired. Please log in again.")

    token = _decode_refresh_jwt(refresh_token)
    if token is None:
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
        cache.set(_access_blocklist_key(token_id), True, settings.AUTH_ACCESS_TOKEN_LIFETIME_MINUTES * 60)
    refresh_session_id = getattr(auth, "refresh_session_id", None)
    if refresh_session_id:
        AuthRefreshSession.objects.filter(id=refresh_session_id, revoked_at__isnull=True).update(revoked_at=timezone.now())
    return None


def revoke_tokens(*, user: object, scope: str) -> None:
    """Revoke refresh/access tokens for the requested scope."""

    if scope != "all":
        return None

    user_id = getattr(user, "id", None)
    AuthRefreshSession.objects.filter(user_id=user_id, revoked_at__isnull=True).update(
        revoked_at=timezone.now()
    )
    if user_id:
        cache.set(_user_revoked_at_key(user_id), int(time.time()), settings.AUTH_ACCESS_TOKEN_LIFETIME_MINUTES * 60)
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

    account = _resolve_database_account(identifier)
    if account is None:
        return None

    user = _get_user_for_account(account)
    email = str(account.get("email") or "").strip()
    if user is None or not email:
        return None

    token = _new_token()
    expires_at = timezone.now() + timedelta(minutes=settings.AUTH_PASSWORD_RECOVERY_TTL_MINUTES)
    PasswordRecoveryToken.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
    recovery = PasswordRecoveryToken.objects.create(
        user=user,
        token_hash=_hash_token(token),
        requested_identifier=identifier.strip()[:254],
        expires_at=expires_at,
    )
    reset_url = _frontend_url(PASSWORD_RECOVERY_LINK_PATH, {"token": token})

    try:
        _send_password_recovery_link(email=email, reset_url=reset_url)
    except Exception:
        recovery.delete()
        raise

    return None


def _mask_email(email: str) -> str:
    local_part, separator, domain = email.partition("@")
    if not separator:
        return email
    if len(local_part) <= 2:
        masked_local = f"{local_part[:1]}***"
    else:
        masked_local = f"{local_part[:3]}***"
    return f"{masked_local}@{domain}"


def inspect_password_recovery(*, recovery_token: str) -> dict[str, str]:
    """Return safe account display metadata for an active recovery token."""

    recovery = (
        PasswordRecoveryToken.objects.select_related("user")
        .filter(token_hash=_hash_token(recovery_token), used_at__isnull=True, expires_at__gt=timezone.now(), user__is_active=True)
        .first()
    )
    if recovery is None:
        raise LoginFlowRejected("This recovery link has expired. Please request a new one.")

    user = recovery.user
    full_name = " ".join(part for part in (user.first_name, user.last_name) if part).strip()
    email = str(user.email or "").strip()
    return {
        "accountLabel": full_name or _mask_email(email),
        "maskedEmail": _mask_email(email) if email else "",
    }


@transaction.atomic
def complete_password_recovery(*, recovery_token: str, password: str) -> None:
    """Complete password reset and revoke active sessions."""

    token_hash = _hash_token(recovery_token)
    recovery = (
        PasswordRecoveryToken.objects.select_for_update()
        .select_related("user")
        .filter(token_hash=token_hash, used_at__isnull=True, expires_at__gt=timezone.now(), user__is_active=True)
        .first()
    )
    if recovery is None:
        raise LoginFlowRejected("This recovery link has expired. Please request a new one.")

    user = recovery.user
    user.set_password(password)
    user.save(update_fields=["password"])
    recovery.used_at = timezone.now()
    recovery.save(update_fields=["used_at"])
    revoke_tokens(user=user, scope="all")
    return None


def request_admin_account_recovery(*, email: str, actor: object) -> None:
    """System Admin initiated staff/admin account recovery request."""

    return request_password_recovery(identifier=email)
