import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]


def env_int(name: str, default: int) -> int:
    raw_value = os.environ.get(name)
    if raw_value in (None, ""):
        return default
    return int(raw_value)


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
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
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
