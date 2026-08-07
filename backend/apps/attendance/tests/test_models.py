from datetime import timedelta
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from apps.applications.models import ApplicationStatus, StudentApplication
from apps.attendance.models import (
    AttendanceEvent,
    AttendanceState,
    CandidateSessionAssignment,
    ExamRoom,
    PermitCredential,
    RoomSession,
    RoomSessionProctorAssignment,
)
from apps.results.models import ExaminationSession


class AttendanceSchemaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.proctor = get_user_model().objects.create_user(
            username="synthetic-proctor",
            email="proctor@example.test",
            password="Test-only-123!",
        )
        cls.candidate = StudentApplication.objects.create(
            candidate_id="PHL-2026-ATT001",
            exam_cycle_id="2026",
            status=ApplicationStatus.APPROVED,
        )
        cls.exam_session = ExaminationSession.objects.create(
            id="SESSION-ATTENDANCE-2026",
            name="Synthetic attendance session",
        )
        cls.room = ExamRoom.objects.create(
            test_center="Synthetic Test Center",
            code="ROOM-A",
            name="Room A",
        )
        cls.starts_at = timezone.now() + timedelta(days=1)
        cls.room_session = RoomSession.objects.create(
            examination_session=cls.exam_session,
            room=cls.room,
            starts_at=cls.starts_at,
            late_after_at=cls.starts_at + timedelta(minutes=15),
            ends_at=cls.starts_at + timedelta(hours=2),
        )

    @classmethod
    def create_candidate(cls, suffix: str) -> StudentApplication:
        return StudentApplication.objects.create(
            candidate_id=f"PHL-2026-{suffix}",
            exam_cycle_id="2026",
            status=ApplicationStatus.APPROVED,
        )

    def create_assignment(
        self,
        *,
        candidate: StudentApplication | None = None,
        seat_label: str = "A-01",
        is_active: bool = True,
        revoked_at=None,
    ) -> CandidateSessionAssignment:
        return CandidateSessionAssignment.objects.create(
            candidate=candidate or self.candidate,
            room_session=self.room_session,
            seat_label=seat_label,
            is_active=is_active,
            revoked_at=revoked_at,
        )

    def create_event(self, assignment, **overrides) -> AttendanceEvent:
        values = {
            "assignment": assignment,
            "requested_status": AttendanceState.Status.PRESENT,
            "resulting_status": AttendanceState.Status.PRESENT,
            "event_type": AttendanceEvent.EventType.MANUAL,
            "source": AttendanceState.Source.MANUAL,
            "outcome": AttendanceEvent.Outcome.ACCEPTED,
            "resulting_version": 1,
        }
        values.update(overrides)
        return AttendanceEvent.objects.create(**values)

    def test_room_code_is_unique_case_insensitively_within_test_center(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            ExamRoom.objects.create(
                test_center="synthetic test center",
                code="room-a",
                name="Duplicate Room A",
            )

    def test_room_session_requires_start_before_end(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            RoomSession.objects.create(
                examination_session=self.exam_session,
                room=self.room,
                starts_at=self.starts_at,
                late_after_at=self.starts_at,
                ends_at=self.starts_at,
            )

    def test_room_session_requires_late_cutoff_not_before_start(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            RoomSession.objects.create(
                examination_session=self.exam_session,
                room=self.room,
                starts_at=self.starts_at,
                late_after_at=self.starts_at - timedelta(seconds=1),
                ends_at=self.starts_at + timedelta(hours=2),
            )

    def test_room_session_requires_late_cutoff_not_after_end(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            RoomSession.objects.create(
                examination_session=self.exam_session,
                room=self.room,
                starts_at=self.starts_at,
                late_after_at=self.starts_at + timedelta(hours=2, seconds=1),
                ends_at=self.starts_at + timedelta(hours=2),
            )

    def test_active_proctor_assignment_is_unique_per_room_session(self):
        RoomSessionProctorAssignment.objects.create(
            room_session=self.room_session,
            proctor=self.proctor,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            RoomSessionProctorAssignment.objects.create(
                room_session=self.room_session,
                proctor=self.proctor,
            )

    def test_revoked_proctor_can_be_reassigned(self):
        old = RoomSessionProctorAssignment.objects.create(
            room_session=self.room_session,
            proctor=self.proctor,
            revoked_at=timezone.now(),
        )
        replacement = RoomSessionProctorAssignment.objects.create(
            room_session=self.room_session,
            proctor=self.proctor,
        )

        self.assertNotEqual(old.pk, replacement.pk)

    def test_active_candidate_assignment_is_unique_per_room_session(self):
        self.create_assignment()

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_assignment(seat_label="A-02")

    def test_active_seat_is_unique_case_insensitively(self):
        self.create_assignment(seat_label="Seat-1")

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_assignment(
                candidate=self.create_candidate("ATT002"),
                seat_label="seat-1",
            )

    def test_inactive_seat_can_be_reassigned(self):
        self.create_assignment(seat_label="Seat-1", is_active=False)
        replacement = self.create_assignment(
            candidate=self.create_candidate("ATT003"),
            seat_label="seat-1",
        )

        self.assertTrue(replacement.is_active)

    def test_whitespace_only_seat_is_rejected(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_assignment(seat_label="   ")

    def test_active_candidate_assignment_cannot_be_revoked(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_assignment(revoked_at=timezone.now())

    def test_permit_token_digest_is_globally_unique(self):
        first = self.create_assignment()
        second = self.create_assignment(
            candidate=self.create_candidate("ATT004"),
            seat_label="A-02",
        )
        PermitCredential.objects.create(assignment=first, token_digest="a" * 64)

        with self.assertRaises(IntegrityError), transaction.atomic():
            PermitCredential.objects.create(assignment=second, token_digest="a" * 64)

    def test_only_one_active_permit_credential_is_allowed(self):
        assignment = self.create_assignment()
        PermitCredential.objects.create(assignment=assignment, token_digest="a" * 64)

        with self.assertRaises(IntegrityError), transaction.atomic():
            PermitCredential.objects.create(assignment=assignment, token_digest="b" * 64)

    def test_inactive_permit_can_be_rotated(self):
        assignment = self.create_assignment()
        PermitCredential.objects.create(
            assignment=assignment,
            token_digest="a" * 64,
            is_active=False,
            revoked_at=timezone.now(),
        )
        replacement = PermitCredential.objects.create(
            assignment=assignment,
            token_digest="b" * 64,
        )

        self.assertTrue(replacement.is_active)

    def test_active_permit_cannot_be_revoked(self):
        assignment = self.create_assignment()

        with self.assertRaises(IntegrityError), transaction.atomic():
            PermitCredential.objects.create(
                assignment=assignment,
                token_digest="a" * 64,
                revoked_at=timezone.now(),
            )

    def test_new_permit_schema_has_no_raw_token_field(self):
        field_names = {field.name for field in PermitCredential._meta.get_fields()}

        self.assertEqual(field_names & {"token", "qr_token", "raw_token"}, set())
        self.assertIn("token_digest", field_names)

    def test_attendance_state_defaults_to_unmarked_version_zero(self):
        assignment = self.create_assignment()
        state = AttendanceState.objects.create(
            assignment=assignment,
            room_session=self.room_session,
        )

        self.assertEqual(state.status, AttendanceState.Status.UNMARKED)
        self.assertEqual(state.version, 0)
        self.assertIsNone(state.recorded_at)
        self.assertEqual(state.source, "")

    def test_client_event_is_idempotent_per_client_instance(self):
        assignment = self.create_assignment()
        client_event_id = UUID("10000000-0000-0000-0000-000000000001")
        self.create_event(
            assignment,
            client_instance_id="web-client-1",
            client_event_id=client_event_id,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_event(
                assignment,
                client_instance_id="web-client-1",
                client_event_id=client_event_id,
            )

    def test_same_client_event_id_is_allowed_for_different_clients(self):
        assignment = self.create_assignment()
        client_event_id = UUID("10000000-0000-0000-0000-000000000001")
        first = self.create_event(
            assignment,
            client_instance_id="web-client-1",
            client_event_id=client_event_id,
        )
        second = self.create_event(
            assignment,
            client_instance_id="web-client-2",
            client_event_id=client_event_id,
        )

        self.assertNotEqual(first.pk, second.pk)

    def test_required_query_indexes_are_declared(self):
        assignment_indexes = {
            tuple(index.fields) for index in CandidateSessionAssignment._meta.indexes
        }
        state_indexes = {tuple(index.fields) for index in AttendanceState._meta.indexes}
        event_indexes = {tuple(index.fields) for index in AttendanceEvent._meta.indexes}

        self.assertIn(("room_session", "seat_label"), assignment_indexes)
        self.assertIn(("room_session", "status"), state_indexes)
        self.assertIn(("assignment", "server_received_at"), event_indexes)
