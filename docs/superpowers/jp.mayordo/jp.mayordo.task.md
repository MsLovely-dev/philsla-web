# JP Mayordo (JP.Mayordo) — Sprint Task Brief

| Field | Value |
|---|---|
| Owner | JP Mayordo (JP.Mayordo) |
| Worktree | `worktrees/jp.mayordo/` |
| Sprint | Wed 2026-08-05 → Fri 2026-08-07 (presentation-ready demo path) |
| Confirmed date | 2026-08-05 (Wednesday) |

## Stories

| # | Story | Module | Branch | Track | Status |
|---|---|---|---|---|---|
| 1 | Maintenance Table – Universities and Courses | Maintenance & Config | `jp.mayordo/universities-courses` | 🟢 real build | **In progress — primary** |
| 2 | Maintenance Table – List of DepEd SHS (Schools) | Maintenance & Config | `jp.mayordo/deped-shs` | 🟢 already delivered (PR #44) | **Verify-only** |

## Wednesday reality check (evidence, not assumption)

The original sprint brief assumed Universities would be "wired to real backend CRUD" and Schools was "Not started." Both are wrong against the current code:

- **Universities** — `frontend/src/pages/admin/maintenance/UniversitiesListMaintenance.tsx` is a complete UI (list → course drill-down, add/edit/delete modals, filters, CSV export) but runs entirely on empty in-memory `useState`. **No `backend/apps/universities` app exists**; the mounted backend apps are `accounts, applications, analytics, configuration, exams, schools, core` (`backend/config/urls.py`). No universities service exists on the frontend either.
- **Schools** — already fully delivered by PR #44: `backend/apps/schools/` (models, serializers, CRUD views with role perms + audit, `seed_schools`, `tests.py`) + `frontend/src/services/backendSchoolService.ts` (Backend + Mock + factory) wired into `SchoolsListMaintenance.tsx`, routed at `/admin/maintenance/schools`, with `backendSchoolService.test.ts`.

**Confirmed scope decision (2026-08-05):** Primary effort goes to giving Universities & Courses a real backend by **replicating the proven schools blueprint**. Schools itself is treated as verify-only (run its tests, confirm the demo path). This makes Story 1 the genuine 🟢 build and keeps Story 2 as a low-risk safety asset.

## Reference blueprint (mirror this, don't invent)

The schools slice is the working template for every layer:

| Layer | Schools reference | Universities target |
|---|---|---|
| Model + code generator | `backend/apps/schools/models.py` (`School`, `generate_school_code`) | new `backend/apps/universities/models.py` (`University`, `CollegeCourse`) |
| Serializer (camelCase boundary) | `backend/apps/schools/serializers.py` | new `universities/serializers.py` |
| CRUD views + role perms + audit | `backend/apps/schools/views.py`, `audit.py` | new `universities/views.py`, `audit.py` |
| URL mount | `backend/config/urls.py` → `api/v1/schools/` | add `api/v1/universities/` |
| Backend tests | `backend/apps/schools/tests.py` | new `universities/tests.py` |
| Frontend service (Backend + Mock + factory) | `frontend/src/services/backendSchoolService.ts` | new `backendUniversityService.ts` |
| Service test | `frontend/src/services/backendSchoolService.test.ts` | new `backendUniversityService.test.ts` |
| Screen wiring | `SchoolsListMaintenance.tsx` (uses `schoolService`, `ServiceResult`, `ConfirmationDialog`) | rewire `UniversitiesListMaintenance.tsx` |

## Day plan

- **Wed (today):** Planning only, no execution. Spec + reviewed plan produced (`specs/`, `plans/`). Plan must pass human review before Thursday. DepEd SHS confirmed verify-only.
- **Thu:** Execute the approved plan on `jp.mayordo/universities-courses`. Backend-first (app → migrations → tests green), then frontend service + rewire. Run `backend/apps/universities` tests and `backendUniversityService.test.ts` after each layer. Log to `implement/jp.mayordo.implement.md`.
- **Fri:** Freeze by midday. Support rehearsal on Universities/Courses if in demo path; P0 fixes only through PR review.

## Constraints

- One worktree, one active branch at a time. No commits to `main` without PR review.
- Frontend validation is usability-only; backend is the authority (roles: `SYSTEM_ADMIN`, `UNIVERSITY_ADMIN`, `ADMISSIONS_REVIEWER`, per the schools precedent).
- Smallest change that satisfies the story; mirror the schools pattern rather than restructuring.
- Nested `CollegeCourse` CRUD is Phase B — deliver `University` CRUD (Phase A) first as the demo-critical path.

## Related

- Plan: `plans/2026-08-05-universities-courses.md`
- Spec: `specs/2026-08-05-universities-courses.md`
