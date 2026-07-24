from types import SimpleNamespace

from django.test import TestCase, override_settings
from rest_framework.test import APIClient


@override_settings(ROOT_URLCONF="config.urls")
class RecoveryEndpointTests(TestCase):
    def test_password_recovery_request_rejects_invalid_identifier_format(self) -> None:
        response = self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "not-valid"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("identifier", response.json()["error"]["fields"])

    def test_password_recovery_request_uses_anti_enumeration_response_for_email(self) -> None:
        response = self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(
            response.json(),
            {"detail": "If the account can be recovered, instructions will be sent to the verified email address."},
        )

    def test_password_recovery_completion_enforces_password_policy(self) -> None:
        response = self.client.post(
            "/api/v1/auth/recovery/password/complete/",
            data={"recoveryToken": "token", "password": "weak", "confirmPassword": "weak"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("password", response.json()["error"]["fields"])

    def test_password_recovery_completion_rejects_expired_token_until_store_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/recovery/password/complete/",
            data={"recoveryToken": "token", "password": "Password1!", "confirmPassword": "Password1!"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(response.json()["error"]["message"], "This recovery link has expired. Please request a new one.")

    def test_admin_account_recovery_requires_system_admin(self) -> None:
        client = APIClient()
        user = SimpleNamespace(id="reviewer-123", is_authenticated=True, is_active=True, role="ADMISSIONS_REVIEWER")
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/recovery/admin/request/",
            data={"email": "staff@example.test"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "PERMISSION_DENIED")

    def test_system_admin_account_recovery_uses_anti_enumeration_response(self) -> None:
        client = APIClient()
        user = SimpleNamespace(id="admin-123", is_authenticated=True, is_active=True, role="SYSTEM_ADMIN")
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/recovery/admin/request/",
            data={"email": "staff@example.test"},
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(
            response.json(),
            {"detail": "If the account can be recovered, instructions will be sent to the verified email address."},
        )
