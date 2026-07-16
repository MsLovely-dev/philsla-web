from datetime import timedelta
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationIdentityMedia


def principal(user, role):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


class Step2ConfigurationEndpointTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="step2-admin")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))

    def tearDown(self):
        for media in ApplicationIdentityMedia.objects.all():
            media.file.delete(save=False)

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

    def test_lrn_and_student_id_names_match_before_selfie_is_allowed(self):
        self.assertEqual(self.client.post(reverse("applications:step2-configuration-admin"), self.payload(), format="json").status_code, 201)
        registration = APIClient()
        verified = registration.post(
            reverse("applications:verify-lrn"),
            {"lrn": "123456789012"},
            format="json",
        )
        token = verified.data["verificationToken"]

        def upload(media_type):
            image = SimpleUploadedFile(f"{media_type}.jpg", b"\xff\xd8\xff\xe0test-image", content_type="image/jpeg")
            return registration.post(
                reverse("applications:step2-verification"),
                {"mediaType": media_type, "file": image},
                format="multipart",
                HTTP_X_REGISTRATION_TOKEN=token,
            )

        self.assertEqual(upload("STUDENT_ID_FRONT").status_code, 200)
        compared = upload("STUDENT_ID_BACK")
        self.assertEqual(compared.status_code, 200)
        self.assertEqual(compared.data["status"], "IN_PROGRESS")
        self.assertTrue(compared.data["results"]["informationComparisonPassed"])
        self.assertEqual(compared.data["results"]["lrnStudentName"], "Lovely Mae R Chavez")
        self.assertEqual(compared.data["results"]["extractedStudentName"], "Lovely Mae R Chavez")
        self.assertEqual(compared.data["results"]["nameMatchScore"], 100.0)

        selfie = upload("SELFIE")
        self.assertEqual(selfie.status_code, 200)
        self.assertEqual(selfie.data["results"]["phase"], "FACIAL_COMPARISON")
