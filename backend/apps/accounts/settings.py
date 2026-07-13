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


@dataclass(frozen=True)
class AuthEmailSettings:
    provider: str
    azure_enabled: bool
    azure_connection_string: str
    azure_endpoint: str
    azure_sender: str

    @property
    def azure_configured(self) -> bool:
        return (
            self.provider == "azure_communication_services"
            and self.azure_enabled
            and bool(self.azure_sender)
            and bool(self.azure_connection_string or self.azure_endpoint)
        )


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


def get_auth_email_settings() -> AuthEmailSettings:
    return AuthEmailSettings(
        provider=settings.AUTH_EMAIL_PROVIDER,
        azure_enabled=settings.AZURE_COMMUNICATION_EMAIL_ENABLED,
        azure_connection_string=settings.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING,
        azure_endpoint=settings.AZURE_COMMUNICATION_EMAIL_ENDPOINT,
        azure_sender=settings.AZURE_COMMUNICATION_EMAIL_SENDER,
    )
