from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.configuration.models import (
    CollegeCourse,
    DegreeType,
    RegistryStatus,
    University,
    UniversityClassification,
)


UNIVERSITIES = (
    ("UPD", "University of the Philippines Diliman", UniversityClassification.PUBLIC, "NCR - National Capital Region", "Quezon City", 1908),
    ("PUP", "Polytechnic University of the Philippines", UniversityClassification.PUBLIC, "NCR - National Capital Region", "Manila", 1904),
    ("TUP", "Technological University of the Philippines", UniversityClassification.PUBLIC, "NCR - National Capital Region", "Manila", 1901),
    ("PNU", "Philippine Normal University", UniversityClassification.PUBLIC, "NCR - National Capital Region", "Manila", 1901),
    ("PLM", "Pamantasan ng Lungsod ng Maynila", UniversityClassification.PUBLIC, "NCR - National Capital Region", "Manila", 1965),
    ("ADMU", "Ateneo de Manila University", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Quezon City", 1859),
    ("DLSU", "De La Salle University", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Manila", 1911),
    ("UST", "University of Santo Tomas", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Manila", 1611),
    ("FEU", "Far Eastern University", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Manila", 1928),
    ("MU", "Mapua University", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Manila", 1925),
    ("AU", "Adamson University", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Manila", 1932),
    ("UE", "University of the East", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Manila", 1946),
    ("NU", "National University", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Manila", 1900),
    ("SBU", "San Beda University", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Manila", 1901),
    ("MC", "Miriam College", UniversityClassification.PRIVATE, "NCR - National Capital Region", "Quezon City", 1926),
)

COURSES = (
    ("College of Computing", "BSCS", "Bachelor of Science in Computer Science", DegreeType.BACHELOR_OF_SCIENCE, 4, 144, "85.00"),
    ("College of Computing", "BSIT", "Bachelor of Science in Information Technology", DegreeType.BACHELOR_OF_SCIENCE, 4, 144, "82.00"),
    ("College of Computing", "BSIS", "Bachelor of Science in Information Systems", DegreeType.BACHELOR_OF_SCIENCE, 4, 140, "80.00"),
    ("College of Engineering", "BSCE", "Bachelor of Science in Civil Engineering", DegreeType.BACHELOR_OF_SCIENCE, 4, 170, "85.00"),
    ("College of Engineering", "BSEE", "Bachelor of Science in Electrical Engineering", DegreeType.BACHELOR_OF_SCIENCE, 4, 170, "85.00"),
    ("College of Engineering", "BSME", "Bachelor of Science in Mechanical Engineering", DegreeType.BACHELOR_OF_SCIENCE, 4, 170, "85.00"),
    ("College of Engineering", "BSIE", "Bachelor of Science in Industrial Engineering", DegreeType.BACHELOR_OF_SCIENCE, 4, 165, "83.00"),
    ("College of Business", "BSA", "Bachelor of Science in Accountancy", DegreeType.BACHELOR_OF_SCIENCE, 4, 150, "85.00"),
    ("College of Business", "BSBA", "Bachelor of Science in Business Administration", DegreeType.BACHELOR_OF_SCIENCE, 4, 144, "80.00"),
    ("College of Health Sciences", "BSN", "Bachelor of Science in Nursing", DegreeType.BACHELOR_OF_SCIENCE, 4, 170, "88.00"),
    ("College of Science", "BSBIO", "Bachelor of Science in Biology", DegreeType.BACHELOR_OF_SCIENCE, 4, 145, "82.00"),
    ("College of Science", "BSCHEM", "Bachelor of Science in Chemistry", DegreeType.BACHELOR_OF_SCIENCE, 4, 150, "84.00"),
    ("College of Social Sciences", "BSPSY", "Bachelor of Science in Psychology", DegreeType.BACHELOR_OF_SCIENCE, 4, 145, "82.00"),
    ("College of Liberal Arts", "BACOMM", "Bachelor of Arts in Communication", DegreeType.BACHELOR_OF_ARTS, 4, 140, "78.00"),
    ("College of Liberal Arts", "BAPOLS", "Bachelor of Arts in Political Science", DegreeType.BACHELOR_OF_ARTS, 4, 140, "78.00"),
)


class Command(BaseCommand):
    help = "Seed 15 universities with 15 college courses each."

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        universities_created = 0
        universities_updated = 0
        courses_created = 0
        courses_updated = 0

        for code, name, classification, region, city, established_year in UNIVERSITIES:
            university, created = University.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "classification": classification,
                    "region": region,
                    "city": city,
                    "established_year": established_year,
                    "status": RegistryStatus.ACTIVE,
                },
            )
            universities_created += int(created)
            universities_updated += int(not created)

            for college_name, program_code, program_name, degree_type, duration_years, total_units, cutoff in COURSES:
                _, course_created = CollegeCourse.objects.update_or_create(
                    university=university,
                    program_code=program_code,
                    defaults={
                        "college_name": college_name,
                        "program_name": program_name,
                        "degree_type": degree_type,
                        "duration_years": duration_years,
                        "total_units": total_units,
                        "cutoff_percentile": Decimal(cutoff),
                        "status": RegistryStatus.ACTIVE,
                    },
                )
                courses_created += int(course_created)
                courses_updated += int(not course_created)

        self.stdout.write(
            self.style.SUCCESS(
                "University seed complete. "
                f"Universities created: {universities_created}, updated: {universities_updated}. "
                f"Courses created: {courses_created}, updated: {courses_updated}."
            )
        )
