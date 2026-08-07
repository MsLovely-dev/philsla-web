from datetime import date, time

from django.core.management.base import BaseCommand

from apps.applications.models import ExamSlot

SAMPLE_SLOTS = [
    {
        "date": date(2026, 6, 15),
        "start_time": time(8, 0),
        "end_time": time(11, 0),
        "test_center": "University of the Philippines Diliman",
        "room": "Benitez Hall R101",
        "total_slots": 50,
        "remaining_slots": 50,
    },
    {
        "date": date(2026, 5, 22),
        "start_time": time(9, 0),
        "end_time": time(12, 0),
        "test_center": "Ateneo de Manila University",
        "room": "SEC Lecture Hall 1",
        "total_slots": 40,
        "remaining_slots": 40,
    },
]


class Command(BaseCommand):
    help = "Creates sample ExamSlot rows for testing the student portal schedule-picker before a real slot-generation feature exists."

    def handle(self, *args, **options):
        for fields in SAMPLE_SLOTS:
            slot, created = ExamSlot.objects.get_or_create(
                room=fields["room"],
                date=fields["date"],
                start_time=fields["start_time"],
                defaults=fields,
            )
            label = "Created" if created else "Already exists"
            self.stdout.write(self.style.SUCCESS(f"{label}: {slot.room} on {slot.date} ({slot.remaining_slots}/{slot.total_slots} remaining)"))
