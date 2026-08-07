from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.attendance.models import ExamPermit

# Must match the `id` field of every entry in `getInitialStudentPCs` in
# frontend/src/pages/proctor/ProctorAttendance.tsx exactly, so the QR test
# codes already published for manual device testing keep working once the
# scan step is wired to the real backend.
PREVIEW_CANDIDATES = [
    {"candidate_id": "ST-001", "full_name": "Juan Carlos Villanueva", "seat": "A01"},
    {"candidate_id": "ST-002", "full_name": "Maria Cristina Santos", "seat": "A02"},
    {"candidate_id": "ST-003", "full_name": "Enrique S. Gatus", "seat": "A03"},
    {"candidate_id": "ST-004", "full_name": "Liza Monica Bautista", "seat": "A04"},
    {"candidate_id": "ST-005", "full_name": "Daniel S. Reyes", "seat": "A05"},
    {"candidate_id": "ST-006", "full_name": "Kathrine B. Mercado", "seat": "A06"},
    {"candidate_id": "ST-101", "full_name": "Patricia Alcaraz", "seat": "B01"},
    {"candidate_id": "ST-102", "full_name": "Ramon Macaraeg", "seat": "B02"},
    {"candidate_id": "ST-103", "full_name": "Isabella Dela Cruz", "seat": "B03"},
    {"candidate_id": "ST-104", "full_name": "Gabriela Silang II", "seat": "B04"},
    {"candidate_id": "ST-105", "full_name": "Miguel De Guzman", "seat": "B05"},
]


class Command(BaseCommand):
    help = (
        "Creates/updates ExamPermit rows whose candidate_id and qr_token match the "
        "hardcoded mock roster in ProctorAttendance.tsx's getInitialStudentPCs, so "
        "VITE_AUTH_SERVICE_MODE=backend scans against the already-published QR test "
        "codes (SAMPLE_QR_ST-001, etc.) resolve to real permits -- giving every student "
        "in the mock roster their own real, scannable QR code."
    )

    def handle(self, *args, **options):
        for entry in PREVIEW_CANDIDATES:
            qr_token = f"SAMPLE_QR_{entry['candidate_id']}"
            permit, created = ExamPermit.objects.update_or_create(
                candidate_id=entry["candidate_id"],
                application=None,
                defaults={
                    "full_name": entry["full_name"],
                    "test_center": "University of the Philippines - Diliman",
                    "room": "Melchor Hall, Room 302" if entry["candidate_id"].startswith("ST-0") else "Benitez Hall, Room 101",
                    "seat": entry["seat"],
                    "status": ExamPermit.Status.ISSUED,
                    "expires_at": timezone.now() + timedelta(days=30),
                    "qr_token": qr_token,
                },
            )
            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{verb} permit {permit.candidate_id} | qr_token={permit.qr_token}"))
