# QR Scanning — Desktop Proctor App Preview — Design

**Date:** 2026-08-06
**Owner:** Joshua Ganapin (Jo.Ganapin)
**Ticket:** [Ticket 001](../jo.ganapin.task.md#ticket-001--qr-scanning-desktop-proctor-app-preview)
**Status:** Approved (2026-08-07) — grace period set to 30 minutes

## Problem and context

`docs/USER_STORY.md` story #13: a proctor scans a candidate's permit QR at the door and the candidate's attendance status becomes "Present." Locked architecture decision **D-QR-01** places this inside the Proctor's desktop exam client (webcam or USB HID scanner), not a separate mobile app or an independent web feature — because offline schedule/seat data is already cached locally in the desktop client, it reuses the Proctor's existing session, and it writes into one audit trail instead of two. That desktop app (`b.mendoza/desktop-app-proctor`) does not exist yet — no Tauri/.NET scaffold exists anywhere in this repo.

This ticket therefore builds a **preview/stand-in screen** for that future desktop app inside the existing web `frontend/src/pages/proctor/ProctorAttendance.tsx` page — not a production web feature in its own right, and not the eventual desktop implementation. When the real desktop Proctor app exists, this logic is meant to inform that build, not live beside it as a permanent second implementation.

### What already exists on disk (verified directly against files, not against recovered docs)

- `frontend/src/pages/proctor/QrScanModal.tsx` — a camera-scanning modal with a manual code-entry fallback. Reusable, but has three unfixed defects (below).
- `frontend/src/services/qrAttendanceService.ts` (+ `.test.ts`) — `matchScannedCodeToStudent(qrValue, students)`, a pure, tested match function against a room roster's `qrCode` field.
- `qrCode` fields already present on every mock `StudentPC` record in `ProctorAttendance.tsx`'s `getInitialStudentPCs()`.
- **Not present:** any wiring of the above into `ProctorAttendance.tsx` — no "Scan QR" button, no handler.
- **Not in scope:** `backend/apps/attendance` — a real, migrated, routed Django app (`POST /api/v1/attendance/scan/`) built for a future mobile scanner app, with zero test coverage. This ticket makes no call to it.

### Known defects in the reused code (verified against the current file, source: a prior local code-review artifact)

1. **Cleanup can crash the app.** `QrScanModal`'s `useEffect` cleanup calls `scanner.stop().catch(() => {})`. `html5-qrcode`'s real `stop()` throws *synchronously* (not a rejected promise) when nothing was actually scanning — e.g. camera permission was denied and the manual-entry fallback was used instead. `.catch()` never sees a synchronous throw; it propagates out of the cleanup function. There is no `ErrorBoundary` anywhere in `frontend/src`, so this blanks the entire app.
2. **Orphaned camera stream.** `start()` is async. If the modal closes/unmounts before `start()` resolves, cleanup's `stop()` call has nothing to stop yet (hits defect 1's throw), and `start()` then resolves afterward and begins scanning with nothing left to ever stop it — violating the hard requirement that the camera stream always stops on close/unmount.
3. **Reopen-after-error crash.** `cameraError` is component state that survives an open→close→open cycle (the modal is mounted persistently by the page, not remounted per open). On reopen, the scan region `<div>` isn't rendered yet (stale `cameraError === true`), but the camera effect still constructs `new Html5Qrcode(regionId)` against a DOM with no matching element, which throws.
4. **Cross-page `qrCode` loss.** The roster `ProctorAttendance.tsx` actually renders is hydrated from `localStorage['philsa_proctor_dist_states']`, not always from `getInitialStudentPCs()`. `ProctorSchedule.tsx` has its own unsynchronized `StudentPC`/`getInitialStudentPCs` (no `qrCode` field) that writes into the same shared key. Visiting Exam Schedule before Attendance — a normal navigation order — leaves that room's persisted roster with no `qrCode` on any record, so every scan silently reports "not recognized" with no indication why.

These are pre-existing defects, not introduced by this design. They must be fixed before new wiring is added on top of them (see plan ordering).

## Goals

- A proctor can scan a candidate's QR (camera or manual fallback) on `ProctorAttendance.tsx` and have that candidate's row flip to Present or Late, computed the same way a human proctor's manual judgment call already reaches those statuses today — no parallel status machine.
- The four known defects in the reused camera/matching code are fixed, with regression tests, before the new "Scan QR" button exists.
- The feature is clearly labeled a desktop-app preview, not a production web feature or an identity-verification control.
- No backend call, no new persisted data beyond fixing the existing cross-page bug.

## Non-goals

- No backend API, model, migration, or `backend/apps/attendance` change of any kind.
- No real desktop app, offline cache, or USB HID scanner support — that remains `b.mendoza/desktop-app-proctor`'s eventual scope.
- No changes to the Absent/Technical-Issue manual flows or the lock/distribution logic already in `ProctorAttendance.tsx` beyond what's needed to add the scan path alongside them.
- No cryptographic permit signature validation — the mock data has no such concept, and inventing one here would misrepresent what a demo can prove.

## Architecture

No new dependency (`html5-qrcode` is already installed). No new component — `QrScanModal.tsx` and `qrAttendanceService.ts` are fixed and extended in place, then wired into `ProctorAttendance.tsx`.

**`qrAttendanceService.ts` additions:**
- `resolveScheduledStart(schedule: { date: string; time: string }): Date` — parses the mock schedule's existing `date` + `time` fields into a single timestamp.
- `computeScanStatus(scheduledStart: Date, scannedAt: Date, graceMinutes: number): 'PRESENT' | 'LATE'` — pure function, no I/O: `scannedAt <= scheduledStart + graceMinutes` → `'PRESENT'`, else `'LATE'`.
- `DEFAULT_LATE_GRACE_MINUTES = 30` exported constant (see "Grace-period rule" below).

**`QrScanModal.tsx` fixes (no API change to its props):**
- Wrap the cleanup's `stop()` call in an outer `try`/`catch` in addition to the existing `.catch()`, so a synchronous throw can never escape the `useEffect` cleanup.
- Track open/mount state through the `start()` continuation; if the modal closed before `start()` resolved, stop the scanner immediately once it does.
- Always render the scan-region `<div>` (visually hidden when `cameraError` is true) so the `Html5Qrcode` constructor can never fail to find its target element on reopen.

**`ProctorAttendance.tsx` additions:**
- Backfill `qrCode` when reading persisted state (`getDistState`), e.g. `qrCode: s.qrCode ?? \`SAMPLE_QR_${s.id}\`` per record — closes defect 4 without needing to touch `ProctorSchedule.tsx`'s duplicate, since the backfill runs on every read regardless of which page last wrote the shared key.
- "Scan QR" button, same visibility condition as "Mark All Present" (`!attendanceComplete && !isExamDistributed`).
- `handleQrScan(value: string)`: debounced (a ref tracking the last-handled value within a short window) so a code held in frame — `html5-qrcode` redecodes ~10x/sec — doesn't fire the match/update logic more than once per physical scan.
- Visible label: "Desktop App Preview — not connected to a backend."

## Grace-period rule (new — needs explicit confirmation, not inferred from any existing spec)

`FR-009` and `LATE_ADMISSION_GRACE_MINUTES`, referenced narratively in `build_plan.md`, do not exist anywhere in `docs/` or the codebase — there is no existing rule to reuse. This design proposes and needs sign-off on:

- **`DEFAULT_LATE_GRACE_MINUTES = 30`** — a candidate scanned at or before `scheduledStart + 30min` is Present; after that, Late. (Confirmed by user 2026-08-07.)
- Source of `scheduledStart`: the currently-selected mock schedule's existing `date` + `time` fields (e.g. `'2026-06-15'` + `'08:00 AM'`).
- This value and this computation exist only in this preview's client-side logic — they are not claimed anywhere as an approved platform-wide attendance rule, and the spec/plan/task-log say so explicitly.

## Data flow

1. Proctor clicks "Scan QR" → `QrScanModal` opens (fixed camera lifecycle) → decodes or manual entry produces a raw string.
2. `handleQrScan(value)` debounces, then calls `matchScannedCodeToStudent(value, students)` against the current schedule's (backfilled) roster.
3. **No match:** inline "QR not recognized for this room" message, no state change, no audit entry, scanning continues.
4. **Match, already Present or Late:** inline "Already marked <status>" message, no state change, no audit entry.
5. **Match, not yet marked:** compute status via `computeScanStatus(...)` against `DEFAULT_LATE_GRACE_MINUTES`; call the page's existing `updateStatus(id, status)` and `addAuditLog('ATTENDANCE_LOCK', ...)` — the same effect the manual Present/Late paths already produce, just reached by a scan.
6. Proctor closes the modal at any point → camera stream stops immediately (all fixes from defects 1–3 apply here).

## Error handling

- Camera permission denied / no camera: manual code-entry fallback (already built), unchanged.
- Rapid repeated decodes of the same code: debounced to exactly one handled scan per hold (new — closes the duplicate-audit-entry risk the prior review flagged).
- Modal closed mid-start or reopened after a prior camera error: no crash, no orphaned stream (defects 1–3 fixed).
- Roster hydrated from `localStorage` with no `qrCode` on a record: backfilled on read, scan still matches (defect 4 fixed).

## Security

- No backend call at any point; `backend/apps/attendance` is untouched by this ticket.
- Camera video processed in-memory only; never recorded, stored, or transmitted; stream guaranteed to stop on close/unmount by the defect fixes above.
- No new `localStorage` field; the backfill only fills in an already-expected field, it doesn't add a new one.
- All matching data (`qrCode` values, names, IDs) stays synthetic, consistent with existing mock data.
- Visible "Desktop App Preview — not connected to a backend" label prevents this from being mistaken for a working desktop client or an identity-verification control.

## Testing

- **Unit (Vitest):** `qrAttendanceService.test.ts` extended with `computeScanStatus`/`resolveScheduledStart` cases (before grace, at grace boundary, after grace).
- **Component (RTL):** `QrScanModal.test.tsx` extended with the three regression cases the prior review specified: `stop()` throwing synchronously, close-before-start-resolves, and a full close→(error)→reopen cycle. Existing mocks must be updated to reflect these real library behaviors, not just idealized ones.
- **Page-level:** a new/extended `ProctorAttendance.test.tsx` covering: scan button opens modal; a scan before grace expiry marks Present; a scan after grace expiry marks Late; already-marked and no-match scans are no-ops; a pre-seeded `localStorage` roster with no `qrCode` on its records still matches (defect 4 regression); rapid repeated decodes of the same value produce exactly one `updateStatus`/`addAuditLog` call.
- **Not unit-testable, disclosed as manual-only:** real camera hardware decode accuracy — stays a human smoke-test item logged in the implementation log, never claimed as automated.

## Open items resolved during self-review

- Confirmed no existing grace-period rule exists to reuse (checked `docs/BRD.md`, `docs/USER_STORY.md`, and the whole repo for `FR-009`/`LATE_ADMISSION_GRACE_MINUTES`) — flagged explicitly above rather than left as an implicit assumption.
- Confirmed the "reuse existing status machinery" principle from the original design still holds even with the new Late computation added — Late still goes through the exact same `updateStatus`/`addAuditLog` calls the manual "Mark Late" path already uses, just with the status decided by `computeScanStatus` instead of the proctor's own judgment.
