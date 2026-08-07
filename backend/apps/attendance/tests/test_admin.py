from datetime import timedelta

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import RequestFactory, TestCase
from django.utils import timezone

from apps.applications.models import ApplicationStatus, StudentApplication
from apps.attendance.admin import AttendanceEventAdmin
from apps.attendance.models import (
    AttendanceEvent,
    AttendanceState,
    CandidateSessionAssignment,
    ExamRoom,
    RoomSession,
)
from apps.results.models import ExaminationSession


class AttendanceEventAdminTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.actor = get_user_model().objects.create_user(
            username="synthetic-audit-actor",
            email="audit-actor@example.test",
            password="Test-only-123!",
        )
        candidate = StudentApplication.objects.create(
            candidate_id="PHL-2026-AUD001",
            exam_cycle_id="2026",
            status=ApplicationStatus.APPROVED,
        )
        exam_session = ExaminationSession.objects.create(
            id="SESSION-AUDIT-2026",
            name="Synthetic audit session",
        )
        room = ExamRoom.objects.create(
            test_center="Synthetic Audit Center",
            code="AUDIT-ROOM",
            name="Audit Room",
        )
        starts_at = timezone.now() + timedelta(days=1)
        room_session = RoomSession.objects.create(
            examination_session=exam_session,
            room=room,
            starts_at=starts_at,
            late_after_at=starts_at + timedelta(minutes=15),
            ends_at=starts_at + timedelta(hours=2),
        )
        assignment = CandidateSessionAssignment.objects.create(
            candidate=candidate,
            room_session=room_session,
            seat_label="AUD-01",
        )
        cls.event = AttendanceEvent.objects.create(
            assignment=assignment,
            requested_status=AttendanceState.Status.PRESENT,
            resulting_status=AttendanceState.Status.PRESENT,
            event_type=AttendanceEvent.EventType.MANUAL,
            source=AttendanceState.Source.MANUAL,
            outcome=AttendanceEvent.Outcome.ACCEPTED,
            actor=cls.actor,
            resulting_version=1,
        )

    def test_saved_event_cannot_be_updated(self):
        self.event.correction_reason = "Changed after insertion"

        with self.assertRaisesMessage(
            ValidationError,
            "Attendance events are append-only.",
        ):
            self.event.save()

    def test_saved_event_cannot_be_deleted(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Attendance events are append-only.",
        ):
            self.event.delete()

    def test_event_admin_denies_all_mutation_permissions(self):
        request = RequestFactory().get("/admin/attendance/attendanceevent/")
        request.user = self.actor
        model_admin = AttendanceEventAdmin(AttendanceEvent, AdminSite())

        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_change_permission(request, self.event))
        self.assertFalse(model_admin.has_delete_permission(request, self.event))

    def test_event_admin_makes_every_concrete_field_read_only(self):
        request = RequestFactory().get("/admin/attendance/attendanceevent/")
        request.user = self.actor
        model_admin = AttendanceEventAdmin(AttendanceEvent, AdminSite())
        concrete_fields = tuple(field.name for field in AttendanceEvent._meta.concrete_fields)

        self.assertEqual(
            model_admin.get_readonly_fields(request, self.event),
            concrete_fields,
        )
