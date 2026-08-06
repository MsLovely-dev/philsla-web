# Jo.Ganapin — Task Log

Per-developer working reference for Joshua Ganapin (short code `jo.ganapin`), per the structure defined in the root `AGENTS.md` ("AI-assisted development workflow") and `build_plan.md`.

## Ticket 001 — QR Scanning (Testing Center Ops)

| Field | Value |
|---|---|
| Status | **Design approved — implementation not yet authorized** |
| Track | Testing Center Ops — 🔴 no backend (`backend/apps/proctoring` contains only `.gitkeep`) |
| Owner | Joshua Ganapin (Jo.Ganapin) |
| Decision date | 2026-08-05 |
| Worktree | `worktrees/jo.ganapin/` |
| Branch | `jo.ganapin/qr-scanning` |
| Spec | [`specs/2026-08-05-qr-scanning-design.md`](specs/2026-08-05-qr-scanning-design.md) |
| Plan | [`plans/2026-08-05-qr-scanning-plan.md`](plans/2026-08-05-qr-scanning-plan.md) |
| Implementation log | [`implement/jo.ganapin.implement.md`](implement/jo.ganapin.implement.md) |

### Problem

`backend/apps/proctoring` has no QR validation logic or API — confirmed empty stub. `frontend/src/pages/proctor/ProctorAttendance.tsx` (route `/proctor/attendance`) currently only supports manual Present/Late/Absent buttons; it has no QR capability. `docs/USER_STORY.md` story #13 calls for a proctor to scan a student's permit QR at the door and have their status flip to "Present." The student side already renders a QR per permit today via `qrcode.react` on `ExamPermitPage.tsx`.

### Evidence reviewed

- `build_plan.md` roster: QR Scanning / Testing Center Ops / 🔴 no backend, Wednesday deliverable is scope agreement, Thursday is a self-contained client-side demo, Friday is dry-run only — no backend integration attempted at any point this sprint.
- `backend/apps/proctoring/.gitkeep` — no models, no endpoints.
- `frontend/src/pages/proctor/ProctorAttendance.tsx` — manual attendance buttons only, no scan flow.
- `frontend/src/pages/ExamPermitPage.tsx` — `QRCodeSVG` from `qrcode.react` already renders `permit.qrCode`; confirms the student-side QR generation pattern to reference.
- `frontend/package.json` — no QR-decode/scanning library present; `qrcode.react` only generates, does not read.
- `frontend/src/pages/admin/maintenance/AttendanceRulesMaintenance.tsx` — existing attendance status codes (PR/AB/LT/DQ) that any scan-driven status change must stay consistent with.

### Decision / solution

Build a **client-side-only, real-camera QR scan** as a demo prototype: a "Scan QR" button on `ProctorAttendance.tsx` opens a modal that decodes a QR code via camera (new dependency, `html5-qrcode`) and matches it against the page's existing mock roster to flip that candidate's status to Present — reusing the page's existing state, stats, and audit-log calls. No backend call at any point. Full design in the linked spec.

### Security requirements

- Label the feature as a prototype, not connected to `backend/apps/proctoring` — must not imply production identity verification.
- Camera video is never persisted, recorded, or uploaded; the stream is released on modal close/unmount.
- No new sensitive data enters `localStorage`; matching runs only against synthetic mock data already in the bundle.
- No API, model, migration, or backend integration is created under this ticket.
- Keep errors/logs free of any real candidate data (synthetic only, consistent with existing mock records in this file).

### Review-only action plan

- [x] Read the root `AGENTS.md` and `build_plan.md`.
- [x] Confirm `backend/apps/proctoring` is an empty stub and the frontend has no existing scan capability.
- [x] Brainstorm and get design approach confirmed (real camera scan; modal on the existing attendance page).
- [x] Write spec and phasing plan.
- [ ] Obtain user approval of the spec and plan.
- [ ] Only after approval: begin Phase 1 of the plan on branch `jo.ganapin/qr-scanning`.

### Resumption / go-ahead gates

- [ ] Spec (`specs/2026-08-05-qr-scanning-design.md`) reviewed and approved.
- [ ] Plan (`plans/2026-08-05-qr-scanning-plan.md`) reviewed and approved.
- [ ] Only then does implementation begin, logged in `implement/jo.ganapin.implement.md`.

### Review gate

No implementation may begin from this entry. The user must review and approve the linked spec and plan first.
