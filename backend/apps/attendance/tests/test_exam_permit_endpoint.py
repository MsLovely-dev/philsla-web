from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationStatus, StudentApplication
from apps.attendance.models import ExamPermit


def principal(user, role=PortalRole.STUDENT.value):
    return SimpleNamespace(
        id=user.id,
        user_id=user.id,
        role=role,
        is_authenticated=True,
        is_active=True,
    )


class MyExamPermitViewTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="student", email="student@example.test")
        self.other_user = User.objects.create_user(username="other", email="other@example.test")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user))

    def make_application(self, owner):
        application = StudentApplication(owner=owner, status=ApplicationStatus.APPROVED)
        application.personal = {"firstName": "Jan", "lastName": "Delacruz", "email": "jan@example.test"}
        application.save()
        return application

    def test_returns_own_permit(self):
        application = self.make_application(self.user)
        ExamPermit.objects.create(
            application=application,
            candidate_id=application.candidate_id,
            full_name="Jan Delacruz",
            test_center="UP Diliman",
            room="Benitez Hall R101",
            seat="1",
        )

        response = self.client.get(reverse("attendance:attendance-mine"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["fullName"], "Jan Delacruz")
        self.assertEqual(response.data["room"], "Benitez Hall R101")
        self.assertIn("qrCode", response.data)

    def test_returns_null_when_no_permit(self):
        response = self.client.get(reverse("attendance:attendance-mine"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)

    def test_never_returns_another_users_permit(self):
        other_application = self.make_application(self.other_user)
        ExamPermit.objects.create(
            application=other_application,
            candidate_id=other_application.candidate_id,
            full_name="Someone Else",
            test_center="UP Diliman",
            room="Benitez Hall R101",
            seat="1",
        )

        response = self.client.get(reverse("attendance:attendance-mine"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)

    def test_unauthenticated_denied(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("attendance:attendance-mine"))

        self.assertEqual(response.status_code, 401)

    def test_wrong_role_denied(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))

        response = self.client.get(reverse("attendance:attendance-mine"))

        self.assertEqual(response.status_code, 403)
