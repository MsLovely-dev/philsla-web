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
- Finalization changes a graded review to `FINALIZED`; it does not create or update a Score Management record.
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

Ported the valid Exam Review serializers, atomic services, role-protected views, URL-relative routes, and repeatable seven-review seed command. Added regression coverage proving finalization does not create a `CandidateScore`.

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
- PostgreSQL-backed migration verification was not run; isolated tests used the configured SQLite test database.
- The existing local `backend/db.sqlite3` has an incompatible historical `results.0001` record and old `results_examreview*` tables. Do not run local migrations until the owner chooses either an archive-and-fresh-database path or a reviewed data-preserving migration path.
- Repository-wide `npm run lint` remains red with 38 unrelated TypeScript errors, including Command Center, Question Bank, Student Application, and other modules. No failing diagnostic points to the unchanged Exam Review frontend files.
- After latest-main integration, the complete backend suite has two upstream application-test errors and the complete frontend suite has one upstream RouteGuards failure. The corresponding files match `origin/main`; focused Exam Review verification remains green.
- The production build reports an existing large-chunk warning.
- A real Exam Review-to-Score Management handoff remains out of scope and `TBD`.
- Answer-sheet template selection does not perform CSV, OCR, or OMR recognition.

## Rollback and deployment note

Rollback is performed by reverting the scoped Exam Review publication commit; do not rewrite Score Management's canonical migration history. Do not apply `exam_reviews.0001_initial` to a shared or production database until the migration and environment-specific rollout are reviewed. This local environment contains historical Exam Review tables under the old `results` namespace, so execution stopped before schema mutation as designed. The recommended development-only recovery is to archive the existing SQLite file and create a fresh database, but that move requires explicit owner approval; preserving old rows requires a separate reviewed data-migration plan.
