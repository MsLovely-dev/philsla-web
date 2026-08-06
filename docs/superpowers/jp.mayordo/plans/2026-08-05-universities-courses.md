# Implementation Plan — Maintenance Table: Universities and Courses

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` once this plan is human-approved. Steps use checkbox (`- [ ]`) syntax for tracking. **Do not start Thursday execution until the approval gate below is signed off.**

**Owner:** JP Mayordo · **Date:** 2026-08-05 · **Branch:** `jp.mayordo/universities-courses`

**Status:** ✅ **Shipped & merged to `main` via PR #68** (2026-08-06). Checklist reconciled post-merge to reflect delivered work.

**Goal:** Replace the in-memory prototype behind `UniversitiesListMaintenance.tsx` with a real, persisted, role-guarded backend by replicating the shipped **schools** slice (PR #44) layer by layer.

**Architecture:** Backend-first. Build and green-test the Django `universities` app before touching the frontend, then add the frontend service, then rewire the screen. Every layer has a named schools reference to mirror.

**Tech Stack:** Django 5.2 / DRF 3.16 (backend), React 19 / TypeScript 5.8 / Vite 6 / Vitest (frontend). Local dev DB is SQLite.

## Global constraints

- Mirror the schools pattern; do not restructure or introduce new abstractions.
- `code` is server-generated, read-only. Management roles: `SYSTEM_ADMIN`, `UNIVERSITY_ADMIN`, `ADMISSIONS_REVIEWER`.
- Serializer boundary is camelCase (`presidentRector`, `establishedYear`, etc.).
- Run the relevant tests after each phase; never claim green without running.
- Phase A (University CRUD) is demo-critical and ships first. Phase B (CollegeCourse) only if A is green. Phase C (verify schools) is quick and can run anytime Thursday.

## Approval gate (Wednesday — must be satisfied before Thursday)

- [x] Human reviewer approved the `University` / `CollegeCourse` field set and the roles — reviewed and merged via **PR #68**; colleague review included the `degree_type` free-string / no-default feedback, which was addressed.
- [x] **Decided (2026-08-05):** Course API is **nested** — `/api/v1/universities/<university_id>/courses/` for list/create and `/api/v1/universities/<university_id>/courses/<course_id>/` for detail/update/delete. Rationale: courses are only ever accessed within a selected university; nesting makes the parent FK unambiguous and gives free scoping. (Schools stays flat because it is a single entity.)
- [x] **Decided (2026-08-05):** `seed_universities` **is in scope** — a small idempotent command (~5–6 real PH universities × 2–3 courses each) mirroring `seed_schools`, so the demo screen and stat cards are populated on a fresh DB and the nested course endpoint is exercised end to end.

---

## Phase A — University backend (demo-critical)

Reference: `backend/apps/schools/{models,serializers,views,urls,audit,tests}.py`, `backend/config/urls.py`.

- [x] Create app scaffold `backend/apps/universities/` (`__init__.py`, `apps.py` with `name = "apps.universities"`, `migrations/`); add `"apps.universities"` to `INSTALLED_APPS` in `config/settings/base.py`.
- [x] `models.py`: `University` with `code` (unique, `editable=False`), `classification` (TextChoices Public/Private), `name`, `region` (own `PhilippineRegion` TextChoices, values identical to schools), `city`, `president_rector`, `email`, `phone`, `established_year`, `status` (TextChoices Active/Inactive), `created_by` FK (PROTECT, nullable), `created_at`, `updated_at`. Added `generate_university_code()` → `UNI-00001` and the `save()` collision-safe loop, mirroring `generate_school_code`.
- [x] `serializers.py`: `UniversitySerializer(ModelSerializer)` emitting camelCase (`presidentRector`, `establishedYear`, `courseCount`), `code`/timestamps read-only, `validate_name` trims/requires.
- [x] `audit.py`: `record_university_event(...)` mirroring `schools/audit.py` (fact/actor/outcome only — never the payload).
- [x] `views.py`: `UniversityListCreateView` (GET list, POST create with `created_by`) and `UniversityDetailView` (GET/PUT/PATCH/DELETE) using `RoleRequiredPermission` + `require_roles(...)`, `transaction.atomic`, audit calls — copied from `schools/views.py`.
- [x] `urls.py`: `""` → list/create, `"<int:university_id>/"` → detail.
- [x] Mount in `config/urls.py`: `path("api/v1/universities/", include(("apps.universities.urls", "universities"), namespace="universities"))`.
- [x] `makemigrations universities` + `migrate` (local settings).
- [x] `tests.py` mirroring `schools/tests.py`: sequential code + list, update + delete (code preserved), invalid choice → 400, unprivileged role → 403.
- [x] Run `python manage.py test apps.universities --settings=config.settings.test` → green. Run `python manage.py check --settings=config.settings.local`.

## Phase A — University frontend service + wiring

Reference: `frontend/src/services/backendSchoolService.ts` + `.test.ts`, `SchoolsListMaintenance.tsx`.

- [x] Create `frontend/src/services/backendUniversityService.ts`: `UniversityRecord`, `UniversityPayload`, `ApiUniversity` boundary type, `UniversityService` interface, `BackendUniversityService` (uses `sharedApiClient`, `serviceSuccess`, endpoint `/api/v1/universities/`, `fromApiUniversity`/`toApiPayload`), `MockUniversityService` (empty in-memory, generates `UNI-#####`), `createUniversityService()` factory on `VITE_AUTH_SERVICE_MODE`, exported `universityService` singleton.
- [x] Create `backendUniversityService.test.ts` mirroring the schools service test (mock `apiClient`, assert mapping + endpoints/methods).
- [x] Rewire `UniversitiesListMaintenance.tsx`: replaced `useState<UniversityItem[]>([])`/`saveUniversities` with `universityService` — list on mount via `useEffect`, `handleSaveUni` → create/update, delete via `ConfirmationDialog`, added `error`/`isSaving` state and the error banner. Kept the existing layout/fields; only swapped the data source; code field is read-only/auto, region is a validated dropdown.
- [x] Run `npx vitest run src/services/backendUniversityService.test.ts` and the maintenance-tables test → green (13/13).
- [x] Manual smoke (backend on, live Django): scripted the real 3-step auth and drove add/edit/delete + reload against the real API — persistence confirmed end to end.

## Phase B — CollegeCourse (only if Phase A green)

API shape decided: **nested** — `/api/v1/universities/<university_id>/courses/` (list/create), `/api/v1/universities/<university_id>/courses/<course_id>/` (detail/update/delete). Views resolve/validate the parent university from the URL and 404 if it is missing.

- [x] `CollegeCourse` model (FK `university`, fields per spec; `degree_type` is a free string field, no enum, no default), serializer (camelCase), views (role-guarded CRUD scoped to the URL's university), nested URL routes, migration, tests (incl. course under a missing university → 404, course isolation between universities, unprivileged role → 403).
- [x] Extend `backendUniversityService.ts` with `listCourses(universityId)` / `create|update|deleteCourse`, plus tests.
- [x] Wire the course drill-down view (`selectedUniversity` branch) onto the service; keep add/edit/delete modals. Degree Type is an editable combobox (`<input list>` + `<datalist>`) — suggestions plus free text.
- [x] Add `seed_universities` management command (idempotent, 6 PH universities × 2–3 courses = 13) mirroring `seed_schools`, with a seed test asserting idempotency + sequential `UNI-#####` codes.
- [x] Run backend + frontend tests → green (backend 13, frontend 13).

## Phase C — Verify DepEd SHS / Schools (stretch story, verify-only)

- [x] `python manage.py test apps.schools --settings=config.settings.test` → green (5/5, no changes).
- [x] Schools endpoint verified reachable (applied the pending `schools.0001_initial` migration on the local Postgres so `/api/v1/schools/` returns 200 instead of erroring). Schools is the separately-delivered stretch story (PR #44); no new feature work here.
- [x] Note in `implement/jp.mayordo.implement.md` that Schools is delivered (PR #44), verified, no new work.

## Definition of done

- [x] `apps.universities` tests green (13); `apps.schools` tests still green (5).
- [x] `backendUniversityService.test.ts` green (13/13). Universities/Courses files are **type-clean** — `tsc` reports **0 errors in this story's files**. (The remaining repo-wide `tsc` errors are pre-existing and unrelated, tracked outside this story.)
- [x] Universities screen does real CRUD against the API and persists across reload; prototype mode still works with no backend.
- [x] Work logged in `docs/superpowers/jp.mayordo/implement/jp.mayordo.implement.md` referencing this plan.
- [x] PR opened against `main` for review (no direct pushes) — **PR #68, merged**.

## Risks / notes

- Universities is a two-entity screen; if Thursday runs short, Phase A alone (University CRUD persisted) is a legitimate, demo-ready deliverable — Phase B degrades gracefully back to the existing in-memory course view. *(Both phases shipped.)*
- Region source: shared PH region values are re-declared in `universities/models.py` (identical to schools) to keep the app self-contained and avoid a cross-app import; the frontend `data/philippineRegions` codes match.
