from datetime import timedelta
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole


def principal(user, role):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


class Step2ConfigurationEndpointTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="step2-admin")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))

    def payload(self):
        return {
            "requireStudentIdVerification": True,
            "requireStudentIdFront": True,
            "requireStudentIdBack": True,
            "enableStudentIdInformationExtraction": True,
            "compareStudentName": True,
            "compareSchoolName": True,
            "nameMatchThreshold": 85,
            "schoolMatchThreshold": 85,
            "enableFacialComparison": True,
            "facialSimilarityThreshold": 90,
            "allowManualReview": True,
            "maximumVerificationAttempts": 5,
            "effectiveDate": (timezone.now() - timedelta(minutes=1)).isoformat(),
            "status": True,
        }

    def test_admin_can_create_version_and_public_registration_reads_it(self):
        created = self.client.post(reverse("applications:step2-configuration-admin"), self.payload(), format="json")
        self.assertEqual(created.status_code, 201)

        public = APIClient().get(reverse("applications:step2-public-configuration"))
        self.assertEqual(public.status_code, 200)
        self.assertTrue(public.data["requireStudentIdVerification"])
        self.assertEqual(public.data["facialSimilarityThreshold"], 90.0)
        self.assertEqual(public.data["facialReferenceMediaType"], "STUDENT_ID_FRONT")

    def test_selfie_only_rejects_enabled_id_processing(self):
        payload = self.payload()
        payload["requireStudentIdVerification"] = False
        response = self.client.post(reverse("applications:step2-configuration-admin"), payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_student_cannot_manage_configuration(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.STUDENT.value))
        response = self.client.get(reverse("applications:step2-configuration-admin"))
        self.assertEqual(response.status_code, 403)
