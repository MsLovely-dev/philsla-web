from django.core.management.base import BaseCommand
from django.db import transaction

from apps.schools.models import PhilippineRegion, School, SchoolClassification


# Real Philippine institutions across a spread of regions. Examinee capacity
# values are representative testing-venue capacities, not enrolment figures.
SEED_SCHOOLS = (
    ("Philippine Science High School - Main Campus", SchoolClassification.PUBLIC, 1200, PhilippineRegion.NCR),
    ("Manila Science High School", SchoolClassification.PUBLIC, 900, PhilippineRegion.NCR),
    ("University of the Philippines Diliman", SchoolClassification.PUBLIC, 2500, PhilippineRegion.NCR),
    ("Ateneo de Manila University", SchoolClassification.PRIVATE, 1800, PhilippineRegion.NCR),
    ("De La Salle University - Manila", SchoolClassification.PRIVATE, 1600, PhilippineRegion.NCR),
    ("University of Santo Tomas", SchoolClassification.PRIVATE, 2000, PhilippineRegion.NCR),
    ("Baguio City National High School", SchoolClassification.PUBLIC, 1000, PhilippineRegion.CAR),
    ("Saint Louis University", SchoolClassification.PRIVATE, 1400, PhilippineRegion.CAR),
    ("University of the Philippines Los Banos", SchoolClassification.PUBLIC, 1500, PhilippineRegion.REGION_IV_A),
    ("Ateneo de Naga University", SchoolClassification.PRIVATE, 800, PhilippineRegion.REGION_V),
    ("West Visayas State University", SchoolClassification.PUBLIC, 1300, PhilippineRegion.REGION_VI),
    ("University of San Carlos", SchoolClassification.PRIVATE, 1500, PhilippineRegion.REGION_VII),
    ("Philippine Science High School - Central Visayas Campus", SchoolClassification.PUBLIC, 700, PhilippineRegion.REGION_VII),
    ("Mindanao State University - Iligan Institute of Technology", SchoolClassification.PUBLIC, 1200, PhilippineRegion.REGION_X),
    ("Ateneo de Davao University", SchoolClassification.PRIVATE, 1100, PhilippineRegion.REGION_XI),
)


class Command(BaseCommand):
    help = "Seed the List of Schools maintenance table with real Philippine institutions (idempotent by school name)."

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        created = 0
        for name, classification, capacity, region in SEED_SCHOOLS:
            _, was_created = School.objects.get_or_create(
                name=name,
                defaults={
                    "classification": classification,
                    "examinee_capacity": capacity,
                    "region": region,
                },
            )
            if was_created:
                created += 1

        skipped = len(SEED_SCHOOLS) - created
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded List of Schools: {created} created, {skipped} already present "
                f"({School.objects.count()} total)."
            )
        )
