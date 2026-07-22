from datetime import timedelta
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationIdentityMedia


def principal(user, role):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


@override_settings(STEP1_SELFIE_FACE_PROVIDER="mock")
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

    def test_lrn_and_student_id_names_match_and_step2_rejects_selfie_upload(self):
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
        self.assertEqual(selfie.status_code, 400)
        self.assertIn("SELFIE", str(selfie.data["error"]["fields"]["mediaType"]))

    def test_selfie_can_be_retaken_before_application_submission(self):
        registration = APIClient()
        verified = registration.post(
            reverse("applications:verify-lrn"),
            {
                "lrn": "123456789012",
                "verificationCategory": "email",
                "verificationValue": "lovely@yopmail.com",
            },
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        token = verified.data["verificationToken"]

        def upload(filename, content):
            image = SimpleUploadedFile(filename, content, content_type="image/jpeg")
            return registration.post(
                reverse("applications:registration-identity-selfie"),
                {"file": image},
                format="multipart",
                HTTP_X_REGISTRATION_TOKEN=token,
            )

        first = upload("selfie-first.jpg", b"\xff\xd8\xff\xe0first-image")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["status"], "PASSED")
        self.assertEqual(first.data["results"]["serverFaceValidation"]["faceCount"], 1)
        self.assertFalse(first.data["results"]["serverFaceValidation"]["faceCovered"])

        second = upload("selfie-second.jpg", b"\xff\xd8\xff\xe0second-image")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["status"], "PASSED")
        self.assertEqual(ApplicationIdentityMedia.objects.count(), 1)

    def test_step1_selfie_only_upload_is_not_blocked_by_step2_attempt_limit(self):
        registration = APIClient()
        verified = registration.post(
            reverse("applications:verify-lrn"),
            {
                "lrn": "123456789012",
                "verificationCategory": "email",
                "verificationValue": "lovely@yopmail.com",
            },
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        token = verified.data["verificationToken"]

        from apps.applications.services import get_step2_verification

        verification = get_step2_verification(token)
        verification.attempts = verification.configuration_snapshot["maximumVerificationAttempts"]
        verification.save(update_fields=["attempts"])

        image = SimpleUploadedFile("selfie.jpg", b"\xff\xd8\xff\xe0selfie-image", content_type="image/jpeg")
        response = registration.post(
            reverse("applications:registration-identity-selfie"),
            {"file": image},
            format="multipart",
            HTTP_X_REGISTRATION_TOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "PASSED")
        verification.refresh_from_db()
        self.assertEqual(verification.attempts, verification.configuration_snapshot["maximumVerificationAttempts"])

    def test_step1_selfie_only_upload_recovers_from_old_attempt_limit_rejection(self):
        registration = APIClient()
        verified = registration.post(
            reverse("applications:verify-lrn"),
            {
                "lrn": "123456789012",
                "verificationCategory": "email",
                "verificationValue": "lovely@yopmail.com",
            },
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        token = verified.data["verificationToken"]

        from apps.applications.models import Step2VerificationStatus
        from apps.applications.services import get_step2_verification

        verification = get_step2_verification(token)
        verification.attempts = verification.configuration_snapshot["maximumVerificationAttempts"]
        verification.status = Step2VerificationStatus.REJECTED
        verification.results = {"code": "MAXIMUM_ATTEMPTS_REACHED"}
        verification.save(update_fields=["attempts", "status", "results"])

        image = SimpleUploadedFile("selfie.jpg", b"\xff\xd8\xff\xe0selfie-image", content_type="image/jpeg")
        response = registration.post(
            reverse("applications:registration-identity-selfie"),
            {"file": image},
            format="multipart",
            HTTP_X_REGISTRATION_TOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "PASSED")

    def test_selfie_face_validation_endpoint_detects_face_without_storing_media(self):
        registration = APIClient()
        verified = registration.post(
            reverse("applications:verify-lrn"),
            {
                "lrn": "123456789012",
                "verificationCategory": "email",
                "verificationValue": "lovely@yopmail.com",
            },
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        image = SimpleUploadedFile("frame.jpg", b"\xff\xd8\xff\xe0frame-image", content_type="image/jpeg")

        response = registration.post(
            reverse("applications:registration-identity-selfie-face"),
            {"file": image},
            format="multipart",
            HTTP_X_REGISTRATION_TOKEN=verified.data["verificationToken"],
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["faceDetected"])
        self.assertFalse(response.data["faceCovered"])
        self.assertEqual(ApplicationIdentityMedia.objects.count(), 0)

    @override_settings(STEP1_SELFIE_FACE_PROVIDER="unavailable")
    def test_selfie_is_rejected_when_server_face_validation_is_unavailable(self):
        registration = APIClient()
        verified = registration.post(
            reverse("applications:verify-lrn"),
            {
                "lrn": "123456789012",
                "verificationCategory": "email",
                "verificationValue": "lovely@yopmail.com",
            },
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        image = SimpleUploadedFile("selfie.jpg", b"\xff\xd8\xff\xe0selfie-image", content_type="image/jpeg")

        response = registration.post(
            reverse("applications:registration-identity-selfie"),
            {"file": image},
            format="multipart",
            HTTP_X_REGISTRATION_TOKEN=verified.data["verificationToken"],
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(ApplicationIdentityMedia.objects.count(), 0)
        self.assertIn("Server-side selfie face validation", response.data["error"]["fields"]["file"][0])

    @override_settings(STEP1_SELFIE_FACE_PROVIDER="opencv")
    def test_opencv_selfie_validation_rejects_image_without_face(self):
        import cv2
        import numpy as np

        registration = APIClient()
        verified = registration.post(
            reverse("applications:verify-lrn"),
            {
                "lrn": "123456789012",
                "verificationCategory": "email",
                "verificationValue": "lovely@yopmail.com",
            },
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        _, encoded = cv2.imencode(".jpg", np.zeros((240, 320, 3), dtype=np.uint8))
        image = SimpleUploadedFile("blank.jpg", encoded.tobytes(), content_type="image/jpeg")

        response = registration.post(
            reverse("applications:registration-identity-selfie"),
            {"file": image},
            format="multipart",
            HTTP_X_REGISTRATION_TOKEN=verified.data["verificationToken"],
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(ApplicationIdentityMedia.objects.count(), 0)
        self.assertIn("No frontal face", response.data["error"]["fields"]["file"][0])

    @override_settings(STEP1_SELFIE_FACE_PROVIDER="opencv")
    def test_opencv_selfie_face_validation_endpoint_rejects_image_without_face(self):
        import cv2
        import numpy as np

        registration = APIClient()
        verified = registration.post(
            reverse("applications:verify-lrn"),
            {
                "lrn": "123456789012",
                "verificationCategory": "email",
                "verificationValue": "lovely@yopmail.com",
            },
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        _, encoded = cv2.imencode(".jpg", np.zeros((240, 320, 3), dtype=np.uint8))
        image = SimpleUploadedFile("blank-frame.jpg", encoded.tobytes(), content_type="image/jpeg")

        response = registration.post(
            reverse("applications:registration-identity-selfie-face"),
            {"file": image},
            format="multipart",
            HTTP_X_REGISTRATION_TOKEN=verified.data["verificationToken"],
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(ApplicationIdentityMedia.objects.count(), 0)
        self.assertIn("No frontal face", response.data["error"]["fields"]["file"][0])
