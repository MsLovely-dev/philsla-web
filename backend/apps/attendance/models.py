import secrets
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower


def generate_qr_token() -> str:
    """24-byte URL-safe token encoded into the permit QR code."""
    return secrets.token_urlsafe(24)


class ExamPermit(models.Model):
    """A candidate's exam entry permit. Whoever builds the web-side permit
    generator/email feature should create one of these per approved
    candidate; qr_token is what gets encoded into the QR image that is
    emailed/printed, and is what the mobile app scans.
    """

    class Status(models.TextChoices):
        ISSUED = "ISSUED", "Issued"
        USED = "USED", "Used"
        VOID = "VOID", "Void"

    application = models.OneToOneField(
        "applications.StudentApplication",
        on_delete=models.CASCADE,
        related_name="exam_permit",
        null=True,
        blank=True,
        help_text="The web-side application this permit was auto-issued for, if any. "
        "Null for permits created another way (e.g. the seed_sample_permits command).",
    )
    candidate_id = models.CharField(max_length=64)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    test_center = models.CharField(max_length=255, blank=True)
    room = models.CharField(max_length=100, blank=True)
    seat = models.CharField(max_length=50, blank=True)
    exam_date = models.DateField(null=True, blank=True)
    exam_start_time = models.TimeField(null=True, blank=True)
    exam_end_time = models.TimeField(null=True, blank=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Permit can no longer be used to check in after this time; null means no expiry set.",
    )
    qr_token = models.CharField(
        max_length=64, unique=True, default=generate_qr_token, editable=False
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.ISSUED
    )
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self) -> str:
        return f"{self.candidate_id} - {self.full_name}"


class AttendanceRecord(models.Model):
    """One row per successful QR scan. permit.status flips to USED on the
    first successful scan; re-scans are reported to the app as
    'already marked' rather than rejected outright, since a proctor
    re-scanning a QR by accident is a common, harmless case.
    """

    permit = models.ForeignKey(
        ExamPermit, on_delete=models.CASCADE, related_name="attendance_records"
    )
    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="attendance_scans",
    )
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-scanned_at"]

    def __str__(self) -> str:
        return f"{self.permit.candidate_id} @ {self.scanned_at:%Y-%m-%d %H:%M}"


class AttendanceStatus(models.TextChoices):
    UNMARKED = "UNMARKED", "Unmarked"
    PRESENT = "PRESENT", "Present"
    LATE = "LATE", "Late"
    ABSENT = "ABSENT", "Absent"


class AttendanceSource(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    QR_SCAN = "QR_SCAN", "QR scan"
    SYNC = "SYNC", "Sync"


class ExamRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_center = models.CharField(max_length=255)
    code = models.CharField(max_length=100)
    name = models.CharField(max_length=160)
    location = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["test_center", "code"]
        constraints = [
            models.UniqueConstraint(
                Lower("test_center"),
                Lower("code"),
                name="attendance_unique_room_code_per_center",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.test_center} / {self.code}"


class RoomSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    examination_session = models.ForeignKey(
        "results.ExaminationSession",
        on_delete=models.PROTECT,
        related_name="room_sessions",
    )
    room = models.ForeignKey(
        ExamRoom,
        on_delete=models.PROTECT,
        related_name="sessions",
    )
    starts_at = models.DateTimeField()
    late_after_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at", "room__test_center", "room__code"]
        constraints = [
            models.CheckConstraint(
                condition=Q(starts_at__lt=F("ends_at")),
                name="attendance_room_session_start_before_end",
            ),
            models.CheckConstraint(
                condition=Q(late_after_at__gte=F("starts_at")),
                name="attendance_room_session_late_after_start",
            ),
            models.CheckConstraint(
                condition=Q(late_after_at__lte=F("ends_at")),
                name="attendance_room_session_late_before_end",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.examination_session_id} / {self.room} / {self.starts_at.isoformat()}"


class RoomSessionProctorAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_session = models.ForeignKey(
        RoomSession,
        on_delete=models.PROTECT,
        related_name="proctor_assignments",
    )
    proctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="attendance_room_assignments",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["room_session__starts_at", "assigned_at"]
        constraints = [
            models.UniqueConstraint(
                fields=("room_session", "proctor"),
                condition=Q(revoked_at__isnull=True),
                name="attendance_unique_active_room_proctor",
            ),
        ]


class CandidateSessionAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        "applications.StudentApplication",
        on_delete=models.PROTECT,
        related_name="attendance_session_assignments",
    )
    room_session = models.ForeignKey(
        RoomSession,
        on_delete=models.PROTECT,
        related_name="candidate_assignments",
    )
    seat_label = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["room_session__starts_at", "seat_label"]
        constraints = [
            models.UniqueConstraint(
                fields=("candidate", "room_session"),
                condition=Q(is_active=True),
                name="attendance_unique_active_candidate_session",
            ),
            models.UniqueConstraint(
                Lower("seat_label"),
                "room_session",
                condition=Q(is_active=True),
                name="attendance_unique_active_room_seat_ci",
            ),
            models.CheckConstraint(
                condition=Q(seat_label__regex=r".*\S.*"),
                name="attendance_seat_label_nonblank",
            ),
            models.CheckConstraint(
                condition=Q(is_active=False) | Q(revoked_at__isnull=True),
                name="attendance_assignment_active_not_revoked",
            ),
        ]
        indexes = [
            models.Index(
                fields=("room_session", "seat_label"),
                name="attendance_roster_seat_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.candidate.candidate_id} / {self.room_session_id} / {self.seat_label}"


class PermitCredential(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        CandidateSessionAssignment,
        on_delete=models.PROTECT,
        related_name="permit_credentials",
    )
    token_digest = models.CharField(max_length=64, unique=True, editable=False)
    is_active = models.BooleanField(default=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-issued_at"]
        constraints = [
            models.UniqueConstraint(
                fields=("assignment",),
                condition=Q(is_active=True),
                name="attendance_unique_active_permit",
            ),
            models.CheckConstraint(
                condition=Q(is_active=False) | Q(revoked_at__isnull=True),
                name="attendance_permit_active_not_revoked",
            ),
        ]


class AttendanceState(models.Model):
    Status = AttendanceStatus
    Source = AttendanceSource

    assignment = models.OneToOneField(
        CandidateSessionAssignment,
        primary_key=True,
        on_delete=models.PROTECT,
        related_name="attendance_state",
    )
    room_session = models.ForeignKey(
        RoomSession,
        on_delete=models.PROTECT,
        related_name="attendance_states",
    )
    status = models.CharField(
        max_length=16,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.UNMARKED,
    )
    recorded_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(
        max_length=16,
        choices=AttendanceSource.choices,
        blank=True,
        default="",
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="recorded_attendance_states",
    )
    last_client_instance_id = models.CharField(max_length=128, blank=True, default="")
    last_client_event_id = models.UUIDField(null=True, blank=True)
    version = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["room_session__starts_at", "assignment__seat_label"]
        constraints = [
            models.CheckConstraint(
                condition=Q(version__gte=0),
                name="attendance_state_version_nonnegative",
            ),
        ]
        indexes = [
            models.Index(
                fields=("room_session", "status"),
                name="attendance_current_status_idx",
            ),
        ]


class AttendanceEvent(models.Model):
    class EventType(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        QR_SCAN = "QR_SCAN", "QR scan"
        SYNC = "SYNC", "Sync"
        CORRECTION = "CORRECTION", "Correction"

    class Outcome(models.TextChoices):
        ACCEPTED = "ACCEPTED", "Accepted"
        CONFLICT = "CONFLICT", "Conflict"
        SESSION_CLOSED = "SESSION_CLOSED", "Session closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        CandidateSessionAssignment,
        on_delete=models.PROTECT,
        related_name="attendance_events",
    )
    requested_status = models.CharField(max_length=16, choices=AttendanceStatus.choices)
    previous_status = models.CharField(
        max_length=16,
        choices=AttendanceStatus.choices,
        blank=True,
        default="",
    )
    resulting_status = models.CharField(
        max_length=16,
        choices=AttendanceStatus.choices,
        blank=True,
        default="",
    )
    event_type = models.CharField(max_length=16, choices=EventType.choices)
    source = models.CharField(max_length=16, choices=AttendanceSource.choices)
    outcome = models.CharField(max_length=20, choices=Outcome.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="attendance_events",
    )
    client_instance_id = models.CharField(max_length=128, blank=True, default="")
    client_event_id = models.UUIDField(null=True, blank=True)
    sync_batch_id = models.UUIDField(null=True, blank=True)
    client_recorded_at = models.DateTimeField(null=True, blank=True)
    server_received_at = models.DateTimeField(auto_now_add=True)
    correction_reason = models.CharField(max_length=240, blank=True, default="")
    resulting_version = models.PositiveBigIntegerField()

    class Meta:
        ordering = ["-server_received_at"]
        constraints = [
            models.UniqueConstraint(
                fields=("client_instance_id", "client_event_id"),
                condition=Q(
                    client_instance_id__gt="",
                    client_event_id__isnull=False,
                ),
                name="attendance_unique_client_event",
            ),
            models.CheckConstraint(
                condition=Q(resulting_version__gte=0),
                name="attendance_event_version_nonnegative",
            ),
        ]
        indexes = [
            models.Index(
                fields=("assignment", "server_received_at"),
                name="attendance_event_history_idx",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Attendance events are append-only.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Attendance events are append-only.")
