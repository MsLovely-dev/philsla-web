import re

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model

from apps.accounts.models import AccountProfile, LoginSelfieLog
from apps.accounts.roles import PortalRole


@override_settings(ROOT_URLCONF="config.urls")
class LoginEndpointTests(TestCase):
    def tearDown(self) -> None:
        cache.clear()
        super().tearDown()

    def test_identifier_step_rejects_invalid_identifier_format(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "not-an-lrn-or-email"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("identifier", payload["error"]["fields"])
        self.assertEqual(payload["error"]["correlationId"], response.headers["X-Correlation-ID"])

    def test_identifier_step_uses_generic_failure_for_well_formed_lrn_until_lookup_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "123456789012"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Identifier not found or invalid. Please check and try again.")

    def test_identifier_step_uses_generic_failure_for_well_formed_email_until_lookup_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Identifier not found or invalid. Please check and try again.")

    def test_identifier_step_returns_activation_for_passwordless_staff_account(self) -> None:
        user = get_user_model().objects.create(
            username="staff",
            email="staff@example.test",
            first_name="Staff",
            last_name="User",
            is_active=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        AccountProfile.objects.create(user=user, role=PortalRole.ADMISSIONS_REVIEWER.value)

        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "staff@example.test"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        payload = response.json()
        self.assertIn("activationToken", payload)
        self.assertNotIn("pendingAuthToken", payload)
        self.assertEqual(payload["nextStep"], "activation")

    def test_password_step_requires_password(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/password/",
            data={"pendingAuthToken": "pending-token", "password": ""},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("password", response.json()["error"]["fields"])

    def test_password_step_rejects_pending_token_until_token_store_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/password/",
            data={"pendingAuthToken": "pending-token", "password": "Password1!"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Your session has expired. Please start again.")

    def test_otp_step_requires_six_digit_code(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": "otp-token", "code": "abc123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("code", response.json()["error"]["fields"])

    def test_otp_step_rejects_code_until_otp_store_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": "otp-token", "code": "123456"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Invalid or expired code. Please try again.")

    def test_database_account_can_complete_otp_and_selfie_login(self) -> None:
        user = get_user_model().objects.create_user(
            username="student",
            email="student@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=user, role=PortalRole.STUDENT.value, lrn="123456789012")

        identifier_response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )

        self.assertEqual(identifier_response.status_code, 202)
        identifier_payload = identifier_response.json()
        self.assertIn("pendingAuthToken", identifier_payload)
        self.assertEqual(identifier_payload["nextStep"], "password")

        password_response = self.client.post(
            "/api/v1/auth/login/password/",
            data={
                "pendingAuthToken": identifier_payload["pendingAuthToken"],
                "password": "Password1!",
            },
            content_type="application/json",
        )

        self.assertEqual(password_response.status_code, 202)
        password_payload = password_response.json()
        self.assertIn("otpPendingAuthToken", password_payload)
        self.assertNotIn("devOtp", password_payload)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["student@example.test"])
        self.assertEqual(mail.outbox[0].subject, "Your PhilSLA login verification code")
        code_match = re.search(r"\b(\d{6})\b", mail.outbox[0].body)
        self.assertIsNotNone(code_match)
        code = code_match.group(1)
        self.assertIn(f"Your PhilSLA login verification code is {code}.", mail.outbox[0].body)
        self.assertEqual(len(mail.outbox[0].alternatives), 1)
        html_body, content_type = mail.outbox[0].alternatives[0]
        self.assertEqual(content_type, "text/html")
        self.assertNotIn("<img", html_body)
        self.assertNotIn('src="cid:', html_body)
        self.assertIn('<span style="color:#18345c;">Phil</span><span style="color:#a5162d;">SLA</span>', html_body)
        self.assertIn("reset your password or contact support", html_body)
        self.assertLess(html_body.index("This code expires in 5 minutes."), html_body.index(f">{code}<"))
        self.assertIn(f">{code}<", html_body)
        self.assertEqual(mail.outbox[0].attachments, [])

        otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={
                "otpPendingAuthToken": password_payload["otpPendingAuthToken"],
                "code": code,
            },
            content_type="application/json",
        )

        self.assertEqual(otp_response.status_code, 202)
        otp_payload = otp_response.json()
        self.assertEqual(otp_payload["nextStep"], "selfie")
        self.assertIn("selfiePendingAuthToken", otp_payload)
        self.assertNotIn("accessToken", otp_payload)
        self.assertNotIn("refreshToken", otp_response.cookies)

        selfie_response = self.client.post(
            "/api/v1/auth/login/selfie/",
            data={
                "selfiePendingAuthToken": otp_payload["selfiePendingAuthToken"],
                "file": SimpleUploadedFile("selfie.jpg", b"selfie-image", content_type="image/jpeg"),
            },
        )

        self.assertEqual(selfie_response.status_code, 200)
        selfie_payload = selfie_response.json()
        self.assertEqual(selfie_payload["tokenType"], "Bearer")
        self.assertIn("accessToken", selfie_payload)
        self.assertIn("refreshToken", selfie_response.cookies)
        self.assertIn(settings.SESSION_COOKIE_NAME, self.client.cookies)
        selfie_log = LoginSelfieLog.objects.get(user=user)
        self.assertEqual(selfie_log.content_type, "image/jpeg")
        self.assertEqual(selfie_log.size, len(b"selfie-image"))

        session_response = self.client.get(
            "/api/v1/auth/session/",
            HTTP_AUTHORIZATION=f"Bearer {selfie_payload['accessToken']}",
        )

        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(session_response.json()["user"]["role"], "STUDENT")

        bearerless_session_response = self.client.get("/api/v1/auth/session/")

        self.assertEqual(bearerless_session_response.status_code, 200)
        self.assertEqual(bearerless_session_response.json()["user"]["role"], "STUDENT")
