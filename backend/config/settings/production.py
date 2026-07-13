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
