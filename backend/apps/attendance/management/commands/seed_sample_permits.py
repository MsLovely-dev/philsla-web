from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.attendance.models import ExamPermit


class Command(BaseCommand):
    help = "Creates a few sample ExamPermit rows and prints their QR tokens, for testing the mobile scanner before the real permit-generation feature exists."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=3)

    def handle(self, *args, **options):
        count = options["count"]
        for i in range(1, count + 1):
            permit = ExamPermit.objects.create(
                candidate_id=f"PH-2026-TEST{i:03d}",
                full_name=f"Test Candidate {i}",
                email=f"test.candidate{i}@example.com",
                test_center="University of the Philippines - Diliman",
                room="Melchor Hall, Room 302",
                seat=f"{i}A",
                expires_at=timezone.now() + timedelta(hours=4),
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created permit {permit.candidate_id} | qr_token={permit.qr_token}"
                )
            )
        self.stdout.write(
            "\nEncode any qr_token above as a QR image (e.g. https://www.qr-code-generator.com/ "
            "or `qrencode` CLI) to test the scanner without building the full permit/email feature yet."
        )
