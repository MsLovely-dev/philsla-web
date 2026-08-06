from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import AccountProfile, AccountRoleAssignment
from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationStatus, StudentApplication
from apps.results.models import CandidateScore, ExaminationSession, ScoreReleaseNotification
from apps.results.services import REGULAR_SESSION_ID, process_score_session, release_score_session


class ScoreManagementSeedCommandTests(TestCase):
    def test_seed_command_creates_deterministic_database_records(self):
        output = StringIO()

        call_command("seed_score_management", count=75, seed=2027, reset=True, stdout=output)

        self.assertTrue(ExaminationSession.objects.filter(id=REGULAR_SESSION_ID).exists())
        self.assertEqual(CandidateScore.objects.filter(session_id=REGULAR_SESSION_ID).count(), 75)
        self.assertIn("Seeded 225 score records across 3 score batches", output.getvalue())

    def test_seed_command_creates_three_demo_batches(self):
        call_command("seed_score_management", count=5, seed=2027, reset=True, stdout=StringIO())

        session_ids = list(ExaminationSession.objects.order_by("id").values_list("id", flat=True))
        self.assertEqual(
            session_ids,
            ["SESSION-2027-REGULAR", "SESSION-2027-SPECIAL", "SESSION-2027-STEM"],
        )
        for session_id in session_ids:
            self.assertEqual(CandidateScore.objects.filter(session_id=session_id).count(), 5)

        self.assertEqual(CandidateScore.objects.values("id").distinct().count(), 15)
        self.assertEqual(CandidateScore.objects.values("candidate_id").distinct().count(), 15)
        self.assertEqual(CandidateScore.objects.values("lrn").distinct().count(), 15)

    def test_score_candidate_profile_seed_creates_linked_student_accounts(self):
        call_command("seed_score_management", count=5, seed=2027, reset=True, stdout=StringIO())

        output = StringIO()
        call_command("seed_score_candidate_profiles", count=5, seed=2027, reset=True, stdout=output)

        scores = CandidateScore.objects.order_by("candidate_id")
        self.assertEqual(scores.count(), 15)
        self.assertEqual(StudentApplication.objects.count(), 15)
        self.assertIn("Seeded 15 student application profile(s)", output.getvalue())

        for score in scores:
            application = StudentApplication.objects.get(lrn=score.lrn)
            self.assertIsNotNone(application.owner)
            self.assertEqual(application.owner.email, application.personal["email"])
            self.assertEqual(application.owner.account_profile.role, PortalRole.STUDENT.value)
            self.assertEqual(application.owner.account_profile.lrn, score.lrn)
            self.assertTrue(
                AccountRoleAssignment.objects.filter(
                    account_profile=application.owner.account_profile,
                    role=PortalRole.STUDENT.value,
                    permission_mode=AccountRoleAssignment.PermissionMode.INHERIT,
                ).exists(),
            )

        self.assertEqual(AccountProfile.objects.filter(role=PortalRole.STUDENT.value).count(), 15)

        second_output = StringIO()
        call_command("seed_score_candidate_profiles", count=5, seed=2027, reset=False, stdout=second_output)

        self.assertEqual(StudentApplication.objects.count(), 15)
        self.assertEqual(AccountProfile.objects.filter(role=PortalRole.STUDENT.value).count(), 15)
        self.assertIn("Seeded 0 student application profile(s)", second_output.getvalue())

    def test_score_seed_reset_removes_release_notifications_before_scores(self):
        call_command("seed_score_management", count=5, seed=2027, reset=True, stdout=StringIO())
        score = CandidateScore.objects.filter(session_id=REGULAR_SESSION_ID).order_by("candidate_id").first()
        self.assertIsNotNone(score)
        StudentApplication.objects.create(
            owner=None,
            lrn=score.lrn,
            status=ApplicationStatus.SUBMITTED,
            submitted_at=timezone.now(),
            personal={
                "firstName": "Juan",
                "lastName": "Dela Cruz",
                "email": "juan.delacruz@example.test",
            },
            school={"lrn": score.lrn},
        )
        process_score_session(session_id=REGULAR_SESSION_ID, processed_by="seed-test")
        release_score_session(session_id=REGULAR_SESSION_ID, released_by="seed-test")
        self.assertEqual(ScoreReleaseNotification.objects.count(), 1)

        call_command("seed_score_management", count=5, seed=2027, reset=True, stdout=StringIO())

        self.assertEqual(ScoreReleaseNotification.objects.count(), 0)
        self.assertEqual(CandidateScore.objects.filter(session_id=REGULAR_SESSION_ID).count(), 5)
