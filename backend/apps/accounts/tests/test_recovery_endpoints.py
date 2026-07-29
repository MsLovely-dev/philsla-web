from datetime import timedelta
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile, AuthRefreshSession, PasswordRecoveryToken
from apps.accounts.roles import PortalRole


@override_settings(ROOT_URLCONF="config.urls")
class RecoveryEndpointTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        mail.outbox = []

    def create_student(self, email: str = "student@example.test"):
        user = get_user_model().objects.create_user(
            username=email,
            email=email,
            password="Password1!",
            is_active=True,
        )
        AccountProfile.objects.create(user=user, role=PortalRole.STUDENT.value, lrn="123456789012")
        return user

    def recovery_token_from_latest_email(self) -> str:
        reset_url = mail.outbox[-1].body.split("set a new password: ", 1)[1].split(" ", 1)[0]
        parsed = urlparse(reset_url)
        return parse_qs(parsed.query)["token"][0]

    def test_password_recovery_request_rejects_invalid_identifier_format(self) -> None:
        response = self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "not-valid"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("identifier", response.json()["error"]["fields"])

    def test_password_recovery_request_uses_anti_enumeration_response_for_email(self) -> None:
        response = self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(
            response.json(),
            {"detail": "If the account can be recovered, instructions will be sent to the verified email address."},
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_password_recovery_request_sends_single_use_link_for_existing_account(self) -> None:
        self.create_student()

        response = self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["student@example.test"])
        self.assertEqual(mail.outbox[0].subject, "Reset your PhilSLA password")
        token = self.recovery_token_from_latest_email()
        self.assertTrue(token)
        self.assertNotIn(token, response.content.decode())
        self.assertEqual(PasswordRecoveryToken.objects.count(), 1)

    def test_password_recovery_request_accepts_student_lrn_identifier(self) -> None:
        self.create_student()

        response = self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "123456789012"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["student@example.test"])

    def test_password_recovery_inspection_returns_safe_account_display_for_valid_token(self) -> None:
        user = self.create_student()
        user.first_name = "Maria"
        user.last_name = "Santos"
        user.save(update_fields=["first_name", "last_name"])
        self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )
        token = self.recovery_token_from_latest_email()

        response = self.client.post(
            "/api/v1/auth/recovery/password/inspect/",
            data={"recoveryToken": token},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"accountLabel": "Maria Santos", "maskedEmail": "stu***@example.test"})
        self.assertNotIn(token, response.content.decode())

    def test_password_recovery_inspection_uses_masked_email_when_name_is_missing(self) -> None:
        self.create_student(email="ab@example.test")
        self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "ab@example.test"},
            content_type="application/json",
        )
        token = self.recovery_token_from_latest_email()

        response = self.client.post(
            "/api/v1/auth/recovery/password/inspect/",
            data={"recoveryToken": token},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"accountLabel": "a***@example.test", "maskedEmail": "a***@example.test"})

    def test_password_recovery_inspection_rejects_invalid_or_used_token_safely(self) -> None:
        self.create_student()

        invalid_response = self.client.post(
            "/api/v1/auth/recovery/password/inspect/",
            data={"recoveryToken": "missing-token"},
            content_type="application/json",
        )

        self.assertEqual(invalid_response.status_code, 401)
        self.assertEqual(invalid_response.json()["error"]["message"], "This recovery link has expired. Please request a new one.")

        self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )
        token = self.recovery_token_from_latest_email()
        self.client.post(
            "/api/v1/auth/recovery/password/complete/",
            data={"recoveryToken": token, "password": "Password2!", "confirmPassword": "Password2!"},
            content_type="application/json",
        )

        used_response = self.client.post(
            "/api/v1/auth/recovery/password/inspect/",
            data={"recoveryToken": token},
            content_type="application/json",
        )

        self.assertEqual(used_response.status_code, 401)

    def test_password_recovery_completion_enforces_password_policy(self) -> None:
        response = self.client.post(
            "/api/v1/auth/recovery/password/complete/",
            data={"recoveryToken": "token", "password": "weak", "confirmPassword": "weak"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("password", response.json()["error"]["fields"])

    def test_password_recovery_completion_rejects_expired_token_until_store_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/recovery/password/complete/",
            data={"recoveryToken": "token", "password": "Password1!", "confirmPassword": "Password1!"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(response.json()["error"]["message"], "This recovery link has expired. Please request a new one.")

    def test_password_recovery_completion_resets_password_consumes_token_and_revokes_sessions(self) -> None:
        user = self.create_student()
        AuthRefreshSession.objects.create(
            user=user,
            token_hash="refresh-hash",
            account={"id": str(user.id), "user_id": user.id, "email": user.email, "role": PortalRole.STUDENT.value},
            expires_at=timezone.now() + timedelta(days=1),
        )
        self.client.post(
            "/api/v1/auth/recovery/password/request/",
            data={"identifier": "student@example.test"},
            content_type="application/json",
        )
        token = self.recovery_token_from_latest_email()

        response = self.client.post(
            "/api/v1/auth/recovery/password/complete/",
            data={"recoveryToken": token, "password": "Password2!", "confirmPassword": "Password2!"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 204)
        user.refresh_from_db()
        self.assertTrue(user.check_password("Password2!"))
        self.assertIsNotNone(PasswordRecoveryToken.objects.get().used_at)
        self.assertIsNotNone(AuthRefreshSession.objects.get().revoked_at)

        reuse_response = self.client.post(
            "/api/v1/auth/recovery/password/complete/",
            data={"recoveryToken": token, "password": "Password3!", "confirmPassword": "Password3!"},
            content_type="application/json",
        )

        self.assertEqual(reuse_response.status_code, 401)

    def test_admin_account_recovery_requires_system_admin(self) -> None:
        client = APIClient()
        user = SimpleNamespace(id="reviewer-123", is_authenticated=True, is_active=True, role="ADMISSIONS_REVIEWER")
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/recovery/admin/request/",
            data={"email": "staff@example.test"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "PERMISSION_DENIED")

    def test_system_admin_account_recovery_uses_anti_enumeration_response(self) -> None:
        client = APIClient()
        user = SimpleNamespace(id="admin-123", is_authenticated=True, is_active=True, role="SYSTEM_ADMIN")
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/recovery/admin/request/",
            data={"email": "staff@example.test"},
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(
            response.json(),
            {"detail": "If the account can be recovered, instructions will be sent to the verified email address."},
        )
