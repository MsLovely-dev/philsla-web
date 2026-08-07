# Student Portal — Results Viewing Implementation Plan

**Goal:** Replace `ResultsPage.tsx`'s fully-mocked results screen with a real, backend-connected view of the student's own released score — the last gap in Student Portal (Dashboard, Schedule, Application, Profile, and Permit are already done).

**Architecture:** A new `GET /api/v1/results/me/` endpoint on the existing `apps.results` Django app resolves the caller's own released `CandidateScore`, joined via `owner → application → lrn` (the same lookup `apps/results/services.py` already uses elsewhere). The frontend gets a new `backendResultService.ts` following the existing Backend/Mock/factory service pattern, and `ResultsPage.tsx` grows a backend-mode branch mirroring how `ExamPermitPage.tsx` already handles loading, real data, and empty states — the prototype-mode mock preview is left untouched.

**Tech Stack:** Django REST Framework, React/TypeScript/Vite, Vitest, Django `TestCase` + DRF `APIClient`.

## Already Completed
- [x] `results.CandidateScore` model already has every field this feature needs (raw score, max score, final score, overall rank, percentile, release status, released-at timestamp). **No migration is needed in this plan.**
- [x] `apps.applications.services.get_my_application(owner)` exists — reuse as-is to resolve the caller's application.
- [x] The shared API client, service-result types, and the `VITE_AUTH_SERVICE_MODE` backend/prototype switch exist — reuse as-is, do not build a new HTTP layer.
- [x] `ResultsPage.tsx`'s prototype-mode mock preview (hardcoded scores + bar chart) already works — leave it exactly as it is today.

## Not Started (this plan's actual scope)
- [ ] No `GET /api/v1/results/me/` endpoint exists yet.
- [ ] No frontend service or backend-mode branch exists on `ResultsPage.tsx` yet — the page is 100% mock today.

## Global Constraints
- No new database tables or migrations. No subject-level score breakdown — that data model doesn't exist anywhere in the codebase, so the redesigned page only shows the real aggregate fields (final score, rank, percentile), not a per-subject chart.
- Match a score to the caller by LRN, not candidate id — that's the join key already used elsewhere in `apps/results/services.py`.
- Only released scores are ever returned to the student; a processed-but-unreleased score must look identical to "no score yet."
- The endpoint must be scoped entirely by the authenticated user — never accept a candidate or session id from the client, matching how the existing "my application" and "my exam permit" endpoints work.
- All new API response fields use camelCase, matching every other endpoint in this codebase.

---

## File Structure
- Modify: `backend/apps/results/services.py`, `serializers.py`, `views.py`, `urls.py`
- Create: `backend/apps/results/tests/test_my_result_endpoint.py`
- Create: `frontend/src/services/backendResultService.ts` and its test file
- Modify: `frontend/src/pages/ResultsPage.tsx`
- Create: `frontend/src/pages/ResultsPage.test.tsx`

---

### Task 1: Backend — service function to fetch the caller's own result
- [ ] In `apps/results/services.py`, add a function that resolves the caller's application (reusing the existing "my application" lookup), then looks up that application's released `CandidateScore` by LRN, returning `None` if there's no application, no LRN, or no released score yet.
- [ ] Add unit tests covering: a released score is returned; an unreleased score returns nothing; no application returns nothing; an application with a blank LRN returns nothing.
- [ ] Run the results app's test suite and confirm everything passes.

### Task 2: Backend — serializer for the caller's own result
- [ ] Add a read-only serializer exposing the score's id, candidate id, raw score, max score, final score, overall rank, percentile, release status, released-at timestamp, exam set id, and session id — all camelCase, following the same field-mapping style as the existing exam permit serializer.

### Task 3: Backend — endpoint and URL wiring
- [ ] Add a view that requires the STUDENT role, calls Task 1's service function, and returns either the serialized result or a null body — no id ever accepted from the request.
- [ ] Wire it to `GET /api/v1/results/me/` in `apps/results/urls.py`.
- [ ] Add endpoint tests mirroring the existing "my exam permit" endpoint test file's structure: returns the caller's own released result; returns null when unreleased; returns null when there's no application; never returns another user's result; rejects unauthenticated requests; rejects non-student roles.
- [ ] Run the full results app test suite and confirm nothing regressed.

### Task 4: Frontend — backend result service
- [ ] Create a service file following the existing Backend/Mock/factory pattern (same shape as the schools service): a `BackendResultService` that calls the new endpoint and maps the response, and a `MockResultService` that always resolves to nothing — because `ResultsPage.tsx` keeps its own separate hardcoded prototype-mode data rather than sourcing it from this service.
- [ ] Add unit tests covering a successful fetch, a null result, and the mock service's always-null behavior.

### Task 5: Frontend — connect `ResultsPage.tsx`
- [ ] Add a backend-mode branch to `ResultsPage.tsx`, matching the loading → real-data → empty-state pattern already used in `ExamPermitPage.tsx`: show a loading indicator while the fetch is in flight, then either the real score view or a "Results Not Yet Released" empty state.
- [ ] Design the real-data view around only the fields that actually exist: candidate id, final score, a qualified/below-cutoff badge, released date, percentile, overall rank, and raw/max score. Do not attempt to recreate the mock's per-subject bar chart — there is no backing data for it.
- [ ] Leave the existing prototype-mode branch (the hardcoded mock preview and its chart) completely unchanged, gated behind the same mode check.
- [ ] Add a test file covering: loading state then real score renders; null result shows the not-yet-released empty state.
- [ ] Run the frontend test suite and a production build to confirm no regressions or unused-import issues.

### Task 6: Manual end-to-end verification
- [ ] Seed sample scores (existing management command) so they line up with real applications' LRNs.
- [ ] As a SYSTEM_ADMIN, process and release that examination session through the existing Score Management flow.
- [ ] Log in as the matching student with the backend mode enabled and confirm the real score renders on `/student/results` with no console errors.
- [ ] Log in as a different approved student with no released score and confirm the "Results Not Yet Released" empty state renders instead of an error.

---

## Self-Review
Frontend, backend, API, and DB are all covered — DB explicitly needs no schema changes, which is called out rather than skipped. Every task has a concrete, testable deliverable and nothing is left as a placeholder.
