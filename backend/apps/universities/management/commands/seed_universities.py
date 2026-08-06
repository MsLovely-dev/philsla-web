from django.core.management.base import BaseCommand
from django.db import transaction

from apps.universities.models import (
    CollegeCourse,
    PhilippineRegion,
    University,
    UniversityClassification,
)


# Real Philippine Higher Education Institutions with a representative spread of
# college courses. Established years and contact details are public, factual
# information. Idempotent by university name and by (university, program code).
SEED_UNIVERSITIES = (
    {
        "name": "University of the Philippines Diliman",
        "classification": UniversityClassification.PUBLIC,
        "region": PhilippineRegion.NCR,
        "city": "Quezon City",
        "president_rector": "Dr. Angelo A. Jimenez",
        "email": "info@up.edu.ph",
        "phone": "(02) 8981-8500",
        "established_year": 1908,
        "courses": (
            ("College of Engineering", "BSCS", "Bachelor of Science in Computer Science", "Bachelor of Science", "Software Engineering", 4, 158, 92.0),
            ("College of Science", "BSBIO", "Bachelor of Science in Biology", "Bachelor of Science", "General Biology", 4, 150, 88.0),
            ("College of Arts and Letters", "ABCOM", "Bachelor of Arts in Communication", "Bachelor of Arts", "Media Studies", 4, 144, 85.0),
        ),
    },
    {
        "name": "Ateneo de Manila University",
        "classification": UniversityClassification.PRIVATE,
        "region": PhilippineRegion.NCR,
        "city": "Quezon City",
        "president_rector": "Fr. Roberto C. Yap, SJ",
        "email": "info@ateneo.edu",
        "phone": "(02) 8426-6001",
        "established_year": 1859,
        "courses": (
            ("John Gokongwei School of Management", "BSMGT", "Bachelor of Science in Management", "Bachelor of Science", "Business Management", 4, 150, 90.0),
            ("School of Humanities", "ABPSY", "Bachelor of Arts in Psychology", "Bachelor of Arts", "General Psychology", 4, 144, 87.0),
        ),
    },
    {
        "name": "De La Salle University - Manila",
        "classification": UniversityClassification.PRIVATE,
        "region": PhilippineRegion.NCR,
        "city": "Manila",
        "president_rector": "Br. Bernard Oca, FSC",
        "email": "info@dlsu.edu.ph",
        "phone": "(02) 8524-4611",
        "established_year": 1911,
        "courses": (
            ("Gokongwei College of Engineering", "BSECE", "Bachelor of Science in Electronics Engineering", "Bachelor of Science", "Electronics", 5, 175, 89.0),
            ("College of Computer Studies", "BSIT", "Bachelor of Science in Information Technology", "Bachelor of Science", "Network Administration", 4, 155, 86.0),
        ),
    },
    {
        "name": "University of Santo Tomas",
        "classification": UniversityClassification.PRIVATE,
        "region": PhilippineRegion.NCR,
        "city": "Manila",
        "president_rector": "Fr. Richard Ang, OP",
        "email": "info@ust.edu.ph",
        "phone": "(02) 8406-1611",
        "established_year": 1611,
        "courses": (
            ("Faculty of Medicine and Surgery", "BSBIO", "Bachelor of Science in Biology", "Bachelor of Science", "Medical Biology", 4, 152, 88.0),
            ("College of Fine Arts and Design", "BFAAD", "Bachelor of Fine Arts in Advertising", "Bachelor of Fine Arts", "Advertising Arts", 4, 144, 82.0),
        ),
    },
    {
        "name": "Saint Louis University",
        "classification": UniversityClassification.PRIVATE,
        "region": PhilippineRegion.CAR,
        "city": "Baguio City",
        "president_rector": "Fr. Gilbert B. Sales, CICM",
        "email": "info@slu.edu.ph",
        "phone": "(074) 442-2793",
        "established_year": 1911,
        "courses": (
            ("School of Engineering and Architecture", "BSCE", "Bachelor of Science in Civil Engineering", "Bachelor of Science", "Structural Engineering", 5, 172, 84.0),
            ("School of Accountancy and Business Management", "BSA", "Bachelor of Science in Accountancy", "Bachelor of Science", "Public Accounting", 4, 160, 85.0),
        ),
    },
    {
        "name": "University of San Carlos",
        "classification": UniversityClassification.PRIVATE,
        "region": PhilippineRegion.REGION_VII,
        "city": "Cebu City",
        "president_rector": "Fr. Narciso A. Cellan Jr., SVD",
        "email": "info@usc.edu.ph",
        "phone": "(032) 230-0100",
        "established_year": 1595,
        "courses": (
            ("School of Arts and Sciences", "ABENG", "Bachelor of Arts in English Language Studies", "Bachelor of Arts", "Applied Linguistics", 4, 144, 80.0),
            ("School of Engineering", "BSME", "Bachelor of Science in Mechanical Engineering", "Bachelor of Science", "Mechatronics", 5, 170, 83.0),
        ),
    },
)


class Command(BaseCommand):
    help = (
        "Seed the List of Universities maintenance table with real Philippine HEIs "
        "and representative college courses (idempotent by university name and program code)."
    )

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        universities_created = 0
        courses_created = 0

        for entry in SEED_UNIVERSITIES:
            university, was_created = University.objects.get_or_create(
                name=entry["name"],
                defaults={
                    "classification": entry["classification"],
                    "region": entry["region"],
                    "city": entry["city"],
                    "president_rector": entry["president_rector"],
                    "email": entry["email"],
                    "phone": entry["phone"],
                    "established_year": entry["established_year"],
                },
            )
            if was_created:
                universities_created += 1

            for (
                college_name,
                program_code,
                program_name,
                degree_type,
                major_specialization,
                duration_years,
                total_units,
                cutoff_percentile,
            ) in entry["courses"]:
                _, course_created = CollegeCourse.objects.get_or_create(
                    university=university,
                    program_code=program_code,
                    defaults={
                        "college_name": college_name,
                        "program_name": program_name,
                        "degree_type": degree_type,
                        "major_specialization": major_specialization,
                        "duration_years": duration_years,
                        "total_units": total_units,
                        "cutoff_percentile": cutoff_percentile,
                    },
                )
                if course_created:
                    courses_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded List of Universities: {universities_created} universities and "
                f"{courses_created} college courses created "
                f"({University.objects.count()} universities, {CollegeCourse.objects.count()} courses total)."
            )
        )
