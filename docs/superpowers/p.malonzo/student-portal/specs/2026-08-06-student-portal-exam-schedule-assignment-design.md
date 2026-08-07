# Student Portal — Exam Schedule Assignment — Design

**Date:** 2026-08-06
**Ticket:** [Student Portal Ticket 001](../student-portal.task.md#ticket-001--student-portal-real-backend-connections-decomposed)
**Status:** Approved (conversational, brainstorming session 2026-08-06) — supersedes/extends [Sub-project A's original design](2026-08-06-student-portal-application-status-design.md) with real backend for schedule assignment, per explicit user direction to build all of it against real data rather than mock.

## Problem and context

`StudentDashboard.tsx` already renders, from mock data, every state an approved candidate should see: "Application Submitted / Document Verification / Examination Phase / Official Results" roadmap, the green "Computer & Tech Check" panel, and (once `examStatus` is `SCHEDULED` or `IN_PROGRESS`) a "Wait for proctor" card. `ExamPermitPage.tsx` and `ResultsPage.tsx` independently already render a matching permit and results report from mock data.

The one state genuinely missing from the code — not just unwired, absent — is what happens between "application approved" and "exam scheduled": today, an application with `status === 'ACCEPTED'`/`'APPROVED'` and no `examStatus` renders nothing in the main content area. There is no schedule picker anywhere in the codebase, mock or otherwise.

Separately, none of this is backed by anything real. `apps.applications.StudentApplication` has no `exam_status` field and no notion of an exam slot; no app in the backend (`applications`, `exams`, `attendance`) has a self-service "candidate picks their own slot" concept. `apps.exams` is the blueprint/exam-set (test content) domain — a different concept — and is Ju.Cabigon/I.Sandoval's active area this sprint.

## Goals

- Add the missing "Select Exam Schedule" UI (batch/room/date/time/capacity table, single-select, confirm action) to `StudentDashboard.tsx`, matching the already-established visual language of the rest of the page.
- Back it with a real, minimal Django surface: an `ExamSlot` model, an `exam_status`/`assigned_slot` extension to `StudentApplication`, and three endpoints (`GET .../me/`, `GET .../exam-slots/`, `POST .../me/exam-slot/`).
- Confirming a slot must be atomic and capacity-safe under concurrent requests (two students cannot both win the last seat).
- Reuse `StudentDashboard.tsx`'s existing `ExamReadyCard` ("waiting for proctor") for the post-confirmation state — no new UI needed there, it already exists and already matches the target look.

## Non-goals

- `ExamPermitPage.tsx` (Sub-project B) and `ResultsPage.tsx` (Sub-project C) stay mock, untouched. C in particular remains excluded because `apps.results`/`apps.exam_reviews` are Prince Malonzo's actively-developed area this sprint — touching them risks the same collision already flagged in the parent ticket.
- `ExamDelivery.tsx` (Sub-project D) stays out of scope — bienvenido.mendoza's ticket.
- No transitions beyond `SCHEDULED` (`IN_PROGRESS`, `SUBMITTED`, `TERMINATED`, `RESULTS_RELEASED`) are backend-driven by this ticket. Nothing in the current codebase drives those transitions today either (mock included), so this doesn't regress anything — it's simply not this ticket's job to build the exam-taking pipeline.
- No new authorization model — reuses `RoleRequiredPermission`/`require_roles(PortalRole.STUDENT)`, the same pattern `ApplicationDetailView`/`ApplicationSubmitView` already use.

## Architecture

All additions live in `backend/apps/applications` (models.py, serializers.py, services.py, views.py, urls.py) — continuing the direction already committed to in Sub-project A's spec (reuse the existing app's auth rather than inventing a new one).

**Models:**

```python
class ApplicationExamStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"

class ExamSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam_cycle_id = models.CharField(max_length=64, blank=True, default="")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    test_center = models.CharField(max_length=255)
    room = models.CharField(max_length=255)
    total_slots = models.PositiveIntegerField()
    remaining_slots = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
```

`StudentApplication` gains:
- `exam_status = models.CharField(max_length=20, choices=ApplicationExamStatus.choices, blank=True, default="")`
- `assigned_slot = models.ForeignKey(ExamSlot, null=True, blank=True, on_delete=models.PROTECT, related_name="assigned_applications")`

**Endpoints** (all `require_roles(PortalRole.STUDENT)`, all scoped to `request.user` — no application-id in the URL, no new object-permission class needed since the queryset itself is the scope):

- `GET /api/v1/applications/me/` — returns the caller's own non-draft application (or `null`), serialized with `ApplicationSerializer` extended with `examStatus`/`assignedSlot`.
- `GET /api/v1/applications/exam-slots/` — lists slots with `remaining_slots > 0`, ordered by date/time.
- `POST /api/v1/applications/me/exam-slot/` — body `{ "slotId": "<uuid>" }`. Calls a new service function.

**Service function** (`services.py`, following the existing `@transaction.atomic` + `select_for_update()` pattern used by `decide_application`/`submit_application`):

```python
@transaction.atomic
def assign_exam_slot(*, owner, slot_id) -> StudentApplication:
    application = (
        StudentApplication.objects.select_for_update()
        .exclude(status=ApplicationStatus.DRAFT)
        .filter(owner=owner)
        .order_by("-updated_at")
        .first()
    )
    if application is None:
        raise Http404(...)
    if application.status != ApplicationStatus.APPROVED:
        raise ApplicationConflict("Application is not approved yet.")
    if application.assigned_slot_id:
        raise ApplicationConflict("An exam slot is already assigned.")
    slot = ExamSlot.objects.select_for_update().get(id=slot_id)
    if slot.remaining_slots <= 0:
        raise ApplicationConflict("This exam slot is full.")
    slot.remaining_slots -= 1
    slot.save(update_fields=["remaining_slots"])
    application.assigned_slot = slot
    application.exam_status = ApplicationExamStatus.SCHEDULED
    application.save(update_fields=["assigned_slot", "exam_status"])
    return application
```

`select_for_update()` on the slot row serializes concurrent assignment attempts at the database level — the second of two simultaneous requests for the last seat blocks until the first commits, then reads `remaining_slots == 0` and raises the 409, rather than both succeeding.

**Seed data:** `apps/attendance` already has a `seed_sample_permits` management command for exactly this kind of "no real generation flow yet, so seed fixtures for demo" need. Mirroring it: `seed_sample_exam_slots` creates the two slots the design (and screenshots) are built around — Benitez Hall R101 / 50 seats / 2026-06-15 08:00–11:00, and SEC Lecture Hall 1 / 40 seats / 2026-05-22 09:00–12:00.

**Frontend:**

- `backendApplicationService.ts` gains `getMyApplication()`, `listExamSlots()`, `assignExamSlot(slotId)` — typed, `ServiceResult`-wrapped, matching the file's existing conventions exactly.
- `StudentDashboard.tsx` branches on `usesBackendServiceMode` (`import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend'`, the same flag `StudentApplication.tsx` already reads) for its `myApp` lookup. Mock-mode behavior is byte-for-byte unchanged.
- New `ScheduleSelectionCard` component (colocated in `StudentDashboard.tsx`, matching the file's existing pattern of subcomponents like `ExamReadyCard`/`TerminatedCard`): renders when `status` is approved and `examStatus` is empty. Fetches `listExamSlots()`, renders a radio-selectable table, "Confirm Selected Slot" calls `assignExamSlot()`, then refetches the application — which now has `examStatus === 'SCHEDULED'` and falls straight into the existing `ExamReadyCard` render path with zero changes to that component.

## Data flow

1. STUDENT with an approved application, no slot yet, loads the dashboard → `GET /applications/me/` → `status: APPROVED, examStatus: ""` → `ScheduleSelectionCard` renders.
2. `GET /applications/exam-slots/` populates the table.
3. Student selects a row, clicks "Confirm Selected Slot" → `POST /applications/me/exam-slot/ { slotId }`.
4. On `200`, dashboard refetches `GET /applications/me/` → `examStatus: "SCHEDULED"` → `ExamReadyCard` (already built) renders instead.
5. Permit/Results pages are unaffected — still mock, unconditionally rendered as they are today.

## Error handling

- Slot filled between page load and confirm click → `409 CONFLICT` (`ApplicationConflict`) → inline error on the card, slot list refetched so `remaining_slots` updates.
- Double-submit / already scheduled → `409 CONFLICT`, no duplicate assignment (idempotent-safe by construction: the `assigned_slot_id` check happens inside the same locked transaction).
- No application found for the account → `404`, surfaced as the existing "No Application Found" empty state pattern (mirrors Sub-project A's already-agreed handling).
- Unauthenticated / wrong role → existing `RouteGuards.tsx` prevents reaching the page; `require_roles(PortalRole.STUDENT)` is defense in depth on the endpoint itself, not the only control.

## Security

- All three endpoints scope by `request.user` server-side — no application ID is ever accepted from the client for the `me/`-prefixed routes, closing off any risk of one student querying or modifying another's record by guessing an ID.
- `select_for_update()` inside `@transaction.atomic` is a real concurrency control, not a cosmetic one — verified with a dedicated test (see below) rather than assumed correct.
- No new PII beyond what `ExamSlot`'s public fields (date/time/room/center/capacity) already are — no student-identifying data on the slot model itself.

## Testing

- **Backend:** `ExamSlot` model test (capacity fields); view tests for `GET me/` (own application returned, null when none, DRAFT excluded), `GET exam-slots/` (only slots with remaining capacity), `POST me/exam-slot/` (success flips `examStatus`+`assigned_slot`, 409 when slot full, 409 when already scheduled, 409 when application not yet approved, 404 when no application, unauthenticated/wrong-role denied); a concurrency test issuing two simultaneous assign requests against a slot with `remaining_slots=1` and asserting exactly one succeeds.
- **Frontend:** `backendApplicationService.test.ts` additions for the three new methods (success/empty/error). New `StudentDashboard.test.tsx` (backend-mode) covering: schedule card renders for approved-unscheduled state, slot selection + confirm calls `assignExamSlot` and re-renders into `ExamReadyCard`, full-slot error path, existing mock-mode tests (if any) remain green and untouched.

## Open items resolved during this design

- Confirmed via direct model inspection that no existing backend concept covers self-service exam scheduling anywhere in the repo — this is genuinely new surface, not a wiring task, which is why it gets its own model rather than reusing `apps.attendance.ExamPermit` (that model is staff-issued and QR-scan-oriented, a different lifecycle).
- Confirmed the capacity race is real and worth a dedicated test, not just a design claim: `ExamSlot.objects.select_for_update()` inside the assignment transaction is what makes the guarantee true, and the test exists specifically to catch a future refactor that accidentally drops the lock (e.g. someone "simplifying" to an `F()`-expression update without the row lock, which would reintroduce the race for the read-then-compare-then-write `remaining_slots <= 0` check).
