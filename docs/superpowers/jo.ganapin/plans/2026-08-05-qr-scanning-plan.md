# QR Scanning (Testing Center Ops) — Phasing Plan

**Date:** 2026-08-05
**Owner:** Joshua Ganapin (Jo.Ganapin)
**Spec:** [`../specs/2026-08-05-qr-scanning-design.md`](../specs/2026-08-05-qr-scanning-design.md)
**Status:** Awaiting user approval — no phase may start until this plan is approved

**Note on existing coverage:** `frontend/src/pages/proctor/` has no test files today. Phase 4's integration tests are net-new, not extensions of existing coverage.

## Recommendation

Execute phases in order, 2 → 3 → 4 strictly sequential (each depends on the previous), test-first per `AGENTS.md`'s TDD expectation (write the failing test, then the code). Phase 1 is the one prerequisite that unblocks a working demo end-to-end — without it, the camera can decode successfully but never find a match, since today's mock roster and the separate `permits` array don't share an ID scheme. Do Phase 1 before touching the camera/modal code, not after — matching against nothing is very hard to debug once the scanner is layered on top. Phase 5 is not optional: `AGENTS.md` requires running `npm test` / `npm run lint` / `npm run build` and disclosing exact results before this can be reported as demo-ready.

If time runs short Thursday, Phases 0–3 alone still produce a defensible narrative ("scanner decodes and matches correctly, UI wiring is next") — Phase 4 is what makes it demoable end-to-end, so it's the one phase not to cut.

## Phase 0 — Preconditions (no code)

- [ ] Confirm `worktrees/jo.ganapin/` exists; create it if not, per `AGENTS.md` developer isolation rules.
- [ ] Confirm branch `jo.ganapin/qr-scanning` is checked out inside that worktree.
- [ ] Confirm this plan and its linked spec are approved (see review gate below).
- [ ] Confirm `frontend/package.json` still has no QR-decode library (re-check immediately before adding one, in case it changed since 2026-08-05).

## Phase 1 — Mock roster data (prerequisite, blocks everything else)

- [ ] Add a `qrCode: string` field to the `StudentPC` interface in `ProctorAttendance.tsx`.
- [ ] Populate `qrCode` for every record in `getInitialStudentPCs()` (both `sch1` and the else branch), using clearly-synthetic values consistent with existing mock data style (e.g. `SAMPLE_QR_ST-001`).
- [ ] No test needed for this phase alone (static data); Phase 2's tests exercise it.

## Phase 2 — `qrAttendanceService.ts` (pure logic, test-first)

- [ ] Write `frontend/src/services/qrAttendanceService.test.ts` first, covering: match found; no match; empty roster; scanned value matches a student already `Present`.
- [ ] Implement `matchScannedCodeToStudent(qrValue, students)` in `frontend/src/services/qrAttendanceService.ts` to make those tests pass.
- [ ] Run `npm test -- qrAttendanceService` from `frontend/` and confirm all cases pass before moving on.

## Phase 3 — `QrScanModal.tsx` (component, `html5-qrcode` mocked in tests)

- [ ] Add `html5-qrcode` to `frontend/package.json` (`npm install`), review the lockfile diff.
- [ ] Write `frontend/src/pages/proctor/QrScanModal.test.tsx` first, with the scanning library mocked: renders closed/open; permission-denied shows manual code-entry fallback; successful decode invokes `onScan(value)`; unmount stops all `MediaStreamTrack`s.
- [ ] Implement `QrScanModal.tsx`: camera start on open, decode callback wired to `onScan`, permission-denied fallback input, cleanup in a `useEffect` return.
- [ ] Run `npm test -- QrScanModal` and confirm all cases pass.

## Phase 4 — Wire into `ProctorAttendance.tsx`

- [ ] Add "Scan QR" button beside "Mark All Present", same visibility condition (`!attendanceComplete && !isExamDistributed`).
- [ ] On `QrScanModal`'s `onScan`, call `matchScannedCodeToStudent`; on match not already Present, call the existing `updateStatus(id, 'PRESENT')` and `addAuditLog(...)`; on already-Present or no-match, show the inline states from the spec — no state mutation.
- [ ] Add the visible "Prototype — not connected to a backend" label near the button.
- [ ] Write `frontend/src/pages/proctor/ProctorAttendance.test.tsx` (new file) covering: scan button opens modal; successful scan flips the row to Present and updates the stats row; already-Present scan is a no-op; no-match scan is a no-op.
- [ ] Run `npm test -- ProctorAttendance` and confirm all cases pass.

## Phase 5 — Verification and demo polish (mandatory, not optional)

- [ ] From `frontend/`: run `npm test`, `npm run lint`, `npm run build` — record exact results (pass/fail, not just "ran it") in the implementation log.
- [ ] Manual smoke test: real camera scan end-to-end in at least one browser; record what was tested and the outcome.
- [ ] Log everything built and verified in `../implement/jo.ganapin.implement.md`, referencing this plan.
- [ ] Friday: dry run the demo narrative only — per `build_plan.md`, no code changes except P0 fixes discovered during rehearsal.

## Review gate

No phase in this plan may be executed until the user has reviewed and approved both this plan and the linked spec.
