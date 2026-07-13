from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True)
class AuthFlowSettings:
    access_token_lifetime_minutes: int
    refresh_token_lifetime_days: int
    pending_auth_token_ttl_minutes: int
    otp_ttl_minutes: int
    otp_resend_cooldown_seconds: int
    otp_max_resends: int
    otp_max_attempts: int
    password_max_attempts: int
    password_lockout_minutes: int
    student_idle_timeout_minutes: int
    staff_idle_timeout_minutes: int
    student_absolute_timeout_hours: int
    staff_absolute_timeout_hours: int


def get_auth_flow_settings() -> AuthFlowSettings:
    return AuthFlowSettings(
        access_token_lifetime_minutes=settings.AUTH_ACCESS_TOKEN_LIFETIME_MINUTES,
        refresh_token_lifetime_days=settings.AUTH_REFRESH_TOKEN_LIFETIME_DAYS,
        pending_auth_token_ttl_minutes=settings.AUTH_PENDING_TOKEN_TTL_MINUTES,
        otp_ttl_minutes=settings.AUTH_OTP_TTL_MINUTES,
        otp_resend_cooldown_seconds=settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS,
        otp_max_resends=settings.AUTH_OTP_MAX_RESENDS,
        otp_max_attempts=settings.AUTH_OTP_MAX_ATTEMPTS,
        password_max_attempts=settings.AUTH_PASSWORD_MAX_ATTEMPTS,
        password_lockout_minutes=settings.AUTH_PASSWORD_LOCKOUT_MINUTES,
        student_idle_timeout_minutes=settings.AUTH_STUDENT_IDLE_TIMEOUT_MINUTES,
        staff_idle_timeout_minutes=settings.AUTH_STAFF_IDLE_TIMEOUT_MINUTES,
        student_absolute_timeout_hours=settings.AUTH_STUDENT_ABSOLUTE_TIMEOUT_HOURS,
        staff_absolute_timeout_hours=settings.AUTH_STAFF_ABSOLUTE_TIMEOUT_HOURS,
    )
