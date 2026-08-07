# QR Scanning — Desktop Proctor App Preview — Phasing Plan

**Date:** 2026-08-06
**Owner:** Joshua Ganapin (Jo.Ganapin)
**Spec:** [`../specs/2026-08-06-qr-scanning-design.md`](../specs/2026-08-06-qr-scanning-design.md)
**Status:** Approved (2026-08-07) — grace period confirmed at 30 minutes; execution starting

## Recommendation

Fix the three camera-lifecycle defects (Phase 1) and the cross-page hydration defect (Phase 2) **before** adding the "Scan QR" button (Phase 4) — wiring a new entry point on top of a component with a documented, unfixed app-crashing bug would make that bug easier to hit in a live demo, not harder. Phase 3 (grace-period logic) has no dependency on Phases 1–2 and could run in parallel if useful, but is written after them here since it's the smaller, lower-risk piece. Test-first per `AGENTS.md`'s TDD expectation: write the failing/regression test before the fix or feature, for every phase. Phase 6 (verification) is mandatory, not optional — `AGENTS.md` requires disclosing exact command results before this can be reported as demo-ready, including the real-camera smoke test, which stays a manual, human-only step in this environment (no camera available to the agent).

## Phase 0 — Preconditions (no code)

- [ ] Confirm `worktrees/jo.ganapin/` and branch `jo.ganapin/qr-scanning` are the active working location.
- [ ] Re-confirm immediately before starting that `frontend/src/pages/proctor/QrScanModal.tsx`, `frontend/src/services/qrAttendanceService.ts`, and the mock `qrCode` fields are still present and unchanged from what this plan assumes (re-check in case anything shifted since 2026-08-06).
- [ ] Confirm this plan and its linked spec are approved (see review gate below).

## Phase 1 — Fix `QrScanModal.tsx` camera-lifecycle defects (test-first)

- [ ] Extend `QrScanModal.test.tsx` with a case where the mocked `stop()` throws synchronously (matching `html5-qrcode`'s real behavior), asserting cleanup does not crash/propagate.
- [ ] Fix: wrap the cleanup's teardown in an outer `try`/`catch` around the existing `.catch()` chain, so a synchronous throw can never escape the `useEffect` cleanup.
- [ ] Extend `QrScanModal.test.tsx` with a case simulating close/unmount while `start()`'s promise is still pending, then resolving it, asserting the scanner ends up stopped rather than left running.
- [ ] Fix: track mount/open state through the `start()` success continuation; if no longer open/mounted when it resolves, stop the scanner immediately.
- [ ] Extend `QrScanModal.test.tsx` driving `isOpen` through `true → false (camera error) → true`, asserting no crash and correct behavior on the second open.
- [ ] Fix: always render the scan-region `<div>` (visually hidden when `cameraError` is true) so the `Html5Qrcode` constructor can never fail to find its target element.
- [ ] Run `npm test -- QrScanModal` from `frontend/` and confirm all cases (existing + new) pass.

## Phase 2 — Fix cross-page `qrCode` hydration loss (test-first)

- [ ] Write a page-level test that pre-seeds `localStorage['philsa_proctor_dist_states']` with a persisted roster whose records have no `qrCode` field (simulating a roster written by `ProctorSchedule.tsx`'s unsynchronized duplicate), then verifies a scan against that data still matches.
- [ ] Fix: in `ProctorAttendance.tsx`'s `getDistState`, backfill `qrCode` per record when reading from persisted state (e.g. `qrCode: s.qrCode ?? \`SAMPLE_QR_${s.id}\`\`), so no change to `ProctorSchedule.tsx` is required.
- [ ] Run the new test and confirm it passes.

## Phase 3 — Grace-period Present/Late logic in `qrAttendanceService.ts` (test-first)

- [ ] Extend `qrAttendanceService.test.ts` with cases for `resolveScheduledStart` (parses mock `date`+`time` correctly) and `computeScanStatus` (before grace boundary → Present; exactly at boundary → Present; after boundary → Late).
- [ ] Implement `resolveScheduledStart(schedule)`, `computeScanStatus(scheduledStart, scannedAt, graceMinutes)`, and export `DEFAULT_LATE_GRACE_MINUTES = 30` in `qrAttendanceService.ts`.
- [ ] Run `npm test -- qrAttendanceService` and confirm all cases pass.

## Phase 4 — Wire "Scan QR" into `ProctorAttendance.tsx` (test-first)

- [ ] Write/extend `ProctorAttendance.test.tsx` covering: "Scan QR" button renders under the same visibility condition as "Mark All Present"; a scan before grace expiry marks the row Present; a scan after grace expiry marks it Late; an already-marked match is a no-op with an inline message; a no-match scan is a no-op with an inline message; rapid repeated decodes of the same value produce exactly one `updateStatus`/`addAuditLog` call (debounce).
- [ ] Implement: add the "Scan QR" button (same visibility rule as "Mark All Present"), the "Desktop App Preview — not connected to a backend" label, and `handleQrScan` (debounced, calling `matchScannedCodeToStudent` then `computeScanStatus`, then the existing `updateStatus`/`addAuditLog`).
- [ ] Run `npm test -- ProctorAttendance` and confirm all cases pass.

## Phase 5 — Documentation and demo labeling polish

- [ ] Confirm the on-screen label reads "Desktop App Preview — not connected to a backend" everywhere the feature is surfaced (button area and/or modal `hint`, per the spec).
- [ ] Confirm no code comment or UI text anywhere claims this is connected to `backend/apps/attendance` or is production identity verification.

## Phase 6 — Verification and demo readiness (mandatory, not optional)

- [ ] From `frontend/`: run `npm test`, `npm run lint`, `npm run build` — record exact pass/fail results (not just "ran it") in the implementation log, including any pre-existing unrelated failures observed.
- [ ] Manual smoke test: real camera scan end-to-end in at least one browser — this requires a human with camera hardware; log what was tested and the outcome, or log explicitly that it remains outstanding if no camera is available.
- [ ] Log everything built and verified in `../implement/jo.ganapin.implement.md`, referencing this plan and its phases by number.

## Explicitly out of scope for this plan

- `backend/apps/attendance` — no test coverage added, no wiring, no changes. Remains a separate, not-yet-reviewed item if the platform later needs a real backend-connected check-in flow.
- Any real desktop application work (Tauri/.NET, offline cache, USB HID scanner) — remains `b.mendoza/desktop-app-proctor`'s scope entirely.

## Review gate

No phase in this plan may be executed until the user has reviewed and approved both this plan and the linked spec.
