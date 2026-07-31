import base64
import hashlib
import re
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole
from apps.applications.models import (
    ApplicationAuditLog,
    ApplicationStatus,
    IdentityMediaType,
    RegistrationSelfieMedia,
    Step2Verification,
    StudentApplication,
    StudentApplicationAdditionalField,
)


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
            "sex": "Female",
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
            "schoolId": "301234",
            "name": "Test School",
            "academicTrack": "STEM",
            "gradeLevel": "Grade 12",
            "enrollmentStatus": "Enrolled",
            "schoolYear": "2026-2027",
            "gwa": "92.5",
        },
        "coursePreferences": [{"university": "Test University", "course": "Test Course"}],
        "reviewStep": {"privacyConsent": True, "declarationAccepted": True},
    }


def verify_registration_email(client, email: str) -> str:
    request_response = client.post(
        reverse("applications:registration-email-otp-request"),
        {"email": email},
        format="json",
    )
    assert request_response.status_code == 200
    code_match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
    assert code_match is not None
    verify_response = client.post(
        reverse("applications:registration-email-otp-verify"),
        {"email": email, "code": code_match.group(1)},
        format="json",
    )
    assert verify_response.status_code == 200
    return verify_response.data["emailVerificationToken"]


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
            {"lrn": "123456789012"},
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
        self.assertEqual(read.data["personal"]["firstName"], "Lovely Mae")
        self.assertEqual(read.data["school"]["name"], "Taysan High School and Child Development Center")
        self.assertEqual(read.data["lrnProfile"]["firstName"], "Lovely Mae")
        self.assertEqual(read.data["lrnProfile"]["lrn"], "123456789012")

        updated = self.client.patch(
            reverse("applications:detail", args=[application_id]),
            {"version": 1, "address": {"region": "Test Region"}},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["version"], 2)

    def test_configurable_extra_fields_are_preserved_in_holding_table(self):
        created = self.create(
            {
                "personal": {"firstName": "Draft", "scholarshipCode": "SCI-2026"},
                "school": {"campusType": "Public"},
            }
        )
        self.assertEqual(created.status_code, 201)

        application_id = created.data["id"]
        read = self.client.get(reverse("applications:detail", args=[application_id]))

        self.assertEqual(read.status_code, 200)
        self.assertEqual(read.data["personal"]["scholarshipCode"], "SCI-2026")
        self.assertEqual(read.data["school"]["campusType"], "Public")
        self.assertTrue(
            StudentApplicationAdditionalField.objects.filter(
                application_id=application_id,
                section="personal",
                field_key="scholarshipCode",
                field_value="SCI-2026",
            ).exists()
        )

    def test_selfie_photo_url_is_stored_as_registration_selfie_media(self):
        image_bytes = b"\xff\xd8\xff\xe0captured-selfie"
        selfie_data_url = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode()}"

        created = self.create(
            {
                "personal": {
                    "firstName": "Draft",
                    "selfiePhotoUrl": selfie_data_url,
                },
            }
        )

        self.assertEqual(created.status_code, 201)
        application_id = created.data["id"]
        application = StudentApplication.objects.get(id=application_id)
        self.assertFalse(
            StudentApplicationAdditionalField.objects.filter(
                application=application,
                section="personal",
                field_key="selfiePhotoUrl",
            ).exists()
        )
        selfie = RegistrationSelfieMedia.objects.get(verification=application.step2_verification)
        self.assertEqual(selfie.application, application)
        self.assertEqual(selfie.content_type, "image/jpeg")
        self.assertEqual(selfie.size, len(image_bytes))
        self.assertEqual(selfie.sha256, hashlib.sha256(image_bytes).hexdigest())
        selfie_path = reverse(
            "applications:identity-media",
            args=[application_id, IdentityMediaType.SELFIE],
        )
        self.assertEqual(created.data["photoUrl"], f"http://testserver{selfie_path}")

    def test_manual_selfie_photo_url_is_stored_as_registration_selfie_media(self):
        image_bytes = b"\xff\xd8\xff\xe0manual-captured-selfie"
        selfie_data_url = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode()}"
        client = APIClient()
        payload = complete_payload()
        payload["personal"]["email"] = "manual.selfie@example.test"
        payload["personal"]["selfiePhotoUrl"] = selfie_data_url
        payload["submitOnCreate"] = True
        payload["emailVerificationToken"] = verify_registration_email(client, payload["personal"]["email"])

        created = client.post(reverse("applications:create"), payload, format="json")

        self.assertEqual(created.status_code, 201)
        application = StudentApplication.objects.get(id=created.data["id"])
        self.assertFalse(
            StudentApplicationAdditionalField.objects.filter(
                application=application,
                section="personal",
                field_key="selfiePhotoUrl",
            ).exists()
        )
        selfie = RegistrationSelfieMedia.objects.get(application=application)
        self.assertIsNone(selfie.verification_id)
        self.assertEqual(selfie.content_type, "image/jpeg")
        self.assertEqual(selfie.size, len(image_bytes))
        self.assertEqual(selfie.sha256, hashlib.sha256(image_bytes).hexdigest())
        selfie_path = reverse(
            "applications:identity-media",
            args=[application.id, IdentityMediaType.SELFIE],
        )
        self.assertEqual(created.data["photoUrl"], f"http://testserver{selfie_path}")

    def test_duplicate_draft_returns_conflict(self):
        self.assertEqual(self.create().status_code, 201)
        duplicate = self.client.post(
            reverse("applications:verify-lrn"),
            {"lrn": "123456789012"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(duplicate.data["error"]["code"], "CONFLICT")

    def test_public_registration_submission_keeps_account_pending_until_approval(self):
        client = APIClient()
        verification = client.post(
            reverse("applications:verify-lrn"),
            {"lrn": "123456789012"},
            format="json",
        )
        payload = complete_payload()
        payload["personal"]["email"] = "new.student@example.test"
        payload["verificationToken"] = verification.data["verificationToken"]
        payload["emailVerificationToken"] = verify_registration_email(client, payload["personal"]["email"])
        payload["submitOnCreate"] = True

        response = client.post(reverse("applications:create"), payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], ApplicationStatus.SUBMITTED)
        self.assertRegex(response.data["candidateId"], r"^PS-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$")
        self.assertIsNotNone(response.data["submittedAt"])
        application = StudentApplication.objects.get(id=response.data["id"])
        self.assertEqual(application.candidate_id, response.data["candidateId"])
        self.assertIsNone(application.owner_id)
        self.assertTrue(application.password_hash)
        self.assertFalse(get_user_model().objects.filter(email="new.student@example.test").exists())
        self.assertEqual(application.personal["identityVerificationStatus"], "VERIFIED")
        self.assertEqual(application.personal["sex"], "Female")
        self.assertEqual(application.school["schoolId"], "301234")

    def test_public_registration_submission_creates_audit_log(self):
        client = APIClient()
        verification = client.post(
            reverse("applications:verify-lrn"),
            {"lrn": "123456789012"},
            format="json",
        )
        payload = complete_payload()
        payload["personal"]["email"] = "audited.student@example.test"
        payload["verificationToken"] = verification.data["verificationToken"]
        payload["emailVerificationToken"] = verify_registration_email(client, payload["personal"]["email"])
        payload["submitOnCreate"] = True

        response = client.post(
            reverse("applications:create"),
            payload,
            format="json",
            HTTP_X_REGISTRATION_SESSION_ID="REG-SESSION-TEST",
            HTTP_USER_AGENT="AuditBrowser/1.0",
        )

        self.assertEqual(response.status_code, 201)
        self.assertRegex(response.data["candidateId"], r"^PS-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$")
        audit_log = ApplicationAuditLog.objects.get(application_id=response.data["id"])
        self.assertEqual(audit_log.action, "REGISTRATION_SUBMITTED")
        self.assertEqual(audit_log.outcome, "success")
        self.assertEqual(audit_log.registration_id, response.data["candidateId"])
        self.assertEqual(audit_log.applicant_id, response.data["candidateId"])
        self.assertEqual(audit_log.account_id, f"PENDING-{response.data['candidateId']}")
        self.assertEqual(audit_log.actor_user_id, "ANONYMOUS")
        self.assertEqual(audit_log.session_id, "REG-SESSION-TEST")
        self.assertEqual(audit_log.user_agent, "AuditBrowser/1.0")

    def test_admissions_reviewer_can_list_registration_submission_audit_logs(self):
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
            submitted_at=timezone.now(),
        )
        ApplicationAuditLog.objects.create(
            application=submitted,
            action="REGISTRATION_SUBMITTED",
            event="application_submitted",
            outcome="success",
            registration_id=str(submitted.id),
            applicant_id=str(submitted.id),
            account_id=f"PENDING-{submitted.id}",
            actor_user_id="ANONYMOUS",
            session_id="REG-SESSION-LIST",
            ip_address="127.0.0.1",
            user_agent="AuditBrowser/1.0",
            correlation_id="corr-test",
        )
        ApplicationAuditLog.objects.create(
            application=submitted,
            action="REGISTRATION_STUDENT_ACCOUNT_ACTIVATED",
            event="student_account_activated",
            outcome="success",
            registration_id=submitted.candidate_id,
            applicant_id=submitted.candidate_id,
            account_id="student-account-1",
            actor_user_id="student-account-1",
            actor_role="Student",
            session_id="REG-SESSION-ACTIVATED",
            ip_address="127.0.0.1",
            user_agent="ActivationBrowser/1.0",
            correlation_id="corr-activation-test",
        )
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.get(reverse("applications:registration-submitted-audit"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        actions = [row["action"] for row in response.data]
        self.assertEqual(actions, [
            "REGISTRATION_STUDENT_ACCOUNT_ACTIVATED",
            "REGISTRATION_SUBMITTED",
        ])
        self.assertEqual(response.data[0]["actorRole"], "Student")
        self.assertEqual(response.data[0]["actorDisplay"], "Test Student")
        self.assertEqual(response.data[0]["accountId"], "student-account-1")
        self.assertEqual(response.data[0]["sessionId"], "REG-SESSION-ACTIVATED")
        self.assertEqual(response.data[1]["actorDisplay"], "Test Student")
        self.assertEqual(response.data[1]["applicationId"], str(submitted.id))
        self.assertEqual(response.data[1]["candidateId"], submitted.candidate_id)
        self.assertEqual(response.data[1]["registrationId"], str(submitted.id))
        self.assertEqual(response.data[1]["sessionId"], "REG-SESSION-LIST")

    def test_public_manual_high_priority_registration_can_create_account_without_lrn(self):
        client = APIClient()
        payload = complete_payload()
        payload["personal"]["email"] = "manual.student.one@example.test"
        payload["school"]["lrn"] = ""
        payload["submitOnCreate"] = True
        payload["emailVerificationToken"] = verify_registration_email(client, payload["personal"]["email"])
        second_payload = complete_payload()
        second_payload["personal"]["email"] = "manual.student.two@example.test"
        second_payload["school"]["lrn"] = ""
        second_payload["submitOnCreate"] = True
        second_payload["emailVerificationToken"] = verify_registration_email(client, second_payload["personal"]["email"])

        first = client.post(reverse("applications:create"), payload, format="json")
        second = client.post(reverse("applications:create"), second_payload, format="json")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.data["personal"]["identityVerificationStatus"], "MANUAL_PENDING")
        self.assertEqual(first.data["school"]["schoolId"], "301234")
        first_application = StudentApplication.objects.get(id=first.data["id"])
        second_application = StudentApplication.objects.get(id=second.data["id"])
        self.assertIsNone(first_application.owner_id)
        self.assertIsNone(second_application.owner_id)
        self.assertTrue(first_application.password_hash)
        self.assertTrue(second_application.password_hash)

    def test_public_manual_registration_allows_duplicate_entered_lrn_as_unverified_data_entry(self):
        client = APIClient()
        payload = complete_payload()
        payload["personal"]["email"] = "manual.duplicate.one@example.test"
        payload["school"]["lrn"] = "123456789012"
        payload["submitOnCreate"] = True
        payload["emailVerificationToken"] = verify_registration_email(client, payload["personal"]["email"])
        second_payload = complete_payload()
        second_payload["personal"]["email"] = "manual.duplicate.two@example.test"
        second_payload["school"]["lrn"] = "123456789012"
        second_payload["submitOnCreate"] = True
        second_payload["emailVerificationToken"] = verify_registration_email(client, second_payload["personal"]["email"])

        first = client.post(reverse("applications:create"), payload, format="json")
        second = client.post(reverse("applications:create"), second_payload, format="json")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        first_application = StudentApplication.objects.get(id=first.data["id"])
        second_application = StudentApplication.objects.get(id=second.data["id"])
        self.assertEqual(first_application.lrn, "")
        self.assertEqual(second_application.lrn, "")
        self.assertEqual(first_application.school["lrn"], "123456789012")
        self.assertEqual(second_application.school["lrn"], "123456789012")
        self.assertEqual(first_application.personal["identityVerificationStatus"], "MANUAL_PENDING")

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
            {"lrn": "123456789012"},
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

    def test_admissions_reviewer_django_session_can_list_submitted_registration_queue(self):
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
        reviewer = get_user_model().objects.create_user(
            username="reviewer",
            email="reviewer@example.test",
            password="Password1!",
        )
        AccountProfile.objects.create(user=reviewer, role=PortalRole.ADMISSIONS_REVIEWER.value)
        session_client = APIClient()
        session_client.force_login(reviewer)

        response = session_client.get(reverse("applications:review-queue"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [str(submitted.id)])

    def test_admissions_reviewer_can_read_submitted_application_detail(self):
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
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.get(reverse("applications:detail", args=[submitted.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(submitted.id))

    def test_submitted_application_detail_includes_authorized_selfie_url(self):
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
        verification = Step2Verification.objects.create(
            application=submitted,
            token_digest="selfie-token-digest",
            lrn="123456789012",
            lrn_profile={},
            configuration_snapshot={},
            expires_at=timezone.now(),
        )
        RegistrationSelfieMedia.objects.create(
            verification=verification,
            file="private/registration-selfies/selfie.jpg",
            content_type="image/jpeg",
            size=12,
            sha256="abc123",
        )
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.get(reverse("applications:detail", args=[submitted.id]))

        self.assertEqual(response.status_code, 200)
        expected_path = reverse("applications:identity-media", args=[submitted.id, IdentityMediaType.SELFIE])
        self.assertEqual(response.data["photoUrl"], f"http://testserver{expected_path}")

    def test_submitted_application_detail_keeps_selfie_url_when_student_id_front_exists(self):
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
        verification = Step2Verification.objects.create(
            application=submitted,
            token_digest="selfie-with-id-token-digest",
            lrn="123456789012",
            lrn_profile={},
            configuration_snapshot={},
            expires_at=timezone.now(),
        )
        RegistrationSelfieMedia.objects.create(
            verification=verification,
            file="private/registration-selfies/selfie.jpg",
            content_type="image/jpeg",
            size=12,
            sha256="abc123",
        )
        ApplicationIdentityMedia.objects.create(
            verification=verification,
            media_type=IdentityMediaType.STUDENT_ID_FRONT,
            file="private/registration-identity/student-id-front.jpg",
            content_type="image/jpeg",
            size=34,
            sha256="def456",
        )
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.get(reverse("applications:detail", args=[submitted.id]))

        self.assertEqual(response.status_code, 200)
        expected_path = reverse("applications:identity-media", args=[submitted.id, IdentityMediaType.SELFIE])
        self.assertEqual(response.data["photoUrl"], f"http://testserver{expected_path}")

    def test_reviewer_can_open_manual_registration_selfie_media(self):
        payload = complete_payload()
        submitted = StudentApplication.objects.create(
            owner=None,
            lrn="",
            exam_cycle_id="2026",
            status=ApplicationStatus.SUBMITTED,
            personal=payload["personal"],
            address=payload["address"],
            school=payload["school"],
            course_preferences=payload["coursePreferences"],
            review_step=payload["reviewStep"],
            password_hash=make_password(payload["password"]),
        )
        selfie_bytes = b"\xff\xd8\xff\xe0manual-review-selfie"
        RegistrationSelfieMedia.objects.create(
            application=submitted,
            file=ContentFile(selfie_bytes, name="manual-selfie.jpg"),
            content_type="image/jpeg",
            size=len(selfie_bytes),
            sha256=hashlib.sha256(selfie_bytes).hexdigest(),
        )
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        detail = self.client.get(reverse("applications:detail", args=[submitted.id]))
        response = self.client.get(
            reverse("applications:identity-media", args=[submitted.id, IdentityMediaType.SELFIE])
        )

        self.assertEqual(detail.status_code, 200)
        expected_path = reverse("applications:identity-media", args=[submitted.id, IdentityMediaType.SELFIE])
        self.assertEqual(detail.data["photoUrl"], f"http://testserver{expected_path}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/jpeg")

    def test_admissions_reviewer_cannot_read_draft_application_detail(self):
        draft = StudentApplication.objects.create(owner=self.user, status=ApplicationStatus.DRAFT)
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.get(reverse("applications:detail", args=[draft.id]))

        self.assertEqual(response.status_code, 403)

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
            HTTP_X_REGISTRATION_SESSION_ID="REG-SESSION-ACTIVATE",
            HTTP_USER_AGENT="ReviewerBrowser/1.0",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], ApplicationStatus.APPROVED)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.APPROVED)
        self.assertEqual(application.review_step["reviewerDecision"], "APPROVE")
        self.assertIsNotNone(application.owner_id)
        self.assertEqual(application.password_hash, "")
        self.assertEqual(application.owner.email, "approved.student@example.test")
        self.assertTrue(application.owner.check_password(payload["password"]))
        self.assertTrue(application.owner.is_active)
        self.assertTrue(
            AccountProfile.objects.filter(
                user=application.owner,
                role=PortalRole.STUDENT.value,
                lrn="123456789012",
            ).exists()
        )
        audit_log = ApplicationAuditLog.objects.get(action="REGISTRATION_STUDENT_ACCOUNT_ACTIVATED")
        self.assertEqual(audit_log.event, "student_account_activated")
        self.assertEqual(audit_log.outcome, "success")
        self.assertEqual(audit_log.application_id, application.id)
        self.assertEqual(audit_log.registration_id, application.candidate_id)
        self.assertEqual(audit_log.applicant_id, application.candidate_id)
        self.assertEqual(audit_log.account_id, str(application.owner_id))
        self.assertEqual(audit_log.actor_user_id, str(application.owner_id))
        self.assertEqual(audit_log.actor_role, "Student")
        self.assertEqual(audit_log.session_id, "REG-SESSION-ACTIVATE")
        self.assertEqual(audit_log.user_agent, "ReviewerBrowser/1.0")

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
