from datetime import timedelta

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import path
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.settings import get_auth_email_settings, get_auth_flow_settings


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
            [
                "apps.accounts.authentication.PendingAwareBearerAuthentication",
                "apps.accounts.authentication.ApiSessionAuthentication",
            ],
        )

    def test_auth_flow_settings_match_jwt_defaults(self) -> None:
        auth_settings = get_auth_flow_settings()

        self.assertEqual(auth_settings.access_token_lifetime_minutes, 20)
        self.assertEqual(auth_settings.refresh_token_lifetime_days, 7)
        self.assertEqual(auth_settings.pending_auth_token_ttl_minutes, 10)
        self.assertEqual(auth_settings.pending_auth_inactivity_ttl_minutes, 10)
        self.assertEqual(auth_settings.pending_auth_absolute_ttl_minutes, 15)
        self.assertEqual(auth_settings.otp_ttl_minutes, 5)
        self.assertEqual(auth_settings.otp_resend_cooldown_seconds, 60)
        self.assertEqual(auth_settings.otp_max_resends, 3)
        self.assertEqual(auth_settings.otp_max_attempts, 5)
        self.assertEqual(auth_settings.otp_min_resend_remaining_seconds, 90)
        self.assertEqual(auth_settings.otp_account_window_limit, 5)
        self.assertEqual(auth_settings.otp_account_window_seconds, 15 * 60)
        self.assertEqual(auth_settings.otp_account_daily_limit, 20)
        self.assertEqual(auth_settings.otp_account_daily_seconds, 24 * 60 * 60)
        self.assertEqual(auth_settings.otp_backoff_seconds, [5 * 60, 15 * 60, 60 * 60])
        self.assertEqual(auth_settings.otp_ip_window_alert_threshold, 20)
        self.assertEqual(auth_settings.otp_ip_daily_alert_threshold, 80)
        self.assertEqual(auth_settings.otp_ip_high_risk_delay_seconds, 1)
        self.assertEqual(auth_settings.otp_ip_confirmed_abuse_block_seconds, 60 * 60)
        self.assertFalse(auth_settings.otp_ip_blocking_enabled)
        self.assertEqual(auth_settings.password_max_attempts, 5)
        self.assertEqual(auth_settings.password_lockout_minutes, 15)
        self.assertEqual(auth_settings.student_idle_timeout_minutes, 20)
        self.assertEqual(auth_settings.staff_idle_timeout_minutes, 10)
        self.assertEqual(auth_settings.student_absolute_timeout_hours, 12)
        self.assertEqual(auth_settings.staff_absolute_timeout_hours, 8)

    def test_simple_jwt_security_settings_use_timedeltas_and_refresh_rotation(self) -> None:
        self.assertIn("rest_framework_simplejwt.token_blacklist", settings.INSTALLED_APPS)
        self.assertEqual(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"], timedelta(minutes=20))
        self.assertEqual(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"], timedelta(days=7))
        self.assertTrue(settings.SIMPLE_JWT["ROTATE_REFRESH_TOKENS"])
        self.assertTrue(settings.SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"])

    def test_auth_email_settings_default_to_console_provider(self) -> None:
        email_settings = get_auth_email_settings()

        self.assertEqual(email_settings.provider, "console")
        self.assertFalse(email_settings.azure_enabled)
        self.assertFalse(email_settings.azure_configured)
        self.assertEqual(email_settings.azure_connection_string, "")
        self.assertEqual(email_settings.azure_endpoint, "")
        self.assertEqual(email_settings.azure_sender, "")

    @override_settings(
        AUTH_EMAIL_PROVIDER="azure_communication_services",
        AZURE_COMMUNICATION_EMAIL_ENABLED=True,
        AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING="endpoint=https://example.communication.azure.com/;accesskey=test",
        AZURE_COMMUNICATION_EMAIL_ENDPOINT="",
        AZURE_COMMUNICATION_EMAIL_SENDER="no-reply@example.test",
    )
    def test_auth_email_settings_allow_future_azure_provider(self) -> None:
        email_settings = get_auth_email_settings()

        self.assertEqual(email_settings.provider, "azure_communication_services")
        self.assertTrue(email_settings.azure_enabled)
        self.assertTrue(email_settings.azure_configured)
        self.assertEqual(email_settings.azure_sender, "no-reply@example.test")

    @override_settings(ROOT_URLCONF=__name__)
    def test_protected_endpoint_requires_authentication(self) -> None:
        response = self.client.get("/protected/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["WWW-Authenticate"], 'Bearer realm="api"')
        self.assertEqual(response.json()["error"]["code"], "NOT_AUTHENTICATED")

    @override_settings(ROOT_URLCONF=__name__)
    def test_invalid_bearer_tokens_are_rejected(self) -> None:
        response = self.client.get("/protected/", headers={"Authorization": "Bearer placeholder"})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["WWW-Authenticate"], 'Bearer realm="api"')
        self.assertEqual(response.json()["error"]["code"], "AUTHENTICATION_FAILED")
