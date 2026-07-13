from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import path
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.settings import get_auth_flow_settings


class ProtectedProbeView(APIView):
    def get(self, request) -> Response:
        return Response({"status": "authenticated"})


urlpatterns = [
    path("protected/", ProtectedProbeView.as_view(), name="protected-probe"),
]


class AuthenticationConfigurationTests(TestCase):
    def test_drf_uses_bearer_authentication_hook(self) -> None:
        self.assertEqual(
            settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"],
            ["apps.accounts.authentication.PendingAwareBearerAuthentication"],
        )

    def test_auth_flow_settings_match_adr_011_defaults(self) -> None:
        auth_settings = get_auth_flow_settings()

        self.assertEqual(auth_settings.access_token_lifetime_minutes, 15)
        self.assertEqual(auth_settings.refresh_token_lifetime_days, 7)
        self.assertEqual(auth_settings.pending_auth_token_ttl_minutes, 10)
        self.assertEqual(auth_settings.otp_ttl_minutes, 5)
        self.assertEqual(auth_settings.otp_resend_cooldown_seconds, 60)
        self.assertEqual(auth_settings.otp_max_resends, 3)
        self.assertEqual(auth_settings.otp_max_attempts, 5)
        self.assertEqual(auth_settings.password_max_attempts, 5)
        self.assertEqual(auth_settings.password_lockout_minutes, 15)
        self.assertEqual(auth_settings.student_idle_timeout_minutes, 20)
        self.assertEqual(auth_settings.staff_idle_timeout_minutes, 10)
        self.assertEqual(auth_settings.student_absolute_timeout_hours, 12)
        self.assertEqual(auth_settings.staff_absolute_timeout_hours, 8)

    @override_settings(ROOT_URLCONF=__name__)
    def test_protected_endpoint_requires_authentication(self) -> None:
        response = self.client.get("/protected/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["WWW-Authenticate"], 'Bearer realm="api"')
        self.assertEqual(response.json()["error"]["code"], "NOT_AUTHENTICATED")

    @override_settings(ROOT_URLCONF=__name__)
    def test_bearer_tokens_are_rejected_until_validation_is_implemented(self) -> None:
        response = self.client.get("/protected/", headers={"Authorization": "Bearer placeholder"})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["WWW-Authenticate"], 'Bearer realm="api"')
        self.assertEqual(response.json()["error"]["code"], "AUTHENTICATION_FAILED")
