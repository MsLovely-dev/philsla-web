from django.test import TestCase, override_settings


@override_settings(ROOT_URLCONF="config.urls")
class LoginEndpointTests(TestCase):
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
