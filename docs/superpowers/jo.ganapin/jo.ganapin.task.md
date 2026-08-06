# Jo.Ganapin — Task Log

Per-developer working reference for Joshua Ganapin (short code `jo.ganapin`), per the structure defined in the root `AGENTS.md` ("AI-assisted development workflow") and `build_plan.md`.

## Ticket 001 — QR Scanning (Desktop Proctor App Preview)

| Field | Value |
|---|---|
| Status | **Design approved — implementation not yet authorized** |
| Track | BRD-04A Proctoring — desktop-app-only per decision D-QR-01; built this sprint as a preview screen inside the existing web `ProctorAttendance.tsx` page, since no desktop Proctor app exists yet |
| Owner | Joshua Ganapin (Jo.Ganapin) |
| Decision date | 2026-08-06 |
| Worktree | `worktrees/jo.ganapin/` |
| Branch | `jo.ganapin/qr-scanning` |
| Spec | [`specs/2026-08-06-qr-scanning-design.md`](specs/2026-08-06-qr-scanning-design.md) |
| Plan | [`plans/2026-08-06-qr-scanning-plan.md`](plans/2026-08-06-qr-scanning-plan.md) |
| Implementation log | [`implement/jo.ganapin.implement.md`](implement/jo.ganapin.implement.md) |

### Problem

The `build_plan.md` roster row for this ticket is stale ("no backend (proctoring app empty)") — `backend/apps/proctoring` no longer exists at all, having been replaced by `backend/apps/attendance`, a real Django app with models, migrations, and a routed endpoint (`POST /api/v1/attendance/scan/`) built for a future *mobile* scanner app. Separately, a prior session already built a frontend web-based scan prototype (`QrScanModal.tsx`, `qrAttendanceService.ts`, mock `qrCode` fields on the roster) and ran it through this project's subagent-driven-development review process — that review found the component **not ready to merge** (4 Critical, 3 Important findings) and the fix wave was never applied. The governing docs for all of this (BRD, spec, plan, task log) had also been deleted from the working tree without being committed.

This entry restarts the ticket from a corrected, verified baseline: the original **D-QR-01 desktop-app-only decision** (QR scanning is a screen inside B.Mendoza's not-yet-built desktop Proctor app, not an independent web feature or the mobile-assuming backend), reusing the already-built frontend pieces where safe to do so, and fixing the known defects before adding anything new on top of them.

### Evidence reviewed

- `build_plan.md` (current) vs. the row pasted into this ticket: confirmed stale on both the backend claim and the D-QR-01/desktop-app framing, which was dropped from the current file.
- `backend/apps/proctoring` confirmed absent; `backend/apps/attendance` confirmed present, migrated, and routed at `api/v1/attendance/`, with zero test coverage — out of scope for this ticket (built for a different, mobile-app-shaped consumer).
- `frontend/src/pages/proctor/QrScanModal.tsx`, `frontend/src/services/qrAttendanceService.ts` (+ `.test.ts`), and `qrCode` fields on `ProctorAttendance.tsx`'s mock roster: confirmed present on disk and reusable, but **not wired into `ProctorAttendance.tsx`** — no "Scan QR" button or handler exists today.
- `.superpowers/sdd/2026-08-05-qr-scanning-plan/final-review-findings.md` (local, untracked session artifact): documents 4 Critical + 3 Important findings against `QrScanModal.tsx`/`ProctorAttendance.tsx`'s (never-landed) wiring. Verified directly against the current file that the 3 findings still applicable to the modal in isolation (synchronous-throw-on-cleanup crash, orphaned camera stream on early close, reopen-after-error crash) are **still present, unfixed**.
- `frontend/src/pages/proctor/ProctorSchedule.tsx`: confirmed a second, unsynchronized `StudentPC`/`getInitialStudentPCs` definition (no `qrCode` field) writing into the same shared `localStorage['philsa_proctor_dist_states']` key used by `ProctorAttendance.tsx` — a latent bug that would silently break scan-matching once wiring exists.
- `docs/BRD.md`, `docs/USER_STORY.md` (story #13), `build_plan.md`: confirmed `FR-009` and `LATE_ADMISSION_GRACE_MINUTES` are referenced narratively but not defined anywhere in code or docs — no existing grace-period rule to reuse.

### Decision / solution

Build a **desktop-Proctor-app preview screen** inside the existing `ProctorAttendance.tsx` web page, explicitly labeled "Desktop App Preview — not connected to a backend" (not "Prototype," per the D-QR-01 framing that this is a stand-in for a future desktop app screen, not an independent web feature). Reuse `QrScanModal.tsx` and `qrAttendanceService.ts` as a base, but fix all four known defects first. Add a new, explicitly-flagged-as-new placeholder business rule (`DEFAULT_LATE_GRACE_MINUTES = 15`) to compute Present vs. Late on scan, since no such rule exists today. No backend call of any kind. Full design in the linked spec; execution order in the linked plan.

### Security requirements

- No call to `backend/apps/attendance` or any backend from this ticket's code.
- Label the feature "Desktop App Preview — not connected to a backend" — must not imply production identity verification or a working desktop client.
- Camera video processed in-memory only; never recorded, stored, or transmitted; stream stops immediately on modal close/unmount (this is the exact property Critical findings C1–C3 currently violate — fixing them is a security requirement, not just a bug fix).
- No new `localStorage` fields beyond fixing the existing cross-page `qrCode` hydration bug (C4).
- All QR values, student names, and IDs stay synthetic, consistent with existing mock data.
- The 15-minute grace-period constant is disclosed in the spec as a new, unapproved-elsewhere placeholder — not represented anywhere as an existing platform rule.

### Review-only action plan

- [x] Read the root `AGENTS.md` and `build_plan.md`.
- [x] Confirm current on-disk reality of `backend/apps/proctoring`/`apps/attendance` and the frontend prototype pieces (not just recovered docs).
- [x] Recover and review the deleted BRD/spec/plan/task-log and the local SDD session ledger for prior, unresolved review findings.
- [x] Brainstorm and confirm scope: desktop-app-only framing (D-QR-01), backend out of scope, reuse-and-fix existing frontend pieces, placeholder grace-period rule at 15 minutes.
- [x] Write spec and phasing plan.
- [ ] Obtain user approval of the spec and plan.
- [ ] Only after approval: begin Phase 1 of the plan on branch `jo.ganapin/qr-scanning`.

### Resumption / go-ahead gates

- [ ] Spec (`specs/2026-08-06-qr-scanning-design.md`) reviewed and approved.
- [ ] Plan (`plans/2026-08-06-qr-scanning-plan.md`) reviewed and approved.
- [ ] Only then does implementation begin, logged in `implement/jo.ganapin.implement.md`.

### Review gate

No implementation may begin from this entry. The user must review and approve the linked spec and plan first.
