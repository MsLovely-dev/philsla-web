import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
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

    def create_student_account(self, *, email: str = "audit-student@example.test", password: str = "Password1!"):
        user = get_user_model().objects.create_user(username=email, email=email, password=password)
        AccountProfile.objects.create(user=user, role=PortalRole.STUDENT.value, lrn="112233445566")
        return user

    def otp_code_from_outbox(self, index: int = -1) -> str:
        code_match = re.search(r"\b(\d{6})\b", mail.outbox[index].body)
        self.assertIsNotNone(code_match)
        return code_match.group(1)

    def test_password_failure_and_success_record_safe_audit_events(self) -> None:
        email = "password-audit@example.test"
        password = "Password1!"
        wrong_password = "WrongPassword1!"
        self.create_student_account(email=email, password=password)

        identifier_response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": email},
            content_type="application/json",
        )
        pending_token = identifier_response.json()["pendingAuthToken"]

        with self.assertLogs("philsa.audit", level="INFO") as captured_failure:
            self.client.post(
                "/api/v1/auth/login/password/",
                data={"pendingAuthToken": pending_token, "password": wrong_password},
                content_type="application/json",
            )

        failure_records = [r for r in captured_failure.records if r.event == "auth.password_submitted"]
        self.assertEqual(len(failure_records), 1)
        self.assertEqual(failure_records[0].outcome, "rejected")

        with self.assertLogs("philsa.audit", level="INFO") as captured_success:
            success_response = self.client.post(
                "/api/v1/auth/login/password/",
                data={"pendingAuthToken": pending_token, "password": password},
                content_type="application/json",
            )

        success_records = [r for r in captured_success.records if r.event == "auth.password_submitted"]
        self.assertEqual(len(success_records), 1)
        self.assertEqual(success_records[0].outcome, "accepted")
        self.assertEqual(success_records[0].correlation_id, success_response.headers["X-Correlation-ID"])

        audit_values = " ".join(captured_failure.output + captured_success.output)
        for sensitive_value in (email, password, wrong_password, pending_token):
            self.assertNotIn(sensitive_value, audit_values)

    def test_otp_verification_failure_and_success_record_safe_audit_events(self) -> None:
        email = "otp-audit@example.test"
        password = "Password1!"
        self.create_student_account(email=email, password=password)

        identifier_response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": email},
            content_type="application/json",
        )
        password_response = self.client.post(
            "/api/v1/auth/login/password/",
            data={"pendingAuthToken": identifier_response.json()["pendingAuthToken"], "password": password},
            content_type="application/json",
        )
        otp_pending_token = password_response.json()["otpPendingAuthToken"]
        valid_code = self.otp_code_from_outbox()

        with self.assertLogs("philsa.audit", level="INFO") as captured_failure:
            self.client.post(
                "/api/v1/auth/login/otp/",
                data={"otpPendingAuthToken": otp_pending_token, "code": "000000"},
                content_type="application/json",
            )

        failure_records = [r for r in captured_failure.records if r.event == "auth.otp_submitted"]
        self.assertEqual(len(failure_records), 1)
        self.assertEqual(failure_records[0].outcome, "rejected")

        with self.assertLogs("philsa.audit", level="INFO") as captured_success:
            success_response = self.client.post(
                "/api/v1/auth/login/otp/",
                data={"otpPendingAuthToken": otp_pending_token, "code": valid_code},
                content_type="application/json",
            )

        success_records = [r for r in captured_success.records if r.event == "auth.otp_submitted"]
        self.assertEqual(len(success_records), 1)
        self.assertEqual(success_records[0].outcome, "accepted")
        self.assertEqual(success_records[0].correlation_id, success_response.headers["X-Correlation-ID"])

        audit_values = " ".join(captured_failure.output + captured_success.output)
        for sensitive_value in (email, valid_code, otp_pending_token):
            self.assertNotIn(sensitive_value, audit_values)

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0)
    def test_otp_send_and_resend_record_safe_audit_events(self) -> None:
        email = "otp-send-audit@example.test"
        password = "Password1!"
        self.create_student_account(email=email, password=password)

        identifier_response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": email},
            content_type="application/json",
        )

        with self.assertLogs("philsa.audit", level="INFO") as captured_send:
            password_response = self.client.post(
                "/api/v1/auth/login/password/",
                data={"pendingAuthToken": identifier_response.json()["pendingAuthToken"], "password": password},
                content_type="application/json",
            )

        send_records = [r for r in captured_send.records if r.event == "auth.password_submitted"]
        self.assertEqual(len(send_records), 1)
        self.assertEqual(send_records[0].outcome, "accepted")

        otp_pending_token = password_response.json()["otpPendingAuthToken"]

        with self.assertLogs("philsa.audit", level="INFO") as captured_resend:
            self.client.post(
                "/api/v1/auth/login/otp/resend/",
                data={"otpPendingAuthToken": otp_pending_token},
                content_type="application/json",
            )

        resend_records = [r for r in captured_resend.records if r.event == "auth.otp_resend_requested"]
        self.assertEqual(len(resend_records), 1)
        self.assertEqual(resend_records[0].outcome, "accepted")

        audit_values = " ".join(captured_send.output + captured_resend.output)
        for sensitive_value in (email, otp_pending_token):
            self.assertNotIn(sensitive_value, audit_values)

    def complete_login_through_selfie(self, *, email: str, password: str):
        identifier_response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": email},
            content_type="application/json",
        )
        password_response = self.client.post(
            "/api/v1/auth/login/password/",
            data={"pendingAuthToken": identifier_response.json()["pendingAuthToken"], "password": password},
            content_type="application/json",
        )
        otp_payload = password_response.json()
        code = self.otp_code_from_outbox()
        otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": otp_payload["otpPendingAuthToken"], "code": code},
            content_type="application/json",
        )
        return otp_response.json()["selfiePendingAuthToken"]

    def test_selfie_save_records_safe_audit_event(self) -> None:
        email = "selfie-audit@example.test"
        password = "Password1!"
        self.create_student_account(email=email, password=password)
        selfie_pending_token = self.complete_login_through_selfie(email=email, password=password)
        selfie_bytes = b"synthetic-selfie-bytes"

        with self.assertLogs("philsa.audit", level="INFO") as captured:
            response = self.client.post(
                "/api/v1/auth/login/selfie/",
                data={
                    "selfiePendingAuthToken": selfie_pending_token,
                    "file": SimpleUploadedFile("selfie.jpg", selfie_bytes, content_type="image/jpeg"),
                },
            )

        selfie_records = [r for r in captured.records if r.event == "auth.login_selfie_submitted"]
        self.assertEqual(len(selfie_records), 1)
        self.assertEqual(selfie_records[0].outcome, "accepted")
        self.assertEqual(selfie_records[0].correlation_id, response.headers["X-Correlation-ID"])

        audit_values = " ".join(captured.output)
        self.assertNotIn(selfie_bytes.decode(), audit_values)
        self.assertNotIn(selfie_pending_token, audit_values)

    def test_session_creation_records_safe_audit_event(self) -> None:
        email = "session-audit@example.test"
        password = "Password1!"
        user = self.create_student_account(email=email, password=password)
        selfie_pending_token = self.complete_login_through_selfie(email=email, password=password)

        with self.assertLogs("philsa.audit", level="INFO") as captured:
            response = self.client.post(
                "/api/v1/auth/login/selfie/",
                data={
                    "selfiePendingAuthToken": selfie_pending_token,
                    "file": SimpleUploadedFile("selfie.jpg", b"synthetic-selfie-bytes", content_type="image/jpeg"),
                },
            )

        session_records = [r for r in captured.records if r.event == "auth.session_created"]
        self.assertEqual(len(session_records), 1)
        self.assertEqual(session_records[0].outcome, "accepted")
        self.assertEqual(session_records[0].user_id, str(user.id))
        self.assertEqual(session_records[0].correlation_id, response.headers["X-Correlation-ID"])

        access_token = response.json()["accessToken"]
        refresh_token = response.cookies["refreshToken"].value
        audit_values = " ".join(captured.output)
        self.assertNotIn(access_token, audit_values)
        self.assertNotIn(refresh_token, audit_values)


class AuthPermissionBoundaryTests(TestCase):
    def test_student_registration_activation_role_boundary(self) -> None:
        self.assertEqual(
            set(StudentRegistrationActivationView.required_roles),
            {PortalRole.ADMISSIONS_REVIEWER.value, PortalRole.SYSTEM_ADMIN.value},
        )

    def test_admin_account_recovery_role_boundary(self) -> None:
        self.assertEqual(AdminAccountRecoveryRequestView.required_roles, (PortalRole.SYSTEM_ADMIN.value,))
