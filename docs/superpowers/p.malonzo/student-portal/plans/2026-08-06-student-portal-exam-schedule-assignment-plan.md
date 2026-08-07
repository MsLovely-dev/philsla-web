# Student Portal — Exam Schedule Assignment — Phasing Plan

**Date:** 2026-08-06
**Spec:** [`../specs/2026-08-06-student-portal-exam-schedule-assignment-design.md`](../specs/2026-08-06-student-portal-exam-schedule-assignment-design.md)
**Status:** Approved (conversational) — proceeding directly per explicit user instruction to implement now.

## Recommendation

Build backend-out, test-first per phase, same discipline as Sub-project A's plan. The concurrency test in Phase 2 is the one non-negotiable check — it's the only thing standing between "capacity-safe" being a design claim versus a verified property.

## Explicitly out of scope for this plan

- Sub-projects B (`ExamPermitPage.tsx`), C (`ResultsPage.tsx`), D (`ExamDelivery.tsx`) — untouched, per the parent ticket's decomposition.
- Document re-upload wiring (Sub-project A's original Phase 4) — not part of what was requested this round (the schedule/dashboard/permit/results flow shown in the reference screenshots). Remains a separate, still-unstarted piece of Sub-project A if picked up later.
- Any change to `backend/apps/results`, `backend/apps/attendance`, or `backend/apps/exams`.

## Phase 0 — Preconditions (no code)

- [ ] Re-confirm no `exam_status`/schedule concept exists anywhere in `apps.applications` (already confirmed once during brainstorming; re-check immediately before touching models in case anything shifted).
- [ ] Confirm current migration head for `apps.applications` before adding a new one.

## Phase 1 — Backend models + migration

- [ ] Add `ApplicationExamStatus` (`SCHEDULED` only), `ExamSlot` model, and `exam_status`/`assigned_slot` fields on `StudentApplication` to `backend/apps/applications/models.py`.
- [ ] Write a model-level test: `ExamSlot` can be created with `remaining_slots <= total_slots`; `StudentApplication.exam_status` defaults to empty; `assigned_slot` defaults to `None`.
- [ ] Generate and review the migration (`python manage.py makemigrations applications`) — confirm it's additive only (no data migration needed, no existing rows affected beyond new nullable/blank fields).
- [ ] Run `python manage.py check --settings=config.settings.local`.

## Phase 2 — Backend service + endpoints (test-first)

- [ ] Write Django tests in `apps/applications/tests/` covering `assign_exam_slot` and the three views:
  - `GET me/`: own application returned; `null` when none; DRAFT excluded; another user's application never returned.
  - `GET exam-slots/`: only slots with `remaining_slots > 0` returned, ordered by date/time.
  - `POST me/exam-slot/`: success sets `exam_status=SCHEDULED` and `assigned_slot`; 409 when slot full; 409 when already scheduled; 409 when application not `APPROVED`; 404 when no application; 401/403 for unauthenticated/wrong-role.
  - **Concurrency test:** a slot with `remaining_slots=1`, two simultaneous assignment attempts (via threads or two DB connections within the test), asserting exactly one succeeds and the other gets 409, and `remaining_slots` ends at `0` (not negative).
- [ ] Implement `assign_exam_slot` in `services.py` per the spec (`@transaction.atomic`, `select_for_update()` on both the application and the slot).
- [ ] Implement `MyApplicationView`, `ExamSlotListView`, `MyApplicationExamSlotView` in `views.py`; extend `ApplicationSerializer` with `examStatus`/`assignedSlot`; add `ExamSlotSerializer`.
- [ ] Wire routes in `urls.py`, placed before the `<uuid:application_id>/` patterns.
- [ ] Run the full `apps.applications` test module and confirm all pass, including the concurrency test.

## Phase 3 — Seed data

- [ ] Add `seed_sample_exam_slots` management command (mirroring `apps/attendance/management/commands/seed_sample_permits.py`), creating the two slots described in the spec.
- [ ] Manually verify via `python manage.py seed_sample_exam_slots` that two `ExamSlot` rows are created with the expected fields.

## Phase 4 — Frontend service (test-first)

- [ ] Extend `backendApplicationService.test.ts` with success/empty/error cases for `getMyApplication()`, `listExamSlots()`, `assignExamSlot()`.
- [ ] Implement the three methods in `backendApplicationService.ts`, following the file's existing `ServiceResult` pattern and typed interfaces.
- [ ] Run `npm test -- backendApplicationService` and confirm all cases pass.

## Phase 5 — `StudentDashboard.tsx` wiring (test-first)

- [ ] Write/extend `StudentDashboard.test.tsx` (backend mode) covering: approved-unscheduled state renders the schedule-picker with fetched slots; selecting a slot and confirming calls `assignExamSlot` then re-fetches, landing on the existing `ExamReadyCard`; full-slot 409 shows an inline error and refetches the slot list; mock-mode behavior is unaffected (spot-check only, since unmodified).
- [ ] Implement: branch `myApp` lookup on `usesBackendServiceMode` (mirroring `StudentApplication.tsx`'s existing flag check); add `ScheduleSelectionCard` subcomponent rendered when status is approved and `examStatus` is empty.
- [ ] Run `npm test -- StudentDashboard` and confirm all cases pass.

## Phase 6 — Verification (mandatory, not optional)

- [ ] From `frontend/`: run `npm test`, `npm run lint`, `npm run build` — record exact results, including any pre-existing unrelated failures.
- [ ] From `backend/`: run `python manage.py check --settings=config.settings.local` and the `apps.applications` test module (and full suite if time allows) — record exact results.
- [ ] Manually run `seed_sample_exam_slots`, then walk the flow in a browser against `VITE_AUTH_SERVICE_MODE=backend`: approved application with no slot → picker renders → confirm → waiting-for-proctor card renders. Record what was and wasn't manually verified.
- [ ] Log everything built and verified in `../implement/student-portal.implement.md`, referencing this plan's phases by number.

## Review gate

Superseded by explicit user instruction to proceed directly to implementation (2026-08-06). Recorded here for the same reason Jo.Ganapin's QR-scanning ticket records its process deviations plainly — so the gap between the normal gate and what actually happened is visible to anyone reading this later, not silently skipped.
