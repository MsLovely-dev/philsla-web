from types import SimpleNamespace

from django.test import TestCase, override_settings
from rest_framework.test import APIClient


@override_settings(ROOT_URLCONF="config.urls")
class CurrentSessionEndpointTests(TestCase):
    def test_current_session_requires_authentication(self) -> None:
        response = self.client.get("/api/v1/auth/session/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["WWW-Authenticate"], 'Bearer realm="api"')
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "NOT_AUTHENTICATED")
        self.assertEqual(payload["error"]["fields"], {})
        self.assertEqual(payload["error"]["correlationId"], response.headers["X-Correlation-ID"])

    def test_bearer_token_is_rejected_until_token_validation_is_implemented(self) -> None:
        response = self.client.get("/api/v1/auth/session/", headers={"Authorization": "Bearer placeholder"})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["WWW-Authenticate"], 'Bearer realm="api"')
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Bearer token validation is not implemented.")

    def test_authenticated_request_returns_server_derived_session_claims(self) -> None:
        client = APIClient()
        user = SimpleNamespace(
            id="user-123",
            is_authenticated=True,
            is_active=True,
            role="STUDENT",
            api_permissions=("applications:create", "applications:read-own"),
            scopes={"studentId": "student-123"},
        )
        client.force_authenticate(user=user)

        response = client.get("/api/v1/auth/session/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "user": {
                    "id": "user-123",
                    "role": "STUDENT",
                    "securityTier": 1,
                    "permissions": ["applications:create", "applications:read-own"],
                    "scopes": {"studentId": "student-123"},
                },
                "session": {
                    "authenticated": True,
                    "expiresAt": None,
                },
            },
        )
