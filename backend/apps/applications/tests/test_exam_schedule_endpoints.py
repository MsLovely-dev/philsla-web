import threading
from datetime import date, time
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.db import connections
from django.db.utils import OperationalError
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationExamStatus, ApplicationStatus, ExamSlot, StudentApplication
from apps.applications.services import ApplicationConflict, assign_exam_slot
from apps.attendance.models import ExamPermit


def principal(user, role=PortalRole.STUDENT.value):
    return SimpleNamespace(
        id=user.id,
        user_id=user.id,
        role=role,
        is_authenticated=True,
        is_active=True,
    )


def make_slot(**overrides):
    fields = {
        "date": date(2026, 6, 15),
        "start_time": time(8, 0),
        "end_time": time(11, 0),
        "test_center": "University of the Philippines Diliman",
        "room": "Benitez Hall R101",
        "total_slots": 50,
        "remaining_slots": 50,
    }
    fields.update(overrides)
    return ExamSlot.objects.create(**fields)


class ExamSlotModelTests(TestCase):
    def test_slot_defaults_and_application_fields_default_unscheduled(self):
        slot = make_slot()
        self.assertEqual(slot.remaining_slots, slot.total_slots)

        User = get_user_model()
        user = User.objects.create_user(username="student", email="student@example.test")
        application = StudentApplication.objects.create(owner=user, status=ApplicationStatus.APPROVED)

        self.assertEqual(application.exam_status, "")
        self.assertIsNone(application.assigned_slot)


class MyApplicationViewTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="student", email="student@example.test")
        self.other_user = User.objects.create_user(username="other", email="other@example.test")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user))

    def test_returns_own_non_draft_application(self):
        StudentApplication.objects.create(owner=self.user, status=ApplicationStatus.DRAFT, exam_cycle_id="draft-cycle")
        approved = StudentApplication.objects.create(owner=self.user, status=ApplicationStatus.APPROVED)

        response = self.client.get(reverse("applications:mine"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(approved.id))

    def test_returns_null_when_no_application(self):
        response = self.client.get(reverse("applications:mine"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)

    def test_never_returns_another_users_application(self):
        StudentApplication.objects.create(owner=self.other_user, status=ApplicationStatus.APPROVED)

        response = self.client.get(reverse("applications:mine"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)

    def test_unauthenticated_denied(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("applications:mine"))

        self.assertEqual(response.status_code, 401)

    def test_wrong_role_denied(self):
        self.client.force_authenticate(user=principal(self.user, PortalRole.ADMISSIONS_REVIEWER.value))

        response = self.client.get(reverse("applications:mine"))

        self.assertEqual(response.status_code, 403)


class ExamSlotListViewTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="student", email="student@example.test")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user))

    def test_only_slots_with_capacity_are_listed(self):
        open_slot = make_slot(room="Benitez Hall R101")
        full_slot = make_slot(room="Full Room", remaining_slots=0)

        response = self.client.get(reverse("applications:exam-slots"))

        self.assertEqual(response.status_code, 200)
        returned_ids = {row["id"] for row in response.data}
        self.assertIn(str(open_slot.id), returned_ids)
        self.assertNotIn(str(full_slot.id), returned_ids)


class AssignExamSlotViewTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="student", email="student@example.test")
        self.client = APIClient()
        self.client.force_authenticate(user=principal(self.user))

    def test_success_flips_exam_status_and_decrements_capacity(self):
        StudentApplication.objects.create(owner=self.user, status=ApplicationStatus.APPROVED)
        slot = make_slot(remaining_slots=5, total_slots=5)

        response = self.client.post(
            reverse("applications:mine-exam-slot"), {"slotId": str(slot.id)}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["examStatus"], ApplicationExamStatus.SCHEDULED)
        self.assertEqual(response.data["assignedSlot"]["id"], str(slot.id))
        slot.refresh_from_db()
        self.assertEqual(slot.remaining_slots, 4)

    def test_success_issues_an_exam_permit_with_an_incrementing_seat_number(self):
        first_application = StudentApplication(owner=self.user, status=ApplicationStatus.APPROVED)
        first_application.personal = {"firstName": "Jan", "lastName": "Delacruz", "email": "jan@example.test"}
        first_application.save()
        slot = make_slot(remaining_slots=5, total_slots=5)

        self.client.post(reverse("applications:mine-exam-slot"), {"slotId": str(slot.id)}, format="json")

        permit = ExamPermit.objects.get(application=first_application)
        self.assertEqual(permit.full_name, "Jan Delacruz")
        self.assertEqual(permit.email, "jan@example.test")
        self.assertEqual(permit.room, slot.room)
        self.assertEqual(permit.test_center, slot.test_center)
        self.assertEqual(permit.exam_date, slot.date)
        self.assertEqual(permit.seat, "1")
        self.assertEqual(permit.status, ExamPermit.Status.ISSUED)

        User = get_user_model()
        second_user = User.objects.create_user(username="second-student", email="second@example.test")
        second_application = StudentApplication.objects.create(owner=second_user, status=ApplicationStatus.APPROVED)
        second_client = APIClient()
        second_client.force_authenticate(user=principal(second_user))
        second_client.post(reverse("applications:mine-exam-slot"), {"slotId": str(slot.id)}, format="json")

        second_permit = ExamPermit.objects.get(application=second_application)
        self.assertEqual(second_permit.seat, "2")

    def test_conflict_when_slot_full(self):
        StudentApplication.objects.create(owner=self.user, status=ApplicationStatus.APPROVED)
        slot = make_slot(remaining_slots=0)

        response = self.client.post(
            reverse("applications:mine-exam-slot"), {"slotId": str(slot.id)}, format="json"
        )

        self.assertEqual(response.status_code, 409)

    def test_conflict_when_already_scheduled(self):
        first_slot = make_slot(room="Room A")
        application = StudentApplication.objects.create(
            owner=self.user, status=ApplicationStatus.APPROVED, assigned_slot=first_slot,
            exam_status=ApplicationExamStatus.SCHEDULED,
        )
        second_slot = make_slot(room="Room B")

        response = self.client.post(
            reverse("applications:mine-exam-slot"), {"slotId": str(second_slot.id)}, format="json"
        )

        self.assertEqual(response.status_code, 409)

    def test_conflict_when_application_not_approved(self):
        StudentApplication.objects.create(owner=self.user, status=ApplicationStatus.SUBMITTED)
        slot = make_slot()

        response = self.client.post(
            reverse("applications:mine-exam-slot"), {"slotId": str(slot.id)}, format="json"
        )

        self.assertEqual(response.status_code, 409)

    def test_not_found_when_no_application(self):
        slot = make_slot()

        response = self.client.post(
            reverse("applications:mine-exam-slot"), {"slotId": str(slot.id)}, format="json"
        )

        self.assertEqual(response.status_code, 404)

    def test_not_found_when_slot_missing(self):
        StudentApplication.objects.create(owner=self.user, status=ApplicationStatus.APPROVED)

        response = self.client.post(
            reverse("applications:mine-exam-slot"),
            {"slotId": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_denied(self):
        slot = make_slot()
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("applications:mine-exam-slot"), {"slotId": str(slot.id)}, format="json"
        )

        self.assertEqual(response.status_code, 401)


class AssignExamSlotConcurrencyTests(TransactionTestCase):
    """Verifies select_for_update() actually prevents two concurrent requests
    from both winning the last seat -- a claim the design makes explicitly and
    which is easy to silently break in a future refactor (e.g. swapping the
    locked read-then-write for an unlocked F() update) without any single
    non-concurrent test catching it.
    """

    def test_two_concurrent_assignments_for_the_last_seat_only_one_succeeds(self):
        User = get_user_model()
        first_user = User.objects.create_user(username="first", email="first@example.test")
        second_user = User.objects.create_user(username="second", email="second@example.test")
        StudentApplication.objects.create(owner=first_user, status=ApplicationStatus.APPROVED)
        StudentApplication.objects.create(owner=second_user, status=ApplicationStatus.APPROVED)
        slot = make_slot(remaining_slots=1, total_slots=1)

        results = {}
        barrier = threading.Barrier(2)

        def attempt(user, key):
            barrier.wait(timeout=5)
            try:
                assign_exam_slot(owner=user, slot_id=slot.id)
                results[key] = "success"
            except ApplicationConflict:
                results[key] = "conflict"
            except OperationalError:
                # SQLite has no true row-level SELECT ... FOR UPDATE: it serializes
                # concurrent writers with a coarser whole-database lock instead, which
                # surfaces here as "database is locked" rather than our 409. That is a
                # stronger guarantee than what's under test (no double-booking), just a
                # different failure shape than production Postgres would give -- so it
                # counts as "did not win the seat," same as an explicit conflict.
                results[key] = "conflict"
            finally:
                connections.close_all()

        threads = [
            threading.Thread(target=attempt, args=(first_user, "first")),
            threading.Thread(target=attempt, args=(second_user, "second")),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=10)

        outcomes = list(results.values())
        self.assertEqual(outcomes.count("success"), 1, outcomes)
        self.assertEqual(outcomes.count("conflict"), 1, outcomes)
        slot.refresh_from_db()
        self.assertEqual(slot.remaining_slots, 0)
