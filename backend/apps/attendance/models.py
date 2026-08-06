import secrets

from django.conf import settings
from django.db import models


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

    candidate_id = models.CharField(max_length=64)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    test_center = models.CharField(max_length=255, blank=True)
    room = models.CharField(max_length=100, blank=True)
    seat = models.CharField(max_length=50, blank=True)
    exam_date = models.DateField(null=True, blank=True)
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
