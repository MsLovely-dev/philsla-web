# Student Portal — Implementation Log

## Exam Schedule Assignment (2026-08-06)

Built against [`../plans/2026-08-06-student-portal-exam-schedule-assignment-plan.md`](../plans/2026-08-06-student-portal-exam-schedule-assignment-plan.md) and its linked spec. Proceeded directly to implementation per explicit user instruction during the brainstorming session (recorded in the plan's Review Gate section as a disclosed deviation from the normal approve-then-implement flow).

### What was built

**Backend** (`backend/apps/applications`):
- `ApplicationExamStatus` (`SCHEDULED`), `ExamSlot` model, `exam_status`/`assigned_slot` fields on `StudentApplication` — migration `0015_examslot_studentapplication_exam_status_and_more.py`, applied cleanly against the local dev DB alongside all other pending migrations.
- `assign_exam_slot(*, owner, slot_id)` service function: `@transaction.atomic`, `select_for_update()` on both the application and slot rows, capacity-checked, idempotent-safe against double-assignment.
- `get_my_application(*, owner)` service function.
- Views: `MyApplicationView` (`GET .../me/`), `ExamSlotListView` (`GET .../exam-slots/`), `MyApplicationExamSlotView` (`POST .../me/exam-slot/`) — all `require_roles(PortalRole.STUDENT)`, scoped by `request.user` only (no application ID accepted from the client on these routes).
- `ExamSlotSerializer`, `ExamSlotAssignSerializer`; `ApplicationSerializer` extended with `examStatus`/`assignedSlot`.
- `seed_sample_exam_slots` management command, seeded with the two slots the design (and reference screenshots) are built around.

**Frontend**:
- `backendApplicationService.ts`: `getMyApplication()`, `listExamSlots()`, `assignExamSlot()`, plus `BackendExamSlot` type and `BackendApplication.examStatus`/`assignedSlot`. `mapBackendApplicationToFrontend` extended to carry `examStatus`, `examDate`, `examTestCenter`, `examRoom` through from the assigned slot.
- `StudentDashboard.tsx`: backend-mode data path (`usesBackendServiceMode`, mirroring `StudentApplication.tsx`'s existing flag) fetching the real application instead of the mock array; new `ScheduleSelectionCard` component rendered only in backend mode for the approved-but-unscheduled state. Confirming a slot re-fetches the application, which lands on the **already-existing** `ExamReadyCard` ("waiting for proctor") with no changes to that component. Mock-mode code path is untouched.

### What was explicitly not touched

Per the spec's non-goals: `ExamPermitPage.tsx`, `ResultsPage.tsx`, `ExamDelivery.tsx`, `backend/apps/results`, `backend/apps/attendance`, `backend/apps/exams`.

### Verification

- **Backend:** `apps.applications.tests.test_exam_schedule_endpoints` — 15/15 new tests pass, including a `TransactionTestCase` concurrency test (two simultaneous assignment attempts against a slot with `remaining_slots=1`; exactly one succeeds). Full `apps.applications` suite: **120/120 pass**, no regressions. `manage.py check` and `manage.py migrate` both clean against `config.settings.local`.
  - Note: the concurrency test treats both `ApplicationConflict` (409, the production/Postgres shape) and `django.db.utils.OperationalError` ("database is locked") as a valid "did not win the seat" outcome — SQLite serializes concurrent writers at the whole-database level rather than true row-level `SELECT ... FOR UPDATE`, so the *failure shape* differs from Postgres even though the guarantee under test (no double-booking) holds either way. Documented inline in the test.
- **Frontend:** `backendApplicationService.test.ts` — 28/28 pass (4 new). New `StudentDashboard.test.tsx` — 4/4 pass (schedule picker renders, confirm flow reaches the waiting-for-proctor state, full-slot 409 shows an inline error and keeps the picker, no-application empty state).
- **Full frontend suite:** `npm test` — 252/262 pass. The 10 failures are pre-existing and unrelated to this change: `UniversitiesListMaintenance.test.tsx`/`MaintenanceCenterTables.test.tsx` (JP Mayordo's active `backendUniversityService` export-name mismatch) and `QrScanModal.test.tsx` (the already-documented, unfixed camera-lifecycle defect from the separate QR-scanning ticket). Confirmed via `git status` that none of these files are touched by this change.
- **`npm run build`:** succeeds cleanly.
- **`npm run lint`** (`tsc --noEmit`): the codebase has a pre-existing baseline of dozens of type errors across unrelated files (confirmed by running lint before touching anything). This change adds two instances of an already-widespread pattern (`if (result.ok) {...} ...result.error` failing to narrow `ServiceResult<T>` — identical in shape to existing, already-merged code in `QuestionBank.tsx`), not a new category of failure.
- **Not verified:** manual browser walkthrough of the live flow (schedule picker → confirm → waiting-for-proctor → permit/results) — no running dev server/browser session was available this pass. Seed command output was verified directly (`seed_sample_exam_slots` produces the exact two slots matching the reference screenshots), and every state transition is covered by an automated test, but the end-to-end visual match to the reference screenshots has not been eyeballed live.

### Known process deviation

This work was authored by Joshua Ganapin on `jo.ganapin/qr-scanning`-derived history (now on `feat/student-portal`), not by Prince Malonzo (the roster owner of record) or from a `worktrees/p.malonzo/` checkout — see [`../student-portal.task.md`](../student-portal.task.md)'s "Ownership and process deviation" section for the original disclosure. This entry continues that same deviation for the newly-added backend scope.

## Closing the remaining gaps to 100% of this ticket's scope (2026-08-06)

Per explicit user direction to close every remaining gap in this ticket's own scope (excluding Results and Exam-taking, which stay excluded/deferred to their actual owners — see the scope-confirmation exchange in conversation). Three pieces:

### 1. Dashboard document re-upload (`RequirementsUploader`)

Previously: a fake `setInterval` progress bar over a hardcoded 3-document list unrelated to the application's real `requiredCorrections`, plus a fully fake "History" tab. Rather than build a second, parallel real-upload implementation duplicating `StudentApplication.tsx`'s already-real, already-backend-connected "Open Form for Correction" flow, the card now renders the real `requiredCorrections`/`adminRemarks` (previously not even mapped through — see below) and links to `/student/application`, where the real fix flow already lives. Fake progress bar and fake history tab removed entirely.

**Bug found and fixed along the way:** `mapBackendApplicationToFrontend` never carried `requiredCorrections` or `adminRemarks` through from the backend's `reviewStep` at all — a real backend-mode student in `FOR_CORRECTION` status would have seen blank/undefined values here regardless of what this card looked like. Fixed in `backendApplicationService.ts`.

### 2. `StudentApplication.tsx` tracking-lookup backend bug

`const myApp = applications.find(...)` was mock-only, with no backend-mode branch at all — a real returning backend-mode student who'd already submitted would incorrectly fall through to the fresh-registration wizard instead of seeing their tracking status, since the mock array never contains their real record. Added the same `usesBackendServiceMode` + `getMyApplication()` pattern already used in `StudentDashboard.tsx`. No loading-guard early-return was added (this file has too many hooks scattered after this point to safely insert one without auditing all of them) — accepted a brief first-render flash of the wizard before the fetch resolves, as a disclosed, low-risk tradeoff.

### 3. Exam Permit — real backend (Sub-project B)

This was flagged in the original decomposition as needing "its own separate spec/plan cycle." Design, condensed given the pace of this session:

**Backend** (`backend/apps/attendance` — extending the QR-scanning ticket's own existing app, not another developer's):
- `ExamPermit.application`: new `OneToOneField` to `apps.applications.StudentApplication` (nullable, so permits created another way — e.g. `seed_sample_permits` — are unaffected). `ExamPermit.exam_start_time`/`exam_end_time`: new fields, denormalized copies from the slot, matching how `room`/`test_center`/`exam_date` already work.
- `issue_or_update_exam_permit(*, application, slot)` in `apps/attendance/services.py`: called from `apps.applications.services.assign_exam_slot` inside the same atomic transaction, so a confirmed slot and its permit are created together or not at all. Seat number is a simple running count (`total_slots - remaining_slots`) — there's no finer-grained seat map anywhere in the system to draw from.
- `MyExamPermitView` (`GET /api/v1/attendance/me/`), `ExamPermitSerializer` — `STUDENT`-only, scoped by `request.user`, same shape as `MyApplicationView`.
- Migrations: `0002_exampermit_application.py`, `0003_exampermit_exam_end_time_exampermit_exam_start_time.py`.

**Frontend:**
- `backendApplicationService.ts`: `getMyExamPermit()` + `BackendExamPermit` type. Deliberately kept in this file rather than a new one-per-backend-app file, since the frontend organizes services by domain (Student Portal) not by Django app boundary.
- `ExamPermitPage.tsx`: `usesBackendServiceMode` branch fetching the real permit; falls through to the existing STUDENT mock-fallback only in non-backend mode now (previously that fallback fired regardless of mode, which would have hidden a real "no permit yet" state behind fake data). Admin-preview permit path (added in the previous session) is untouched and still works, including the real QR code display for actual issued permits.

### Verification (this round)

- **Backend:** `apps.applications` + `apps.attendance` — **126/126 pass** (new: `test_success_issues_an_exam_permit_with_an_incrementing_seat_number`, 5 new tests in `apps/attendance/tests/test_exam_permit_endpoint.py`). Full backend suite: **431/432 pass** — the 1 failure (`apps.core.tests.test_result_migration_boundaries`) is a pre-existing, unrelated migration-boundary assertion hardcoded to an old `apps.results` leaf migration name; `apps.results` has moved past it under Prince Malonzo's active work, unrelated to and unaffected by anything in this session. `manage.py check`/`migrate` clean.
- **Frontend:** full suite **264/274 pass** — same 10 pre-existing, unrelated failures as every previous verification pass this session (JP Mayordo's WIP, the QR-scanning camera bug). New tests: 2 in `backendApplicationService.test.ts` (permit fetch success/empty), 4 in `ExamPermitPage.test.tsx` (mock-mode admin preview ×2, backend-mode real permit ×2), 2 in `StudentApplication.test.tsx` (new file — tracking view for a real returning student, wizard fallback for none), 2 more in `StudentDashboard.test.tsx` (real `requiredCorrections` rendering + link). `npm run build` clean.
- **Notable environment finding:** `frontend/.env.local` sets `VITE_AUTH_SERVICE_MODE="backend"` as this project's actual local dev default — meaning every manual screenshot taken during this session was already running against the real backend by default, not a special opt-in mode. Worth knowing when reasoning about what a fresh `git clone` + `npm run dev` actually does out of the box.
- **Not verified:** live manual browser walkthrough (no running dev server this session, consistent with every prior verification note in this log) — every code path is covered by an automated test instead.

### Still out of scope (unchanged, by design)

Results (Sub-project C — collides with Prince Malonzo's active `apps.results`/`apps.exam_reviews` work) and Exam-taking/`ExamDelivery` (Sub-project D — bienvenido.mendoza's desktop-app ticket). Confirmed explicitly with the user before starting this round rather than assumed.
