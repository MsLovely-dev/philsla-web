import re

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.applications.models import ApplicationAuditLog


class RegistrationEmailOtpTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.request_url = reverse("applications:registration-email-otp-request")
        self.verify_url = reverse("applications:registration-email-otp-verify")

    def request_otp(self, email="student@example.test"):
        return self.client.post(self.request_url, {"email": email}, format="json")

    def verify_otp(self, email="student@example.test", code="123456", **headers):
        return self.client.post(self.verify_url, {"email": email, "code": code}, format="json", **headers)

    def latest_code(self) -> str:
        match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(match)
        return match.group(1)

    def test_request_sends_registration_otp_email_without_exposing_code(self):
        response = self.request_otp()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "student@example.test")
        self.assertEqual(response.data["expiresInSeconds"], 300)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["student@example.test"])
        self.assertNotIn(self.latest_code(), str(response.data))

    def test_verify_valid_email_otp_returns_registration_email_token(self):
        self.request_otp("Student@Example.Test")

        response = self.client.post(
            self.verify_url,
            {"email": "student@example.test", "code": self.latest_code()},
            format="json",
            HTTP_X_REGISTRATION_SESSION_ID="REG-SESSION-OTP",
            HTTP_USER_AGENT="OtpBrowser/1.0",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["verified"])
        self.assertEqual(response.data["email"], "student@example.test")
        self.assertTrue(response.data["emailVerificationToken"])
        self.assertFalse(ApplicationAuditLog.objects.exists())

    def test_invalid_code_is_rejected_without_exposing_submitted_code(self):
        self.request_otp()

        response = self.verify_otp(
            code="000000",
            HTTP_X_REGISTRATION_SESSION_ID="REG-SESSION-OTP-FAILED",
            HTTP_USER_AGENT="OtpBrowser/1.0",
            REMOTE_ADDR="203.0.113.10",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "REGISTRATION_EMAIL_OTP_FAILED")
        self.assertNotIn("000000", str(response.data))
        self.assertFalse(ApplicationAuditLog.objects.exists())

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=60)
    def test_resend_during_cooldown_returns_retry_after(self):
        self.request_otp()

        response = self.request_otp()

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.data["error"]["code"], "REGISTRATION_EMAIL_OTP_COOLDOWN")
        self.assertGreater(response.data["error"]["meta"]["retryAfterSeconds"], 0)
