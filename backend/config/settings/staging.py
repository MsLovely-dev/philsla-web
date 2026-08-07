import os

from django.core.exceptions import ImproperlyConfigured

from apps.core.database import database_config_from_url

from .base import *  # noqa: F403

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY is required in staging.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")  # noqa: F405
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS is required in staging.")

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")  # noqa: F405
if not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured("DJANGO_CSRF_TRUSTED_ORIGINS is required in staging.")

CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS")  # noqa: F405
if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured("DJANGO_CORS_ALLOWED_ORIGINS is required in staging.")

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)  # noqa: F405
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 0)  # noqa: F405

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise ImproperlyConfigured("DATABASE_URL is required in staging.")

DATABASES = {"default": database_config_from_url(DATABASE_URL)}

STAGING_ALLOW_MOCK_INTEGRATIONS = env_bool("STAGING_ALLOW_MOCK_INTEGRATIONS", False)  # noqa: F405

if not STAGING_ALLOW_MOCK_INTEGRATIONS:
    if LRN_REGISTRY_PROVIDER == "mock":  # noqa: F405
        raise ImproperlyConfigured("LRN_REGISTRY_PROVIDER=mock requires STAGING_ALLOW_MOCK_INTEGRATIONS=true.")
    if PHILSYS_REGISTRY_PROVIDER == "mock":  # noqa: F405
        raise ImproperlyConfigured("PHILSYS_REGISTRY_PROVIDER=mock requires STAGING_ALLOW_MOCK_INTEGRATIONS=true.")
    if STEP2_DOCUMENT_RECOGNITION_PROVIDER == "mock":  # noqa: F405
        raise ImproperlyConfigured(
            "STEP2_DOCUMENT_RECOGNITION_PROVIDER=mock requires STAGING_ALLOW_MOCK_INTEGRATIONS=true."
        )
    if STEP1_SELFIE_FACE_PROVIDER in {"mock", "unavailable"}:  # noqa: F405
        raise ImproperlyConfigured(
            "STEP1_SELFIE_FACE_PROVIDER must be configured or STAGING_ALLOW_MOCK_INTEGRATIONS=true."
        )

if LRN_REGISTRY_PROVIDER == "deped" and (not LRN_DEPED_VERIFY_URL or not LRN_DEPED_API_TOKEN):  # noqa: F405
    raise ImproperlyConfigured("LRN_DEPED_VERIFY_URL and LRN_DEPED_API_TOKEN are required when LRN_REGISTRY_PROVIDER=deped.")

if ACTIVE_EXAM_CYCLE_ID == "TBD":  # noqa: F405
    raise ImproperlyConfigured("ACTIVE_EXAM_CYCLE_ID is required in staging.")

if AUTH_EMAIL_PROVIDER == "azure_communication_services_smtp":  # noqa: F405
    if not AZURE_COMMUNICATION_EMAIL_SMTP_USERNAME or not AZURE_COMMUNICATION_EMAIL_SMTP_PASSWORD:  # noqa: F405
        raise ImproperlyConfigured("Azure Communication Services SMTP credentials are required in staging.")
elif AUTH_EMAIL_PROVIDER == "brevo_smtp":  # noqa: F405
    pass
elif AUTH_EMAIL_PROVIDER != "console":  # noqa: F405
    raise ImproperlyConfigured("Unsupported AUTH_EMAIL_PROVIDER for staging.")

if AUTH_EMAIL_PROVIDER != "console" and is_placeholder_email_sender(DEFAULT_FROM_EMAIL):  # noqa: F405
    raise ImproperlyConfigured("DEFAULT_FROM_EMAIL must be configured with a verified sender in staging.")
