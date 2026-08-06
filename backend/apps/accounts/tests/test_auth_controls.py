from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings

from apps.accounts.models import AccountProfile, PasswordLoginLockout
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

    def test_sensitive_login_throttle_does_not_block_session_refresh(self) -> None:
        with override_settings(
            CACHES=THROTTLE_TEST_CACHES,
            REST_FRAMEWORK=throttled_rest_framework("auth_sensitive", "1/min"),
        ):
            first_response = self.client.post(
                "/api/v1/auth/login/password/",
                data={"pendingAuthToken": "expired", "password": "Password1!"},
                content_type="application/json",
            )
            second_response = self.client.post(
                "/api/v1/auth/login/password/",
                data={"pendingAuthToken": "expired", "password": "Password1!"},
                content_type="application/json",
            )
            refresh_response = self.client.post("/api/v1/auth/token/refresh/")

        self.assertEqual(first_response.status_code, 401)
        self.assertEqual(second_response.status_code, 429)
        self.assertEqual(refresh_response.status_code, 401)
        self.assertEqual(refresh_response.json()["error"]["code"], "AUTHENTICATION_FAILED")


@override_settings(ROOT_URLCONF="config.urls")
class AuthAuditBoundaryTests(TestCase):
    def tearDown(self) -> None:
        cache.clear()
        super().tearDown()

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

    def test_lockout_state_and_audit_event_exclude_authentication_secrets(self) -> None:
        email = 'lockout-user@example.test'
        lrn = '987654321098'
        wrong_password = 'WrongPassword1!'
        user = get_user_model().objects.create_user(
            username='lockout-user',
            email=email,
            password='Password1!',
        )
        AccountProfile.objects.create(user=user, role=PortalRole.STUDENT.value, lrn=lrn)
        identifier_response = self.client.post(
            '/api/v1/auth/login/identifier/',
            data={'identifier': email},
            content_type='application/json',
        )
        pending_token = identifier_response.json()['pendingAuthToken']

        for _ in range(4):
            self.client.post(
                '/api/v1/auth/login/password/',
                data={'pendingAuthToken': pending_token, 'password': wrong_password},
                content_type='application/json',
            )

        with self.assertLogs('philsa.audit', level='INFO') as captured:
            response = self.client.post(
                '/api/v1/auth/login/password/',
                data={'pendingAuthToken': pending_token, 'password': wrong_password},
                content_type='application/json',
            )

        state = PasswordLoginLockout.objects.get(user=user)
        persisted_values = ' '.join(
            str(value) for key, value in state.__dict__.items() if key != '_state'
        )

        lockout_records = [record for record in captured.records if record.event == 'auth.lockout']
        self.assertEqual(len(lockout_records), 1)
        lockout_record = lockout_records[0]
        self.assertEqual(lockout_record.outcome, 'enforced')
        self.assertEqual(lockout_record.user_id, str(user.id))
        self.assertEqual(lockout_record.correlation_id, response.headers['X-Correlation-ID'])
        self.assertEqual(lockout_record.metadata, {})

        audit_values = ' '.join(
            [
                lockout_record.event,
                lockout_record.outcome,
                lockout_record.correlation_id,
                lockout_record.user_id,
                str(lockout_record.metadata),
                *captured.output,
            ]
        )
        for sensitive_value in (email, lrn, wrong_password, pending_token):
            self.assertNotIn(sensitive_value, persisted_values)
            self.assertNotIn(sensitive_value, audit_values)


class AuthPermissionBoundaryTests(TestCase):
    def test_student_registration_activation_role_boundary(self) -> None:
        self.assertEqual(
            set(StudentRegistrationActivationView.required_roles),
            {PortalRole.ADMISSIONS_REVIEWER.value, PortalRole.SYSTEM_ADMIN.value},
        )

    def test_admin_account_recovery_role_boundary(self) -> None:
        self.assertEqual(AdminAccountRecoveryRequestView.required_roles, (PortalRole.SYSTEM_ADMIN.value,))
