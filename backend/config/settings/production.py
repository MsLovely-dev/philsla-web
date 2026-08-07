import os

from django.core.exceptions import ImproperlyConfigured

from apps.core.database import database_config_from_url

from .base import *  # noqa: F403

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY is required in production.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")  # noqa: F405
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS is required in production.")

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")  # noqa: F405
CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS")  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)  # noqa: F405
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 31536000)  # noqa: F405

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise ImproperlyConfigured("DATABASE_URL is required in production for Supabase Postgres.")

DATABASES = {"default": database_config_from_url(DATABASE_URL)}

if not os.environ.get("REDIS_URL", ""):
    raise ImproperlyConfigured("REDIS_URL is required in production for Score Management background jobs.")

if LRN_REGISTRY_PROVIDER == "mock":  # noqa: F405
    raise ImproperlyConfigured("LRN_REGISTRY_PROVIDER=mock is not allowed in production.")
if LRN_REGISTRY_PROVIDER == "deped" and (not LRN_DEPED_VERIFY_URL or not LRN_DEPED_API_TOKEN):  # noqa: F405
    raise ImproperlyConfigured("LRN_DEPED_VERIFY_URL and LRN_DEPED_API_TOKEN are required when LRN_REGISTRY_PROVIDER=deped.")
if PHILSYS_REGISTRY_PROVIDER == "mock":  # noqa: F405
    raise ImproperlyConfigured("PHILSYS_REGISTRY_PROVIDER=mock is not allowed in production.")
if STEP2_DOCUMENT_RECOGNITION_PROVIDER == "mock":  # noqa: F405
    raise ImproperlyConfigured("STEP2_DOCUMENT_RECOGNITION_PROVIDER=mock is not allowed in production.")
if STEP1_SELFIE_FACE_PROVIDER in {"mock", "unavailable"}:  # noqa: F405
    raise ImproperlyConfigured("STEP1_SELFIE_FACE_PROVIDER must be configured with a production face detector.")
if ACTIVE_EXAM_CYCLE_ID == "TBD":  # noqa: F405
    raise ImproperlyConfigured("ACTIVE_EXAM_CYCLE_ID is required in production.")
if AUTH_EMAIL_PROVIDER != "azure_communication_services_smtp":  # noqa: F405
    raise ImproperlyConfigured("AUTH_EMAIL_PROVIDER=azure_communication_services_smtp is required in production.")
if not AZURE_COMMUNICATION_EMAIL_SMTP_USERNAME or not AZURE_COMMUNICATION_EMAIL_SMTP_PASSWORD:  # noqa: F405
    raise ImproperlyConfigured("Azure Communication Services SMTP credentials are required in production.")
if not DEFAULT_FROM_EMAIL or DEFAULT_FROM_EMAIL == "PhilSA Admissions <no-reply@example.test>":  # noqa: F405
    raise ImproperlyConfigured("DEFAULT_FROM_EMAIL must be configured with a verified sender in production.")
