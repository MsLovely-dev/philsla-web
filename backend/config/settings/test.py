from .base import *  # noqa: F403

SECRET_KEY = "test-only-secret-key"
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

LOGGING["handlers"]["null"] = {"class": "logging.NullHandler"}  # noqa: F405
LOGGING["loggers"]["philsa.request"]["handlers"] = ["null"]  # noqa: F405
