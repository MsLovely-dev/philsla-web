# Exam Review Isolation Repair — Implementation Record

**Owner:** Prince Barachiel Malonzo (P.Malonzo)

**Date:** 2026-08-05

**Specification:** `../specs/2026-08-05-exam-review-repair-design.md`

**Implementation plan:** `../plans/2026-08-05-exam-review-repair-plan.md`

**Execution checkout:** `C:/Users/prince.malonzo/Desktop/philsla/philsla-web`

**Execution branch:** `p.malonzo/exam-review`

**Status:** Code repair implemented; latest main integrated; publication authorized with disclosed upstream failures

## Objective

Restore Score Management as the sole owner of `apps.results` and move Exam Review into `apps.exam_reviews` while preserving public API paths, frontend behavior, permissions, data relationships, and migration safety.

## Owner instructions and plan deviations

The owner approved implementation, initially instructed that the repair remain uncommitted, aligned the current checkout to the official Exam Review branch, and later explicitly authorized committing and pushing that branch. Therefore:

- execution used the current checkout instead of creating `worktrees/p.malonzo/`;
- the repair was carried unchanged from `feat/exam-review` to `p.malonzo/exam-review`;
- publication is limited to Exam Review and the minimum shared boundary repair;
- A.Depositar's pulled documentation is excluded from P.Malonzo's commit;
- no local or shared database migration was applied; and
- the branch must integrate the latest `origin/main` and pass verification before push.

These deviations affect delivery mechanics only. The approved architecture and behavior remain unchanged.

## Implemented boundaries

- `apps.results` contains only the canonical Score Management models, serializers, services, endpoints, seed command, tests, and three-migration chain from `9f49e3b`.
- `apps.exam_reviews` owns Exam Review models, admin registrations, serializers, services, endpoints, seed command, tests, and `exam_reviews.0001_initial`.
- `/api/v1/results/exam-reviews/...` remains the public Exam Review API prefix.
- `/api/v1/results/score-management/...` remains owned by `apps.results`.
- Exam Review retains its protected foreign key to `applications.StudentApplication` and its account-role permission checks.
- Finalization atomically creates or safely updates an unprocessed Score Management `CandidateScore` through the Score Management-owned intake service, then changes the graded review to `FINALIZED`.
- No frontend production file or transport URL was changed.
- No dependency was added.

## Root cause and baseline evidence

The pull combined independently developed Exam Review and Score Management code by concatenating conflicting `apps.results` files. It also duplicated the `apps.results` entry and URL include. The original baseline produced:

- `ImproperlyConfigured: Application labels aren't unique, duplicates: results`;
- invalid Python in the results initial migration, models, services, URLs, and views; and
- one shared model and migration namespace owned by two modules.

The duplicate settings and URL entries had already been manually removed in the staged pull resolution when execution resumed, so `manage.py check` could start. A new structural regression test then failed because `apps.exam_reviews` was absent and Exam Review models were still owned by `apps.results`.

## Test-first evidence

### Result application boundary — red

Command:

```powershell
.\.venv\Scripts\python.exe manage.py test apps.core.tests.test_result_app_boundaries --settings=config.settings.test --verbosity 2
```

Observed: exit code `1`; expected `apps.exam_reviews` registration count was `1`, actual count was `0`.

### Exam Review model boundary — red

Command:

```powershell
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews.tests.test_model_boundary --settings=config.settings.test --verbosity 2
```

Observed: exit code `1`; `LookupError: No installed app with label 'exam_reviews'`.

### Exam Review behavior — red

Command:

```powershell
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews.tests.test_exam_review_seed_and_api --settings=config.settings.test --verbosity 1
```

Observed: 17 expected errors because `seed_exam_reviews` and the new app-owned API implementation were not present yet.

## Task execution

| Plan task | Status | Commit | Verification |
|---|---|---|---|
| Task 0 — baseline | Complete | Publication commit | Root cause and red regressions recorded |
| Task 1 — Score Management restoration | Complete | Publication commit | 33 Score Management tests passed |
| Task 2 — Exam Review model boundary | Complete | Publication commit | Model and ownership tests passed; migration generated and checked |
| Task 3 — Exam Review API and services | Complete | Publication commit | 18 behavior tests plus 3 boundary tests passed |
| Task 4 — migration safeguards | Complete with local blocker | Publication commit | Independent test graph passed; existing local schema mismatch detected read-only |
| Task 5 — frontend contract | Complete | Publication commit | 4 files and 16 tests passed; no frontend production diff |
| Task 6 — documentation | Complete | Publication commit | API and backend architecture ownership corrected |
| Task 7 — final verification | Complete with limitations | Publication commit | Backend and build green; repository-wide TypeScript baseline remains red |

### Task 1 — Score Management restoration

Actions:

- restored the valid Score Management-only `models.py`, `serializers.py`, `services.py`, `views.py`, `urls.py`, and `0001_initial.py`;
- retained the canonical Score Management `0002` and `0003` migrations;
- removed Exam Review models, routes, command, tests, admin registrations, and migrations from `apps.results`; and
- removed the invalid merge migration.

Verification:

```text
compileall apps\results: exit 0
Score Management focused tests: 33 passed
git diff 9f49e3b -- backend/apps/results: only package marker/newline metadata observed at that checkpoint
```

### Task 2 — Exam Review model and migration boundary

Created:

- `apps.exam_reviews.ExamReviewsConfig`;
- `ExamReviewRecord`, `ExamReviewItem`, and `ExamReviewAnswerSheet` with the valid enums, constraints, ordering, and private upload path;
- Exam Review admin registrations; and
- `exam_reviews.0001_initial`, depending on `applications.0013_studentapplicationadditionalattachment`.

Verification:

```text
Model/ownership boundary tests: 2 passed
makemigrations --check --dry-run: No changes detected
compileall apps\results apps\exam_reviews: exit 0
```

### Task 3 — Exam Review API, services, and seed command

Ported the valid Exam Review serializers, atomic services, role-protected views, URL-relative routes, and repeatable seven-review seed command. The later 2026-08-06 completion work replaced the original isolation boundary with an explicit Score Management-owned intake service so finalization performs a real, guarded `CandidateScore` handoff without moving score ownership into `apps.exam_reviews`.

Verification:

```text
Exam Review behavior/model/result boundary tests: 21 passed
manage.py check: System check identified no issues
```

### Task 4 — migration safeguards

The migration graph regression confirms exactly one leaf for each capability:

- `results.0003_candidatescore_results_can_session_739f12_idx_and_more`
- `exam_reviews.0001_initial`

The disposable test database applied both independent chains successfully.

Local database inspection was read-only. Django reports `results.0001_initial` as applied and the remaining new leaves as pending:

```text
results.0001_initial: applied
results.0002 and results.0003: pending
exam_reviews.0001_initial: pending
current migration graph: no old Exam Review migration filenames
```

Table introspection then found only:

```text
results_examreviewrecord
results_examreviewitem
results_examreviewanswersheet
```

The expected Score Management tables for the current `results.0001_initial` are absent. This proves the local `results.0001` history row belongs to the former Exam Review schema even though the migration filename is the same. Running `migrate` against this database would incorrectly skip Score Management's initial table creation and is blocked pending an environment-specific recovery choice.

No `migrate`, fake migration, reset, delete, historical table rename, or database move was performed against the local database.

### Task 5 — unchanged frontend contract

Command:

```powershell
npm test -- src/services/backendExamReviewService.test.ts src/services/examReviewExportService.test.ts src/pages/admin/hub/ExamReviewList.test.tsx src/pages/admin/hub/ExamReviewDetail.test.tsx
```

Observed: 4 test files passed, 16 tests passed. A direct diff check over the four production Exam Review frontend files exited `0`.

The first sandboxed attempt could not start esbuild and returned Windows `spawn EPERM`. Rerunning with process permission passed; this was an environment restriction, not a test failure.

### Task 6 — documentation

Updated:

- `docs/api/API-ENDPOINTS.md` with `apps.exam_reviews` and `exam_reviews.0001_initial` ownership and accurate finalization semantics; and
- `docs/architecture/BACKEND-ARCHITECTURE.md` with distinct Score Management and Exam Review responsibilities.

### Task 7 — final verification

Before integrating the latest `origin/main`:

Backend:

```text
compileall apps\results apps\exam_reviews: exit 0
manage.py check --settings=config.settings.local: no issues
makemigrations --check --dry-run: No changes detected
focused backend suite: 55 passed
complete backend suite: 281 passed
migration boundary test: passed
```

Frontend:

```text
focused Exam Review suite: 4 files, 16 tests passed
npm run build: passed; 3,108 modules transformed
npm run lint: failed with 38 TypeScript errors in unrelated existing modules
Exam Review production files changed: none
```

After fetching `origin/main` at `ccd8435`, the branch integrated the updated BUILD_PLAN, A.Depositar's Score Management merge, deployment changes, and the other owners' latest work. Five `apps.results` conflicts were resolved with blobs verified identical to canonical Score Management commit `9f49e3b`; Exam Review remains in `apps.exam_reviews`.

Post-integration verification:

```text
focused Exam Review/Score Management and boundary suite: 55 passed
complete backend suite: 285 run, 2 errors
  - both errors are NameError: ApplicationIdentityMedia in applications endpoint tests
complete frontend suite: 119 run, 1 failure
  - RouteGuards permission test renders protected content instead of unauthorized
```

The three failing test/source files are byte-identical to `origin/main` and outside P.Malonzo's Exam Review scope. The owner reviewed this disclosure and explicitly instructed publication of `p.malonzo/exam-review` despite those upstream failures.

Diff hygiene:

```text
git diff --check: exit 0
git diff --cached --check: exit 0 before final unstage
Exam Review publication commit: `1b917b0`
latest-main merge commit: `0b6a7d2`
push target: `origin/p.malonzo/exam-review`
```

## Disclosed limitations

- The repository requires Python 3.13, but only Python 3.14.5 is installed locally. All backend verification passed on 3.14.5; the accepted 3.13 runtime remains to be verified in CI or a compliant environment.
- PostgreSQL-backed migration and concurrent row-lock verification were not run; isolated tests used the configured SQLite test database. The handoff/reprocessing serialization path requires a PostgreSQL-compatible rehearsal before production rollout.
- The existing local `backend/db.sqlite3` has an incompatible historical `results.0001` record and old `results_examreview*` tables. Do not run local migrations until the owner chooses either an archive-and-fresh-database path or a reviewed data-preserving migration path.
- Repository-wide `npm run lint` remains red with 38 unrelated TypeScript errors, including Command Center, Question Bank, Student Application, and other modules. No failing diagnostic points to the unchanged Exam Review frontend files.
- After latest-main integration, the complete backend suite has two upstream application-test errors and the complete frontend suite has one upstream RouteGuards failure. The corresponding files match `origin/main`; focused Exam Review verification remains green.
- The production build reports an existing large-chunk warning.
- The Exam Review-to-Score Management handoff accepts only an exact, unique ExamSet-code match in a not-yet-processed session; ranking, result release, analytics, and external distribution remain separate workflows.
- Answer-sheet template selection does not perform CSV, OCR, or OMR recognition.

## Rollback and deployment note

Rollback is performed by reverting the scoped Exam Review publication commit; do not rewrite Score Management's canonical migration history. Do not apply `exam_reviews.0001_initial` to a shared or production database until the migration and environment-specific rollout are reviewed. This local environment contains historical Exam Review tables under the old `results` namespace, so execution stopped before schema mutation as designed. The recommended development-only recovery is to archive the existing SQLite file and create a fresh database, but that move requires explicit owner approval; preserving old rows requires a separate reviewed data-migration plan.

## 2026-08-06 — Exam Review completion hardening (uncommitted)

The confirmed issue was functional, not documentation-only: the backend permitted a review with pending subjective items to be marked `GRADED`, and an inconsistent graded record could then be finalized. The connected frontend also exposed grading/release actions without enforcing the same readiness rule.

Implemented without committing or pushing:

- backend grading and release services now return a conflict until every subjective item has an official score;
- the queue disables **Mark as Graded** while subjective items remain and explains why;
- the detail page hides release while scoring is incomplete, displays a readiness notice, and retains a handler-level guard;
- subjective items with blank rubric text display `No rubric provided for this item.`; and
- `build_plan.md` now records Exam Review as a real backend/API-backed feature at approximately 95%, while the separate Results Release & Analytics story remains explicitly unbuilt.

Verification evidence:

```text
backend Exam Review suite: 21 tests passed
manage.py check --settings=config.settings.local: no issues
focused frontend Exam Review suite: 3 files, 15 tests passed
npm run build: passed; 3,109 modules transformed
npm run lint: failed with 40 existing TypeScript errors in unrelated modules
changed Exam Review frontend files in lint diagnostics: none
git diff --check before this record update: exit 0
```

No commit or push was performed at that checkpoint. The hardening work and its plan/record remained working-tree changes for owner review.

## 2026-08-06 — Exam Review to Score Management handoff (uncommitted)

Exam Review release now performs a real synchronous handoff through the Score Management-owned intake service. It resolves exactly one Score Management ExamSet by code, creates or safely updates the candidate's unprocessed approved score, and only then finalizes the Exam Review in the same transaction.

Implemented without committing or pushing:

- exact ExamSet-code matching with missing/ambiguous configuration conflicts;
- application candidate ID, 12-digit LRN, normalized name, raw/max score, and half-up two-decimal percentage mapping;
- deterministic IDs for newly handed-off scores and safe updates keyed by session/candidate;
- protection against changing processed, ranked, or released score data;
- transaction rollback that leaves the review `GRADED` whenever intake fails;
- synthetic Exam Review alignment to `ES-BP0001` and deterministic demo LRNs; and
- truthful API, architecture, build-plan, and frontend conflict documentation/tests.

Verification evidence:

```text
Exam Review plus complete Score Management backend suites: 67 tests passed
manage.py check --settings=config.settings.local: no issues
focused frontend Exam Review suite: 3 files, 16 tests passed
Playwright Exam Review release success/conflict journey: 2 tests passed
npm run build: passed; 3,111 modules transformed
npm run lint: failed with 38 existing TypeScript errors in unrelated modules
changed Exam Review diagnostics in lint output: none
```

The handoff intentionally stops before ranking, percentile processing, student-facing results release, analytics, and external distribution. All current handoff work, its tests, design, plan, and documentation remain uncommitted and unstaged for owner review.

## 2026-08-07 — Results Release stale-request hardening

Removed the misplaced standalone Task 4 report. The Results Release screen now accepts only the latest list response and a successful process/release action refreshes with the latest selected filters. Focused Results Release service/page tests passed (2 files, 16 tests), the production build passed, and `git diff --check` passed.

## 2026-08-07 — Release-summary review hardening

The release summary now selects filtered, ordered session IDs before running score aggregation, keeping aggregation bounded to the requested page. Readiness is conservative with the existing mutation services: processing rejects inconsistent score/session, ranking-population, and exam-set relationships; release requires an actual processing batch and counts only approved scores with a non-null rank. Search input is capped at the session-name model length of 160 characters.

Test-first evidence:

```text
RED: py -3.13 manage.py test apps.results.tests.test_results_release_api --settings=config.settings.test
     13 tests run; 5 expected failures covered page-bounded SQL, invalid relationships,
     missing processing batch, unranked processed scores, and overlong search.
GREEN: the same focused command passed 13 tests.
Regression: py -3.13 manage.py test apps.results.tests.test_results_release_api apps.results.tests.test_score_management_api --settings=config.settings.test
            passed 45 tests.
Django check: py -3.13 manage.py check --settings=config.settings.local
              passed with no issues.
Diff check: git diff --check
            passed.
```

## 2026-08-07 — Results Release ambiguous mutation replay hardening

The shared API client now accepts a typed `allowAlternativeBaseUrlFallback` request option. Existing callers preserve the prior cross-base fallback behavior by default, while Results Release processing and release POSTs disable it so a committed mutation whose response connection is lost is not replayed against alternative local URLs. A network failure closes the stale confirmation and refetches the authoritative release summary without repeating the mutation.

Test-first and verification evidence:

```text
RED: npm test -- src/services/apiClient.test.ts src/services/resultsReleaseService.test.ts src/pages/admin/hub/ResultsRelease.test.tsx --run
     25 tests ran; 4 expected failures showed four fetch attempts for each ambiguous mutation and no authoritative page refetch.
GREEN: the same focused command passed 3 files and all 25 tests.
Build: npm run build
       passed; 3,119 modules transformed. The existing large-chunk advisory remained.
TypeScript: npm run lint
            failed on existing unrelated errors in other modules; no diagnostic referenced the changed Results Release or API client files.
Diff check: git diff --check
            passed before this implementation-record append.
```

The tests emitted the existing warning that `backend/staticfiles/` is absent. One check invocation from the repository root failed because `manage.py` is under `backend/`; rerunning the exact check from `backend/` passed.

## 2026-08-07 — Released results analytics reporting matrix

Replaced the Reporting Matrix's national, university, demographic, qualification, regional, subject, and batch mock authority with the typed `resultsAnalyticsService.getOverview()` contract. The page now renders only released-candidate totals, released-session totals, mean final score, server-provided score bands (with both visual bars and a semantic table), and a released-session aggregate table. It has accessible loading, empty, safe error/retry, keyboard-focus, responsive overflow, null-field fallback, and latest-request/unmount guards.

Test-first evidence:

```text
RED: npm test -- src/pages/results/ReportingMatrix.test.tsx --run
     6 expected assertions failed against the old prototype Reporting Matrix.
GREEN: npm test -- src/services/resultsAnalyticsService.test.ts src/pages/results/ReportingMatrix.test.tsx --run
       2 files passed, 9 tests passed.
Build: npm run build
       passed; 3,119 modules transformed. Existing chunk-size advisory remained.
Diff check: git diff --check
            passed.
```

## 2026-08-07 — Results Release mutation error contract

Score processing and release lifecycle failures now pass through the configured DRF exception handler instead of returning a raw `{detail}` body. Missing sessions return the standard `404 NOT_FOUND` envelope; safe lifecycle failures return `409 CONFLICT`; serializer failures remain `400 VALIDATION_FAILED`. The adapter maps the finite known domain messages to documented public messages and replaces any unexpected service text with a generic session-state conflict message.

Test-first and verification evidence:

```text
RED: py -3.13 manage.py test apps.results.tests.test_results_release_api apps.results.tests.test_score_management_api --settings=config.settings.test
     46 tests ran; 4 expected failures showed raw 400 responses where exact 404/409 envelopes were required.
GREEN: the same focused command passed all 48 tests, including each documented process precondition.
Frontend: npm test -- --run src/services/resultsReleaseService.test.ts
          1 file passed, 7 tests passed using a complete backend-shaped conflict envelope.
Django check: py -3.13 manage.py check --settings=config.settings.local
              passed with no issues.
Diff check: git diff --check
            passed.
```

The first sandboxed frontend test attempt failed before collection because esbuild could not spawn (`EPERM`). The required escalated rerun passed. Backend tests emitted the existing warning that `backend/staticfiles/` is absent; it did not affect results.

## 2026-08-07 — Reporting Matrix main-landmark correction

The Reporting Matrix now uses a labelled page section rather than its own `main` landmark because `DashboardLayout` owns the routed content `main`. A layout-integrated regression renders the registered protected Reporting Matrix route inside `DashboardLayout` and asserts exactly one `main` landmark.

```text
RED: npm test -- src/pages/results/ReportingMatrix.test.tsx --run
     7 tests ran; the new layout regression found 2 main landmarks (expected 1).
GREEN: npm test -- src/services/resultsAnalyticsService.test.ts src/pages/results/ReportingMatrix.test.tsx --run
       2 files passed, 10 tests passed.
Build: npm run build
       passed; 3,119 modules transformed. Existing chunk-size advisory remained.
Diff check: git diff --check
            passed.
```

## 2026-08-07 — Results Release orchestration Tasks 1–4 consolidated record

The implemented scope follows the approved minimal `plans/2026-08-07-results-release-orchestration.md` plan. The broader 2026-08-06 design and core plan are retained as explicitly superseded history. No release-policy, hold, publication-snapshot, notification, model, migration, or dependency work from those older documents was implemented.

### Runtime and storage evidence

- `py -3.13 --version` reported `Python 3.13.14`. Every Django command listed below used this launcher; the separately observed default `python --version` value of `Python 3.14.5` did not run these Django checks.
- `node --version` reported `v24.16.0`.
- `config.settings.test` uses an in-memory SQLite database (`ENGINE=django.db.backends.sqlite3`, `NAME=:memory:`). The focused backend results below therefore do not constitute PostgreSQL verification.

### Task 1 — administrative release summary

Implemented the paginated `/api/v1/results/release-summary/` contract with validated page, page-size, status, and search filters; safe aggregate-only rows; bounded page aggregation; and conservative processing/release readiness.

```text
Command: py -3.13 manage.py test apps.results.tests.test_results_release_api --settings=config.settings.test
Result: exit 0; 13 tests passed; Django system check reported no issues.
Note: the existing warning that backend/staticfiles/ is absent was emitted.
```

### Task 2 — process/release operator permissions

Authorized `SYSTEM_ADMIN` and `EXAM_ADMINISTRATOR` for release summary, score processing, and batch release while retaining candidate list/profile/export restrictions and backend authority.

```text
Command: py -3.13 manage.py test apps.results.tests.test_results_release_api apps.results.tests.test_score_management_api --settings=config.settings.test
Result: exit 0; 48 tests passed; Django system check reported no issues.
Database: in-memory SQLite through config.settings.test.
```

### Task 3 — typed frontend orchestration service

Added typed `list`, `process`, and `release` methods over the shared API client, including encoded IDs, standard `ServiceResult` failures, and no alternative-base replay for mutations whose network outcome is ambiguous.

```text
Command: npm test -- src/services/resultsReleaseService.test.ts --run
Result: exit 0; 1 test file passed; 9 tests passed.
```

### Task 4 — authoritative admin screen

Removed mock/localStorage candidate and notification authority. The screen now provides loading, global-empty, filtered-empty, safe error/retry, page-scoped summary labels, responsive table overflow, filters, pagination, confirmation/cancel flows, pending guards, authoritative network-failure refetch, stale-list-response protection, and final released state.

```text
RED command: npm test -- src/pages/admin/hub/ResultsRelease.test.tsx
RED result: 15 tests ran; 2 expected failures proved the global-looking page-total labels and undifferentiated filtered-empty message.
GREEN command: npm test -- src/pages/admin/hub/ResultsRelease.test.tsx
GREEN result: 1 test file passed; 15 tests passed.
Final combined command: npm test -- src/services/resultsReleaseService.test.ts src/pages/admin/hub/ResultsRelease.test.tsx --run
Final combined result: exit 0; 2 test files passed; 24 tests passed.
Build command: npm run build
Build result: exit 0; Vite transformed 3,119 modules and emitted the existing large-chunk advisory.
```

### Rollout, rollback, and outstanding verification

- Roll out the backend summary and permission contracts before or with the connected frontend. Existing `/api/v1/results/score-management/batches/{sessionId}/process/` and `/release/` paths remain the mutation boundary.
- Roll back by reverting the frontend screen/service and backend summary/permission commits as a coordinated application release. There is no database rollback because this minimal plan added no model or migration.
- PostgreSQL-compatible storage was not exercised for Tasks 1–4; focused backend tests used in-memory SQLite. A PostgreSQL rehearsal remains outstanding before treating database-specific behavior as verified.
- Playwright was not run for this minimal Results Release screen. Browser-journey verification remains outstanding.
- Repository-wide `npm run lint` is a known red baseline with unrelated TypeScript diagnostics in other modules. The last observed run exited `1`; no diagnostic referenced `ResultsRelease.tsx`, `ResultsRelease.test.tsx`, or `resultsReleaseService.ts`. It was not rerun as part of this focused final cleanup, and is not claimed as passing.

## 2026-08-07 — Analytics final sign-off

The analytics API documentation now explicitly defines the standard `401 NOT_AUTHENTICATED` and `403 PERMISSION_DENIED` contracts and records that the session aggregates are intentionally unpaginated within the bounded administrative overview. The Reporting Matrix regression suite now also resolves a deferred overview response after unmount and verifies that the unmounted page remains empty without a post-unmount rendering error.

```text
Command: npm test -- src/services/resultsAnalyticsService.test.ts src/pages/results/ReportingMatrix.test.tsx --run
Result: exit 0; 2 test files passed; 11 tests passed.
Build: not rerun because production code was unchanged (documentation and test coverage only).
Diff check: git diff --check
            passed before this implementation-record append.
```
