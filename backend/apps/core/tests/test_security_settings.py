from django.conf import settings
from django.test import SimpleTestCase


class SecuritySettingsTests(SimpleTestCase):
    def test_cookie_security_defaults_are_strict(self) -> None:
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertTrue(settings.SESSION_COOKIE_SECURE)
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, "Strict")
        self.assertTrue(settings.CSRF_COOKIE_HTTPONLY)
        self.assertTrue(settings.CSRF_COOKIE_SECURE)
        self.assertEqual(settings.CSRF_COOKIE_SAMESITE, "Strict")

    def test_security_headers_are_enabled_by_default(self) -> None:
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertEqual(settings.SECURE_REFERRER_POLICY, "same-origin")
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")

    def test_origin_settings_are_allowlist_based(self) -> None:
        self.assertIsInstance(settings.CSRF_TRUSTED_ORIGINS, list)
        self.assertIsInstance(settings.CORS_ALLOWED_ORIGINS, list)
        self.assertTrue(settings.CORS_ALLOW_CREDENTIALS)

    def test_cors_middleware_is_enabled(self) -> None:
        self.assertIn("apps.core.middleware.CorsAllowlistMiddleware", settings.MIDDLEWARE)
