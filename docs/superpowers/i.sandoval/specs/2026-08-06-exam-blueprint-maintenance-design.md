# Exam Blueprint Maintenance Table — Design

- Date: 2026-08-06
- Owner: Ian Chris Sandoval (`i.sandoval`)
- Ticket: Ticket 001 — Maintenance Table – Exam Blueprint (`task.md`)
- Status: Resumption gates authorized by Ian Chris Sandoval on 2026-08-06. This spec is the "test-first implementation plan reviewed and approved before code changes begin" gate; it must be reviewed and approved before implementation starts.

## Problem

`frontend/src/pages/admin/maintenance/ExamBlueprintMaintenance.tsx` is a UI-only prototype: four tabs (Subject Areas, Difficulty Level, Question Type, Topics) backed by nothing but local component state. Ticket 001 deferred turning this into a real, backend-integrated maintenance table until its catalog ownership, lifecycle, authorization, and persistence questions were resolved (see `task.md`). Those questions are answered below.

## Resumption gates — how each is satisfied

1. **Product/sprint ownership reprioritizes the ticket.** Authorized by Ian Chris Sandoval, 2026-08-06.
2. **Blueprint-vs-Exam-Set boundary and catalog ownership.** This table manages *reference/lookup data* (`Subject`, `Topic`, `QuestionType`) that `Question` and `BlueprintSection` records already point to by foreign key. It does not touch `ExamBlueprint`, `BlueprintVersion`, `ExamSet`, or any workflow/lifecycle object — those remain owned by the separately implemented Exam Sets integration and by Ju.Cabigon's Exam Blueprint story (transition tests, Question Bank wiring). No file overlap: this work only adds new views/serializers/URLs and a new frontend service; it does not modify anything Ju.Cabigon's branch touches.
3. **Maintenance lookup ownership, lifecycle, authorized operations.** See "Data model" and "Lifecycle" below.
4. **Backend API contract and persistence approach.** See "API contract" below. No new models or migrations — `Subject`, `Topic`, and `QuestionType` already exist in `apps/exams/models.py` with `is_active`, `code`, `name`, `description`, `created_at`, `updated_at`, and (for `Topic`) a `subject` FK with `on_delete=PROTECT`.
5. **Permission matrix, object-level authorization, validation, audit events, sensitive-data handling.** See "Permissions", "Validation", and "Audit" below. No sensitive or real exam content is involved — these are catalog labels (subject/topic/question-type names and codes), not exam content, answer keys, or personal data.
6. **Test-first implementation plan reviewed and approved before code changes.** This spec plus the implementation plan produced by `writing-plans` after this spec is approved.

## Scope

**In scope:** real, backend-integrated CRUD (create, edit, deactivate — no hard delete) for:
- Subject Areas (`Subject`)
- Question Type (`QuestionType`)
- Topics (`Topic`, flat resource with `subject_id` as a payload field)

**Out of scope:**
- Difficulty Level. It is a fixed `DifficultyLevel(TextChoices)` enum in code (`EASY`/`MEDIUM`/`HARD`), not a database-editable table. Converting it to an editable model would touch `Question.difficulty` and `BlueprintDifficultyDistribution`, both used by the already-implemented and tested Exam Sets/Blueprint validation logic. That's a materially bigger, separate change and is not authorized here.
- CSV/XLSX bulk upload. The prototype has a `bulkUpload` UI affordance; the real Universities/Courses maintenance table (the closest existing precedent) doesn't implement this either. Left out; the button is removed rather than wired to nothing.
- Hard delete of any record.
- Any change to `ExamBlueprint`, `BlueprintVersion`, `ExamSet`, or other workflow/lifecycle models.

## Data model

No new models or migrations. Existing fields on `Subject`, `Topic`, `QuestionType` (all in `apps/exams/models.py`):

| Field | Notes |
|---|---|
| `code` | Unique per model (Subject, QuestionType); Topic has no unique code constraint but has a unique `(subject, name)` constraint |
| `name` | Unique per model (Subject, QuestionType) |
| `description` | Optional, free text |
| `is_active` | Soft-deactivate flag; defaults `True` |
| `created_at` / `updated_at` | Already present, used for audit trail and optimistic concurrency |
| `Topic.subject` | FK to `Subject`, `on_delete=PROTECT` — the database already refuses to hard-delete a Subject that has Topics |

## Lifecycle

- **Create:** any of the four authorized roles can create a new Subject/Topic/QuestionType with a unique code+name (per the existing DB constraints).
- **Edit:** any field can be changed by the four authorized roles via a direct partial update (`PUT`/`PATCH`, same handler) — no client-submitted version/concurrency token. This matches `ExamBlueprintDetailView`/`QuestionListCreateView`'s sibling detail view/`ExamSetDetailView` exactly: none of them require a client-submitted version either, even `ExamSet` (the most lifecycle-sensitive model in this app), which instead guards against lost updates with `select_for_update()` inside its service function. An earlier draft of this spec proposed an `expected_version` field mirroring `apps/configuration`'s University/CollegeCourse pattern; dropped because it doesn't match any existing convention inside `apps/exams` itself, and a simple reference/lookup table doesn't need stronger concurrency guarantees than this app's own ExamSet lifecycle transitions have. The update service function still wraps the read-modify-write in `select_for_update()` for the same reason `update_exam_set`-style functions do: a concurrent duplicate-code write should still fail cleanly on the DB unique constraint, not race.
- **Deactivate:** `PATCH {is_active: false}`. A deactivated record stays valid on existing Questions/Blueprint sections that already reference it (nothing is retroactively invalidated), but stops appearing as a selectable option when authoring *new* Questions/Blueprint sections. Reactivation (`is_active: true`) is allowed the same way.
- **No hard delete**, anywhere, for any of the three record types. `Topic.subject`'s `on_delete=PROTECT` already enforces this at the database level for Subjects with Topics; the API simply never exposes a DELETE method at all, for any of the three, so the same posture applies uniformly even to unreferenced records.

## API contract

Follows `apps/exams/views.py`'s own established view shape (`ExamBlueprintListCreateView`/`ExamBlueprintDetailView` and siblings) rather than `apps/configuration/views.py`'s University/CollegeCourse admin views, since these new views live in the same file — see "Lifecycle" above for why pagination and `expected_version` specifically were dropped from an earlier draft of this spec.

```
GET/POST   /api/v1/exams/admin/subjects/
GET/PATCH/PUT /api/v1/exams/admin/subjects/{subject_id}/

GET/POST   /api/v1/exams/admin/topics/
GET/PATCH/PUT /api/v1/exams/admin/topics/{topic_id}/

GET/POST   /api/v1/exams/admin/question-types/
GET/PATCH/PUT /api/v1/exams/admin/question-types/{question_type_id}/
```

Topics are a **flat** resource (`subject_id` is a field in the create/update payload, not part of the URL) — not nested under `/subjects/{id}/topics/` as an earlier draft of this spec proposed by analogy with `apps/configuration`'s CollegeCourse-under-University nesting. Two reasons: (1) `apps/exams` doesn't nest any resource anywhere — Blueprints, Questions, and ExamSets are all flat top-level lists; (2) the existing prototype's Topics tab already renders a flat, cross-subject table (with Subject shown as a column on each row), not a "pick a subject, then see its topics" drill-down, so a flat list matches the UI it's replacing. The list representation includes the subject's `code`/`name` alongside each topic (matching how `CollegeCourseSerializer` includes `universityCode`), so the frontend never has to join client-side.

- List endpoints: unpaginated, returning the full active-and-inactive set ordered by the model's `Meta.ordering`, with no query-param filtering. This deliberately does not copy `StandardPageNumberPagination` or search/status filtering from `apps/configuration`'s University/CollegeCourse admin views (an earlier draft of this spec assumed it would) — every existing list endpoint in `apps/exams` itself (`ExamBlueprintListCreateView`, `QuestionListCreateView`, `ExamSetListCreateView`) already returns a flat, unfiltered, unpaginated array with no query-param support at all, and matching the sibling views in the same app/file takes precedence over matching a different app's convention. These are small reference tables (tens of records, not hundreds), so the frontend filters/searches client-side over the full returned list, the same way a lookup dropdown normally works.
- No DELETE method on any endpoint.
- `PUT` and `PATCH` are the same handler (`patch()` delegates to `put()`), matching `ExamBlueprintDetailView`/`ExamSetDetailView` exactly.
- Validation errors (duplicate code/name, unknown `subject_id` for a Topic) surface through DRF's global exception handler (`apps/core/exceptions.py`), which every `apps/exams` endpoint already goes through automatically — raising a plain `serializers.ValidationError` or an `APIException` subclass (e.g. a new `ExamBlueprintMaintenanceConflict`, mirroring `UniversityRegistryConflict`'s shape for the duplicate-code-on-save race) is enough; no bespoke envelope-building code is needed.

## Permissions

`RoleRequiredPermission` with `required_roles = require_roles(PortalRole.ITEM_WRITER, PortalRole.ACADEMIC_REVIEWER, PortalRole.EXAM_ADMINISTRATOR, PortalRole.SYSTEM_ADMIN)` — identical to the existing `BLUEPRINT_MANAGEMENT_ROLES`/`QUESTION_MANAGEMENT_ROLES` in `apps/exams/views.py`. Rationale: these are the same people who author Questions and Blueprint sections that reference these lookups.

Given the P0 found during the Exam Sets live rehearsal (`_actor_profile()` only worked for `force_authenticate()`-issued test users, not real bearer-token logins), every write endpoint here will be exercised by at least one test that drives a real login to a real access token, not only `force_authenticate()`.

## Audit

Mirror `apps/configuration/audit.py`'s `record_configuration_event`: a new `apps/exams/audit.py` with `record_exam_blueprint_maintenance_event(*, event: str, outcome: str, request=None, user=None)`, logging structured events (`subject_created`, `subject_updated`, `subject_deactivated`, and the `topic_*`/`question_type_*` equivalents) to the existing `philsa.audit` logger. No new database audit table — consistent with how the Universities/Courses maintenance table (the closest precedent) handles this. (Confirmed no existing audit helper already covers `apps/exams` — searched for `AuditLog`/`audit_log`/`WorkflowHistory` patterns in the configuration and universities apps; the only precedent is `apps/configuration/audit.py`.)

## Frontend

- New `frontend/src/services/backendExamBlueprintMaintenanceService.ts`: typed transport mapping (`listSubjects`, `createSubject`, `updateSubject`, `listTopics`, `createTopic`, `updateTopic`, `listQuestionTypes`, `createQuestionType`, `updateQuestionType` — `listTopics` takes no arguments, since Topics is a flat resource), following `backendUniversityService.ts`'s pattern.
- Rewire `ExamBlueprintMaintenance.tsx`: remove the local `useState<BlueprintConfig[]>([])` array as the source of truth; load through the new service with loading/empty/retryable-error/mutation-error states, matching `UniversitiesListMaintenance.tsx`. Keep the tab UI for Subject Areas / Question Type / Topics; remove the Difficulty Level tab. Change the Topics tab's "Subject" field from free text to a dropdown populated from loaded Subjects (`Topic.subject` is a real FK, not free text).
- Fix `routes.tsx`'s route entry for `/admin/maintenance/exam-blueprint`: it currently declares `allowedRoles: withSystemAdmin('UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER')`, which doesn't match any role with a legitimate reason to maintain exam-blueprint catalogs — it looks like a copy-paste leftover from a different maintenance route. Change it to `withSystemAdmin('ITEM_WRITER', 'ACADEMIC_REVIEWER', 'EXAM_ADMINISTRATOR')`, matching the backend role list exactly. This is a one-line change to a route config array, not a change to `RouteGuards.tsx`'s guard logic itself (which is shared, generic infrastructure I'm not touching).
- Remove the `bulkUpload` prop/button from the rewired component (out of scope, see above).

## Testing

- Backend (`apps/exams/tests.py`, following `ExamSetApiTests`' structure): list/create/update/deactivate/validation-conflict/permission-denied/unauthenticated cases for all three resources, plus at least one test per resource driving a real login flow to a real bearer token (not `force_authenticate()`), per the lesson from the Exam Sets rehearsal.
- Frontend: `backendExamBlueprintMaintenanceService.test.ts` (transport mapping) and `ExamBlueprintMaintenance.test.tsx` (loading/empty/error/mutation states, tab switching, Subject dropdown for Topics), following the `UniversitiesListMaintenance.test.tsx` pattern.
- No new Playwright e2e spec is required for this pass; the existing manual/live-rehearsal technique proven on Exam Sets is available if a live walkthrough is wanted before release.

## Security

- No real exam content, answer keys, candidate/student data, credentials, or tokens are involved — Subject/Topic/QuestionType are catalog labels only.
- Same posture as the rest of `apps/exams`: backend is authoritative for validation, authorization, and lifecycle; the frontend has no independent authority.
- No hard delete anywhere, so no path to silently breaking existing Questions/Blueprint sections that reference a Subject/Topic/QuestionType.
