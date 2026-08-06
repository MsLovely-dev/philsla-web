# Spec — Maintenance Table: Universities and Courses (backend + wiring)

**Owner:** JP Mayordo · **Date:** 2026-08-05 · **Branch:** `jp.mayordo/universities-courses`

## Problem

`UniversitiesListMaintenance.tsx` presents a full Universities registry and a per-university College Courses drill-down, but it is a pure prototype: all state lives in empty in-memory `useState` arrays, nothing persists, and no backend or service exists. Admins cannot actually maintain universities or courses.

## Goal

Give the screen a real, persisted, permission-guarded backend by replicating the already-shipped **schools** slice (PR #44) one layer at a time, so behaviour, auth, and the camelCase API boundary match an approved precedent instead of a new invention.

## Why mirror schools

Schools solves the identical problem (a maintenance registry with auto codes, classification, region, role-guarded CRUD, audit logging, seed data, and a Backend/Mock service split). Reusing that shape minimizes design risk and review surface, and keeps the two Maintenance tables consistent.

## Scope

**In scope**
- New Django app `universities` with `University` (Phase A) and `CollegeCourse` (Phase B) models, serializers, CRUD APIVIews, role permissions, audit events, URL mount at `/api/v1/universities/`, migrations, and tests.
- New `backendUniversityService.ts` with `BackendUniversityService`, `MockUniversityService`, and a `createUniversityService()` factory keyed on `VITE_AUTH_SERVICE_MODE`, plus a service test.
- Rewire `UniversitiesListMaintenance.tsx` from in-memory state onto the service (list on mount, create/update/delete via `ServiceResult`, error + saving states, `ConfirmationDialog` for delete) — matching `SchoolsListMaintenance.tsx`.

**Out of scope**
- The `List of DepEd SHS` / schools work (already delivered — verify only).
- Any redesign of the existing university UI layout or field set beyond what persistence requires.
- CSV import, bulk ops, pagination beyond what schools already does.

## Entities (derived from the existing UI types)

- **University** — `code` (auto, e.g. `UNI-00001`, read-only), `classification` (`Public` | `Private`), `name`, `region`, `city`, `presidentRector`, `email`, `phone`, `establishedYear`, `status` (`Active` | `Inactive`), timestamps.
- **CollegeCourse** — FK `university`, `collegeName`, `programCode`, `programName`, `degreeType`, `majorSpecialization`, `durationYears`, `totalUnits`, `cutoffPercentile`, `status`, timestamps.

Serializer emits camelCase (e.g. `presidentRector`, `establishedYear`) so the frontend mapping stays near-identity, exactly as `SchoolSerializer` does for `examineeCapacity`.

## Approved boundary / decisions

- Management roles: `SYSTEM_ADMIN`, `UNIVERSITY_ADMIN`, `ADMISSIONS_REVIEWER` (same as schools).
- `code` is server-generated and read-only; client never sets it.
- Phase A (University CRUD) is the demo-critical path and ships first; Phase B (nested CollegeCourse CRUD) follows only if Phase A is green.
- Backend is the authority; the frontend `status`/required-field checks stay usability-only.

## Success criteria

- `python manage.py test apps.universities --settings=config.settings.test` passes (create/list/update/delete, sequential code, invalid choice rejected, unprivileged role → 403 — mirroring `schools/tests.py`).
- `npx vitest run src/services/backendUniversityService.test.ts` passes.
- With `VITE_AUTH_SERVICE_MODE=backend`, the Universities screen lists/adds/edits/deletes universities against the API and survives reload; in prototype mode it falls back to the mock service with no backend required.
- `npm run lint` (tsc) clean.

## Resolved decisions (2026-08-05)

- **Course API shape → nested.** `/api/v1/universities/<university_id>/courses/` (list/create) and `/api/v1/universities/<university_id>/courses/<course_id>/` (detail/update/delete). Courses are only accessed within a selected university, so nesting keeps the parent FK unambiguous and gives free scoping/404s. Schools stays flat as a single entity.
- **`seed_universities` → in scope.** A small idempotent command (~5–6 real PH universities × 2–3 courses) mirroring `seed_schools`, so the demo screen and stat cards are populated on a fresh DB and the nested course endpoint is exercised.

## Still needs human sign-off

- Approval of the `University` / `CollegeCourse` field set and management roles before Thursday execution.
