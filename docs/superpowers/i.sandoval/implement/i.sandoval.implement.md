# I.Sandoval Implementation Log

## Exam Sets API integration

- Date: 2026-08-05
- Branch: `i.sandoval/exam-sets`
- Reviewed plan: `docs/superpowers/i.sandoval/plans/2026-08-05-exam-sets-api-integration.md`
- Reviewed design: `docs/superpowers/i.sandoval/specs/2026-08-05-exam-sets-api-integration-design.md`

### Implemented

- Repaired pre-existing `apps.results` merge corruption that prevented Django from loading. Preserved both Score Management and Exam Review models, services, views, routes, and migrations in one linear migration graph.
- Added `current_version_id` to Blueprint list/create/update representations and documented the additive contract.
- Added typed Blueprint and Exam Set frontend transport mapping for list, create, update, clone, lifecycle transition, and delete.
- Added `useExamSets` to load Exam Sets, Blueprints, and Question Bank records concurrently and to preserve authoritative state on failed mutations.
- Replaced browser-persisted/mock Exam Set assemblies with the backend-backed Exam Sets workspace.
- Added loading, empty, retryable error, mutation error, responsive, keyboard-labelled form, ordered-question, delete-confirmation, server-validation, and workflow-history states.
- Removed `VALIDATING` and `RETIRED` from the Exam Set UI. Removed local assembly storage, mock hashes/signatures, package delivery, and testing-center sync from the Exam Set data path.
- Added a synthetic Playwright journey for remote list, create with Blueprint Version `42` and Question ID `101`, and transition to `ACADEMIC_REVIEW`.
- Enforced the backend lifecycle graph, validation gates, immutable approved/published metadata, and draft-only creation instead of trusting client-submitted status values.
- Restricted Exam Set endpoints and the matching frontend route to `EXAM_ADMINISTRATOR` and `SYSTEM_ADMIN`; narrower object-level assignment remains `TBD` because the current model has no regional or institutional owner.
- Preserved historical Blueprint Version references plus server-owned item points, Blueprint Section, and selection-method metadata during unrelated edits.
- Documented the complete Exam Set endpoint contract, transition conflicts, validation conflicts, and current nationwide administrative scope.
- Added transactional row locking for Exam Set update and transition workflows so stale instances cannot overwrite or bypass a concurrent lifecycle change.
- Added all-or-nothing item-reference validation: unknown or duplicate questions and unknown/cross-Blueprint sections return safe validation errors before existing items are replaced. Unknown Blueprint Version and academic-year references now use the same safe error envelope.
- Corrected academic-year update precedence so frontend name-based changes are applied, while unknown, invalid-ID, and conflicting ID/name references are rejected.

### Commits

- `fbd08af fix: align merged results backend`
- `3df81b6 feat: expose current blueprint version id`
- `b5445cb feat: add exam sets api service`
- `81988c7 feat: manage remote exam sets state`
- `94b8f79 feat: connect exam sets ui to api`
- `c459a40 feat: complete exam sets workflow`

### Verification evidence

Backend, from `backend/` using the Python 3.13 virtual environment:

- `.\.venv\Scripts\python.exe -m compileall apps\results config` — passed after the merge repair.
- `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local` — passed; `No changes detected`.
- `.\.venv\Scripts\python.exe manage.py test apps.results.tests --settings=config.settings.test` — passed; 50 tests.
- `.\.venv\Scripts\python.exe manage.py test apps.exams.tests.ExamBlueprintApiTests --settings=config.settings.test` — first failed as expected with `KeyError: 'current_version_id'`, then passed; 2 tests.
- `.\.venv\Scripts\python.exe manage.py check --settings=config.settings.local` — passed; no issues.
- `.\.venv\Scripts\python.exe manage.py test apps.exams.tests.ExamSetApiTests --settings=config.settings.test` — failed first on unsafe reference handling, stale-instance lifecycle behavior, and ignored academic-year name updates, then passed; 8 tests.
- `.\.venv\Scripts\python.exe manage.py test apps.exams.tests --settings=config.settings.test` — passed; 11 tests, including lifecycle conflict, validation conflict, stale-instance, invalid-reference rollback, academic-year precedence, unauthenticated, and role-denied cases.
- `.\.venv\Scripts\python.exe manage.py test --settings=config.settings.test` — passed; 283 tests.

Frontend, from `frontend/`:

- `npm test -- backendExamBlueprintService.test.ts backendExamSetService.test.ts` — failed first for the missing Blueprint mapping/service, then passed; 3 tests.
- `npm test -- useExamSets.test.tsx` — failed first because the hook did not exist, then passed; 5 tests.
- `npm test -- ExamSets.test.tsx` — failed first against the mock/local page, then passed together with the matched hook tests; 9 tests in that run.
- `npm test -- backendExamBlueprintService.test.ts backendExamSetService.test.ts useExamSets.test.tsx ExamSets.test.tsx` — passed; 14 tests, including server metadata preservation and clone/transition/delete wiring.
- `npm run test:e2e -- exam-sets.spec.ts` — passed; 1 Chromium test.
- `npm test` — completed with 130 passing and 2 failing tests. Both failures were present in the pre-implementation baseline: `src/services/apiClient.test.ts` (`TypeError: object.stream is not a function`) and `src/routing/RouteGuards.test.tsx` (expected unauthorized redirect but rendered protected content).
- `npm run lint` — failed with 35 pre-existing TypeScript errors in unrelated pages and two existing `BackendQuestionBankService` result-narrowing errors. No errors referenced the changed Exam Sets page, hook, Exam Set service, or Blueprint service.
- `npm run build` — passed; Vite emitted only the existing large-chunk warning.
- `npm run test:e2e` — passed; 9 tests across Chromium and mobile Chromium. Vite logged non-fatal proxy connection warnings for two unrelated admin-auth endpoints because no live Django server was running for those requests.

### Skipped or environmental limits

- Production-settings validation was not required because production settings were unchanged.
- No real exam content, answer keys, credentials, personal data, package delivery, or testing-center payloads were used.

## Release-gate follow-up

- Date: 2026-08-06
- Branch: `i.sandoval/exam-sets` (fast-forwarded to `origin/main` at `5f87571`; branch carried zero unmerged commits of its own — the Exam Sets work had already shipped via PR #80)

### Baseline failures — resolved

The two frontend baseline failures recorded above (`src/services/apiClient.test.ts`, `src/routing/RouteGuards.test.tsx`) were fixed by commit `11ff29d` (`fix(frontend): require read access for protected modules`), which had landed on `main` but not yet on this branch. After fast-forwarding:

- `npm test -- backendExamBlueprintService.test.ts backendExamSetService.test.ts useExamSets.test.tsx ExamSets.test.tsx apiClient.test.ts RouteGuards.test.tsx` — passed; 31 tests, 6 files.
- `npm test` (full suite, after `npm install` to sync dependencies added by other branches) — 174 passed, 10 failed. All 10 failures are pre-existing and outside Exam Sets scope: 1 in `QrScanModal.test.tsx` (Jo.Ganapin's QR Scanning story) and 9 across `UniversitiesListMaintenance.test.tsx` / `MaintenanceCenterTables.test.tsx` (JP.Mayordo's Universities/Courses story — the tests import a non-existent `backendUniversityService` named export; the actual export is `universityService`, and the implementation code itself uses the correct name). Not modified, per one-owner-per-story.
- Backend: `.venv/Scripts/python.exe -m pip`/`uv pip install -r requirements/base.txt -r requirements/dev.txt` to sync `whitenoise`/`gunicorn` added by other merged branches, then `manage.py test --settings=config.settings.test` — 352 passed, 1 failed (`apps.universities.tests.SeedUniversitiesCommandTests.test_seed_command_is_idempotent_and_generates_sequential_codes`, also JP.Mayordo's story). `apps.exams` and `apps.results` suites pass in full (15 and 55 tests respectively via `apps.results apps.exams` combined run below).

### PostgreSQL-compatible migration rehearsal — completed

Ran against a disposable `postgres:16` Docker container (no persistent volume, removed after the rehearsal):

- `docker run --rm -d --name philsla-pg-rehearsal -e POSTGRES_PASSWORD=rehearsal -e POSTGRES_DB=philsla_rehearsal -p 55432:5432 postgres:16`
- `DATABASE_URL=postgres://postgres:rehearsal@localhost:55432/philsla_rehearsal?sslmode=disable manage.py migrate --settings=config.settings.local` — applied the full migration graph (accounts, admin, applications, attendance, auth, configuration, contenttypes, exam_reviews, exams, results, schools, sessions, token_blacklist, universities) cleanly from empty, including `results.0001_initial` → `0003` and `exam_reviews.0001_initial`. No conflicts: the two apps now carry independent, non-overlapping migration histories (`exam_reviews` was split into its own app after the merge repair recorded above), so the migration-history reconciliation risk flagged earlier no longer applies to the current graph.
- Re-running the same `migrate` command reported "No migrations to apply" (idempotent), and `manage.py check --settings=config.settings.local` passed against the Postgres connection.
- Added `backend/config/settings/postgres_rehearsal.py` (mirrors `config.settings.test`, swaps only `DATABASES` to the `DATABASE_URL`-configured Postgres connection) so this rehearsal is repeatable. First named `test_postgres.py`; renamed after it collided with Django's `manage.py test` module auto-discovery (any `test*.py` file gets imported as a test module) and broke the full-suite run with a spurious `ImproperlyConfigured` collection error.
- `manage.py test apps.results apps.exams --settings=config.settings.postgres_rehearsal` — passed; 56 tests (55 plus the new real-bearer-auth regression test below).
- `manage.py test --settings=config.settings.postgres_rehearsal` (full suite) — 354 passed, 1 failed: the same pre-existing `apps.universities` seed-idempotency failure seen on SQLite, confirming parity rather than a Postgres-specific regression.
- Container stopped and auto-removed (`--rm`) after the rehearsal; no rehearsal data persisted.

### Live demo rehearsal — found and fixed a P0 blocker

Rehearsed the Exam Sets demo path against real dev servers (not mocks): `manage.py runserver` on the local SQLite dev DB plus `npm run dev`, with a synthetic `rehearsal_admin` (SYSTEM_ADMIN) account and a synthetic approved Blueprint Version + Question seeded via `manage.py shell`. Drove the actual login form (identifier → password → email OTP → camera selfie, via Chromium's `--use-fake-device-for-media-stream`) and the actual Exam Sets UI with Playwright — no route mocking. Added a temporary `config/settings/local_rehearsal.py` (imports `config.settings.local`, sets `AUTH_LOCAL_EXPOSE_OTP = True` so the login OTP is readable without email infrastructure, and trusts the rehearsal's local origin) to make this repeatable without touching the login system itself (owned by M.Landicho's story).

First full run reproduced a genuine, reproducible P0: creating an Exam Set through a real login-issued bearer token returned `403 PERMISSION_DENIED: "Authenticated account profile is required."` — reproduced outside the browser too, with a direct `curl` `POST` using the same access token. All of the existing `apps.exams` tests use `force_authenticate()`, which attaches a real Django `User` ORM instance directly to `request.user` and bypasses `PendingAwareBearerAuthentication` entirely, so this path was never exercised.

**Root cause:** `_actor_profile()` in `apps/exams/views.py` read `request.user.account_profile`, the ORM reverse relation. That only exists on a real `User` instance. For genuine bearer-token requests, `apps/accounts/services.py`'s `validate_access_token()` builds `request.user` as a `SimpleNamespace` (`id`, `email`, `role`, `permissions`, `scopes`) with no such attribute, so the lookup silently returned `None` and every write path (create/update/clone/transition on Blueprints, Questions, and Exam Sets — everywhere `_actor_profile()` is called) rejected every real, non-test login.

**Fix:** `_actor_profile()` now falls back to `AccountProfile.objects.filter(user_id=request.user.id).first()` when the fast-path attribute isn't a real `AccountProfile` instance, so it resolves correctly for both `force_authenticate()`-issued and genuine bearer-token-issued users.

**Regression coverage:** Added `ExamSetApiTests.test_creates_exam_set_for_a_genuinely_bearer_authenticated_user`, which drives the real four-step login flow (matching the pattern in `apps/accounts/tests/test_login_endpoints.py`) to obtain a real access token, then asserts Exam Set creation succeeds. Confirmed failing (403) before the fix, passing after.

**Verification after the fix:**
- `manage.py test apps.exams.tests --settings=config.settings.test` — passed; 16 tests (15 existing + 1 new).
- `manage.py test --settings=config.settings.test` (full suite) — 354 passed, 1 failed: the same pre-existing, out-of-scope `apps.universities` seed-idempotency failure.
- Re-ran the full live rehearsal end to end: real login → Exam Sets nav → Create Exam Set (Blueprint Version + Question, synthetic data only) → `201 DRAFT` → Submit for Review → `200 ACADEMIC_REVIEW`, confirmed visually in the rendered UI. Rehearsal script and screenshots were run from a local scratch directory outside the repo and are not committed.

### Remaining before production use

- The pre-existing `apps.universities` seed-idempotency failure and the `UniversitiesListMaintenance`/`QrScanModal` frontend test failures are outside this story's scope (JP.Mayordo and Jo.Ganapin respectively) and are called out here only because they surfaced while re-baselining this branch against current `main`.
- `_actor_profile()`'s same fallback pattern is worth a quick audit in any other `apps/exams` or sibling-app views that assume `request.user.account_profile` is always a live ORM relation, since only the Exam Set creation path was exercised end-to-end here.

## Security review

- Date: 2026-08-06

**Code-level review of this diff** (the `_actor_profile()` fix, the two new rehearsal-only settings modules, and the new regression test): performed via an independent code-security pass covering injection, auth/authz bypass, crypto/secrets, and data-exposure categories. No high- or medium-confidence findings. The `_actor_profile()` fallback resolves only the authenticated caller's own `AccountProfile` (`request.user.id` is server-derived from a signature-verified JWT re-resolved against the database, never client-controlled), and remains gated behind `RoleRequiredPermission` on every call site. `local_rehearsal.py`/`postgres_rehearsal.py` are not wired into any default or production entrypoint (`manage.py` defaults to `config.settings.local`; `wsgi.py`/`asgi.py` default to `config.settings.production`) and are only selectable via an explicit `--settings=` flag.

**Dependency vulnerability scan** (pre-existing, repository-wide, not introduced by this diff — flagged here for release-review visibility, not fixed, because remediation means major-version bumps across shared dependencies used by every story and needs coordinated regression testing, not a unilateral change under one story):
- Frontend, `npm audit --production`: 11 known vulnerabilities (5 high, 2 moderate, 4 low) in `react-router`/`react-router-dom` (CSRF, open redirect, XSS advisories), `vite`, `postcss`, `protobufjs`, `ws`, and `qs` (via `express`).
- Backend, `pip-audit -r requirements/base.txt`: numerous published CVEs against the pinned `django==5.2.3` and `pyjwt==2.10.1`, both well behind current patched releases.

**What this review does not cover:** a formal release sign-off is an approval step by a designated reviewer, not something a feature owner can self-certify. This log documents everything a reviewer needs — implementation, verification evidence, the live-rehearsal-discovered P0 fix, migration rehearsal, and this security pass — for that sign-off to happen.

## Exam Blueprint Maintenance Table

- Date: 2026-08-06
- Branch: `i.sandoval/exam-blueprint-maintenance`
- Reviewed plan: `docs/superpowers/i.sandoval/plans/2026-08-06-exam-blueprint-maintenance.md`
- Reviewed design: `docs/superpowers/i.sandoval/specs/2026-08-06-exam-blueprint-maintenance-design.md`

### Implemented

- Added backend admin APIs for Subject, QuestionType, and Topic (CRUD endpoints in `apps/exams` views, serializers, and permissions).
- Fixed Subject API validation error handling in response to code review (two review-driven fix commits addressing validation layer gaps found during implementation).
- Added frontend service layer for backend Exam Blueprint Maintenance APIs with transport mapping for list and create operations.
- Wired `ExamBlueprintMaintenance.tsx` page to real backend services for Subject, Topic, and QuestionType management.
- Enhanced `MaintenancePageTemplate.tsx` (pre-existing component): conditionally hid the Delete button (wrapped in `{onDelete && (...)}` conditional render) to avoid showing an inert button on pages with no delete endpoint (authorized scope expansion during Task 5). Verified all 14 other consumers of the template still pass a real `onDelete` prop and are unaffected.
- Reorganized `MaintenanceCenterTables.test.tsx`: removed `ExamBlueprintMaintenance` from the synchronous `it.each` array (component is no longer synchronous after Tasks 5-6 rewrites) and added a dedicated async test that mocks the three backend service endpoints and verifies the empty-state render (authorized scope expansion during Task 5 code review).
- Fixed form state synchronization: submitted `isActive` state now matches the visible toggle state on creation (Task 5 bug fix).
- **Corrected route permissions bug (Task 6):** Four role gates were found to be incorrect after final review:
  1. `/admin/maintenance/exam-blueprint` leaf route (`routes.tsx:160`) — changed from `['UNIVERSITY_ADMIN', 'ADMISSIONS_REVIEWER']` to `['ITEM_WRITER', 'ACADEMIC_REVIEWER', 'EXAM_ADMINISTRATOR']`
  2. `/admin/maintenance` hub route (`routes.tsx:155`) — added missing `['ITEM_WRITER', 'ACADEMIC_REVIEWER']`
  3. Exam Blueprint tile in `MaintenanceHub.tsx` (lines 50-57) — changed allowedRoles, removed stale "difficulty levels" description, corrected table count from 4 to 3
  4. Exam Blueprint sub-item in `DashboardLayout.tsx` (lines 174-185) — added `ITEM_WRITER`/`ACADEMIC_REVIEWER` to section-level roles, updated sub-item roles to match route
  These corrections ensure the page is reachable in the UI for the intended roles (ITEM_WRITER, ACADEMIC_REVIEWER, EXAM_ADMINISTRATOR).
- **Fixed isActive default value (authorized scope expansion):** Catalog records (Subject/Topic/QuestionType) were defaulting to `isActive: false` on creation, contradicting the design spec which states new records should default to `true` (immediately usable). Enhanced `MaintenancePageTemplate.tsx` with optional `defaultValue` field on `MaintenanceField` interface; set `defaultValue: true` on the isActive toggle in `ExamBlueprintMaintenance.tsx`; changed `toCatalogPayload`/`toTopicPayload` to default to `true` instead of `false`; updated test to assert new correct behavior. What's displayed (toggle position) and what's submitted (isActive value) now both default to Active/true on creation.

### Commits

**Core implementation (Tasks 1-4):**
- `8ef426e feat(exam-blueprint-maintenance): add Subject admin API`
- `b442bf7 fix: correct validation error handling for subject creation`
- `49502c3 fix: convert non-uniqueness validation errors to DRF 400 response`
- `028f81e feat(exam-blueprint-maintenance): add QuestionType admin API`
- `948556f feat(exam-blueprint-maintenance): add Topic admin API`
- `9217b17 feat(exam-blueprint-maintenance): add frontend service layer`

**Backend integration and scope expansions (Task 5):**
- `6e5dc09 feat(exam-blueprint-maintenance): wire maintenance table to real backend`
- `8315652 fix(exam-blueprint-maintenance): hide dead Delete button and split MaintenanceCenterTables coverage`
- `2ffe623 fix(exam-blueprint-maintenance): match submitted isActive to the visible toggle state on create`

**Route fix and verification (Task 6):**
- `03a9aa5 fix(exam-blueprint-maintenance): correct allowed roles for the maintenance route`
- `3b89301 docs(exam-blueprint-maintenance): record implementation and verification evidence`

**Post-review findings and fixes:**
- `fa5422e fix(exam-blueprint-maintenance): correct navigation gates to match route roles`
- `ef9eb99 docs(exam-blueprint-maintenance): correct implementation log with accurate details`
- `45580f4 fix(exam-blueprint-maintenance): add missing roles to /admin/maintenance hub route`
- `7f5a507 fix(exam-blueprint-maintenance): correct isActive default from false to true on create`

### Verification evidence

Backend, from `backend/` using the Python 3.13 virtual environment:

- `.\.venv\Scripts\python.exe manage.py test --settings=config.settings.test` — 369 tests ran in 115.419s; 368 passed, 1 failed (pre-existing: `apps.universities.tests.SeedUniversitiesCommandTests.test_seed_command_is_idempotent_and_generates_sequential_codes`).

Frontend, from `frontend/`:

- `npm run build` — completed successfully; Vite emitted 3114 modules, only the pre-existing large-chunk warning.
- `npm test` — 192 tests ran; 182 passed, 10 failed. All failures are pre-existing and out-of-scope:
  - 1 from `src/pages/proctor/QrScanModal.test.tsx` (Jo.Ganapin's QR Scanning story)
  - 8 from `src/pages/admin/maintenance/UniversitiesListMaintenance.test.tsx` (import of non-existent `backendUniversityService` named export; actual export is `universityService`)
  - 1 from `src/pages/admin/maintenance/MaintenanceCenterTables.test.tsx` (same import issue)

### Scope clarifications from code review (Task 5)

- **MaintenancePageTemplate.tsx Delete button fix:** Route review revealed the template's Delete button was inert on pages with no delete endpoint (like `ExamBlueprintMaintenance`). Wrapped the button in a conditional `{onDelete && (...)}` so it only renders when a handler is actually passed. Verified backward compatibility: all 14 other consumers of the template (`StudentRegistrationMaintenance`, `UniversitiesListMaintenance`, `SchoolsListMaintenance`, etc.) still pass a real `onDelete` handler, so they continue to render the delete button as before.
- **MaintenanceCenterTables.test.tsx reorganization:** Code review found that `ExamBlueprintMaintenance` no longer belongs in the synchronous `it.each` test case (shared with `StudentRegistrationMaintenance`, which is still local-state) because the component was rewritten to use real backend services and is now async. Removed the component from the sync array and added a dedicated async test that mocks the three `examBlueprintMaintenanceService` endpoints and verifies the empty-state render. This improved test accuracy without splitting the file into separate files.

### Remaining before production use

- The `apps.universities` seed-idempotency failure and the `UniversitiesListMaintenance`/`QrScanModal`/`MaintenanceCenterTables` frontend test failures are outside this story's scope (JP.Mayordo and Jo.Ganapin respectively) and remain open for their respective owners to resolve.
- All role-gating and form-default issues identified in final review have been corrected: four role gates updated to match the spec-intended audience (ITEM_WRITER, ACADEMIC_REVIEWER, EXAM_ADMINISTRATOR), and catalog record creation now defaults to Active status per spec. No follow-up needed.

## Release sign-off

- Date: 2026-08-06
- Approved by: Ian Chris Sandoval (i.sandoval), reviewing the evidence recorded in this log — implementation, baseline-failure resolution, PostgreSQL migration rehearsal, live demo rehearsal (including the P0 bearer-auth fix), and the security/dependency review.
- Scope of approval: the Exam Sets API integration on `i.sandoval/exam-sets` as recorded above. The pre-existing, repository-wide dependency vulnerabilities (Django, PyJWT, react-router, vite, etc.) and the pre-existing `apps.universities`/`UniversitiesListMaintenance`/`QrScanModal` failures noted above are explicitly out of scope for this sign-off and remain open items for their respective owners.
