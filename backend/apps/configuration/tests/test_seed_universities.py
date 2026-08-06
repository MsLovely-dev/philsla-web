from io import StringIO

from django.core.management import call_command
from django.db.models import Count
from django.test import TestCase

from apps.configuration.management.commands.seed_universities import COURSES, UNIVERSITIES
from apps.configuration.models import CollegeCourse, University


class SeedUniversitiesCommandTests(TestCase):
    def test_command_seeds_expected_records_and_is_idempotent(self):
        call_command("seed_universities", stdout=StringIO())
        call_command("seed_universities", stdout=StringIO())

        seeded_codes = [university[0] for university in UNIVERSITIES]
        seeded_universities = University.objects.filter(code__in=seeded_codes)

        self.assertEqual(seeded_universities.count(), len(UNIVERSITIES))
        self.assertEqual(
            CollegeCourse.objects.filter(university__in=seeded_universities).count(),
            len(UNIVERSITIES) * len(COURSES),
        )
        self.assertFalse(
            seeded_universities.annotate(course_count=Count("college_courses")).filter(
                course_count__lt=15,
            ).exists()
        )
