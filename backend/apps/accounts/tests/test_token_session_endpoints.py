import re
from types import SimpleNamespace

from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile, AuthRefreshSession
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

    def test_logout_with_django_session_signs_out_admin_session(self) -> None:
        user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@example.test",
            password="Password1!",
        )
        self.client.force_login(user)

        session_response = self.client.get("/api/v1/auth/session/")
        response = self.client.post("/api/v1/auth/logout/")
        next_session_response = self.client.get("/api/v1/auth/session/")

        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.cookies[settings.SESSION_COOKIE_NAME]["max-age"], 0)
        self.assertEqual(response.cookies["refreshToken"]["max-age"], 0)
        self.assertEqual(next_session_response.status_code, 401)

    def test_refresh_token_boundary_returns_session_expired_until_token_store_exists(self) -> None:
        response = self.client.post("/api/v1/auth/token/refresh/")

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Your session has expired. Please log in again.")

    def login_student(self):
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
        code_match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(code_match)
        otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={
                "otpPendingAuthToken": password_response.json()["otpPendingAuthToken"],
                "code": code_match.group(1),
            },
            content_type="application/json",
        )
        return otp_response

    def test_refresh_token_survives_cache_restart_and_rotates_cookie(self) -> None:
        otp_response = self.login_student()
        self.client.cookies["refreshToken"] = otp_response.cookies["refreshToken"].value
        cache.clear()

        refresh_response = self.client.post("/api/v1/auth/token/refresh/")

        self.assertEqual(refresh_response.status_code, 200)
        self.assertIn("accessToken", refresh_response.json())
        self.assertIn("refreshToken", refresh_response.cookies)
        self.assertEqual(AuthRefreshSession.objects.filter(revoked_at__isnull=True).count(), 1)

        self.client.cookies["refreshToken"] = otp_response.cookies["refreshToken"].value
        replay_response = self.client.post("/api/v1/auth/token/refresh/")

        self.assertEqual(replay_response.status_code, 401)
        self.assertEqual(replay_response.json()["error"]["code"], "AUTHENTICATION_FAILED")

    def test_logout_revokes_persistent_refresh_session(self) -> None:
        otp_response = self.login_student()

        response = self.client.post(
            "/api/v1/auth/logout/",
            headers={"Authorization": f"Bearer {otp_response.json()['accessToken']}"},
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(AuthRefreshSession.objects.filter(revoked_at__isnull=True).exists())

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
