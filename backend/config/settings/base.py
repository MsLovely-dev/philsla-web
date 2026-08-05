import os
from pathlib import Path
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parents[2]


def env_int(name: str, default: int) -> int:
    raw_value = os.environ.get(name)
    if raw_value in (None, ""):
        return default
    return int(raw_value)


def env_bool(name: str, default: bool) -> bool:
    raw_value = os.environ.get(name)
    if raw_value in (None, ""):
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str) -> list[str]:
    return [value.strip() for value in os.environ.get(name, "").split(",") if value.strip()]


def is_placeholder_email_sender(value: str) -> bool:
    return not value or "example" in value or "your-verified-domain" in value


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-development-key")
DEBUG = False
ALLOWED_HOSTS: list[str] = []

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "apps.accounts",
    "apps.applications",
    "apps.analytics",
    "apps.configuration",
    "apps.exam_reviews",
    "apps.results",
    "apps.core",
    "apps.exams",
    "apps.schools",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.CorrelationIdMiddleware",
    "apps.core.middleware.CorsAllowlistMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES: list[dict[str, object]] = []
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES: dict[str, dict[str, object]] = {}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_ROOT = BASE_DIR / "private-media"
MEDIA_URL = "/private-media/"
STEP2_MAX_IMAGE_BYTES = env_int("STEP2_MAX_IMAGE_BYTES", 5 * 1024 * 1024)
EXAM_REVIEW_MAX_ANSWER_SHEET_BYTES = env_int("EXAM_REVIEW_MAX_ANSWER_SHEET_BYTES", 10 * 1024 * 1024)
REGISTRATION_ATTACHMENT_MAX_BYTES = env_int("REGISTRATION_ATTACHMENT_MAX_BYTES", 5 * 1024 * 1024)
STEP2_DOCUMENT_RECOGNITION_PROVIDER = os.environ.get("STEP2_DOCUMENT_RECOGNITION_PROVIDER", "unavailable")
STEP1_SELFIE_FACE_PROVIDER = os.environ.get("STEP1_SELFIE_FACE_PROVIDER", "unavailable")
STEP1_SELFIE_MIN_IMAGE_WIDTH = env_int("STEP1_SELFIE_MIN_IMAGE_WIDTH", 480)
STEP1_SELFIE_MIN_IMAGE_HEIGHT = env_int("STEP1_SELFIE_MIN_IMAGE_HEIGHT", 360)
STEP1_SELFIE_MIN_FACE_RATIO = float(os.environ.get("STEP1_SELFIE_MIN_FACE_RATIO", "0.20"))
STEP1_SELFIE_MAX_FACE_RATIO = float(os.environ.get("STEP1_SELFIE_MAX_FACE_RATIO", "0.70"))
STEP1_SELFIE_MIN_LAPLACIAN_VARIANCE = float(os.environ.get("STEP1_SELFIE_MIN_LAPLACIAN_VARIANCE", "20"))
STEP1_SELFIE_MIN_BRIGHTNESS = float(os.environ.get("STEP1_SELFIE_MIN_BRIGHTNESS", "60"))
STEP1_SELFIE_MAX_BRIGHTNESS = float(os.environ.get("STEP1_SELFIE_MAX_BRIGHTNESS", "200"))
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.PendingAwareBearerAuthentication",
        "apps.accounts.authentication.ApiSessionAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPageNumberPagination",
    "DEFAULT_THROTTLE_RATES": {
        "auth_identifier": "20/min",
        "auth_sensitive": "10/min",
        "auth_refresh": "120/min",
        "auth_recovery": "5/hour",
        "registration_lrn_verify": "20/min",
        "registration_email_otp": "5/min",
        "registration_selfie_face": "30/min",
    },
    "PAGE_SIZE": 25,
}

AUTH_ACCESS_TOKEN_LIFETIME_MINUTES = env_int("AUTH_ACCESS_TOKEN_LIFETIME_MINUTES", 20)
AUTH_REFRESH_TOKEN_LIFETIME_DAYS = env_int("AUTH_REFRESH_TOKEN_LIFETIME_DAYS", 7)
AUTH_PENDING_TOKEN_TTL_MINUTES = env_int("AUTH_PENDING_TOKEN_TTL_MINUTES", 10)
AUTH_PENDING_INACTIVITY_TTL_MINUTES = env_int("AUTH_PENDING_INACTIVITY_TTL_MINUTES", 10)
AUTH_PENDING_ABSOLUTE_TTL_MINUTES = env_int("AUTH_PENDING_ABSOLUTE_TTL_MINUTES", 15)
AUTH_OTP_TTL_MINUTES = env_int("AUTH_OTP_TTL_MINUTES", 5)
AUTH_OTP_RESEND_COOLDOWN_SECONDS = env_int("AUTH_OTP_RESEND_COOLDOWN_SECONDS", 60)
AUTH_OTP_MAX_RESENDS = env_int("AUTH_OTP_MAX_RESENDS", 3)
AUTH_OTP_MAX_ATTEMPTS = env_int("AUTH_OTP_MAX_ATTEMPTS", 5)
AUTH_OTP_MIN_RESEND_REMAINING_SECONDS = env_int("AUTH_OTP_MIN_RESEND_REMAINING_SECONDS", 90)
AUTH_OTP_ACCOUNT_WINDOW_LIMIT = env_int("AUTH_OTP_ACCOUNT_WINDOW_LIMIT", 5)
AUTH_OTP_ACCOUNT_WINDOW_SECONDS = env_int("AUTH_OTP_ACCOUNT_WINDOW_SECONDS", 15 * 60)
AUTH_OTP_ACCOUNT_DAILY_LIMIT = env_int("AUTH_OTP_ACCOUNT_DAILY_LIMIT", 20)
AUTH_OTP_ACCOUNT_DAILY_SECONDS = env_int("AUTH_OTP_ACCOUNT_DAILY_SECONDS", 24 * 60 * 60)
AUTH_OTP_BACKOFF_SECONDS = [
    env_int("AUTH_OTP_BACKOFF_FIRST_SECONDS", 5 * 60),
    env_int("AUTH_OTP_BACKOFF_SECOND_SECONDS", 15 * 60),
    env_int("AUTH_OTP_BACKOFF_THIRD_SECONDS", 60 * 60),
]
AUTH_OTP_IP_WINDOW_ALERT_THRESHOLD = env_int("AUTH_OTP_IP_WINDOW_ALERT_THRESHOLD", 20)
AUTH_OTP_IP_DAILY_ALERT_THRESHOLD = env_int("AUTH_OTP_IP_DAILY_ALERT_THRESHOLD", 80)
AUTH_OTP_IP_HIGH_RISK_DELAY_SECONDS = env_int("AUTH_OTP_IP_HIGH_RISK_DELAY_SECONDS", 1)
AUTH_OTP_IP_CONFIRMED_ABUSE_BLOCK_SECONDS = env_int("AUTH_OTP_IP_CONFIRMED_ABUSE_BLOCK_SECONDS", 60 * 60)
AUTH_OTP_IP_BLOCKING_ENABLED = env_bool("AUTH_OTP_IP_BLOCKING_ENABLED", False)
AUTH_PASSWORD_MAX_ATTEMPTS = env_int("AUTH_PASSWORD_MAX_ATTEMPTS", 5)
AUTH_PASSWORD_LOCKOUT_MINUTES = env_int("AUTH_PASSWORD_LOCKOUT_MINUTES", 15)
AUTH_PASSWORD_RECOVERY_TTL_MINUTES = env_int("AUTH_PASSWORD_RECOVERY_TTL_MINUTES", 30)
AUTH_STUDENT_IDLE_TIMEOUT_MINUTES = env_int("AUTH_STUDENT_IDLE_TIMEOUT_MINUTES", 20)
AUTH_STAFF_IDLE_TIMEOUT_MINUTES = env_int("AUTH_STAFF_IDLE_TIMEOUT_MINUTES", 10)
AUTH_STUDENT_ABSOLUTE_TIMEOUT_HOURS = env_int("AUTH_STUDENT_ABSOLUTE_TIMEOUT_HOURS", 12)
AUTH_STAFF_ABSOLUTE_TIMEOUT_HOURS = env_int("AUTH_STAFF_ABSOLUTE_TIMEOUT_HOURS", 8)
AUTH_LOCAL_EXPOSE_OTP = env_bool("AUTH_LOCAL_EXPOSE_OTP", False)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=AUTH_ACCESS_TOKEN_LIFETIME_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=AUTH_REFRESH_TOKEN_LIFETIME_DAYS),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

ACTIVE_EXAM_CYCLE_ID = os.environ.get("ACTIVE_EXAM_CYCLE_ID", "TBD")
EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS = False
LRN_REGISTRY_PROVIDER = os.environ.get("LRN_REGISTRY_PROVIDER", "unavailable")
LRN_VERIFICATION_TTL_MINUTES = env_int("LRN_VERIFICATION_TTL_MINUTES", 15)
LRN_MAX_FAILED_ATTEMPTS = env_int("LRN_MAX_FAILED_ATTEMPTS", 5)
LRN_FAILED_ATTEMPT_WINDOW_MINUTES = env_int("LRN_FAILED_ATTEMPT_WINDOW_MINUTES", 15)

AUTH_EMAIL_PROVIDER = os.environ.get("AUTH_EMAIL_PROVIDER", "console")
AZURE_COMMUNICATION_EMAIL_ENABLED = env_bool("AZURE_COMMUNICATION_EMAIL_ENABLED", False)
AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING = os.environ.get("AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING", "")
AZURE_COMMUNICATION_EMAIL_ENDPOINT = os.environ.get("AZURE_COMMUNICATION_EMAIL_ENDPOINT", "")
AZURE_COMMUNICATION_EMAIL_SENDER = os.environ.get("AZURE_COMMUNICATION_EMAIL_SENDER", "")
AZURE_COMMUNICATION_EMAIL_SMTP_HOST = os.environ.get("AZURE_COMMUNICATION_EMAIL_SMTP_HOST", "smtp.azurecomm.net")
AZURE_COMMUNICATION_EMAIL_SMTP_PORT = env_int("AZURE_COMMUNICATION_EMAIL_SMTP_PORT", 587)
AZURE_COMMUNICATION_EMAIL_SMTP_USERNAME = os.environ.get("AZURE_COMMUNICATION_EMAIL_SMTP_USERNAME", "")
AZURE_COMMUNICATION_EMAIL_SMTP_PASSWORD = os.environ.get("AZURE_COMMUNICATION_EMAIL_SMTP_PASSWORD", "")
BREVO_EMAIL_SENDER = os.environ.get("BREVO_EMAIL_SENDER", "")
BREVO_SMTP_HOST = os.environ.get("BREVO_SMTP_HOST", "smtp-relay.brevo.com")
BREVO_SMTP_PORT = env_int("BREVO_SMTP_PORT", 587)
BREVO_SMTP_USERNAME = os.environ.get("BREVO_SMTP_USERNAME", "")
BREVO_SMTP_PASSWORD = os.environ.get("BREVO_SMTP_PASSWORD", "")
BREVO_SMTP_USE_TLS = env_bool("BREVO_SMTP_USE_TLS", True)

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "PhilSA Admissions <no-reply@example.test>")
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000")
if AUTH_EMAIL_PROVIDER == "azure_communication_services_smtp":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = AZURE_COMMUNICATION_EMAIL_SMTP_HOST
    EMAIL_PORT = AZURE_COMMUNICATION_EMAIL_SMTP_PORT
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = AZURE_COMMUNICATION_EMAIL_SMTP_USERNAME
    EMAIL_HOST_PASSWORD = AZURE_COMMUNICATION_EMAIL_SMTP_PASSWORD
    if AZURE_COMMUNICATION_EMAIL_SENDER:
        DEFAULT_FROM_EMAIL = AZURE_COMMUNICATION_EMAIL_SENDER
elif AUTH_EMAIL_PROVIDER == "brevo_smtp":
    if not BREVO_SMTP_USERNAME or not BREVO_SMTP_PASSWORD:
        raise ImproperlyConfigured("BREVO_SMTP_USERNAME and BREVO_SMTP_PASSWORD are required when AUTH_EMAIL_PROVIDER=brevo_smtp.")
    brevo_from_email = BREVO_EMAIL_SENDER or DEFAULT_FROM_EMAIL
    if is_placeholder_email_sender(brevo_from_email):
        raise ImproperlyConfigured("BREVO_EMAIL_SENDER or DEFAULT_FROM_EMAIL must be set to a verified Brevo sender.")
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = BREVO_SMTP_HOST
    EMAIL_PORT = BREVO_SMTP_PORT
    EMAIL_USE_TLS = BREVO_SMTP_USE_TLS
    EMAIL_HOST_USER = BREVO_SMTP_USERNAME
    EMAIL_HOST_PASSWORD = BREVO_SMTP_PASSWORD
    DEFAULT_FROM_EMAIL = brevo_from_email

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Strict"
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "Strict"

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "safe_json": {
            "()": "apps.core.logging.SafeJsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "safe_json",
        },
    },
    "loggers": {
        "philsa.request": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "philsa.audit": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
