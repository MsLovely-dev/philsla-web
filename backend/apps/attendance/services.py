from datetime import datetime

from django.utils import timezone

from .models import AttendanceRecord, ExamPermit


def issue_or_update_exam_permit(*, application, slot) -> ExamPermit:
    """Issues (or re-issues, if the application already has one) the exam
    permit for a StudentApplication once its exam slot is confirmed.

    Called from apps.applications.services.assign_exam_slot inside the same
    atomic transaction, so a confirmed slot and its permit are created
    together or not at all. The seat number is a simple running count of how
    many permits this slot has issued so far -- there's no finer-grained
    seat map anywhere in the system to draw from.
    """
    personal = getattr(application, "personal_info", None)
    full_name = f"{personal.first_name} {personal.last_name}".strip() if personal else ""
    email = personal.email if personal else ""

    seat_number = slot.total_slots - slot.remaining_slots
    expires_at = (
        timezone.make_aware(datetime.combine(slot.date, slot.start_time))
        if slot.date and slot.start_time
        else None
    )

    permit, _ = ExamPermit.objects.update_or_create(
        application=application,
        defaults={
            "candidate_id": application.candidate_id,
            "full_name": full_name,
            "email": email,
            "test_center": slot.test_center,
            "room": slot.room,
            "seat": str(seat_number),
            "exam_date": slot.date,
            "exam_start_time": slot.start_time,
            "exam_end_time": slot.end_time,
            "expires_at": expires_at,
            "status": ExamPermit.Status.ISSUED,
        },
    )
    return permit


class AttendanceError(Exception):
    def __init__(self, code: str, detail: str) -> None:
        self.code = code
        self.detail = detail
        super().__init__(detail)


def mark_attendance(*, qr_token: str, proctor) -> dict:
    """Validate a scanned QR token and record attendance.

    Idempotent on purpose: scanning an already-used permit again does not
    raise, it just reports alreadyMarked=True so the mobile UI can show a
    distinct (still success-styled) state instead of an error.
    """

    try:
        permit = ExamPermit.objects.get(qr_token=qr_token)
    except ExamPermit.DoesNotExist as exc:
        raise AttendanceError(
            "NOT_FOUND", "This QR code does not match any issued permit."
        ) from exc

    if permit.status == ExamPermit.Status.VOID:
        raise AttendanceError(
            "VOID", "This permit has been voided and cannot be used for entry."
        )

    already_marked = permit.status == ExamPermit.Status.USED

    if not already_marked and permit.expires_at and timezone.now() > permit.expires_at:
        raise AttendanceError(
            "EXPIRED", "This permit has expired and can no longer be used for entry."
        )

    if not already_marked:
        permit.status = ExamPermit.Status.USED
        permit.save(update_fields=["status"])
        AttendanceRecord.objects.create(permit=permit, scanned_by=proctor)
        scanned_at = timezone.now()
    else:
        latest = permit.attendance_records.order_by("-scanned_at").first()
        scanned_at = latest.scanned_at if latest else timezone.now()

    return {
        "alreadyMarked": already_marked,
        "permit": {
            "candidateId": permit.candidate_id,
            "fullName": permit.full_name,
            "testCenter": permit.test_center,
            "room": permit.room,
            "seat": permit.seat,
        },
        "scannedAt": scanned_at.isoformat(),
    }
