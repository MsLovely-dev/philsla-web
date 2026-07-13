import os
from pathlib import Path

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


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-development-key")
DEBUG = False
ALLOWED_HOSTS: list[str] = []

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "apps.accounts",
    "apps.core",
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
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES: dict[str, dict[str, object]] = {}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.accounts.authentication.PendingAwareBearerAuthentication"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPageNumberPagination",
    "PAGE_SIZE": 25,
}

AUTH_ACCESS_TOKEN_LIFETIME_MINUTES = env_int("AUTH_ACCESS_TOKEN_LIFETIME_MINUTES", 15)
AUTH_REFRESH_TOKEN_LIFETIME_DAYS = env_int("AUTH_REFRESH_TOKEN_LIFETIME_DAYS", 7)
AUTH_PENDING_TOKEN_TTL_MINUTES = env_int("AUTH_PENDING_TOKEN_TTL_MINUTES", 10)
AUTH_OTP_TTL_MINUTES = env_int("AUTH_OTP_TTL_MINUTES", 5)
AUTH_OTP_RESEND_COOLDOWN_SECONDS = env_int("AUTH_OTP_RESEND_COOLDOWN_SECONDS", 60)
AUTH_OTP_MAX_RESENDS = env_int("AUTH_OTP_MAX_RESENDS", 3)
AUTH_OTP_MAX_ATTEMPTS = env_int("AUTH_OTP_MAX_ATTEMPTS", 5)
AUTH_PASSWORD_MAX_ATTEMPTS = env_int("AUTH_PASSWORD_MAX_ATTEMPTS", 5)
AUTH_PASSWORD_LOCKOUT_MINUTES = env_int("AUTH_PASSWORD_LOCKOUT_MINUTES", 15)
AUTH_STUDENT_IDLE_TIMEOUT_MINUTES = env_int("AUTH_STUDENT_IDLE_TIMEOUT_MINUTES", 20)
AUTH_STAFF_IDLE_TIMEOUT_MINUTES = env_int("AUTH_STAFF_IDLE_TIMEOUT_MINUTES", 10)
AUTH_STUDENT_ABSOLUTE_TIMEOUT_HOURS = env_int("AUTH_STUDENT_ABSOLUTE_TIMEOUT_HOURS", 12)
AUTH_STAFF_ABSOLUTE_TIMEOUT_HOURS = env_int("AUTH_STAFF_ABSOLUTE_TIMEOUT_HOURS", 8)

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
    },
}
