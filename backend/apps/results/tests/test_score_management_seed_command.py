from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.results.models import CandidateScore, ExaminationSession
from apps.results.services import REGULAR_SESSION_ID


class ScoreManagementSeedCommandTests(TestCase):
    def test_seed_command_creates_deterministic_database_records(self):
        output = StringIO()

        call_command("seed_score_management", count=75, seed=2027, reset=True, stdout=output)

        self.assertTrue(ExaminationSession.objects.filter(id=REGULAR_SESSION_ID).exists())
        self.assertEqual(CandidateScore.objects.filter(session_id=REGULAR_SESSION_ID).count(), 75)
        self.assertIn("Seeded 75 score records", output.getvalue())
