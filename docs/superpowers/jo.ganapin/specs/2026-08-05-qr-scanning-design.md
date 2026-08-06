# QR Scanning (Testing Center Ops) — Design

**Date:** 2026-08-05
**Owner:** Joshua Ganapin (Jo.Ganapin)
**Ticket:** [Ticket 001](../jo.ganapin.task.md#ticket-001--qr-scanning-testing-center-ops)
**Status:** Awaiting user review

## Problem and context

`docs/USER_STORY.md` story #13: a proctor scans a candidate's permit QR at the door and the candidate's attendance status becomes "Present." Today this is entirely manual in `frontend/src/pages/proctor/ProctorAttendance.tsx` — a proctor clicks a Present/Late/Absent button per row. `backend/apps/proctoring` is an empty stub (`.gitkeep` only, no models or endpoints), and `build_plan.md` explicitly scopes this sprint's deliverable as a client-side demo with **no backend integration attempt**.

The student side already generates a QR per permit: `frontend/src/pages/ExamPermitPage.tsx` renders `<QRCodeSVG value={permit.qrCode} />` from the `qrcode.react` package. There is currently no QR **decoding** capability anywhere in the frontend.

## Goals

- A proctor can scan a candidate's QR with their device camera and have that candidate's row flip to Present, without any backend call.
- The scan reuses `ProctorAttendance.tsx`'s existing state, stats, lock/distribution rules, and audit logging exactly as the manual "Mark Present" button does today — no parallel state machine.
- The feature is clearly labeled a prototype and cannot be mistaken for a production identity-verification control.

## Non-goals

- No backend API, model, migration, or `backend/apps/proctoring` change of any kind.
- No changes to the Late/Absent/Technical-Issue manual flows, the lock/distribution logic, or the correction-modal flow already in `ProctorAttendance.tsx` — the scan only triggers the same path the "Mark Present" button already triggers.
- No cross-linking to the separate `permits` mock dataset used by `ExamPermitPage.tsx` (see "Mock data decision" below for why).

## Architecture

**New dependency:** `html5-qrcode` (actively maintained, camera-decode only, MIT licensed) added to `frontend/package.json`.

**New component:** `frontend/src/pages/proctor/QrScanModal.tsx` — a modal that owns the camera lifecycle (start on open, stop on close/unmount) and calls back with a decoded string.

**New service (pure logic, no React):** `frontend/src/services/qrAttendanceService.ts` — exports `matchScannedCodeToStudent(qrValue: string, students: StudentPC[]): StudentPC | null`. Kept out of the component per `AGENTS.md`'s "keep business rules ... out of presentation components; use focused hooks, domain utilities, or services with tests."

**Wiring:** `ProctorAttendance.tsx` adds a "Scan QR" button next to "Mark All Present" (same visibility condition: hidden once `attendanceComplete || isExamDistributed`, matching every other pre-lock bulk action already on that page). On a successful match, it calls the page's existing `updateStatus(id, 'PRESENT')` and `addAuditLog(...)` — identical to the manual Present button's effect, just triggered by a scan instead of a click.

## Mock data decision

`ExamPermit.qrCode` (in the separate `permits` mock array, keyed by `userId`) uses ID formats (`PH-2026-8842`, `CAND-2026-8804`) that don't currently line up with `StudentPC.id` (`ST-001`, `ST-002`, ...) used by the room roster in `ProctorAttendance.tsx`. Rather than building a cross-table lookup to reconcile two independently-evolving mock datasets, **each mock `StudentPC` record in `getInitialStudentPCs()` gets its own `qrCode` field directly** (e.g. `ST-001` → `qrCode: 'SAMPLE_QR_ST-001'`). `matchScannedCodeToStudent` does a direct match against the current schedule's roster only.

This is a deliberate simplification for the prototype, not an oversight: there is no backend enforcing one shared identity between the two mock datasets today, so inventing a cross-table join would add complexity without adding real correctness. It does mean the QR encoded in `ExamPermitPage.tsx`'s demo permit and the QR matched here are independent mock values — acceptable for a demo, called out explicitly rather than left implicit.

## Data flow

1. Proctor clicks "Scan QR" → `QrScanModal` opens, requests camera permission, starts decode loop.
2. On decode: modal calls `matchScannedCodeToStudent(value, students)` for the currently-selected schedule's roster.
3. **Match found, not already Present:** modal closes, `updateStatus(id, 'PRESENT')` runs, `addAuditLog('ATTENDANCE_LOCK', ...)` records the scan (reuses the existing audit action already used for other attendance changes on this page), modal shows a brief success state before closing.
4. **Match found, already Present:** modal shows "Already marked Present" inline, no state change, no audit entry, camera keeps running for the next scan.
5. **No match:** modal shows "QR not recognized for this room" inline, no state change, no audit entry, camera keeps running.
6. Proctor closes modal at any point → camera stream stops immediately (all `MediaStreamTrack`s stopped, not just the video element hidden).

## Error handling

- **Camera permission denied / no camera:** modal falls back to a manual code-entry text input wired to the same `matchScannedCodeToStudent` call, so a live demo isn't blocked by hardware or browser permission prompts.
- **Decode of a QR that isn't a recognized candidate code:** treated identically to "no match" above — no crash, no partial state change.
- **Modal closed mid-scan:** camera cleanup runs in a `useEffect` cleanup function, not only on explicit close, so navigating away or unmounting never leaves the camera active.

## Security

- UI carries a visible "Prototype — not connected to a backend" label, consistent with how other 🔴-track demos in this sprint (e.g. `ExamSets.tsx`) are expected to disclose mock/prototype status.
- Camera video is processed in-memory only; never recorded, stored, or transmitted.
- No new field added to `localStorage` beyond what `ProctorAttendance.tsx` already persists (`philsa_proctor_dist_states`); the scan only changes existing `StudentPC.attendance`/`device`/`battery` fields the same way the manual button already does.
- All matching data (`qrCode` values, student names, IDs) stays synthetic, matching the existing mock data already in this file.
- No API, model, migration, or integration is created — satisfies `AGENTS.md`'s requirement that those require separately reviewed contracts.

## Testing

- **Unit (Vitest):** `qrAttendanceService.test.ts` — match found, no match, empty roster, already-present case.
- **Component (RTL):** `QrScanModal.test.tsx` — with `html5-qrcode` mocked: renders, permission-denied fallback shows manual entry, successful decode invokes the callback, cleanup stops the mock stream on unmount.
- **Integration:** extend `ProctorAttendance.tsx`'s existing test coverage (if any exists today — to be confirmed in the plan) for the "Scan QR" button wiring: successful scan updates the row and stats identically to the manual button.
- **Not unit-testable, disclosed as manual-only:** actual camera hardware decode accuracy. This stays a manual smoke-test item in the implementation log, never claimed as an automated pass.

## Open items resolved during self-review

- Removed dependence on the separate `permits` mock array (see "Mock data decision") — this was the one placeholder-shaped gap in the original design; resolved explicitly rather than left as TBD.
