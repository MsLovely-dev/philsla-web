# Attendance Session Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the reviewed session-scoped attendance models, additive migration, schema safeguards, tests, admin protection, and downstream handoff documentation without changing the active attendance API.

**Architecture:** `apps.attendance` owns physical rooms, room sessions, proctor and candidate assignments, hashed permit credentials, current attendance state, and immutable attendance events. Physical `RoomSession` rows link to the existing overall `results.ExaminationSession`; candidate identity and actors remain foreign keys to `applications.StudentApplication` and the configured Django user model.

**Tech Stack:** Python 3.13, Django 5.2, Django ORM/migrations, Django test runner, SQLite test database, PostgreSQL-compatible constraints and indexes.

## Global Constraints

- Implement only Django models, migration, admin safeguards, model/migration tests, and documentation.
- Do not change serializers, views, URLs, services, frontend code, or the active `/api/v1/attendance/scan/` behavior.
- Do not drop, rename, rewrite, or backfill `ExamPermit` or `AttendanceRecord` data.
- Store only a SHA-256 digest in `PermitCredential`; never add a raw token field to the new schema.
- Store session timestamps as timezone-aware datetimes under the existing `USE_TZ=True` configuration.
- Keep the migration additive and reversible; do not apply it to staging or production.
- Preserve future PWA idempotency metadata without implementing service workers, offline queues, device provisioning, or batch endpoints.
- Use synthetic identifiers and data in every test.
- Do not add dependencies.

---

## File map

- Modify `backend/apps/attendance/models.py`: retain the two legacy models and add all seven reviewed schema models, choices, constraints, indexes, and append-only guards.
- Create `backend/apps/attendance/migrations/0002_session_attendance_schema.py`: generated additive schema migration depending on the current attendance, applications, results, and user-model migration leaves.
- Create `backend/apps/attendance/tests/__init__.py`: make attendance tests a package.
- Create `backend/apps/attendance/tests/test_models.py`: relational, default, check, uniqueness, and index behavior.
- Create `backend/apps/attendance/tests/test_migrations.py`: forward/reverse migration preservation of legacy rows.
- Create `backend/apps/attendance/tests/test_admin.py`: immutable-event model and admin protections.
- Modify `backend/apps/attendance/admin.py`: register new operational models and expose `AttendanceEvent` read-only.
- Modify `docs/superpowers/b.mendoza/specs/2026-08-06-attendance-schema-design.md`: record the generated migration name and observed verification outcome.
- Create `docs/superpowers/b.mendoza/implement/b.mendoza.implement.md`: record implementation, exact commands/results, rollout, rollback, and known limitations.
- Create `docs/superpowers/b.mendoza/plans/2026-08-06-attendance-api-handoff.md`: hand off API/service/web integration work to another developer.

---

### Task 1: Implement the complete additive attendance schema

**Files:**

- Modify: `backend/apps/attendance/models.py`
- Create: `backend/apps/attendance/migrations/0002_session_attendance_schema.py`
- Create: `backend/apps/attendance/tests/__init__.py`
- Create: `backend/apps/attendance/tests/test_models.py`

**Interfaces:**

- Consumes: `applications.StudentApplication`, `results.ExaminationSession`, `settings.AUTH_USER_MODEL`.
- Produces: `ExamRoom`, `RoomSession`, `RoomSessionProctorAssignment`, `CandidateSessionAssignment`, `PermitCredential`, `AttendanceState`, `AttendanceEvent`, plus their nested choice enums.

- [ ] **Step 1: Create the attendance test package and write failing schema tests**

Create `backend/apps/attendance/tests/__init__.py` as an empty file. Create `test_models.py` with synthetic fixtures and focused cases using this structure:

```python
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from apps.applications.models import ApplicationStatus, StudentApplication
from apps.attendance.models import (
    AttendanceEvent,
    AttendanceState,
    CandidateSessionAssignment,
    ExamRoom,
    PermitCredential,
    RoomSession,
    RoomSessionProctorAssignment,
)
from apps.results.models import ExaminationSession


class AttendanceSchemaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="synthetic-proctor",
            email="proctor@example.test",
            password="Test-only-123!",
        )
        cls.candidate = StudentApplication.objects.create(
            candidate_id="PHL-2026-ATT001",
            exam_cycle_id="2026",
            status=ApplicationStatus.APPROVED,
        )
        cls.exam_session = ExaminationSession.objects.create(
            id="SESSION-ATTENDANCE-2026",
            name="Synthetic attendance session",
        )
        cls.room = ExamRoom.objects.create(
            test_center="Synthetic Test Center",
            code="ROOM-A",
            name="Room A",
        )
        cls.starts_at = timezone.now() + timedelta(days=1)
        cls.room_session = RoomSession.objects.create(
            examination_session=cls.exam_session,
            room=cls.room,
            starts_at=cls.starts_at,
            late_after_at=cls.starts_at + timedelta(minutes=15),
            ends_at=cls.starts_at + timedelta(hours=2),
        )

    def create_assignment(self, *, seat_label="A-01"):
        return CandidateSessionAssignment.objects.create(
            candidate=self.candidate,
            room_session=self.room_session,
            seat_label=seat_label,
        )
```

Add explicit tests that assert:

```python
def test_room_session_rejects_invalid_time_order(self):
    with self.assertRaises(IntegrityError), transaction.atomic():
        RoomSession.objects.create(
            examination_session=self.exam_session,
            room=self.room,
            starts_at=self.starts_at,
            late_after_at=self.starts_at - timedelta(seconds=1),
            ends_at=self.starts_at + timedelta(hours=2),
        )

def test_active_candidate_assignment_is_unique_per_room_session(self):
    self.create_assignment()
    with self.assertRaises(IntegrityError), transaction.atomic():
        self.create_assignment(seat_label="A-02")

def test_active_seat_is_unique_case_insensitively(self):
    self.create_assignment(seat_label="Seat-1")
    other = StudentApplication.objects.create(
        candidate_id="PHL-2026-ATT002",
        exam_cycle_id="2026",
        status=ApplicationStatus.APPROVED,
    )
    with self.assertRaises(IntegrityError), transaction.atomic():
        CandidateSessionAssignment.objects.create(
            candidate=other,
            room_session=self.room_session,
            seat_label="seat-1",
        )

def test_whitespace_only_seat_is_rejected(self):
    with self.assertRaises(IntegrityError), transaction.atomic():
        self.create_assignment(seat_label="   ")

def test_revoked_proctor_assignment_can_be_reassigned(self):
    old = RoomSessionProctorAssignment.objects.create(
        room_session=self.room_session,
        proctor=self.user,
        revoked_at=timezone.now(),
    )
    replacement = RoomSessionProctorAssignment.objects.create(
        room_session=self.room_session,
        proctor=self.user,
    )
    self.assertNotEqual(old.pk, replacement.pk)

def test_only_one_active_permit_credential_is_allowed(self):
    assignment = self.create_assignment()
    PermitCredential.objects.create(assignment=assignment, token_digest="a" * 64)
    with self.assertRaises(IntegrityError), transaction.atomic():
        PermitCredential.objects.create(assignment=assignment, token_digest="b" * 64)

def test_attendance_state_defaults_to_unmarked_version_zero(self):
    assignment = self.create_assignment()
    state = AttendanceState.objects.create(
        assignment=assignment,
        room_session=self.room_session,
    )
    self.assertEqual(state.status, AttendanceState.Status.UNMARKED)
    self.assertEqual(state.version, 0)
    self.assertIsNone(state.recorded_at)
    self.assertEqual(state.source, "")

def test_client_event_is_idempotent_per_client_instance(self):
    assignment = self.create_assignment()
    client_event_id = "10000000-0000-0000-0000-000000000001"
    AttendanceEvent.objects.create(
        assignment=assignment,
        requested_status=AttendanceState.Status.PRESENT,
        resulting_status=AttendanceState.Status.PRESENT,
        event_type=AttendanceEvent.EventType.MANUAL,
        source=AttendanceState.Source.MANUAL,
        outcome=AttendanceEvent.Outcome.ACCEPTED,
        client_instance_id="web-client-1",
        client_event_id=client_event_id,
        resulting_version=1,
    )
    with self.assertRaises(IntegrityError), transaction.atomic():
        AttendanceEvent.objects.create(
            assignment=assignment,
            requested_status=AttendanceState.Status.PRESENT,
            resulting_status=AttendanceState.Status.PRESENT,
            event_type=AttendanceEvent.EventType.MANUAL,
            source=AttendanceState.Source.MANUAL,
            outcome=AttendanceEvent.Outcome.ACCEPTED,
            client_instance_id="web-client-1",
            client_event_id=client_event_id,
            resulting_version=1,
        )
```

Also assert the declared indexes include `("room_session", "seat_label")`, `("room_session", "status")`, and `("assignment", "server_received_at")`, and that `PermitCredential` exposes no field whose name stores a raw token.

- [ ] **Step 2: Run the focused tests and verify the red state**

Run from `backend/`:

```powershell
python manage.py test apps.attendance.tests.test_models --settings=config.settings.test
```

Expected: import failure because the seven new model names do not exist.

- [ ] **Step 3: Add the seven models and exact choices**

Append the models to `models.py` without changing the two legacy models. Add imports for `uuid`, `ValidationError`, `F`, `Q`, and `Lower`. Use UUID primary keys for all new aggregate/event records except `AttendanceState`, whose one-to-one assignment is its primary key.

Use these choices and field contracts:

```python
class AttendanceStatus(models.TextChoices):
    UNMARKED = "UNMARKED", "Unmarked"
    PRESENT = "PRESENT", "Present"
    LATE = "LATE", "Late"
    ABSENT = "ABSENT", "Absent"


class AttendanceSource(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    QR_SCAN = "QR_SCAN", "QR scan"
    SYNC = "SYNC", "Sync"
```

Implement the model fields exactly as follows:

```python
class ExamRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_center = models.CharField(max_length=255)
    code = models.CharField(max_length=100)
    name = models.CharField(max_length=160)
    location = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class RoomSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    examination_session = models.ForeignKey(
        "results.ExaminationSession", on_delete=models.PROTECT, related_name="room_sessions"
    )
    room = models.ForeignKey(ExamRoom, on_delete=models.PROTECT, related_name="sessions")
    starts_at = models.DateTimeField()
    late_after_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class RoomSessionProctorAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_session = models.ForeignKey(RoomSession, on_delete=models.PROTECT, related_name="proctor_assignments")
    proctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="attendance_room_assignments")
    assigned_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)


class CandidateSessionAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        "applications.StudentApplication", on_delete=models.PROTECT, related_name="attendance_session_assignments"
    )
    room_session = models.ForeignKey(RoomSession, on_delete=models.PROTECT, related_name="candidate_assignments")
    seat_label = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PermitCredential(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(CandidateSessionAssignment, on_delete=models.PROTECT, related_name="permit_credentials")
    token_digest = models.CharField(max_length=64, unique=True, editable=False)
    is_active = models.BooleanField(default=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)


class AttendanceState(models.Model):
    Status = AttendanceStatus
    Source = AttendanceSource
    assignment = models.OneToOneField(
        CandidateSessionAssignment, primary_key=True, on_delete=models.PROTECT, related_name="attendance_state"
    )
    room_session = models.ForeignKey(RoomSession, on_delete=models.PROTECT, related_name="attendance_states")
    status = models.CharField(max_length=16, choices=AttendanceStatus.choices, default=AttendanceStatus.UNMARKED)
    recorded_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=16, choices=AttendanceSource.choices, blank=True, default="")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="recorded_attendance_states"
    )
    last_client_instance_id = models.CharField(max_length=128, blank=True, default="")
    last_client_event_id = models.UUIDField(null=True, blank=True)
    version = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class AttendanceEvent(models.Model):
    class EventType(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        QR_SCAN = "QR_SCAN", "QR scan"
        SYNC = "SYNC", "Sync"
        CORRECTION = "CORRECTION", "Correction"

    class Outcome(models.TextChoices):
        ACCEPTED = "ACCEPTED", "Accepted"
        CONFLICT = "CONFLICT", "Conflict"
        SESSION_CLOSED = "SESSION_CLOSED", "Session closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(CandidateSessionAssignment, on_delete=models.PROTECT, related_name="attendance_events")
    requested_status = models.CharField(max_length=16, choices=AttendanceStatus.choices)
    previous_status = models.CharField(max_length=16, choices=AttendanceStatus.choices, blank=True, default="")
    resulting_status = models.CharField(max_length=16, choices=AttendanceStatus.choices, blank=True, default="")
    event_type = models.CharField(max_length=16, choices=EventType.choices)
    source = models.CharField(max_length=16, choices=AttendanceSource.choices)
    outcome = models.CharField(max_length=20, choices=Outcome.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="attendance_events"
    )
    client_instance_id = models.CharField(max_length=128, blank=True, default="")
    client_event_id = models.UUIDField(null=True, blank=True)
    sync_batch_id = models.UUIDField(null=True, blank=True)
    client_recorded_at = models.DateTimeField(null=True, blank=True)
    server_received_at = models.DateTimeField(auto_now_add=True)
    correction_reason = models.CharField(max_length=240, blank=True, default="")
    resulting_version = models.PositiveBigIntegerField()
```

Add `Meta.constraints` and `Meta.indexes` matching the approved spec:

```python
# ExamRoom.Meta
models.UniqueConstraint(Lower("test_center"), Lower("code"), name="attendance_unique_room_code_per_center")

# RoomSession.Meta
models.CheckConstraint(condition=Q(starts_at__lt=F("ends_at")), name="attendance_room_session_start_before_end")
models.CheckConstraint(condition=Q(late_after_at__gte=F("starts_at")), name="attendance_room_session_late_after_start")
models.CheckConstraint(condition=Q(late_after_at__lte=F("ends_at")), name="attendance_room_session_late_before_end")

# RoomSessionProctorAssignment.Meta
models.UniqueConstraint(fields=("room_session", "proctor"), condition=Q(revoked_at__isnull=True), name="attendance_unique_active_room_proctor")

# CandidateSessionAssignment.Meta
models.UniqueConstraint(fields=("candidate", "room_session"), condition=Q(is_active=True), name="attendance_unique_active_candidate_session")
models.UniqueConstraint(Lower("seat_label"), "room_session", condition=Q(is_active=True), name="attendance_unique_active_room_seat_ci")
models.CheckConstraint(condition=Q(seat_label__regex=r".*\S.*"), name="attendance_seat_label_nonblank")
models.CheckConstraint(condition=Q(is_active=False) | Q(revoked_at__isnull=True), name="attendance_assignment_active_not_revoked")

# PermitCredential.Meta
models.UniqueConstraint(fields=("assignment",), condition=Q(is_active=True), name="attendance_unique_active_permit")
models.CheckConstraint(condition=Q(is_active=False) | Q(revoked_at__isnull=True), name="attendance_permit_active_not_revoked")

# AttendanceState.Meta
models.CheckConstraint(condition=Q(version__gte=0), name="attendance_state_version_nonnegative")

# AttendanceEvent.Meta
models.UniqueConstraint(
    fields=("client_instance_id", "client_event_id"),
    condition=Q(client_instance_id__gt="", client_event_id__isnull=False),
    name="attendance_unique_client_event",
)
models.CheckConstraint(condition=Q(resulting_version__gte=0), name="attendance_event_version_nonnegative")
```

Add indexes with explicit names:

```python
# CandidateSessionAssignment.Meta
models.Index(fields=("room_session", "seat_label"), name="attendance_roster_seat_idx")

# AttendanceState.Meta
models.Index(fields=("room_session", "status"), name="attendance_current_status_idx")

# AttendanceEvent.Meta
models.Index(fields=("assignment", "server_received_at"), name="attendance_event_history_idx")
```

- [ ] **Step 4: Generate the named additive migration**

Run from `backend/`:

```powershell
python manage.py makemigrations attendance --name session_attendance_schema --settings=config.settings.local
```

Expected: creates `apps/attendance/migrations/0002_session_attendance_schema.py`. Inspect it and confirm it depends on:

```python
("attendance", "0001_initial")
("applications", "0014_bulk_upload_application_metadata")
("results", "0007_scorereleasenotification")
migrations.swappable_dependency(settings.AUTH_USER_MODEL)
```

Confirm operations only create the seven new models, constraints, and indexes. Reject any generated removal, rename, or alteration of `ExamPermit` or `AttendanceRecord`.

- [ ] **Step 5: Run the focused schema tests**

```powershell
python manage.py test apps.attendance.tests.test_models --settings=config.settings.test
python manage.py makemigrations --check --dry-run --settings=config.settings.local
```

Expected: tests pass and Django reports `No changes detected`.

- [ ] **Step 6: Commit the schema unit**

```powershell
git add backend/apps/attendance/models.py backend/apps/attendance/migrations/0002_session_attendance_schema.py backend/apps/attendance/tests/__init__.py backend/apps/attendance/tests/test_models.py
git commit -m "feat: add session attendance schema"
```

---

### Task 2: Enforce append-only event behavior and admin protection

**Files:**

- Modify: `backend/apps/attendance/models.py`
- Modify: `backend/apps/attendance/admin.py`
- Create: `backend/apps/attendance/tests/test_admin.py`

**Interfaces:**

- Consumes: `AttendanceEvent` from Task 1.
- Produces: instance-level immutable `AttendanceEvent` behavior and a read-only `AttendanceEventAdmin`.

- [ ] **Step 1: Write failing immutability and admin tests**

Create a synthetic event through the Task 1 model fixtures, then assert:

```python
event.correction_reason = "Changed after insert"
with self.assertRaisesMessage(ValidationError, "Attendance events are append-only."):
    event.save()

with self.assertRaisesMessage(ValidationError, "Attendance events are append-only."):
    event.delete()

model_admin = AttendanceEventAdmin(AttendanceEvent, AdminSite())
self.assertFalse(model_admin.has_add_permission(request))
self.assertFalse(model_admin.has_change_permission(request, event))
self.assertFalse(model_admin.has_delete_permission(request, event))
```

Also assert `get_readonly_fields()` returns every concrete field name.

- [ ] **Step 2: Run the focused tests and verify failure**

```powershell
python manage.py test apps.attendance.tests.test_admin --settings=config.settings.test
```

Expected: failures because event mutation/deletion and admin registration are not yet protected.

- [ ] **Step 3: Add model and admin safeguards**

Add to `AttendanceEvent`:

```python
def save(self, *args, **kwargs):
    if not self._state.adding:
        raise ValidationError("Attendance events are append-only.")
    return super().save(*args, **kwargs)

def delete(self, *args, **kwargs):
    raise ValidationError("Attendance events are append-only.")
```

Register the six operational models normally and define:

```python
@admin.register(AttendanceEvent)
class AttendanceEventAdmin(admin.ModelAdmin):
    list_display = ("assignment", "requested_status", "outcome", "actor", "server_received_at", "resulting_version")
    list_filter = ("event_type", "source", "outcome", "requested_status")
    search_fields = ("assignment__candidate__candidate_id", "client_instance_id", "client_event_id")
    ordering = ("-server_received_at",)

    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.concrete_fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
```

Preserve all legacy admin registrations and behavior unchanged.

- [ ] **Step 4: Run admin and model tests**

```powershell
python manage.py test apps.attendance.tests.test_admin apps.attendance.tests.test_models --settings=config.settings.test
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit the safeguard unit**

```powershell
git add backend/apps/attendance/models.py backend/apps/attendance/admin.py backend/apps/attendance/tests/test_admin.py
git commit -m "test: protect attendance audit events"
```

---

### Task 3: Prove migration reversibility and legacy-data preservation

**Files:**

- Create: `backend/apps/attendance/tests/test_migrations.py`

**Interfaces:**

- Consumes: `attendance.0001_initial` and `attendance.0002_session_attendance_schema`.
- Produces: executable proof that forward/reverse migration leaves legacy permit/scan rows unchanged.

- [ ] **Step 1: Write the migration boundary test**

Use `MigrationExecutor` in a `TransactionTestCase`. Migrate attendance back to `0001_initial`, create a synthetic auth user, legacy permit, and legacy attendance row through historical models, migrate forward to `0002_session_attendance_schema`, and assert:

```python
self.assertEqual(new_apps.get_model("attendance", "ExamPermit").objects.filter(pk=permit_id).count(), 1)
self.assertEqual(new_apps.get_model("attendance", "AttendanceRecord").objects.filter(pk=record_id).count(), 1)
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
```

Then migrate back to `0001_initial` and assert both legacy rows still exist. In `tearDown`, migrate back to the graph's current leaf nodes so this test cannot contaminate later tests.

- [ ] **Step 2: Run the migration test**

```powershell
python manage.py test apps.attendance.tests.test_migrations --settings=config.settings.test
```

Expected: the forward and reverse boundary passes without legacy row changes.

- [ ] **Step 3: Run migration and system checks**

```powershell
python manage.py migrate --plan --settings=config.settings.local
python manage.py check --settings=config.settings.local
python manage.py makemigrations --check --dry-run --settings=config.settings.local
```

Expected: the plan lists only `attendance.0002_session_attendance_schema`; the system check reports no issues; no model drift is detected. Do not run an unscoped `migrate` against staging or production.

- [ ] **Step 4: Commit migration verification**

```powershell
git add backend/apps/attendance/tests/test_migrations.py
git commit -m "test: verify attendance migration boundaries"
```

---

### Task 4: Verify the complete schema and write the downstream handoff

**Files:**

- Modify: `docs/superpowers/b.mendoza/specs/2026-08-06-attendance-schema-design.md`
- Create: `docs/superpowers/b.mendoza/implement/b.mendoza.implement.md`
- Create: `docs/superpowers/b.mendoza/plans/2026-08-06-attendance-api-handoff.md`

**Interfaces:**

- Consumes: the observed migration file, model interfaces, test results, and approved schema spec.
- Produces: factual implementation record and a separate executable plan for API/service/web work by another developer.

- [ ] **Step 1: Run complete backend verification**

From `backend/` run:

```powershell
python manage.py check --settings=config.settings.local
python manage.py test apps.attendance --settings=config.settings.test
python manage.py test --settings=config.settings.test
python manage.py makemigrations --check --dry-run --settings=config.settings.local
```

Inspect:

```powershell
git diff --check
git diff --stat HEAD
git status --short
```

Record exact pass/fail counts and disclose every skipped command or pre-existing failure.

- [ ] **Step 2: Update the spec and implementation log with observed facts**

Change the spec status to `Implemented — awaiting review`, record migration `attendance.0002_session_attendance_schema`, and list the exact verification results. In `b.mendoza.implement.md`, record:

- approved spec path;
- implemented model names;
- migration name and dependencies;
- legacy tables left unchanged;
- commands and observed results;
- rollout order and rollback warning;
- PostgreSQL verification status;
- API/frontend/PWA work explicitly not implemented.

- [ ] **Step 3: Write the downstream API handoff plan**

The handoff plan must define separate reviewed tasks for:

1. transactional candidate assignment plus initial `UNMARKED` state creation;
2. secure permit issuance, digest lookup, rotation, expiry, and revocation;
3. proctor-only roster reads with active room-session assignment checks;
4. manual and QR attendance commands using `select_for_update`, expected versions, UTC session gates, and append-only events;
5. idempotent retry behavior that returns the existing event without appending a duplicate;
6. machine-readable conflict and session-closed responses;
7. legacy `/attendance/scan/` retirement and raw-token disposal after explicit data assessment;
8. web `ProctorAttendance.tsx` integration through a typed frontend service;
9. a separately reviewed future PWA/offline batch extension that reuses the command service without trusting client clocks by default.

The handoff must not silently add or alter schema fields. Any required schema change must return for separate review.

- [ ] **Step 4: Commit documentation and handoff**

```powershell
git add docs/superpowers/b.mendoza/specs/2026-08-06-attendance-schema-design.md docs/superpowers/b.mendoza/implement/b.mendoza.implement.md docs/superpowers/b.mendoza/plans/2026-08-06-attendance-api-handoff.md
git commit -m "docs: hand off attendance API implementation"
```

---

## Final review gate

Before reporting completion, inspect the complete diff and confirm:

- exactly seven new schema models exist;
- the generated migration is additive and reversible;
- legacy models, data, service, serializer, view, and URL behavior remain unchanged;
- no raw token field exists in the new models;
- every approved constraint and index appears in both model state and migration state;
- no frontend, API, PWA, or dependency change entered the diff;
- exact test and check results are reported without extrapolation.
