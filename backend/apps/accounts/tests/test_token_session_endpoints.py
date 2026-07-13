from types import SimpleNamespace

from django.test import TestCase, override_settings
from rest_framework.test import APIClient


@override_settings(ROOT_URLCONF="config.urls")
class TokenSessionEndpointTests(TestCase):
    def test_logout_requires_authentication(self) -> None:
        response = self.client.post("/api/v1/auth/logout/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "NOT_AUTHENTICATED")

    def test_authenticated_logout_revokes_current_session_boundary(self) -> None:
        client = APIClient()
        user = SimpleNamespace(id="user-123", is_authenticated=True, is_active=True)
        client.force_authenticate(user=user, token=SimpleNamespace(token_id="token-123"))

        response = client.post("/api/v1/auth/logout/")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.cookies["refreshToken"]["max-age"], 0)
        self.assertEqual(response.cookies["refreshToken"]["samesite"], "Strict")

    def test_refresh_token_boundary_returns_session_expired_until_token_store_exists(self) -> None:
        response = self.client.post("/api/v1/auth/token/refresh/")

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Your session has expired. Please log in again.")

    def test_token_revoke_requires_authentication(self) -> None:
        response = self.client.post("/api/v1/auth/token/revoke/", data={"scope": "current"}, content_type="application/json")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "NOT_AUTHENTICATED")

    def test_authenticated_token_revoke_accepts_current_scope(self) -> None:
        client = APIClient()
        user = SimpleNamespace(id="user-123", is_authenticated=True, is_active=True)
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/token/revoke/",
            data={"scope": "current"},
            format="json",
        )

        self.assertEqual(response.status_code, 204)

    def test_token_revoke_rejects_invalid_scope(self) -> None:
        client = APIClient()
        user = SimpleNamespace(id="user-123", is_authenticated=True, is_active=True)
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/token/revoke/",
            data={"scope": "invalid"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("scope", response.json()["error"]["fields"])
