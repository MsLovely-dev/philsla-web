# Implementation Plan — Maintenance Table: Universities and Courses

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` once this plan is human-approved. Steps use checkbox (`- [ ]`) syntax for tracking. **Do not start Thursday execution until the approval gate below is signed off.**

**Owner:** JP Mayordo · **Date:** 2026-08-05 · **Branch:** `jp.mayordo/universities-courses`

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

- [ ] Human reviewer approves the `University` / `CollegeCourse` field set and the roles.
- [x] **Decided (2026-08-05):** Course API is **nested** — `/api/v1/universities/<university_id>/courses/` for list/create and `/api/v1/universities/<university_id>/courses/<course_id>/` for detail/update/delete. Rationale: courses are only ever accessed within a selected university; nesting makes the parent FK unambiguous and gives free scoping. (Schools stays flat because it is a single entity.)
- [x] **Decided (2026-08-05):** `seed_universities` **is in scope** — a small idempotent command (~5–6 real PH universities × 2–3 courses each) mirroring `seed_schools`, so the demo screen and stat cards are populated on a fresh DB and the nested course endpoint is exercised end to end.

---

## Phase A — University backend (demo-critical)

Reference: `backend/apps/schools/{models,serializers,views,urls,audit,tests}.py`, `backend/config/urls.py`.

- [ ] Create app scaffold `backend/apps/universities/` (`__init__.py`, `apps.py` with `name = "apps.universities"`, `migrations/`); add `"apps.universities"` to `INSTALLED_APPS` in `config/settings/base.py`.
- [ ] `models.py`: `University` with `code` (unique, `editable=False`), `classification` (TextChoices Public/Private), `name`, `region` (reuse a region choices source; confirm whether to import schools' `PhilippineRegion` or use `data/philippineRegions` parity), `city`, `president_rector`, `email`, `phone`, `established_year`, `status` (TextChoices Active/Inactive), `created_by` FK (PROTECT, nullable), `created_at`, `updated_at`. Add `generate_university_code()` → `UNI-00001` and the `save()` collision-safe loop, mirroring `generate_school_code`.
- [ ] `serializers.py`: `UniversitySerializer(ModelSerializer)` emitting camelCase (`presidentRector`, `establishedYear`), `code`/timestamps read-only, `validate_name` trims/requires.
- [ ] `audit.py`: `record_university_event(...)` mirroring `schools/audit.py` (fact/actor/outcome only — never the payload).
- [ ] `views.py`: `UniversityListCreateView` (GET list, POST create with `created_by`) and `UniversityDetailView` (GET/PUT/PATCH/DELETE) using `RoleRequiredPermission` + `require_roles(...)`, `transaction.atomic`, audit calls — copied from `schools/views.py`.
- [ ] `urls.py`: `""` → list/create, `"<int:university_id>/"` → detail.
- [ ] Mount in `config/urls.py`: `path("api/v1/universities/", include(("apps.universities.urls", "universities"), namespace="universities"))`.
- [ ] `makemigrations universities` + `migrate` (local settings).
- [ ] `tests.py` mirroring `schools/tests.py`: sequential code + list, update + delete (code preserved), invalid choice → 400, unprivileged role → 403.
- [ ] Run `python manage.py test apps.universities --settings=config.settings.test` → green. Run `python manage.py check --settings=config.settings.local`.

## Phase A — University frontend service + wiring

Reference: `frontend/src/services/backendSchoolService.ts` + `.test.ts`, `SchoolsListMaintenance.tsx`.

- [ ] Create `frontend/src/services/backendUniversityService.ts`: `UniversityRecord`, `UniversityPayload`, `ApiUniversity` boundary type, `UniversityService` interface, `BackendUniversityService` (uses `sharedApiClient`, `serviceSuccess`, endpoint `/api/v1/universities/`, `fromApiUniversity`/`toApiPayload`), `MockUniversityService` (empty in-memory, generates `UNI-#####`), `createUniversityService()` factory on `VITE_AUTH_SERVICE_MODE`, exported `universityService` singleton.
- [ ] Create `backendUniversityService.test.ts` mirroring the schools service test (mock `apiClient`, assert mapping + endpoints/methods).
- [ ] Rewire `UniversitiesListMaintenance.tsx`: replace `useState<UniversityItem[]>([])`/`saveUniversities` with `universityService` — list on mount via `useEffect`, `handleSaveUni` → create/update, delete via `ConfirmationDialog` + `deleteSchool`-equivalent, add `error`/`isSaving` state and the error banner. Keep the existing layout/fields; only swap the data source. (Preserve the courses drill-down UI reading from local state until Phase B lands.)
- [ ] Run `npx vitest run src/services/backendUniversityService.test.ts` and `npm run lint` → green.
- [ ] Manual smoke (with backend on, `VITE_AUTH_SERVICE_MODE=backend`): add/edit/delete a university, reload, confirm persistence.

## Phase B — CollegeCourse (only if Phase A green)

API shape decided: **nested** — `/api/v1/universities/<university_id>/courses/` (list/create), `/api/v1/universities/<university_id>/courses/<course_id>/` (detail/update/delete). Views resolve/validate the parent university from the URL and 404 if it is missing.

- [ ] `CollegeCourse` model (FK `university`, fields per spec), serializer (camelCase), views (role-guarded CRUD scoped to the URL's university), nested URL routes, migration, tests (incl. course under a missing university → 404, unprivileged role → 403).
- [ ] Extend `backendUniversityService.ts` with `listCourses(universityId)` / `create|update|deleteCourse`, plus tests.
- [ ] Wire the course drill-down view (`selectedUniversity` branch) onto the service; keep add/edit/delete modals.
- [ ] Add `seed_universities` management command (idempotent, ~5–6 PH universities × 2–3 courses) mirroring `seed_schools`, with a seed test asserting idempotency + sequential `UNI-#####` codes.
- [ ] Run backend + frontend tests → green.

## Phase C — Verify DepEd SHS / Schools (stretch story, verify-only)

- [ ] `python manage.py test apps.schools --settings=config.settings.test` → green (no changes expected).
- [ ] Manual smoke of `/admin/maintenance/schools` for the demo path.
- [ ] Note in `implement/jp.mayordo.implement.md` that Schools is delivered (PR #44), verified, no new work.

## Definition of done

- [ ] `apps.universities` tests green; `apps.schools` tests still green.
- [ ] `backendUniversityService.test.ts` green; `npm run lint` clean.
- [ ] Universities screen does real CRUD against the API and persists across reload; prototype mode still works with no backend.
- [ ] Work logged in `docs/superpowers/jp.mayordo/implement/jp.mayordo.implement.md` referencing this plan.
- [ ] PR opened against `main` for review (no direct pushes).

## Risks / notes

- Universities is a two-entity screen; if Thursday runs short, Phase A alone (University CRUD persisted) is a legitimate, demo-ready deliverable — Phase B degrades gracefully back to the existing in-memory course view.
- Region source: confirm whether to share schools' `PhilippineRegion` choices or keep frontend `data/philippineRegions` parity, to avoid drift between the two tables.
