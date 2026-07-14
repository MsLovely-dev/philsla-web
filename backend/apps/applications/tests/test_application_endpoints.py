from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationStatus, StudentApplication


def principal(user, role=PortalRole.STUDENT.value):
    return SimpleNamespace(
        id=user.id,
        user_id=user.id,
        role=role,
        is_authenticated=True,
        is_active=True,
    )


def complete_payload():
    return {
        "personal": {
            "firstName": "Test",
            "lastName": "Student",
            "dateOfBirth": "2008-05-15",
            "email": "student@example.test",
            "mobile": "09171234567",
        },
        "password": "Password1!",
        "address": {
            "region": "Test Region",
            "province": "Test Province",
            "city": "Test City",
            "barangay": "Test Barangay",
            "street": "Test Street",
            "postalCode": "1000",
        },
        "school": {
            "lrn": "123456789012",
            "name": "Test School",
            "academicTrack": "STEM",
            "gradeLevel": "Grade 12",
            "gwa": "92.5",
        },
        "coursePreferences": [{"university": "Test University", "course": "Test Course"}],
        "reviewStep": {"privacyConsent": True, "declarationAccepted": True},
    }


class ApplicationEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.user = User.objects.create_user(username="student", email="student@example.test")
        self.other_user = User.objects.create_user(username="other", email="other@example.test")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user))

    def create(self, payload=None):
        verification = self.client.post(
            reverse("applications:verify-lrn"),
            {"lrn": "123456789012", "dateOfBirth": "2008-05-15"},
            format="json",
        )
        body = dict(payload or {})
        body["verificationToken"] = verification.data["verificationToken"]
        return self.client.post(reverse("applications:create"), body, format="json")

    def test_student_can_create_read_and_update_own_draft(self):
        created = self.create({"personal": {"firstName": "Draft"}})
        self.assertEqual(created.status_code, 201)
        application_id = created.data["id"]

        read = self.client.get(reverse("applications:detail", args=[application_id]))
        self.assertEqual(read.status_code, 200)
        self.assertEqual(read.data["personal"]["firstName"], "Sample")
        self.assertEqual(read.data["school"]["name"], "Sample National High School")

        updated = self.client.patch(
            reverse("applications:detail", args=[application_id]),
            {"version": 1, "address": {"region": "Test Region"}},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["version"], 2)

    def test_duplicate_draft_returns_conflict(self):
        self.assertEqual(self.create().status_code, 201)
        duplicate = self.client.post(
            reverse("applications:verify-lrn"),
            {"lrn": "123456789012", "dateOfBirth": "2008-05-15"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(duplicate.data["error"]["code"], "CONFLICT")

    def test_public_registration_can_create_submitted_application_without_account(self):
        client = APIClient()
        verification = client.post(
            reverse("applications:verify-lrn"),
            {"lrn": "123456789012", "dateOfBirth": "2008-05-15"},
            format="json",
        )
        payload = complete_payload()
        payload["verificationToken"] = verification.data["verificationToken"]
        payload["submitOnCreate"] = True

        response = client.post(reverse("applications:create"), payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], ApplicationStatus.SUBMITTED)
        self.assertIsNotNone(response.data["submittedAt"])
        application = StudentApplication.objects.get(id=response.data["id"])
        self.assertIsNone(application.owner_id)
        self.assertTrue(application.password_hash)
        self.assertNotEqual(application.password_hash, "Password1!")

    def test_draft_requires_a_valid_lrn_verification_proof(self):
        response = self.client.post(
            reverse("applications:create"),
            {"verificationToken": "expired-proof"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "LRN_VERIFICATION_FAILED")

    def test_public_submit_on_create_rolls_back_incomplete_registration(self):
        client = APIClient()
        verification = client.post(
            reverse("applications:verify-lrn"),
            {"lrn": "123456789012", "dateOfBirth": "2008-05-15"},
            format="json",
        )

        response = client.post(
            reverse("applications:create"),
            {"verificationToken": verification.data["verificationToken"], "submitOnCreate": True},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(StudentApplication.objects.filter(lrn="123456789012").exists())

    def test_other_student_cannot_read_application(self):
        application = StudentApplication.objects.create(owner=self.other_user)
        response = self.client.get(reverse("applications:detail", args=[application.id]))
        self.assertEqual(response.status_code, 403)

    def test_stale_update_returns_conflict_without_overwriting(self):
        application = StudentApplication.objects.create(owner=self.user, personal={"firstName": "Original"}, version=2)
        response = self.client.patch(
            reverse("applications:detail", args=[application.id]),
            {"version": 1, "personal": {"firstName": "Stale"}},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        application.refresh_from_db()
        self.assertEqual(application.personal["firstName"], "Original")

    def test_incomplete_application_cannot_be_submitted(self):
        application = StudentApplication.objects.create(owner=self.user)
        response = self.client.post(reverse("applications:submit", args=[application.id]), {"version": 1}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("personal", response.data["error"]["fields"])

    def test_complete_draft_is_submitted_and_locked(self):
        payload = complete_payload()
        application = StudentApplication.objects.create(
            owner=self.user,
            personal=payload["personal"],
            address=payload["address"],
            school=payload["school"],
            course_preferences=payload["coursePreferences"],
            review_step=payload["reviewStep"],
            password_hash=make_password(payload["password"]),
        )
        submitted = self.client.post(reverse("applications:submit", args=[application.id]), {"version": 1}, format="json")
        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.data["status"], ApplicationStatus.SUBMITTED)
        self.assertIsNotNone(submitted.data["submittedAt"])

        edit = self.client.patch(
            reverse("applications:detail", args=[application.id]),
            {"version": 2, "personal": payload["personal"]},
            format="json",
        )
        self.assertEqual(edit.status_code, 409)

    def test_for_correction_submission_becomes_resubmitted(self):
        payload = complete_payload()
        application = StudentApplication.objects.create(
            owner=self.user,
            status=ApplicationStatus.FOR_CORRECTION,
            personal=payload["personal"], address=payload["address"], school=payload["school"],
            course_preferences=payload["coursePreferences"], review_step=payload["reviewStep"],
        )
        response = self.client.post(reverse("applications:submit", args=[application.id]), {"version": 1}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], ApplicationStatus.RESUBMITTED)

    def test_admissions_reviewer_can_list_submitted_registration_queue(self):
        payload = complete_payload()
        submitted = StudentApplication.objects.create(
            owner=None,
            lrn="123456789012",
            exam_cycle_id="2026",
            status=ApplicationStatus.SUBMITTED,
            personal=payload["personal"],
            address=payload["address"],
            school=payload["school"],
            course_preferences=payload["coursePreferences"],
            review_step=payload["reviewStep"],
            password_hash=make_password(payload["password"]),
        )
        StudentApplication.objects.create(owner=self.user, status=ApplicationStatus.DRAFT)
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.get(reverse("applications:review-queue"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [str(submitted.id)])

    def test_student_cannot_list_review_queue(self):
        response = self.client.get(reverse("applications:review-queue"))
        self.assertEqual(response.status_code, 403)

    def test_reviewer_decision_updates_application_status_in_database(self):
        payload = complete_payload()
        payload["personal"]["email"] = "approved.student@example.test"
        application = StudentApplication.objects.create(
            owner=None,
            lrn="123456789012",
            exam_cycle_id="2026",
            status=ApplicationStatus.SUBMITTED,
            personal=payload["personal"],
            address=payload["address"],
            school=payload["school"],
            course_preferences=payload["coursePreferences"],
            review_step=payload["reviewStep"],
            password_hash=make_password(payload["password"]),
        )
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.post(
            reverse("applications:review-decision", args=[application.id]),
            {"decision": "APPROVE", "reason": "Verified."},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], ApplicationStatus.APPROVED)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.APPROVED)
        self.assertEqual(application.review_step["reviewerDecision"], "APPROVE")
        self.assertIsNotNone(application.owner_id)
        self.assertEqual(application.password_hash, "")
        self.assertEqual(application.owner.username, "test-student")
        self.assertEqual(application.owner.first_name, "Test")
        self.assertEqual(application.owner.last_name, "Student")
        self.assertTrue(application.owner.check_password(payload["password"]))
        self.assertTrue(
            AccountProfile.objects.filter(
                user=application.owner,
                role=PortalRole.STUDENT.value,
                lrn="123456789012",
            ).exists()
        )

    def test_reviewer_reject_clears_pending_password_hash(self):
        payload = complete_payload()
        application = StudentApplication.objects.create(
            owner=None,
            lrn="123456789012",
            exam_cycle_id="2026",
            status=ApplicationStatus.SUBMITTED,
            personal=payload["personal"],
            address=payload["address"],
            school=payload["school"],
            course_preferences=payload["coursePreferences"],
            review_step=payload["reviewStep"],
            password_hash=make_password(payload["password"]),
        )
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.post(
            reverse("applications:review-decision", args=[application.id]),
            {"decision": "REJECT", "reason": "Not eligible."},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.REJECTED)
        self.assertEqual(application.password_hash, "")

    def test_student_cannot_decide_application(self):
        application = StudentApplication.objects.create(status=ApplicationStatus.SUBMITTED)
        response = self.client.post(
            reverse("applications:review-decision", args=[application.id]),
            {"decision": "REJECT"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
