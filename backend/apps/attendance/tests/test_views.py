from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.attendance.models import AttendanceRecord, ExamPermit


class ScanAttendanceViewTests(TestCase):
    """Uses a real, saved User (with `.role` set in-memory) rather than the
    lightweight SimpleNamespace principal other endpoint tests use, because
    this view -- unlike read-only endpoints -- writes `AttendanceRecord.scanned_by`,
    a real ForeignKey to the user model that rejects a non-model duck-typed object.
    """

    def setUp(self):
        User = get_user_model()
        self.proctor = User.objects.create_user(username="proctor1", email="proctor1@example.test")
        self.proctor.role = PortalRole.PROCTOR.value
        self.client = APIClient()
        self.client.force_authenticate(user=self.proctor)

    def make_permit(
        self,
        *,
        status=ExamPermit.Status.ISSUED,
        expires_at=None,
        candidate_id="ST-001",
        exam_date=None,
        exam_start_time=None,
        exam_end_time=None,
    ):
        return ExamPermit.objects.create(
            candidate_id=candidate_id,
            full_name="Test Candidate",
            test_center="UP Diliman",
            room="Melchor Hall, Room 302",
            seat="1A",
            status=status,
            expires_at=expires_at,
            exam_date=exam_date,
            exam_start_time=exam_start_time,
            exam_end_time=exam_end_time,
        )

    def test_first_scan_marks_used_and_creates_attendance_record(self):
        permit = self.make_permit()

        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": permit.qr_token}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["alreadyMarked"], False)
        self.assertEqual(response.data["permit"]["candidateId"], "ST-001")
        permit.refresh_from_db()
        self.assertEqual(permit.status, ExamPermit.Status.USED)
        self.assertEqual(AttendanceRecord.objects.filter(permit=permit).count(), 1)

    def test_scan_response_includes_the_candidate_s_real_assigned_schedule(self):
        permit = self.make_permit(
            exam_date=date(2026, 6, 15),
            exam_start_time=time(8, 0),
            exam_end_time=time(11, 0),
        )

        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": permit.qr_token}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["permit"]["testCenter"], "UP Diliman")
        self.assertEqual(response.data["permit"]["room"], "Melchor Hall, Room 302")
        self.assertEqual(response.data["permit"]["seat"], "1A")
        self.assertEqual(response.data["permit"]["examDate"], "2026-06-15")
        self.assertEqual(response.data["permit"]["examStartTime"], "08:00:00")
        self.assertEqual(response.data["permit"]["examEndTime"], "11:00:00")

    def test_scan_response_schedule_fields_are_null_when_unset(self):
        permit = self.make_permit()

        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": permit.qr_token}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["permit"]["examDate"])
        self.assertIsNone(response.data["permit"]["examStartTime"])
        self.assertIsNone(response.data["permit"]["examEndTime"])

    def test_rescanning_already_used_permit_reports_already_marked_without_duplicate_record(self):
        permit = self.make_permit(status=ExamPermit.Status.USED)
        AttendanceRecord.objects.create(permit=permit, scanned_by=self.proctor)

        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": permit.qr_token}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["alreadyMarked"], True)
        self.assertEqual(AttendanceRecord.objects.filter(permit=permit).count(), 1)

    def test_void_permit_returns_409_with_standard_envelope(self):
        permit = self.make_permit(status=ExamPermit.Status.VOID)

        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": permit.qr_token}, format="json")

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "VOID")
        self.assertIn("voided", response.data["error"]["message"])

    def test_expired_permit_returns_409_with_standard_envelope(self):
        permit = self.make_permit(expires_at=timezone.now() - timedelta(hours=1))

        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": permit.qr_token}, format="json")

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "EXPIRED")
        self.assertIn("expired", response.data["error"]["message"])

    def test_unknown_token_returns_404_with_standard_envelope(self):
        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": "does-not-exist"}, format="json")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_wrong_role_denied(self):
        self.proctor.role = PortalRole.STUDENT.value
        permit = self.make_permit()

        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": permit.qr_token}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_denied(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(reverse("attendance:attendance-scan"), {"qrToken": "anything"}, format="json")

        self.assertEqual(response.status_code, 401)
