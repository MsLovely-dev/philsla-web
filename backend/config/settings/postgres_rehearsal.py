import os

from apps.core.database import database_config_from_url

from .test import *  # noqa: F403

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise ImproperlyConfigured("DATABASE_URL is required for the PostgreSQL rehearsal settings.")  # noqa: F405

DATABASES = {"default": database_config_from_url(DATABASE_URL)}
