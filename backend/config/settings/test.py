from .base import *  # noqa: F403

SECRET_KEY = "test-only-secret-key"
ACTIVE_EXAM_CYCLE_ID = "2026"
LRN_REGISTRY_PROVIDER = "mock"
STEP2_DOCUMENT_RECOGNITION_PROVIDER = "mock"
STEP1_SELFIE_FACE_PROVIDER = "mock"
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

LOGGING["handlers"]["null"] = {"class": "logging.NullHandler"}  # noqa: F405
LOGGING["loggers"]["philsa.request"]["handlers"] = ["null"]  # noqa: F405
LOGGING["loggers"]["philsa.audit"]["handlers"] = ["null"]  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "auth_identifier": "1000/min",
    "auth_sensitive": "1000/min",
    "auth_refresh": "1000/min",
    "auth_recovery": "1000/hour",
    "registration_lrn_verify": "1000/min",
    "registration_selfie_face": "1000/min",
}
