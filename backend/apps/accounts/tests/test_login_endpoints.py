import re
from datetime import datetime, timedelta

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import AccountProfile, LoginSelfieLog, PasswordLoginLockout
from apps.accounts.roles import PortalRole
from apps.accounts.services import OTP_ACCOUNT_RATE_PREFIX, PENDING_OTP_PREFIX, _safe_account_rate_key


@override_settings(ROOT_URLCONF="config.urls")
class LoginEndpointTests(TestCase):
    def tearDown(self) -> None:
        cache.clear()
        super().tearDown()

    def create_student_account(self):
        user = get_user_model().objects.create_user(
            username="student",
            email="student@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=user, role=PortalRole.STUDENT.value, lrn="123456789012")
        return user

    def start_student_password_login(self):
        user = self.create_student_account()
        identifier_response = self.client.post(
            '/api/v1/auth/login/identifier/',
            data={'identifier': 'student@example.test'},
            content_type='application/json',
        )
        self.assertEqual(identifier_response.status_code, 202)
        return user, identifier_response.json()['pendingAuthToken']

    def post_password(self, *, pending_auth_token: str, password: str):
        return self.client.post(
            '/api/v1/auth/login/password/',
            data={'pendingAuthToken': pending_auth_token, 'password': password},
            content_type='application/json',
        )

    def assert_generic_password_failure(self, response) -> None:
        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload['error']['code'], 'AUTHENTICATION_FAILED')
        self.assertEqual(payload['error']['message'], 'Incorrect email/LRN or password.')

    def start_student_otp_login(self) -> dict:
        self.create_student_account()
        identifier_response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )
        self.assertEqual(identifier_response.status_code, 202)

        password_response = self.client.post(
            "/api/v1/auth/login/password/",
            data={
                "pendingAuthToken": identifier_response.json()["pendingAuthToken"],
                "password": "Password1!",
            },
            content_type="application/json",
        )
        self.assertEqual(password_response.status_code, 202)
        return password_response.json()

    def otp_code_from_outbox(self, index: int = -1) -> str:
        code_match = re.search(r"\b(\d{6})\b", mail.outbox[index].body)
        self.assertIsNotNone(code_match)
        return code_match.group(1)

    def test_identifier_step_rejects_invalid_identifier_format(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "not-an-lrn-or-email"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("identifier", payload["error"]["fields"])
        self.assertEqual(payload["error"]["correlationId"], response.headers["X-Correlation-ID"])

    def test_identifier_step_uses_generic_failure_for_well_formed_lrn_until_lookup_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "123456789012"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Identifier not found or invalid. Please check and try again.")

    def test_identifier_step_uses_generic_failure_for_well_formed_email_until_lookup_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Identifier not found or invalid. Please check and try again.")

    def test_identifier_step_returns_activation_for_passwordless_staff_account(self) -> None:
        user = get_user_model().objects.create(
            username="staff",
            email="staff@example.test",
            first_name="Staff",
            last_name="User",
            is_active=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        AccountProfile.objects.create(user=user, role=PortalRole.ADMISSIONS_REVIEWER.value)

        response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "staff@example.test"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        payload = response.json()
        self.assertIn("activationToken", payload)
        self.assertNotIn("pendingAuthToken", payload)
        self.assertEqual(payload["nextStep"], "activation")

    def test_password_step_requires_password(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/password/",
            data={"pendingAuthToken": "pending-token", "password": ""},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("password", response.json()["error"]["fields"])

    def test_password_step_rejects_pending_token_until_token_store_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/password/",
            data={"pendingAuthToken": "pending-token", "password": "Password1!"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Your session has expired. Please start again.")

    def test_first_four_wrong_passwords_do_not_lock_account(self) -> None:
        user, pending_token = self.start_student_password_login()

        for _ in range(4):
            response = self.post_password(pending_auth_token=pending_token, password='WrongPassword1!')
            self.assert_generic_password_failure(response)

        state = PasswordLoginLockout.objects.get(user=user)
        self.assertEqual(state.failed_attempts, 4)
        self.assertIsNone(state.locked_until)

    def test_fifth_wrong_password_locks_account_for_fifteen_minutes(self) -> None:
        user, pending_token = self.start_student_password_login()
        for _ in range(4):
            self.post_password(pending_auth_token=pending_token, password='WrongPassword1!')

        before_fifth_attempt = timezone.now()
        response = self.post_password(pending_auth_token=pending_token, password='WrongPassword1!')

        self.assert_generic_password_failure(response)
        state = PasswordLoginLockout.objects.get(user=user)
        self.assertEqual(state.failed_attempts, 5)
        self.assertGreaterEqual(state.locked_until, before_fifth_attempt + timedelta(minutes=15))
        self.assertLessEqual(state.locked_until, timezone.now() + timedelta(minutes=15))

    def test_correct_password_is_denied_during_active_lockout(self) -> None:
        _, pending_token = self.start_student_password_login()
        for _ in range(5):
            self.post_password(pending_auth_token=pending_token, password='WrongPassword1!')

        response = self.post_password(pending_auth_token=pending_token, password='Password1!')

        self.assert_generic_password_failure(response)
        self.assertEqual(len(mail.outbox), 0)

    def test_correct_password_is_accepted_after_lockout_expires(self) -> None:
        user, pending_token = self.start_student_password_login()
        for _ in range(5):
            self.post_password(pending_auth_token=pending_token, password='WrongPassword1!')
        lockout_model = PasswordLoginLockout
        state = lockout_model.objects.get(user=user)
        state.locked_until = timezone.now() - timedelta(seconds=1)
        state.save(update_fields=['locked_until', 'updated_at'])

        response = self.post_password(pending_auth_token=pending_token, password='Password1!')

        self.assertEqual(response.status_code, 202)
        self.assertFalse(lockout_model.objects.filter(user=user).exists())

    def test_successful_password_clears_failure_state(self) -> None:
        user, pending_token = self.start_student_password_login()
        for _ in range(3):
            self.post_password(pending_auth_token=pending_token, password='WrongPassword1!')
        lockout_model = PasswordLoginLockout
        self.assertEqual(lockout_model.objects.get(user=user).failed_attempts, 3)

        response = self.post_password(pending_auth_token=pending_token, password='Password1!')

        self.assertEqual(response.status_code, 202)
        self.assertFalse(lockout_model.objects.filter(user=user).exists())

    def test_otp_step_requires_six_digit_code(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": "otp-token", "code": "abc123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("code", response.json()["error"]["fields"])

    def test_otp_step_rejects_code_until_otp_store_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": "otp-token", "code": "123456"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(payload["error"]["message"], "Invalid or expired code. Please try again.")

    def test_database_account_can_complete_otp_and_selfie_login(self) -> None:
        user = get_user_model().objects.create_user(
            username="student",
            email="student@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=user, role=PortalRole.STUDENT.value, lrn="123456789012")

        identifier_response = self.client.post(
            "/api/v1/auth/login/identifier/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )

        self.assertEqual(identifier_response.status_code, 202)
        identifier_payload = identifier_response.json()
        self.assertIn("pendingAuthToken", identifier_payload)
        self.assertEqual(identifier_payload["nextStep"], "password")

        password_response = self.client.post(
            "/api/v1/auth/login/password/",
            data={
                "pendingAuthToken": identifier_payload["pendingAuthToken"],
                "password": "Password1!",
            },
            content_type="application/json",
        )

        self.assertEqual(password_response.status_code, 202)
        password_payload = password_response.json()
        self.assertIn("otpPendingAuthToken", password_payload)
        self.assertNotIn("devOtp", password_payload)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["student@example.test"])
        self.assertEqual(mail.outbox[0].subject, "Your PhilSLA login verification code")
        code_match = re.search(r"\b(\d{6})\b", mail.outbox[0].body)
        self.assertIsNotNone(code_match)
        code = code_match.group(1)
        self.assertIn(f"Your PhilSLA login verification code is {code}.", mail.outbox[0].body)
        self.assertEqual(len(mail.outbox[0].alternatives), 1)
        html_body, content_type = mail.outbox[0].alternatives[0]
        self.assertEqual(content_type, "text/html")
        self.assertNotIn("<img", html_body)
        self.assertNotIn('src="cid:', html_body)
        self.assertIn('<span style="color:#18345c;">Phil</span><span style="color:#a5162d;">SLA</span>', html_body)
        self.assertIn("reset your password or contact support", html_body)
        self.assertLess(html_body.index("This code expires in 5 minutes."), html_body.index(f">{code}<"))
        self.assertIn(f">{code}<", html_body)
        self.assertEqual(mail.outbox[0].attachments, [])

        otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={
                "otpPendingAuthToken": password_payload["otpPendingAuthToken"],
                "code": code,
            },
            content_type="application/json",
        )

        self.assertEqual(otp_response.status_code, 202)
        otp_payload = otp_response.json()
        self.assertEqual(otp_payload["nextStep"], "selfie")
        self.assertIn("selfiePendingAuthToken", otp_payload)
        self.assertNotIn("accessToken", otp_payload)
        self.assertNotIn("refreshToken", otp_response.cookies)

        selfie_response = self.client.post(
            "/api/v1/auth/login/selfie/",
            data={
                "selfiePendingAuthToken": otp_payload["selfiePendingAuthToken"],
                "file": SimpleUploadedFile("selfie.jpg", b"selfie-image", content_type="image/jpeg"),
            },
        )

        self.assertEqual(selfie_response.status_code, 200)
        selfie_payload = selfie_response.json()
        self.assertEqual(selfie_payload["tokenType"], "Bearer")
        self.assertIn("accessToken", selfie_payload)
        self.assertEqual(selfie_payload["expiresInSeconds"], settings.AUTH_ACCESS_TOKEN_LIFETIME_MINUTES * 60)
        self.assertIn("refreshToken", selfie_response.cookies)
        self.assertEqual(selfie_response.cookies["refreshToken"]["max-age"], settings.AUTH_REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60)
        self.assertIn(settings.SESSION_COOKIE_NAME, self.client.cookies)
        selfie_log = LoginSelfieLog.objects.get(user=user)
        self.assertEqual(selfie_log.content_type, "image/jpeg")
        self.assertEqual(selfie_log.size, len(b"selfie-image"))

        session_response = self.client.get(
            "/api/v1/auth/session/",
            HTTP_AUTHORIZATION=f"Bearer {selfie_payload['accessToken']}",
        )

        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(session_response.json()["user"]["role"], "STUDENT")

        bearerless_session_response = self.client.get("/api/v1/auth/session/")

        self.assertEqual(bearerless_session_response.status_code, 200)
        self.assertEqual(bearerless_session_response.json()["user"]["role"], "STUDENT")

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0)
    def test_otp_resend_sends_replacement_code_for_pending_login(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]
        original_code = self.otp_code_from_outbox()

        resend_response = self.client.post(
            "/api/v1/auth/login/otp/resend/",
            data={"otpPendingAuthToken": otp_pending_token},
            content_type="application/json",
        )

        self.assertEqual(resend_response.status_code, 202)
        resend_payload = resend_response.json()
        self.assertEqual(resend_payload["otpPendingAuthToken"], otp_pending_token)
        self.assertEqual(resend_payload["nextStep"], "otp")
        self.assertEqual(len(mail.outbox), 2)
        replacement_code = self.otp_code_from_outbox()

        old_otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={
                "otpPendingAuthToken": otp_pending_token,
                "code": original_code,
            },
            content_type="application/json",
        )

        self.assertEqual(old_otp_response.status_code, 401)

        otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={
                "otpPendingAuthToken": otp_pending_token,
                "code": replacement_code,
            },
            content_type="application/json",
        )

        self.assertEqual(otp_response.status_code, 202)
        self.assertEqual(otp_response.json()["nextStep"], "selfie")

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0)
    def test_otp_resend_resets_inactivity_without_extending_absolute_expiry(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]
        pending_key = f"{PENDING_OTP_PREFIX}{otp_pending_token}"
        state = cache.get(pending_key)
        now = timezone.now()
        state["inactivity_expires_at"] = (now + timedelta(seconds=120)).isoformat()
        state["absolute_expires_at"] = (now + timedelta(seconds=200)).isoformat()
        state["otp_expires_at"] = (now + timedelta(seconds=1)).isoformat()
        state["last_sent_at"] = (now - timedelta(minutes=5)).isoformat()
        cache.set(pending_key, state, 200)

        response = self.client.post(
            "/api/v1/auth/login/otp/resend/",
            data={"otpPendingAuthToken": otp_pending_token},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        payload = response.json()
        self.assertGreaterEqual(payload["expiresInSeconds"], 195)
        self.assertLessEqual(payload["expiresInSeconds"], 200)
        updated_state = cache.get(pending_key)
        self.assertEqual(updated_state["absolute_expires_at"], state["absolute_expires_at"])
        inactivity_seconds = int(
            (
                datetime.fromisoformat(updated_state["inactivity_expires_at"])
                - datetime.fromisoformat(updated_state["last_sent_at"])
            ).total_seconds()
        )
        self.assertEqual(inactivity_seconds, settings.AUTH_PENDING_INACTIVITY_TTL_MINUTES * 60)

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0)
    def test_otp_resend_requires_minimum_remaining_absolute_time(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]
        pending_key = f"{PENDING_OTP_PREFIX}{otp_pending_token}"
        state = cache.get(pending_key)
        now = timezone.now()
        state["absolute_expires_at"] = (now + timedelta(seconds=89)).isoformat()
        state["inactivity_expires_at"] = (now + timedelta(minutes=10)).isoformat()
        state["last_sent_at"] = (now - timedelta(minutes=5)).isoformat()
        cache.set(pending_key, state, 89)

        response = self.client.post(
            "/api/v1/auth/login/otp/resend/",
            data={"otpPendingAuthToken": otp_pending_token},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["error"]["message"],
            "Verification code expired. Please start login again to request a new code.",
        )

    def test_otp_is_single_use(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]
        code = self.otp_code_from_outbox()

        first_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": otp_pending_token, "code": code},
            content_type="application/json",
        )
        second_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": otp_pending_token, "code": code},
            content_type="application/json",
        )

        self.assertEqual(first_response.status_code, 202)
        self.assertEqual(second_response.status_code, 401)

    def test_otp_max_attempts_consumes_pending_login(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]
        code = self.otp_code_from_outbox()

        for _attempt in range(settings.AUTH_OTP_MAX_ATTEMPTS):
            response = self.client.post(
                "/api/v1/auth/login/otp/",
                data={"otpPendingAuthToken": otp_pending_token, "code": "999999"},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 401)

        response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": otp_pending_token, "code": code},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0, AUTH_OTP_ACCOUNT_WINDOW_LIMIT=1)
    def test_account_otp_request_limit_counts_initial_send_and_resend(self) -> None:
        password_payload = self.start_student_otp_login()

        response = self.client.post(
            "/api/v1/auth/login/otp/resend/",
            data={"otpPendingAuthToken": password_payload["otpPendingAuthToken"]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 429)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "OTP_RATE_LIMITED")
        self.assertEqual(payload["error"]["meta"]["retryAfterSeconds"], 5 * 60)

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0, AUTH_OTP_ACCOUNT_WINDOW_LIMIT=1)
    def test_account_otp_request_limit_escalates_backoff(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]
        pending_state = cache.get(f"{PENDING_OTP_PREFIX}{otp_pending_token}")
        rate_key = f"{OTP_ACCOUNT_RATE_PREFIX}{_safe_account_rate_key(pending_state['account'])}"

        retry_after_values = []
        for _violation in range(3):
            response = self.client.post(
                "/api/v1/auth/login/otp/resend/",
                data={"otpPendingAuthToken": otp_pending_token},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 429)
            retry_after_values.append(response.json()["error"]["meta"]["retryAfterSeconds"])
            rate_state = cache.get(rate_key)
            rate_state["backoff_until"] = 0
            cache.set(rate_key, rate_state, settings.AUTH_OTP_ACCOUNT_DAILY_SECONDS + 60 * 60)

        self.assertEqual(retry_after_values, [5 * 60, 15 * 60, 60 * 60])

    @override_settings(
        AUTH_OTP_RESEND_COOLDOWN_SECONDS=0,
        AUTH_OTP_ACCOUNT_WINDOW_LIMIT=10,
        AUTH_OTP_IP_WINDOW_ALERT_THRESHOLD=0,
        AUTH_OTP_IP_DAILY_ALERT_THRESHOLD=50,
        AUTH_OTP_IP_HIGH_RISK_DELAY_SECONDS=0,
    )
    def test_ip_otp_threshold_logs_alert_without_blocking(self) -> None:
        first_payload = self.start_student_otp_login()
        first_token = first_payload["otpPendingAuthToken"]

        with self.assertLogs("philsa.audit", level="INFO") as captured:
            response = self.client.post(
                "/api/v1/auth/login/otp/resend/",
                data={"otpPendingAuthToken": first_token},
                content_type="application/json",
                REMOTE_ADDR="203.0.113.10",
            )

        self.assertEqual(response.status_code, 202)
        self.assertTrue(
            any(
                getattr(record, "event", "") == "auth.otp_ip_threshold_exceeded"
                and getattr(record, "outcome", "") == "alerted"
                for record in captured.records
            )
        )

    def test_otp_resend_during_cooldown_is_rejected(self) -> None:
        password_payload = self.start_student_otp_login()

        response = self.client.post(
            "/api/v1/auth/login/otp/resend/",
            data={"otpPendingAuthToken": password_payload["otpPendingAuthToken"]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 429)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "OTP_COOLDOWN")
        self.assertIn("Please wait", payload["error"]["message"])
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0, AUTH_OTP_ACCOUNT_WINDOW_LIMIT=100)
    def test_otp_resend_allows_exactly_the_configured_maximum(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]

        for _resend in range(settings.AUTH_OTP_MAX_RESENDS):
            response = self.client.post(
                "/api/v1/auth/login/otp/resend/",
                data={"otpPendingAuthToken": otp_pending_token},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 202)

        self.assertEqual(len(mail.outbox), 1 + settings.AUTH_OTP_MAX_RESENDS)

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0, AUTH_OTP_ACCOUNT_WINDOW_LIMIT=100)
    def test_otp_resend_beyond_maximum_is_rejected_without_sending_or_rotating_or_extending(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]
        pending_key = f"{PENDING_OTP_PREFIX}{otp_pending_token}"

        for _resend in range(settings.AUTH_OTP_MAX_RESENDS):
            response = self.client.post(
                "/api/v1/auth/login/otp/resend/",
                data={"otpPendingAuthToken": otp_pending_token},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 202)

        state_before_rejection = cache.get(pending_key)
        outbox_count_before_rejection = len(mail.outbox)

        response = self.client.post(
            "/api/v1/auth/login/otp/resend/",
            data={"otpPendingAuthToken": otp_pending_token},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 429)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "OTP_RATE_LIMITED")
        self.assertEqual(len(mail.outbox), outbox_count_before_rejection)

        state_after_rejection = cache.get(pending_key)
        self.assertEqual(state_after_rejection["otp_hash"], state_before_rejection["otp_hash"])
        self.assertEqual(
            state_after_rejection["absolute_expires_at"],
            state_before_rejection["absolute_expires_at"],
        )

    @override_settings(AUTH_OTP_RESEND_COOLDOWN_SECONDS=0, AUTH_OTP_ACCOUNT_WINDOW_LIMIT=100)
    def test_latest_otp_remains_usable_after_resend_exhaustion(self) -> None:
        password_payload = self.start_student_otp_login()
        otp_pending_token = password_payload["otpPendingAuthToken"]

        for _resend in range(settings.AUTH_OTP_MAX_RESENDS):
            response = self.client.post(
                "/api/v1/auth/login/otp/resend/",
                data={"otpPendingAuthToken": otp_pending_token},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 202)

        latest_code = self.otp_code_from_outbox()

        rejected_response = self.client.post(
            "/api/v1/auth/login/otp/resend/",
            data={"otpPendingAuthToken": otp_pending_token},
            content_type="application/json",
        )
        self.assertEqual(rejected_response.status_code, 429)

        otp_response = self.client.post(
            "/api/v1/auth/login/otp/",
            data={"otpPendingAuthToken": otp_pending_token, "code": latest_code},
            content_type="application/json",
        )

        self.assertEqual(otp_response.status_code, 202)
        self.assertEqual(otp_response.json()["nextStep"], "selfie")
