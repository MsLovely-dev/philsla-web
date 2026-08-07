# B.Mendoza Attendance Schema Implementation Log

**Date:** 2026-08-06

**Branch:** `feat/attendance-schema`

**Approved design:** [`../specs/2026-08-06-attendance-schema-design.md`](../specs/2026-08-06-attendance-schema-design.md)

**Execution plan:** [`../plans/2026-08-06-attendance-schema-implementation.md`](../plans/2026-08-06-attendance-schema-implementation.md)

## Implemented

Added seven session-scoped models to `apps.attendance`:

- `ExamRoom`
- `RoomSession`
- `RoomSessionProctorAssignment`
- `CandidateSessionAssignment`
- `PermitCredential`
- `AttendanceState`
- `AttendanceEvent`

The implementation includes UTC-aware scheduling fields, configurable late cutoffs, active/revoked assignments, case-insensitive seat uniqueness, digest-only permit credentials, versioned current attendance, client-event idempotency, append-only event guards, required query indexes, and read-only event administration.

Generated additive migration `attendance.0002_session_attendance_schema` with dependencies on:

- `applications.0014_bulk_upload_application_metadata`
- `attendance.0001_initial`
- `results.0007_scorereleasenotification`
- the configured Django user model

The migration creates only the seven new tables, constraints, and indexes. It does not alter `ExamPermit` or `AttendanceRecord`.

## Legacy boundary

Legacy `ExamPermit`, `AttendanceRecord`, `/api/v1/attendance/scan/`, and their existing service/serializer/view behavior remain unchanged. The migration test proves that synthetic legacy permit and scan rows survive forward migration to `0002` and reverse migration to `0001`.

The local database still reports:

```text
attendance
 [X] 0001_initial
 [ ] 0002_session_attendance_schema
```

The new migration was not applied to the local developer database, staging, or production.

## Verification

Environment:

- Python `3.13.14`
- Django `5.2.3`
- `python -m pip check` — passed: no broken requirements

Commands and observed results:

```text
.venv\Scripts\python.exe manage.py check --settings=config.settings.local
PASS — System check identified no issues (0 silenced).

.venv\Scripts\python.exe manage.py test apps.attendance.tests.test_models --settings=config.settings.test
PASS — 20 tests in 0.784s.

.venv\Scripts\python.exe manage.py test apps.attendance.tests.test_admin apps.attendance.tests.test_models --settings=config.settings.test
PASS — 24 tests in 1.640s.

.venv\Scripts\python.exe manage.py test apps.attendance.tests.test_migrations --settings=config.settings.test
PASS — 1 test in 5.065s.

.venv\Scripts\python.exe manage.py test apps.attendance --settings=config.settings.test
PASS — 25 tests in 6.995s.

.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local
PASS — No changes detected.

.venv\Scripts\python.exe manage.py migrate --plan --settings=config.settings.local
PASS — planned only attendance.0002_session_attendance_schema.

.venv\Scripts\python.exe manage.py test --settings=config.settings.test
PARTIAL — 436 tests ran in 206.159s; 434 passed and 2 failed.
```

The two full-suite failures are outside this change:

- `apps.core.tests.test_result_app_boundaries.ResultAppBoundaryTests.test_score_management_and_exam_review_have_distinct_app_labels` expects the Results model inventory not to contain the already-implemented `ScoreReleaseNotification`.
- `apps.core.tests.test_result_migration_boundaries.ResultMigrationBoundaryTests.test_results_and_exam_reviews_have_independent_leaf_nodes` expects `results.0003` to be the leaf while the repository's current leaf is `results.0007_scorereleasenotification`.

The pre-change baseline full suite exceeded a 180-second observation window after hundreds of passing tests, so these late Results failures were not visible in the initial baseline run. Attendance-focused tests and system checks are green.

PostgreSQL-compatible behavior was designed using portable Django constraints and indexes, but no PostgreSQL test database was available. PostgreSQL execution is not claimed.

## Rollout

1. Review the model and migration diff.
2. Apply `attendance.0002_session_attendance_schema` through the deployment runbook's manual post-deploy migration step.
3. Deploy assignment, permit, and attendance services only after the separate API plan is approved.
4. Integrate the web attendance page after the backend contract is deployed.
5. Retire legacy raw-token persistence only after explicit production-data assessment.

## Rollback

Before downstream services write new rows, reverse to `attendance.0001_initial`. After new attendance rows exist, preserve/export those rows before reversing because reversal drops the seven new tables. Legacy permit and scan tables remain intact in either direction.

## Not implemented

- Assignment or permit issuance services
- Attendance API endpoints or authorization
- Frontend attendance integration
- PWA/offline behavior
- Legacy endpoint retirement or raw-token cleanup
- Candidate rescheduling
- Exam-start authorization
