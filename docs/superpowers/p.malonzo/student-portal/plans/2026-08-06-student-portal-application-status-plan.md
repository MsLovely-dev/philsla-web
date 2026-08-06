# Student Portal Sub-project A — Real Application Status/Documents — Phasing Plan

**Date:** 2026-08-06
**Spec:** [`../specs/2026-08-06-student-portal-application-status-design.md`](../specs/2026-08-06-student-portal-application-status-design.md)
**Status:** Awaiting user approval — no phase may start until this plan is approved

## Recommendation

Build backend-out (Phase 1 before Phase 2/3): the endpoint is a small, independently testable unit reusing existing authorization, and having a real endpoint to call makes the frontend service/page phases straightforward rather than speculative. Test-first per `AGENTS.md`'s TDD expectation for every phase. Phase 5 (verification) is mandatory, matching the same standard applied to the QR-scanning ticket — exact command results disclosed, not just "ran it."

## Phase 0 — Preconditions (no code)

- [ ] Confirm the active branch/checkout (`jo.ganapin/qr-scanning`, per the ownership note in the task log — no `worktrees/p.malonzo/` checkout exists for this work).
- [ ] Re-confirm immediately before starting that `backend/apps/applications/urls.py` still has no "my application" endpoint and that `Application.owner`'s `related_name` is still `student_applications` (re-check in case anything shifted since 2026-08-06).
- [ ] Confirm this plan and its linked spec are approved (see review gate below).

## Phase 1 — Backend: `GET /api/v1/applications/me/` (test-first)

- [ ] Write Django tests covering: authenticated STUDENT with an application → 200 with that application's data; authenticated STUDENT with no application → 200 with an empty/null body; a STUDENT never receives another user's application; unauthenticated request → 401; non-STUDENT role → 403.
- [ ] Implement a thin `ApplicationMineView(APIView)` in `backend/apps/applications/views.py`, `required_roles=[PortalRole.STUDENT]`, querying `request.user.student_applications.exclude(status=Application.Status.DRAFT).order_by('-updated_at').first()`, reusing the existing application serializer.
- [ ] Wire the route in `backend/apps/applications/urls.py` (e.g. `path("me/", ApplicationMineView.as_view(), name="mine")`) — placed so it cannot collide with the existing `<uuid:application_id>/` pattern.
- [ ] Run `python manage.py test --settings=config.settings.test` (or the focused subset for `apps.applications`) and confirm all new and existing cases pass.
- [ ] Run `python manage.py check --settings=config.settings.local` and confirm no errors.

## Phase 2 — Frontend service: `getMyApplication()` (test-first)

- [ ] Extend `backendApplicationService.test.ts` with success, empty-application, and error cases for a new `getMyApplication()` method.
- [ ] Implement `getMyApplication()` in `backendApplicationService.ts`, calling `GET /api/v1/applications/me/` and following the file's existing `ServiceResult` pattern.
- [ ] Run `npm test -- backendApplicationService` from `frontend/` and confirm all cases pass.

## Phase 3 — Wire `StudentDashboard.tsx` to real data (test-first)

- [ ] Write `StudentDashboard.test.tsx` (new) covering, in backend mode (`getMyApplication` mocked): application loads and renders; `FOR_CORRECTION` status renders the rejection banner and correction chips; no-application renders an empty/prompt state, not a crash; mock-mode path is unaffected (spot-check, not full re-test, since it's unmodified).
- [ ] Implement: branch `myApp` lookup on `usesBackendServiceMode`, calling `getMyApplication()` in backend mode and keeping the existing `applications.find(...)` unchanged in mock mode.
- [ ] Run `npm test -- StudentDashboard` and confirm all cases pass.

## Phase 4 — Wire document re-upload to real attachment endpoints (test-first)

- [ ] Extend `StudentDashboard.test.tsx` with: successful re-upload calls the real attachment endpoint and refreshes application state; a failed upload shows an error state instead of the current always-succeeds simulation.
- [ ] Implement: replace the `setInterval`-simulated `handleUpload` (backend-mode branch only) with a call to the existing attachment upload path already used by `StudentApplication.tsx`, followed by a `getMyApplication()` refetch on success.
- [ ] Run the extended `StudentDashboard` tests and confirm all cases pass.

## Phase 5 — Verification (mandatory, not optional)

- [ ] From `frontend/`: run `npm test`, `npm run lint`, `npm run build` — record exact pass/fail results, including any pre-existing unrelated failures observed.
- [ ] From `backend/`: run `python manage.py check --settings=config.settings.local` and `python manage.py test --settings=config.settings.test` — record exact results.
- [ ] Log everything built and verified in `../implement/student-portal.implement.md`, referencing this plan and its phases by number.

## Explicitly out of scope for this plan

- Sub-project B (ExamPermitPage), C (ResultsPage), D (ExamDelivery) — see the task log's decomposition table. None of their code is touched here.
- Any change to `backend/apps/results` or `backend/apps/attendance`.

## Review gate

No phase in this plan may be executed until the user has reviewed and approved both this plan and the linked spec.
