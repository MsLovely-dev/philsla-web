import os
from pathlib import Path


def load_local_env() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_local_env()

from .base import *  # noqa: F403

STEP2_DOCUMENT_RECOGNITION_PROVIDER = "mock"
STEP1_SELFIE_FACE_PROVIDER = "opencv"

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
AUTH_LOCAL_EXPOSE_OTP = False
ACTIVE_EXAM_CYCLE_ID = "2026"
LRN_REGISTRY_PROVIDER = "mock"
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
CORS_ALLOWED_ORIGINS = CSRF_TRUSTED_ORIGINS
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}
