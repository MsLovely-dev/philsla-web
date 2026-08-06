from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings


@override_settings(ROOT_URLCONF="config.urls")
class AuthErrorSafetyTests(TestCase):
    def assertResponseDoesNotExpose(self, response, *sensitive_values: str) -> None:
        body = response.content.decode("utf-8")
        for value in sensitive_values:
            self.assertNotIn(value, body)

    def test_login_identifier_error_does_not_expose_identifier_or_role_path(self) -> None:
        identifier = "student@example.test"

        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": identifier},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertResponseDoesNotExpose(response, identifier, "Student", "staff", "admin")

    def test_password_step_error_does_not_expose_pending_token_or_password(self) -> None:
        pending_token = "pending-secret-token"
        password = "Password1!"

        response = self.client.post(
            "/api/v1/auth/login/password/",
            data={"pendingAuthToken": pending_token, "password": password},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertResponseDoesNotExpose(response, pending_token, password)

    def test_otp_step_error_does_not_expose_otp_token_or_code(self) -> None:
        otp_token = "otp-secret-token"
        code = "123456"

        response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": otp_token, "code": code},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertResponseDoesNotExpose(response, otp_token, code)

    def test_selfie_step_error_does_not_expose_selfie_token_or_bytes(self) -> None:
        selfie_token = "selfie-secret-token"
        selfie_bytes = b"synthetic-selfie-bytes"

        response = self.client.post(
            "/api/v1/auth/login/selfie/",
            data={
                "selfiePendingAuthToken": selfie_token,
                "file": SimpleUploadedFile("selfie.jpg", selfie_bytes, content_type="image/jpeg"),
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertResponseDoesNotExpose(response, selfie_token, selfie_bytes.decode())

    def test_refresh_error_does_not_expose_refresh_cookie(self) -> None:
        refresh_token = "refresh-secret-token"
        self.client.cookies["refreshToken"] = refresh_token

        response = self.client.post("/api/v1/auth/token/refresh/")

        self.assertEqual(response.status_code, 401)
        self.assertResponseDoesNotExpose(response, refresh_token)

    def test_staff_activation_error_does_not_expose_activation_token_or_password(self) -> None:
        activation_token = "activation-secret-token"
        password = "Password1!"

        response = self.client.post(
            "/api/v1/auth/activation/staff/complete/",
            data={
                "activationToken": activation_token,
                "password": password,
                "confirmPassword": password,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertResponseDoesNotExpose(response, activation_token, password)

    def test_recovery_request_does_not_expose_identifier(self) -> None:
        identifier = "student@example.test"

        response = self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": identifier},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertResponseDoesNotExpose(response, identifier)

    def test_recovery_completion_error_does_not_expose_recovery_token_or_password(self) -> None:
        recovery_token = "recovery-secret-token"
        password = "Password1!"

        response = self.client.post(
            "/api/v1/auth/recovery/password/complete/",
            data={
                "recoveryToken": recovery_token,
                "password": password,
                "confirmPassword": password,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertResponseDoesNotExpose(response, recovery_token, password)
