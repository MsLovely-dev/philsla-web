from django.conf import settings
from django.test import TestCase, override_settings

from apps.accounts.roles import PortalRole
from apps.accounts.views import AdminAccountRecoveryRequestView, StudentRegistrationActivationView


def throttled_rest_framework(scope: str, rate: str) -> dict[str, object]:
    rest_framework = dict(settings.REST_FRAMEWORK)
    throttle_rates = dict(rest_framework["DEFAULT_THROTTLE_RATES"])
    throttle_rates[scope] = rate
    rest_framework["DEFAULT_THROTTLE_RATES"] = throttle_rates
    return rest_framework


THROTTLE_TEST_CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "auth-control-throttle-tests",
    }
}


@override_settings(ROOT_URLCONF="config.urls")
class AuthThrottleTests(TestCase):
    def test_identifier_login_is_throttled(self) -> None:
        with override_settings(
            CACHES=THROTTLE_TEST_CACHES,
            REST_FRAMEWORK=throttled_rest_framework("auth_identifier", "1/min"),
        ):
            first_response = self.client.post(
                "/api/v1/auth/login/identifier/",
                data={"identifier": "123456789012"},
                content_type="application/json",
            )
            second_response = self.client.post(
                "/api/v1/auth/login/identifier/",
                data={"identifier": "123456789012"},
                content_type="application/json",
            )

        self.assertEqual(first_response.status_code, 401)
        self.assertEqual(second_response.status_code, 429)
        self.assertEqual(second_response.json()["error"]["code"], "THROTTLED")


@override_settings(ROOT_URLCONF="config.urls")
class AuthAuditBoundaryTests(TestCase):
    def test_identifier_login_records_safe_audit_event(self) -> None:
        identifier = "student@example.test"

        with self.assertLogs("philsa.audit", level="INFO") as captured:
            response = self.client.post(
                "/api/v1/auth/login/identifier/",
                data={"identifier": identifier},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(len(captured.records), 1)

        record = captured.records[0]
        self.assertEqual(record.event, "auth.identifier_submitted")
        self.assertEqual(record.outcome, "rejected")
        self.assertEqual(record.correlation_id, response.headers["X-Correlation-ID"])
        self.assertNotIn(identifier, captured.output[0])


class AuthPermissionBoundaryTests(TestCase):
    def test_student_registration_activation_role_boundary(self) -> None:
        self.assertEqual(
            set(StudentRegistrationActivationView.required_roles),
            {PortalRole.ADMISSIONS_REVIEWER.value, PortalRole.SYSTEM_ADMIN.value},
        )

    def test_admin_account_recovery_role_boundary(self) -> None:
        self.assertEqual(AdminAccountRecoveryRequestView.required_roles, (PortalRole.SYSTEM_ADMIN.value,))
