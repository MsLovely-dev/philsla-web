from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationStatus, StudentApplication


@override_settings(ROOT_URLCONF="config.urls")
class ActivationEndpointTests(TestCase):
    def test_student_registration_activation_requires_authentication(self) -> None:
        response = self.client.post(
            "/api/v1/auth/activation/student-registration/",
            data={"registrationApplicationId": "application-123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "NOT_AUTHENTICATED")

    def test_student_registration_activation_requires_allowed_role(self) -> None:
        client = APIClient()
        user = SimpleNamespace(id="user-123", is_authenticated=True, is_active=True, role="STUDENT")
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/activation/student-registration/",
            data={"registrationApplicationId": "application-123"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "PERMISSION_DENIED")

    def test_student_registration_activation_requires_approved_application(self) -> None:
        application = StudentApplication.objects.create(
            lrn="123456789012",
            exam_cycle_id="2026",
            status=ApplicationStatus.SUBMITTED,
            personal={"email": "student@example.test", "firstName": "Juan", "lastName": "Dela Cruz"},
            password_hash=make_password("Password1!"),
        )
        client = APIClient()
        user = SimpleNamespace(id="reviewer-123", is_authenticated=True, is_active=True, role="ADMISSIONS_REVIEWER")
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/activation/student-registration/",
            data={"registrationApplicationId": str(application.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        application.refresh_from_db()
        self.assertIsNone(application.owner_id)
        self.assertTrue(application.password_hash)

    def test_student_registration_activation_creates_student_account_for_approved_application(self) -> None:
        application = StudentApplication.objects.create(
            lrn="123456789012",
            exam_cycle_id="2026",
            status=ApplicationStatus.APPROVED,
            personal={"email": "student@example.test", "firstName": "Juan", "lastName": "Dela Cruz"},
            password_hash=make_password("Password1!"),
        )
        client = APIClient()
        user = SimpleNamespace(id="reviewer-123", is_authenticated=True, is_active=True, role="ADMISSIONS_REVIEWER")
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/auth/activation/student-registration/",
            data={"registrationApplicationId": str(application.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        application.refresh_from_db()
        self.assertIsNotNone(application.owner_id)
        self.assertEqual(application.password_hash, "")
        account = get_user_model().objects.get(email="student@example.test")
        self.assertEqual(account.username, "juan-dela-cruz")
        self.assertEqual(account.first_name, "Juan")
        self.assertEqual(account.last_name, "Dela Cruz")
        self.assertTrue(account.check_password("Password1!"))
        self.assertTrue(account.is_active)
        self.assertTrue(
            AccountProfile.objects.filter(
                user=account,
                role=PortalRole.STUDENT.value,
                lrn="123456789012",
            ).exists()
        )

    def test_staff_activation_completion_requires_matching_password_confirmation(self) -> None:
        response = self.client.post(
            "/api/v1/auth/activation/staff/complete/",
            data={
                "activationToken": "activation-token",
                "password": "Password1!",
                "confirmPassword": "Different1!",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("confirmPassword", response.json()["error"]["fields"])

    def test_staff_activation_completion_enforces_password_policy(self) -> None:
        response = self.client.post(
            "/api/v1/auth/activation/staff/complete/",
            data={
                "activationToken": "activation-token",
                "password": "weak",
                "confirmPassword": "weak",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "VALIDATION_FAILED")
        self.assertIn("password", response.json()["error"]["fields"])

    def test_staff_activation_completion_uses_safe_expired_link_error_until_token_store_exists(self) -> None:
        response = self.client.post(
            "/api/v1/auth/activation/staff/complete/",
            data={
                "activationToken": "activation-token",
                "password": "Password1!",
                "confirmPassword": "Password1!",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "AUTHENTICATION_FAILED")
        self.assertEqual(
            payload["error"]["message"],
            "This activation link has expired. Please request a new one from your administrator.",
        )
