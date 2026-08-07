from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class AttendanceMigrationBoundaryTests(TransactionTestCase):
    migrate_from = ("attendance", "0001_initial")
    migrate_to = ("attendance", "0002_session_attendance_schema")

    def attendance_target_with_other_leaves(self, attendance_target):
        executor = MigrationExecutor(connection)
        return [
            node
            for node in executor.loader.graph.leaf_nodes()
            if node[0] != "attendance"
        ] + [attendance_target]

    def migrate(self, attendance_target):
        executor = MigrationExecutor(connection)
        targets = self.attendance_target_with_other_leaves(attendance_target)
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        self.migrate(self.migrate_to)
        super().tearDown()

    def test_forward_and_reverse_preserve_legacy_attendance_rows(self):
        old_apps = self.migrate(self.migrate_from)
        User = old_apps.get_model("auth", "User")
        ExamPermit = old_apps.get_model("attendance", "ExamPermit")
        AttendanceRecord = old_apps.get_model("attendance", "AttendanceRecord")

        user = User.objects.create(
            username="synthetic-legacy-proctor",
            password="not-a-real-password",
        )
        permit = ExamPermit.objects.create(
            candidate_id="PHL-2026-LEG001",
            full_name="Synthetic Legacy Candidate",
            test_center="Synthetic Legacy Center",
            room="Legacy Room",
            seat="L-01",
            qr_token="synthetic-legacy-token",
        )
        record = AttendanceRecord.objects.create(
            permit_id=permit.pk,
            scanned_by_id=user.pk,
        )

        new_apps = self.migrate(self.migrate_to)
        self.assertEqual(
            new_apps.get_model("attendance", "ExamPermit")
            .objects.filter(pk=permit.pk, qr_token="synthetic-legacy-token")
            .count(),
            1,
        )
        self.assertEqual(
            new_apps.get_model("attendance", "AttendanceRecord")
            .objects.filter(pk=record.pk, permit_id=permit.pk)
            .count(),
            1,
        )
        for model_name in (
            "ExamRoom",
            "RoomSession",
            "RoomSessionProctorAssignment",
            "CandidateSessionAssignment",
            "PermitCredential",
            "AttendanceState",
            "AttendanceEvent",
        ):
            self.assertIsNotNone(new_apps.get_model("attendance", model_name))

        reversed_apps = self.migrate(self.migrate_from)
        self.assertEqual(
            reversed_apps.get_model("attendance", "ExamPermit")
            .objects.filter(pk=permit.pk, qr_token="synthetic-legacy-token")
            .count(),
            1,
        )
        self.assertEqual(
            reversed_apps.get_model("attendance", "AttendanceRecord")
            .objects.filter(pk=record.pk, permit_id=permit.pk)
            .count(),
            1,
        )
