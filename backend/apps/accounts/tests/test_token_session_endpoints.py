from types import SimpleNamespace

from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole


@override_settings(ROOT_URLCONF="config.urls")
class TokenSessionEndpointTests(TestCase):
    def tearDown(self) -> None:
        cache.clear()
        super().tearDown()

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

    @override_settings(AUTH_LOCAL_EXPOSE_OTP=True)
    def test_refresh_token_rotates_cookie_and_returns_new_access_token(self) -> None:
        user = get_user_model().objects.create_user(
            username="student",
            email="student@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=user, role=PortalRole.STUDENT.value)

        identifier_response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )
        password_response = self.client.post(
            "/api/v1/auth/login/password/",
            data={
                "pendingAuthToken": identifier_response.json()["pendingAuthToken"],
                "password": "Password1!",
            },
            content_type="application/json",
        )
        otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={
                "otpPendingAuthToken": password_response.json()["otpPendingAuthToken"],
                "code": password_response.json()["devOtp"],
            },
            content_type="application/json",
        )
        self.client.cookies["refreshToken"] = otp_response.cookies["refreshToken"].value

        refresh_response = self.client.post("/api/v1/auth/token/refresh/")

        self.assertEqual(refresh_response.status_code, 200)
        self.assertIn("accessToken", refresh_response.json())
        self.assertIn("refreshToken", refresh_response.cookies)

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
