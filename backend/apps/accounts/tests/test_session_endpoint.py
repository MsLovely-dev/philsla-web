from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AccountPermission, AccountProfile
from apps.accounts.roles import PortalRole


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

    def test_invalid_bearer_token_is_rejected(self) -> None:
        response = self.client.get("/api/v1/auth/session/", headers={"Authorization": "Bearer placeholder"})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["WWW-Authenticate"], 'Bearer realm="api"')
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Invalid or expired bearer token.")

    def test_authenticated_request_returns_server_derived_session_claims(self) -> None:
        client = APIClient()
        user = SimpleNamespace(
            id="user-123",
            is_authenticated=True,
            is_active=True,
            email="student@example.test",
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
                    "email": "student@example.test",
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

    def test_django_admin_session_returns_system_admin_claims_for_superuser(self) -> None:
        user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@example.test",
            password="Password1!",
        )
        self.client.force_login(user)

        response = self.client.get("/api/v1/auth/session/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["id"], str(user.id))
        self.assertEqual(payload["user"]["email"], "admin@example.test")
        self.assertEqual(payload["user"]["role"], "SYSTEM_ADMIN")
        self.assertEqual(payload["user"]["securityTier"], 3)
        self.assertTrue(payload["session"]["authenticated"])

    def test_django_session_returns_account_profile_role_claims(self) -> None:
        user = get_user_model().objects.create_user(
            username="reviewer",
            email="reviewer@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(
            user=user,
            role=PortalRole.ADMISSIONS_REVIEWER.value,
            api_permissions=["applications:review"],
            scopes={"office": "admissions"},
        )
        self.client.force_login(user)

        response = self.client.get("/api/v1/auth/session/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["role"], "ADMISSIONS_REVIEWER")
        self.assertEqual(payload["user"]["permissions"], ["applications:review"])
        self.assertEqual(payload["user"]["scopes"], {"office": "admissions"})

    def test_session_returns_structured_account_permissions(self) -> None:
        user = get_user_model().objects.create_user(
            username="admin",
            email="admin@example.test",
            password="Password1!",
        )
        profile = AccountProfile.objects.create(user=user, role=PortalRole.SYSTEM_ADMIN.value)
        AccountPermission.objects.create(
            account_profile=profile,
            module_id="99",
            action="READ",
            effect=AccountPermission.Effect.ALLOW,
        )
        self.client.force_login(user)

        response = self.client.get("/api/v1/auth/session/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("MOD_31_READ", response.json()["user"]["permissions"])
        self.assertIn("MOD_99_READ", response.json()["user"]["permissions"])
