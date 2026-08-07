# Student Portal — Task Log

Sub-initiative folder nested under `docs/superpowers/p.malonzo/`, per the user's explicit instruction on 2026-08-06, kept separate from Prince Malonzo's existing Exam Review docs in the parent folder so the two initiatives' specs/plans/implementation logs don't mix.

## Ownership and process deviation (disclosed explicitly)

- **Recorded owner:** Prince Barachiel Malonzo (P.Malonzo), per `build_plan.md`. **Recorded status:** "🟡 out of scope this sprint," "*(parked — no branch yet)*." Prince's own task log independently confirms: "Keep Student Portal explicitly parked with no branch or implementation work."
- **Actual execution:** this ticket is being designed and (pending approval) implemented by Joshua Ganapin (Jo.Ganapin), in his own session and checkout (branch `jo.ganapin/qr-scanning` — no `worktrees/p.malonzo/` checkout exists, matching the "parked — no branch yet" note), per the user's direct instruction: *"I'm creating student portal in superpowers so i want you to make it focus only in the student portal."*
- This deviates from `AGENTS.md`'s developer-isolation convention (one developer, one worktree, one story) and from the sprint's own recorded scope decision to keep this parked. Recorded here plainly rather than silently treated as routine, so anyone reading this log later understands why the owner field and the actual author don't match.

## Ticket 001 — Student Portal: real backend connections (decomposed)

| Field | Value |
|---|---|
| Status | **Sub-project A extended and implemented** (exam schedule assignment, real backend) — see [`implement/student-portal.implement.md`](implement/student-portal.implement.md). Sub-projects B, C, D remain not started. |
| Track | Student Portal (undefined in any BRD section — confirmed by direct search of `docs/BRD.md`/`docs/USER_STORY.md`; scoped here from what already exists in the frontend, not from a requirements doc) |
| Decision date | 2026-08-06 |
| Branch in use | `jo.ganapin/qr-scanning` (see ownership note above) |

### Problem

"Student Portal" in `build_plan.md` has no defined scope beyond its own row — no BRD reference, no requirements doc. On inspection, most of the ground it could plausibly cover already exists as mock-only frontend: `StudentDashboard.tsx` (application status/document upload, rendered by `Dashboard.tsx` for STUDENT-role users), `StudentApplication.tsx` (already backend-connected via `backendApplicationService`, not a gap), `ExamPermitPage.tsx` (permit/QR, fully mock), `ResultsPage.tsx` (results, fully mock), `ExamDelivery.tsx` (exam-taking, fully mock).

### Decomposition (this is not one project)

| Sub-project | Current state | Backend dependency | Decision |
|---|---|---|---|
| **A. StudentDashboard → real application status/docs** | Mock only | `backend/apps/applications` (already real; `StudentApplication.tsx` already uses it) | **In this cycle** — see spec/plan below |
| **B. ExamPermitPage → real permit + QR** | Mock only, no backend read endpoint exists | `backend/apps/attendance.ExamPermit` (same app as Jo.Ganapin's separate QR-scanning ticket, which currently has only a scan-write endpoint) | Deferred — separate spec/plan cycle, not started |
| **C. ResultsPage → real results** | Mock only | `backend/apps/results` | **Explicitly out of scope** — Prince Malonzo's own task log documents this app as mid-repair: duplicate app registration, broken migrations, an unresolved ownership conflict between Score Management and Exam Review. Touching it here would collide with his active, documented work. |
| **D. ExamDelivery → real exam-taking backend** | Mock only (fake SQLite log strings) | The desktop Proctor/Student exam client itself | **Explicitly out of scope** — this is bienvenido.mendoza's separate BRD-04/04A story (`desktop-app-student`/`desktop-app-proctor`), not started, no Tauri/.NET app exists. Building this here would mean building someone else's ticket. |

### Evidence reviewed

- `build_plan.md` row for Student Portal (P.Malonzo) and the "Standing items" section confirming it's parked.
- `docs/superpowers/p.malonzo/p.malonzo.task.md`'s own recorded scope decision ("Keep Student Portal explicitly parked").
- Direct search of `docs/BRD.md`/`docs/USER_STORY.md` for "Student Portal" — no defining section found.
- `frontend/src/pages/Dashboard.tsx:10,221` — confirms `StudentDashboard` is live (rendered for STUDENT role), not orphaned.
- `frontend/src/pages/student/StudentDashboard.tsx:846-850` — confirms current mock lookup: `applications.find(a => a.userId === user?.id)` against `useMockData()`, client-side and unscoped.
- `frontend/src/services/backendApplicationService.ts` — confirms `StudentApplication.tsx` already uses this real service (`VITE_AUTH_SERVICE_MODE === 'backend'` flag), and that no "get my own application" method exists yet.
- `backend/apps/applications/models.py:31-37,62-65` — `Application.owner` is a `ForeignKey(AUTH_USER_MODEL, related_name="student_applications")` with an existing `can_be_accessed_by` object-level check; `ApplicationStatus` choices (`DRAFT`, `SUBMITTED`, `FOR_CORRECTION`, `RESUBMITTED`, `APPROVED`, `REJECTED`) and `requiredCorrections` already match the shape `StudentDashboard.tsx`'s mock UI expects.
- `backend/apps/applications/urls.py` — confirms no "my application" endpoint exists today, only `review-queue/` (admin) and `<uuid:application_id>/` (requires already knowing the ID).
- `backend/apps/applications/views.py:297-350` — `ApplicationDetailView`/`ApplicationAdditionalAttachmentView` already implement the object-level authorization and attachment access this design reuses.
- `backend/apps/results/` — confirmed near-empty directory listing (no `models.py`/`views.py`/`urls.py` present), consistent with Prince's task log describing it as broken/mid-repair.

### Decision / solution

Design and (pending approval) implement **Sub-project A only** this cycle: a new thin `GET /api/v1/applications/me/` backend endpoint plus frontend wiring so `StudentDashboard.tsx` reads and acts on a real, server-scoped application record instead of an unscoped mock array. Full design in the linked spec; execution order in the linked plan. Sub-projects B, C, D are explicitly not started under this ticket.

### Security requirements

- The new endpoint must return only `request.user`'s own application data — no client-side filtering of an all-applications list, unlike the mock it replaces.
- Reuse the existing `ObjectScopePermission`/`can_be_accessed_by` authorization already proven in `ApplicationDetailView` — no new authorization model invented.
- No new attachment/upload endpoint — reuse `ApplicationAdditionalAttachmentView` and the existing upload service methods already used by `StudentApplication.tsx`.
- No change to `apps/results`, `apps/attendance`, or any exam-delivery code under this ticket.
- Synthetic data only in tests/fixtures, consistent with `AGENTS.md`.

### Review-only action plan (superseded — see below)

- [x] Read the root `AGENTS.md` and `build_plan.md`.
- [x] Confirm "Student Portal" has no defined scope beyond its build-plan row; confirm current on-disk state of every page it could plausibly cover.
- [x] Decompose into sub-projects A–D and identify cross-developer collisions (C, D).
- [x] Brainstorm and confirm scope for Sub-project A: reuse `backend/apps/applications`, thin new read endpoint, no new authorization model.
- [x] Write spec and phasing plan for Sub-project A.

### Exam schedule assignment (2026-08-06) — extends Sub-project A

The user reviewed a set of reference screenshots of the target Dashboard/Application/Permit/Results flow and, during brainstorming, explicitly directed building the whole flow against real data rather than mock, then explicitly instructed proceeding directly to implementation rather than pausing for a separate written-spec approval round. See [`specs/2026-08-06-student-portal-exam-schedule-assignment-design.md`](specs/2026-08-06-student-portal-exam-schedule-assignment-design.md) and [`plans/2026-08-06-student-portal-exam-schedule-assignment-plan.md`](plans/2026-08-06-student-portal-exam-schedule-assignment-plan.md), both written and committed before implementation started, per the user's direction.

- [x] Write spec and plan for the exam-slot backend + schedule-picker UI.
- [x] Implement all phases (backend model/migration/service/views/urls/seed command/tests; frontend service methods/UI/tests).
- [x] Verify: full `apps.applications` suite (120/120), new tests (15 backend + 4 frontend service + 4 frontend component), `npm run build`, `manage.py check`/`migrate`. Full results in [`implement/student-portal.implement.md`](implement/student-portal.implement.md).
- [ ] Manual browser walkthrough against a running dev server — not yet done, disclosed as an open item in the implement log.

### Still not started

- Sub-project B (`ExamPermitPage.tsx` → real permit) — requires its own separate spec/plan cycle before any work starts on it.
- Sub-project C (`ResultsPage.tsx`) — explicitly excluded, collides with Prince Malonzo's active `apps.results`/`apps.exam_reviews` work.
- Sub-project D (`ExamDelivery.tsx`) — bienvenido.mendoza's ticket.
