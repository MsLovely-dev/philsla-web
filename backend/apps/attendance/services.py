from django.utils import timezone

from .models import AttendanceRecord, ExamPermit


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
