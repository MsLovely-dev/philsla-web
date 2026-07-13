from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model

from apps.accounts.models import AccountProfile
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

    @override_settings(AUTH_LOCAL_EXPOSE_OTP=True)
    def test_database_account_can_complete_three_step_login(self) -> None:
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
        self.assertRegex(password_payload["devOtp"], r"^\d{6}$")

        otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={
                "otpPendingAuthToken": password_payload["otpPendingAuthToken"],
                "code": password_payload["devOtp"],
            },
            content_type="application/json",
        )

        self.assertEqual(otp_response.status_code, 200)
        otp_payload = otp_response.json()
        self.assertEqual(otp_payload["tokenType"], "Bearer")
        self.assertIn("accessToken", otp_payload)
        self.assertIn("refreshToken", otp_response.cookies)

        session_response = self.client.get(
            "/api/v1/auth/session/",
            HTTP_AUTHORIZATION=f"Bearer {otp_payload['accessToken']}",
        )

        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(session_response.json()["user"]["role"], "STUDENT")
