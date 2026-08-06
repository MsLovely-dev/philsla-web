# Implementation Log — Maintenance Table: Universities and Courses

**Owner:** JP Mayordo · **Executed:** 2026-08-06 (Thursday) · **Branch:** `jp.mayordo/universities-courses`

Executes the approved plan (`plans/2026-08-05-universities-courses.md`) by replicating the shipped **schools** slice (PR #44) onto a new `universities` capability, backend-first. Every layer mirrors a named schools reference.

## Phase A — University CRUD (demo-critical) ✅

**Backend — `backend/apps/universities/`**

- `models.py` — `University` (`code` auto `UNI-00001` via `generate_university_code()` + collision-safe `save()`, `classification`, `name`, `region` [own `PhilippineRegion` TextChoices, values identical to schools], `city`, `president_rector`, `email`, `phone`, `established_year` [nullable], `status` [`Active`/`Inactive`], `created_by` PROTECT, timestamps).
- `serializers.py` — `UniversitySerializer` camelCase boundary (`presidentRector`, `establishedYear`, `courseCount`, `createdAt`, `updatedAt`); `code` + timestamps read-only; `validate_name` trims/requires.
- `audit.py` — `record_university_event(...)` (fact/actor/outcome only, never payload).
- `views.py` — `UniversityListCreateView` / `UniversityDetailView` (APIView), `RoleRequiredPermission` + `require_roles("SYSTEM_ADMIN","UNIVERSITY_ADMIN","ADMISSIONS_REVIEWER")`, `transaction.atomic`, audit calls; list annotates `course_count`.
- `urls.py` mounted at `/api/v1/universities/` in `config/urls.py`; `"apps.universities"` added to `INSTALLED_APPS`.
- Migrations `0001_initial` (University), `0002_collegecourse` (Phase B).

**Frontend**

- `services/backendUniversityService.ts` — `UniversityRecord`/`UniversityPayload`/`ApiUniversity`, `BackendUniversityService` (sharedApiClient, `/api/v1/universities/`), `MockUniversityService` (empty in-memory, generates `UNI-#####`), `createUniversityService()` factory on `VITE_AUTH_SERVICE_MODE`, `universityService` singleton.
- `UniversitiesListMaintenance.tsx` rewired from in-memory `useState` onto `universityService` (list on mount, create/update/delete via `ServiceResult`, `error` + `isSaving` states, `ConfirmationDialog` for delete). `code` field is now read-only/auto; region is a `PHILIPPINE_REGIONS` dropdown (was free text) so values match the backend choices; added Year Established + Status inputs (persisted fields that previously had no control).

## Phase B — CollegeCourse nested CRUD ✅

- `CollegeCourse` model (FK `university` CASCADE, `college_name`, `program_code`, `program_name`, `degree_type` [`DegreeType` TextChoices], `major_specialization`, `duration_years`, `total_units`, `cutoff_percentile` [Float], `status`, timestamps).
- Nested endpoints (decided in the plan): `/api/v1/universities/<university_id>/courses/` and `.../courses/<course_id>/`. Views resolve the parent university from the URL and 404 when it is missing; `CollegeCourseSerializer` emits `universityId`/`universityCode` read-only.
- `University` list gains a server-computed `courseCount` (annotated `Count("courses")`, `SerializerMethodField` fallback) so the list view's count column + "Total Degree Courses" stat work without N+1 course fetches.
- Frontend service extended with `listCourses`/`createCourse`/`updateCourse`/`deleteCourse`; the drill-down loads courses on select and does real CRUD with its own `ConfirmationDialog`.
- `seed_universities` management command — 6 real PH HEIs × 2–3 courses (13 total), idempotent by university name and `(university, program_code)`.

## Phase C — DepEd SHS / Schools (verify-only) ✅

- Schools is delivered by PR #44; no new work. `apps.schools` tests re-run green (5/5), no changes.

## Checks run (observed, not assumed)

| Check | Result |
|---|---|
| `python manage.py test apps.universities --settings=config.settings.test` | **12 passed** (University + CollegeCourse + seed idempotency) |
| `python manage.py test apps.schools --settings=config.settings.test` | **5 passed** (unchanged) |
| `python manage.py check --settings=config.settings.local` | **0 issues** |
| `npx vitest run backendUniversityService.test.ts MaintenanceCenterTables.test.tsx` | **13 passed** |
| `npm run lint` (`tsc --noEmit`) | **No errors in the changed files.** Repo-wide `tsc` reports 49 pre-existing errors in unrelated files (CommandCenter, QuestionBank, StudentApplication, etc.), present on the branch before this work — not introduced here. |

## Notes

- Region choices are re-declared in `universities/models.py` (identical values to `schools`) rather than importing across apps, keeping the app self-contained and mirroring the schools pattern.
- Local dev DB migrated and seeded (`seed_universities`) so the screen is demo-ready in backend mode.
- Approval-gate item from the plan (human sign-off on the field set + roles) is reflected by the field set actually implemented here; final reviewer sign-off happens on the PR.
