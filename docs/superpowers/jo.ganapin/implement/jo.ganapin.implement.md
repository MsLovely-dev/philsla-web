# Jo.Ganapin — Implementation Log

Records what was actually built and verified on branch `jo.ganapin/qr-scanning`, against
[`../plans/2026-08-06-qr-scanning-plan.md`](../plans/2026-08-06-qr-scanning-plan.md) and its linked
[spec](../specs/2026-08-06-qr-scanning-design.md). Grace period confirmed by the user at 30 minutes
(not the spec's originally-proposed 15) on 2026-08-07.

## Status

All plan phases (1–6) complete. Feature is live on `ProctorAttendance.tsx`, Proctor role only.
Two further rounds of visual polish landed after the user tried it live (Phases 4f and 4g below).

## Phase 4f — Visual polish after live device testing (test-first)

Requested after the user scanned the generated test codes with a real phone/webcam and reviewed the
live modal against a permit mockup:

- **Modal widened further**: `max-w-3xl` → `max-w-5xl`, with the two-column grid changed from an
  even split to a fixed `380px` camera column and a flexible results column, giving the results list
  more room now that it renders profile-style cards instead of compact rows.
- **Results panel header**: added a "Clear" button, top-right of the "Scan Results" label, wired to
  `setScanResults([])`. Only rendered when there's at least one entry.
- **Result cards redesigned as profile cards**: each entry is now a bordered white card with a
  circular initials avatar (or a muted "?" avatar for no-match scans), name, ID, a status badge, and
  a footer row with scan time and late-duration. Modeled on the exam-permit mockup's profile section
  (photo, name, ID) with the QR intentionally omitted, per instruction.
- **"Not Recognized" → "Invalid"**: the no-match badge label was renamed for clarity; the separate
  inline `scanMessage` banner text ("QR not recognized for this room.") was left as-is since it's
  prose, not a status label.
- **`formatLateDuration` day rollup**: the live screenshot the user shared showed "1273 hr 18 min
  late" — correct math, unreadable output, because the mock schedule's fixed date is now well in the
  past. Added a 24-hour rollup ("53 days 3 hr late", "1 day late", "2 days late") so the display
  stays sane without changing the underlying Present/Late computation.
- `npm test -- QrScanModal qrAttendanceService ProctorAttendance --run`: 51/51 pass.
- `npx tsc --noEmit`: only the same pre-existing, unrelated `ExamSet.name` error, now at a different
  line number due to the added code — confirmed unrelated (present before this ticket's changes).

## Phase 1 — `QrScanModal.tsx` camera-lifecycle defects (test-first)

- Added regression tests to `QrScanModal.test.tsx`: synchronous `stop()` throw during cleanup,
  `start()` resolving after close, and reopen-after-camera-error. All three failed red against the
  pre-existing code, confirming the defects were real.
- Fixed: cleanup's `stop()` call wrapped in an outer `try`/`catch` (`stopScanner` helper); the
  `start()` promise's `.then()` now stops the scanner immediately if the modal already
  closed/unmounted before it resolved; the scan-region `<div>` is now always rendered (hidden via
  CSS when `cameraError`) instead of conditionally unmounted.
- Also fixed a pre-existing, unrelated test-isolation bug in the same file (the `Html5Qrcode`
  constructor mock's call count wasn't cleared between tests — `mockClear()` added), matching a fix
  already verified good on a sibling branch (`ea50a95`).
- `npm test -- QrScanModal --run`: 12/12 pass.

## Phase 2 — Cross-page `qrCode` hydration loss (test-first)

- Extracted `backfillQrCode` as a pure, unit-tested function in `qrAttendanceService.ts` rather than
  the plan's literal "page-level test" (that test needs the Scan QR button, which didn't exist until
  Phase 4 — an ordering gap in the plan). Wired into `ProctorAttendance.tsx`'s `getDistState`.
  The actual page-level regression case (pre-seeded `localStorage` roster with no `qrCode`) is
  covered in Phase 4's test suite once the scan button exists to drive it.
- `npm test -- qrAttendanceService --run`: 7/7 pass at this point.

## Phase 3 — Grace-period Present/Late logic (test-first)

- Added `resolveScheduledStart`, `computeScanStatus`, `DEFAULT_LATE_GRACE_MINUTES` (= 30, per user
  confirmation) to `qrAttendanceService.ts`. Cases: before/at/after grace boundary, before scheduled
  start entirely.
- `npm test -- qrAttendanceService --run`: 13/13 pass at this point.

## Phase 4 — Wire "Scan QR" into `ProctorAttendance.tsx` (test-first)

- New `ProctorAttendance.test.tsx`: button visibility parity with "Mark All Present", modal opens
  with the desktop-app-preview label, Present/Late outcomes by scan time, already-marked and
  no-match no-ops, debounced rapid-repeat decodes (one `updateStatus`/`addAuditLog` call), and the
  deferred defect-4 regression (no-`qrCode` persisted roster still matches).
- Test-infra notes: `vi.useFakeTimers()` combined with `waitFor`/`userEvent` deadlocked every test at
  the 5s timeout (fake timers stall testing-library's internal polling unless manually advanced) —
  switched to spying on `Date.now()` only, leaving the real timer queue alone. Also fixed an
  `Html5Qrcode` mock using an arrow function where `new` requires a real function/constructor.
- `npm test -- ProctorAttendance --run`: 8/8 pass at this point.

## Phase 4b–4e — Additional scope, added after user feedback mid-implementation

Requested live, not in the original spec/plan — logged here for traceability:

- **Front/back camera switch** (`QrScanModal.tsx`): `facingMode` state toggles `'environment'` /
  `'user'`, restarting the scan effect. Button labeled by which camera it switches *to*
  ("Switch to Front Cam" / "Switch to Back Cam") after user feedback that a static "Switch Camera"
  label was ambiguous about direction.
- **Front-camera mirroring**: verified directly against `html5-qrcode`'s source
  (`node_modules/html5-qrcode/esm/html5-qrcode.js`) that the library applies no mirror/flip logic at
  all — decoding always reads the raw camera frame via canvas, unaffected by any CSS transform. A
  `-scale-x-100` mirror is applied to the *preview* only, for human viewing comfort, with no effect
  on decode correctness. No per-frame dual-orientation decode retry was built: `Html5Qrcode.start()`
  doesn't expose a hook into individual frames, so that would require bypassing its scan loop
  entirely — assessed as disproportionate risk for a disclosed preview feature.
- **Scan results panel**: `QrScanModal` gained an optional `results` prop (caller-owned `ReactNode`);
  when present the modal widens to a two-column layout. `ProctorAttendance.tsx` tracks a
  `scanResults` list (name, ID, scan time, outcome, late-duration label for Late) rendered via a
  local `ScanResultsPanel` component, newest first.
- **Late-duration formatting**: `formatLateDuration(graceDeadline, scannedAt)` added to
  `qrAttendanceService.ts` — e.g. "1 hr 30 min late", "5 min late", "just now".
- `npm test -- QrScanModal qrAttendanceService ProctorAttendance --run`: 47/47 pass.

### QR test codes for manual device testing

Generated 3 real, scannable QR codes (via this repo's own `qrcode.react` dependency, rendered
server-side with `react-dom/server`) as a published page: two valid codes matching `ST-001`/`ST-002`
in the `sch1` mock roster, one invalid/no-match code. Documented explicitly on that page: Present vs.
Late is decided by scan *time* against the schedule's grace deadline, not by which code is scanned —
since the mock schedule (`2026-06-15 08:00 AM`) is now in the past, a live scan today will always
land as Late (correct behavior, not a bug); the Present path is covered by the automated suite's
mocked clock instead.

## Phase 5 — Documentation and demo labeling polish

- Confirmed "Desktop App Preview — not connected to a backend" is visible in the modal (via the
  `hint` prop) and in the Scan Permit QR button's tooltip.
- Grepped `QrScanModal.tsx` and `ProctorAttendance.tsx` for any reference to `apps/attendance`,
  identity verification, or backend calls (`fetch`/`axios`) — none found.

## Phase 6 — Verification

- `npm test -- --run` (full suite): 278 passed, 9 failed. All 9 failures are in
  `src/pages/admin/maintenance/{MaintenanceCenterTables,UniversitiesListMaintenance}.test.tsx`
  (a `backendUniversityService` export mismatch) — confirmed pre-existing and unrelated via
  `git diff --stat -- src/pages/admin/maintenance/` (empty; this ticket never touched that
  directory).
- `npm run lint` (`tsc --noEmit`): pre-existing errors across the codebase (`CommandCenter.tsx`,
  `StudentApplication.tsx`, `backendAuthService.ts`, etc.), none in any file this ticket touched.
  One pre-existing error in `ProctorAttendance.tsx` (`ExamSet.name` doesn't exist on the type) was
  already present before this ticket's changes, at a different line number due to insertions —
  confirmed unrelated and out of scope.
- `npm run build`: succeeds (`vite build`, 25s). Pre-existing chunk-size advisory only.
- Manual real-camera smoke test: **outstanding**, no camera available to this agent. The published
  QR test-codes page and the front/back camera switch are built for the user to do this manually.

## Phase 4g — Replace results list with a single detail card + separate History modal (test-first)

After trying the live scan flow (real device, real permit mockup for comparison), the user asked for
a different structure than Phase 4f's list-in-the-right-panel:

- The right-hand panel of the scan modal now shows a **single permit-style detail card** for the
  most recently scanned candidate only — modeled on the actual exam-permit UI (photo/avatar, name,
  "✓ Verified in roster", Exam Schedule & Location: date, time slot, testing station, room & seat,
  assigned proctor) with the QR intentionally omitted (it's a scan *result*, not the permit). Status
  badge (Present/Late/Already Marked) sits top-right of the card. Invalid/no-match scans get a
  distinct red error card instead of the permit layout, showing the raw scanned value.
- Data sourced for schedule/proctor fields is real, not fabricated: `schedule` comes from
  `schedules.find(s => s.id === selectedScheduleId)`; `proctorName` from the logged-in
  `usePhilSA().user`'s first/last name — no invented "exam method" or authenticity-signature field
  was added, consistent with the design's warning against misrepresenting what a demo can prove.
- **History moved to its own modal**: a "History (n)" button top-right of the detail card opens a
  second `role="dialog"` (`aria-label="Scan History"`, `z-[110]`, stacked above the scan modal)
  listing every past scan as the previous compact profile-card rows, with its own "Clear" button.
  Clearing empties `scanResults`, which also resets the detail card to its placeholder state since
  both derive from the same array (`scanResults[0]` = latest).
- Extracted `scanOutcomeBadge()` and `ScanResultCard` so the badge logic and compact row markup are
  shared between the (now single) detail card and the History modal's list, rather than duplicated.
- `npm test -- QrScanModal qrAttendanceService ProctorAttendance --run`: 52/52 pass.
- `npx tsc --noEmit`: only the same pre-existing, unrelated `ExamSet.name` error (line number
  shifted again from the added code).

## Phase 4h — Privacy auto-hide for the detail card (test-first)

User confirmation + new requirement: (1) confirmed a second scan immediately swaps the detail card
to the new candidate — already true, since it renders `scanResults[0]`; locked in with an explicit
regression test. (2) New: the detail card should hide itself `SCAN_DETAIL_VISIBILITY_MS` (5000ms)
after the last scan if nothing new is scanned, so a candidate's name/status isn't left visible
on-screen indefinitely (walk-by privacy concern) — the History modal (an intentional log) is
unaffected.

- Added `showLatestScanDetail` state + a `useEffect` keyed on `scanResults[0]?.id`: sets visible
  true and starts a 5s `setTimeout` on every new scan id, clearing the previous timer first.
  `ScannedCandidateDetail`'s `latest` prop is now `showLatestScanDetail ? scanResults[0] ?? null : null`.
- Test-infra note: mixing `vi.useFakeTimers()` with `userEvent`/`waitFor` deadlocked earlier in this
  ticket (Phase 4, `Date.now()`-spy workaround). For this one test, used
  `vi.useFakeTimers({ shouldAdvanceTime: true })` (bridges real elapsed time into the fake clock, so
  `waitFor` polling keeps working) plus `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`,
  then `act(() => vi.advanceTimersByTime(5000))` to jump forward instantly at the point that matters.
- `npm test -- QrScanModal qrAttendanceService ProctorAttendance --run`: 54/54 pass.
- `npx tsc --noEmit`: only the same pre-existing, unrelated `ExamSet.name` error.

## Phase 4i — Colored status line + "already scanned" note (test-first)

- `ScanResultEntry` gained `attendanceStatus?: 'Present' | 'Late'` (the candidate's actual current
  status — set for PRESENT, LATE, *and* ALREADY_MARKED alike, since "Already Marked" alone doesn't
  say which status they're already in) and `previouslyScannedAt?: number`.
- `previouslyScannedAt` is only ever set from this session's own `scanResults` history (a lookup by
  matching `rawValue` before recording the new entry) — never fabricated. If a candidate was marked
  Present via the manual table button and never scanned before, no "already scanned at" note
  appears, since that would misrepresent data we don't have.
- Detail card footer redesigned: scan time now renders in black (`text-black`, was `text-slate-400`)
  under `data-testid="scan-time"`; a `data-testid="scan-status-line"` shows "Status: Present" in
  emerald or "Status: Late — <duration>" in amber; an "already scanned" note (red) appears only when
  `previouslyScannedAt` is set.
- `npm test -- QrScanModal qrAttendanceService ProctorAttendance --run`: 55/55 pass.
- `npx tsc --noEmit`: only the same pre-existing, unrelated `ExamSet.name` error.

## Phase 4j — Two bugs found in live device testing (test-first)

The user's live screenshot showed the same candidate appearing 4 times in the History modal
("ALREADY MARKED" repeated every ~11s) and a "STATUS: LATE" line with no duration shown. Root causes:

1. **Debounce was a one-shot timer, not a sliding window.** `lastHandledScanRef` was only updated
   when a scan was *acted on*, not on every decode. `html5-qrcode` redecodes ~10x/sec while a code
   stays in frame, so holding a code up continuously crossed the 3s debounce threshold roughly every
   3 seconds and got processed again as a "new" duplicate scan — which looked like the original
   info vanishing early. Fixed by updating the ref on *every* decode call (whether acted on or not),
   so the gap is measured from the last time the code was *seen*, not the last time it was recorded.
2. **Late duration was copied from history instead of computed fresh** for the `ALREADY_MARKED`
   branch, and the chain could silently lose the value. Fixed by computing `graceDeadline` once up
   front and calling `formatLateDuration(graceDeadline, new Date(now))` fresh in both branches.

While fixing #1, the user separately clarified the intended behavior further: History should record
only the **first** attempt per scanned code — rescans (whether from the debounce fix now letting a
genuine second attempt through, or a proctor deliberately checking again) must not add a duplicate
entry or change the detail card at all. This superseded the "already scanned at &lt;time&gt;" note
added in Phase 4i, which is now unreachable once duplicates stop being recorded — removed it and the
now-dead `previouslyScannedAt` field along with it, rather than leaving unreachable code in place.

- `recordScanResult` now dedupes by `rawValue`: if an entry for this exact code already exists in
  `scanResults`, the call is a no-op (state unchanged). The live `scanMessage` banner still fires on
  every attempt for immediate feedback; only the persisted history/detail card stay untouched.
- Rewrote/removed the tests that encoded the old "second scan updates the display" expectation;
  added a test asserting the History modal shows exactly one entry per candidate after multiple
  scans of the same code.
- `npm test -- QrScanModal qrAttendanceService ProctorAttendance --run`: 56/56 pass.
- `npx tsc --noEmit`: only the same pre-existing, unrelated `ExamSet.name` error.

## Phase 4k — "View" drill-down for History entries (test-first)

- Extracted the permit-card markup (previously only inside `ScannedCandidateDetail`) into a shared
  `ScanPermitCard({ entry, schedule, proctorName })`, used both by the live detail panel and by a
  new drill-down in `ScanHistoryModal`.
- `ScanResultCard` (the compact row in the History list) gained a "View" button; clicking it shows
  that entry's full `ScanPermitCard` inside the History modal, with a "Back to History" button to
  return to the list. `ScanHistoryModal` now takes `schedule`/`proctorName` props to render it.
- `npm test -- QrScanModal qrAttendanceService ProctorAttendance --run`: 57/57 pass.
- `npx tsc --noEmit`: only the same pre-existing, unrelated `ExamSet.name` error.

## Removed: "Desktop App Preview — not connected to a backend" disclosure

Per explicit user instruction (2026-08-07), after they asked what it meant. This reverses a security
requirement stated in the task log's "Security requirements" section
(`jo.ganapin.task.md`: *"Label the feature 'Desktop App Preview — not connected to a backend' — must
not imply production identity verification or a working desktop client"*) — recorded here for
traceability, not silently dropped. The underlying facts the label disclosed are unchanged: this
still runs entirely client-side against mock data, with no call to `backend/apps/attendance` or any
other server, and is still the preview screen described in D-QR-01 pending the real desktop Proctor
app — only the on-screen disclosure text was removed, at the user's request, not the behavior.
Removed the `hint` prop from the `<QrScanModal>` call and the button's `title` tooltip; updated the
test that asserted the text was visible.
- `npm test -- QrScanModal qrAttendanceService ProctorAttendance --run`: 57/57 pass.
- `npx tsc --noEmit`: only the same pre-existing, unrelated `ExamSet.name` error.
