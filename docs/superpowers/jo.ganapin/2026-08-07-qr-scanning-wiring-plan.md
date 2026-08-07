# QR Scanning — Real Backend Wiring Implementation Plan

**Goal:** Connect `ProctorAttendance.tsx`'s QR scan step to the already-built `POST /api/v1/attendance/scan/` endpoint when the backend mode is enabled, so a scan validates against a real exam permit and writes a real attendance record — instead of only matching client-side against a hardcoded mock roster.

**Architecture:** Implements the already-approved `2026-08-07-qr-scanning-backend-design.md`. A new `backendQrScanService.ts` follows the existing Backend/Mock/factory service pattern. `ProctorAttendance.tsx`'s scan handler is rewritten to call this service uniformly in both modes — in backend mode it hits the real endpoint; in prototype mode a mock implementation wraps the existing client-side matching logic unchanged, so nothing regresses. The scan endpoint's error response is fixed to match this codebase's standard error shape, and a new seed command creates real permits matching the frontend's hardcoded mock candidate IDs so already-published QR test codes keep working.

**Tech Stack:** Django REST Framework, React/TypeScript/Vite, Vitest, `html5-qrcode` (unchanged).

## Already Completed
- [x] The exam permit model, the attendance record model, and the `mark_attendance` service function — real, migrated, and already handle first-scan-vs-already-used-vs-void-vs-expired logic correctly.
- [x] The scan endpoint itself — already exists, already authenticated and role-restricted to Proctor/System Admin.
- [x] `QrScanModal.tsx` — the entire camera lifecycle (start/stop, permission-denied fallback, manual-entry fallback) is done and untouched by this plan.
- [x] The client-side matching, Present/Late computation, and duplicate-scan debounce/dedupe logic in `qrAttendanceService.ts` and `ProctorAttendance.tsx` — all done; this plan reuses it in prototype mode rather than rewriting it.

## Not Started (this plan's actual scope)
- [ ] The endpoint's error response doesn't match this app's standard shape — a real bug, not yet fixed.
- [ ] Nothing on the frontend calls the scan endpoint yet — `ProctorAttendance.tsx` still matches client-side only.
- [ ] No seed data lines up with the frontend's mock IDs.
- [ ] The scan modal's "not connected to a backend" label never got a backend-mode variant.

## Global Constraints
- No fallback from backend to local matching on network failure — in backend mode a scan either gets a real answer or a real error, never a silent fallback.
- The roster, schedule, and rooms shown on the page stay mock data — no new "list permits for this room" endpoint.
- Present/Late is still decided client-side against the existing mock schedule — the backend is only the source of truth for whether a permit is real and unused.
- Camera lifecycle and the existing scan debounce/dedupe behavior must not change.
- Seeded permits reuse the same synthetic candidate IDs already hardcoded in the mock roster — no real candidate data introduced.

---

## File Structure
- Modify: `backend/apps/attendance/views.py`
- Create: `backend/apps/attendance/tests/test_views.py`
- Create: `backend/apps/attendance/management/commands/seed_proctor_preview_permits.py`
- Create: `frontend/src/services/backendQrScanService.ts` and its test file
- Modify: `frontend/src/pages/proctor/ProctorAttendance.tsx` and its test file

---

### Task 1: Backend — fix the scan endpoint's error response
- [ ] Change the scan endpoint's error branch to return the standard `{error: {code, message}}` envelope instead of its current non-standard shape — this is the one real bug in the existing backend code, and without it a real "not found / void / expired" response would show a generic error instead of the specific message.
- [ ] Add a new view-level test file (none exists today) covering: a first valid scan marks the permit used and creates one attendance record; re-scanning an already-used permit reports "already marked" without creating a duplicate record; a void permit returns a conflict with the standard envelope; an expired permit returns a conflict with the standard envelope; an unknown code returns not-found with the standard envelope; wrong role is rejected; unauthenticated is rejected.
- [ ] Run the attendance app's full test suite and confirm everything passes.

### Task 2: Backend — seed command matching the mock roster
- [ ] Add a new, separate management command (not an edit to the existing generic sample-permit seeder, to avoid changing its unrelated existing behavior) that creates one real permit per candidate ID hardcoded in the frontend's mock roster, with a QR value matching exactly what's already hardcoded there — so the already-published QR test codes keep working once scanning is wired to the real backend.
- [ ] Run it, confirm the expected number of permits are created, run it again, and confirm it updates rather than duplicates them.

### Task 3: Frontend — backend QR scan service
- [ ] Create a service file following the existing Backend/Mock/factory pattern: a backend implementation that calls the real scan endpoint and maps its response, and a mock implementation that wraps the existing client-side matching logic unchanged (so prototype mode behaves exactly as it does today).
- [ ] Because the mock implementation needs the current room's live roster to match against — and a module-level singleton can't hold per-render component state — have the scan function accept the roster as a second argument that the backend implementation simply ignores.
- [ ] Add unit tests covering: a first valid scan maps correctly (including unwrapping the real endpoint's nested response shape); an already-marked scan maps correctly; not-found, void/conflict, and network-failure errors all surface correctly; the mock implementation matches against a given roster and reports not-found/already-marked correctly.

### Task 4: Frontend — wire the scan handler
- [ ] Before editing, identify every existing test assertion around the scan handler that isn't already waiting for an async result, since the handler is becoming asynchronous.
- [ ] Rewrite the scan handler to call the new service instead of matching directly, keeping the existing debounce guard, and keeping the exact same downstream behavior for not-recognized, already-marked, and present/late outcomes — just now driven by the service's response instead of a direct local lookup.
- [ ] Fix any test assertions identified in the first step so they correctly wait for the now-async result.
- [ ] Run the existing scan test suite and confirm the same tests pass as before this change — proving prototype-mode behavior hasn't regressed.

### Task 5: Frontend — mode-aware scan modal label
- [ ] The scan modal already supports an optional hint message, but nothing currently passes one. Pass a hint that reads "not connected to a backend" in prototype mode, and a "connected to the backend, scans write real records" message in backend mode.
- [ ] Verify visually in the browser that the correct label shows in each mode.

### Task 6: Manual end-to-end verification
- [ ] Seed the preview permits and run both the backend and frontend in backend mode.
- [ ] Scan a known code for the first time — confirm the candidate is marked present/late correctly and a real permit/attendance record was created.
- [ ] Scan the same code again — confirm "already marked" with no duplicate record.
- [ ] Scan an unrecognized code — confirm the real backend message displays, not a generic error.
- [ ] Mark one seeded permit void and another expired, scan each, and confirm the correct specific messages display.
- [ ] Switch back to prototype mode and confirm scanning still works exactly as before, with no network call made and the original label showing.

---

## Self-Review
Every part of the approved design doc is covered: the backend fix, the seed data reconciliation, the new service, the handler rewire, and the label-copy gap it explicitly flagged as still open. Nothing here duplicates already-built work — each task targets only what's verified missing or broken.
