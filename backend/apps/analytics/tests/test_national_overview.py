from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.applications.models import (
    ApplicationStatus,
    Step2Verification,
    Step2VerificationStatus,
    StudentApplication,
    StudentApplicationAddress,
    StudentApplicationCoursePreference,
    StudentApplicationSchoolInfo,
)


def principal(user, role):
    return SimpleNamespace(
        id=user.id,
        user_id=user.id,
        role=role,
        is_authenticated=True,
        is_active=True,
    )


def create_application(*, status, region="", school_id="", university="", verified_via_personal=False, verified_via_step2=False):
    application = StudentApplication.objects.create(status=status)
    if region:
        StudentApplicationAddress.objects.create(application=application, region=region)
    if school_id:
        StudentApplicationSchoolInfo.objects.create(application=application, school_id=school_id)
    if university:
        StudentApplicationCoursePreference.objects.create(application=application, university=university)
    application.personal = {
        "identityVerificationStatus": "VERIFIED" if verified_via_personal else "",
    }
    application.save()
    if verified_via_step2:
        Step2Verification.objects.create(
            application=application,
            token_digest=f"digest-{application.id}",
            lrn="123456789012",
            status=Step2VerificationStatus.PASSED,
            expires_at="2030-01-01T00:00:00Z",
        )
    return application


class NationalOverviewEndpointTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="gov-user", email="gov-user@example.test")
        self.client = APIClient()

    def test_anonymous_request_is_denied(self):
        response = self.client.get(reverse("analytics:national-overview"))
        self.assertEqual(response.status_code, 401)

    def test_disallowed_role_is_denied(self):
        for role in (PortalRole.STUDENT.value, PortalRole.ADMISSIONS_REVIEWER.value, PortalRole.PROCTOR.value):
            with self.subTest(role=role):
                self.client.force_authenticate(user=principal(self.user, role))
                response = self.client.get(reverse("analytics:national-overview"))
                self.assertEqual(response.status_code, 403)

    def test_each_permitted_role_can_read(self):
        for role in (
            PortalRole.CHED_ADMIN.value,
            PortalRole.DEPED_ADMIN.value,
            PortalRole.TESDA_ADMIN.value,
            PortalRole.EXECUTIVE.value,
            PortalRole.SYSTEM_ADMIN.value,
        ):
            with self.subTest(role=role):
                self.client.force_authenticate(user=principal(self.user, role))
                response = self.client.get(reverse("analytics:national-overview"))
                self.assertEqual(response.status_code, 200)

    def test_post_is_not_allowed(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.EXECUTIVE.value))
        response = self.client.post(reverse("analytics:national-overview"))
        self.assertEqual(response.status_code, 405)

    def test_empty_database_returns_zero_counts_and_empty_regional_breakdown(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.EXECUTIVE.value))
        response = self.client.get(reverse("analytics:national-overview"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totalRegisteredExaminees"], 0)
        self.assertEqual(response.data["totalVerifiedExaminees"], 0)
        self.assertEqual(response.data["totalParticipatingSchools"], 0)
        self.assertEqual(response.data["totalParticipatingUniversities"], 0)
        self.assertEqual(response.data["regionalBreakdown"], [])

    def test_aggregation_counts_registered_verified_schools_universities_and_regions(self):
        create_application(status=ApplicationStatus.DRAFT, region="NCR", school_id="SCH-1", university="Uni A")
        create_application(
            status=ApplicationStatus.SUBMITTED,
            region="NCR",
            school_id="SCH-1",
            university="Uni A",
            verified_via_personal=True,
        )
        create_application(
            status=ApplicationStatus.APPROVED,
            region="NCR",
            school_id="SCH-2",
            university="Uni B",
            verified_via_step2=True,
        )
        create_application(status=ApplicationStatus.REJECTED, region="Region VII", school_id="", university="")
        create_application(status=ApplicationStatus.FOR_CORRECTION, region="", school_id="SCH-3", university="Uni C")

        self.client.force_authenticate(user=principal(self.user, PortalRole.EXECUTIVE.value))
        response = self.client.get(reverse("analytics:national-overview"))

        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data["totalRegisteredExaminees"], 4)
        self.assertEqual(data["totalVerifiedExaminees"], 2)
        self.assertEqual(data["totalParticipatingSchools"], 3)
        self.assertEqual(data["totalParticipatingUniversities"], 3)
        regional_by_name = {row["region"]: row["applicationCount"] for row in data["regionalBreakdown"]}
        self.assertEqual(regional_by_name, {"NCR": 2, "Region VII": 1})

    def test_successful_read_emits_audit_log_event(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.EXECUTIVE.value))

        with self.assertLogs("philsa.audit", level="INFO") as captured:
            response = self.client.get(reverse("analytics:national-overview"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any("analytics_event" in message for message in captured.output))
