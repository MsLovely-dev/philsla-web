# Exam Review Isolation Repair Design

**Date:** 2026-08-05

**Owner:** Prince Barachiel Malonzo (P.Malonzo)

**Target worktree:** `worktrees/p.malonzo/`

**Target branch:** `p.malonzo/exam-review`

**Status:** Approved and implemented; GitHub branch publication authorized

## Problem

Exam Review and Score Management were developed independently inside the same Django app, `apps.results`. Merge commit `4affde0` combined their conflicting files by concatenating sections rather than integrating them. Pull request merge `ad6d357` then placed that broken state on `main`.

The current backend has duplicate `apps.results` registrations and duplicate `/api/v1/results/` URL includes. The shared results package also contains malformed Python in its initial migration, models, services, URLs, and views. Django stops during application loading with a duplicate application-label error before any Exam Review or Score Management endpoint can run.

The architectural cause is shared file ownership: two separately owned modules use one Django application label, migration namespace, and set of source files.

## Current evidence

- `backend/config/settings/base.py` contains two `apps.results` entries.
- `backend/config/urls.py` contains two includes for `apps.results.urls` under the same prefix.
- `python manage.py check --settings=config.settings.local` exits with `ImproperlyConfigured: Application labels aren't unique, duplicates: results`.
- `python -m compileall -q apps/results` reports errors in `migrations/0001_initial.py`, `models.py`, `services.py`, `urls.py`, and `views.py`.
- Commit `5594e8e` is the valid pre-conflict Exam Review implementation.
- Commit `9f49e3b` is the valid Score Management merge before the broken Exam Review merge.
- The frontend already uses an isolated `backendExamReviewService.ts` and stable `/api/v1/results/exam-reviews/...` URLs.

## Goal

Restore a runnable backend while preserving both modules' intended behavior and making Exam Review independently owned, testable, and migratable.

The repair must:

- restore Score Management without changing its public API or business rules;
- move Exam Review backend behavior to `apps.exam_reviews`;
- preserve the existing Exam Review frontend routes, API URLs, request and response shapes, permissions, and workflows;
- preserve Exam Review relationships to Student Applications and account roles through explicit cross-app dependencies;
- create an unambiguous migration graph without destructive database actions; and
- make backend startup, focused tests, relevant frontend checks, and documentation consistent with the repaired architecture.

## Non-goals

- Do not redesign the Exam Review UI or rubric display.
- Do not change Score Management models, calculations, ranking, processing, release rules, or frontend behavior.
- Do not implement automatic CSV, OCR, or OMR answer-sheet parsing. Uploads continue to store validated private files and record their selected template source.
- Do not create a new Exam Review-to-Score Management handoff. Existing release behavior continues to mark the review `FINALIZED` only.
- Do not implement the Results Release & Analytics roadmap or Student Portal in this repair.
- Do not delete, reset, or fake migration state in an existing database.

## Approaches considered

### Independent Django apps — selected

Keep Score Management in `apps.results` and move Exam Review to `apps.exam_reviews`. This creates separate labels, models, services, views, migrations, tests, admin registration, and seed commands while preserving explicit integration points.

This has the largest initial file movement but removes the root ownership conflict and provides the safest long-term boundary.

### Merge both modules in `apps.results` — rejected

Manually reconcile every shared file and keep one app. This requires less movement, but both module owners would continue editing the same models, migrations, services, views, URLs, and tests. The merge-conflict risk and unclear ownership would remain.

### Frontend-only recovery — rejected

Ignore the backend and keep the walkthrough on mocks. This avoids backend work but leaves `main` unable to start and misrepresents already documented persistence and API behavior.

## Architecture

### Score Management boundary

`apps.results` remains the Score Management app. Its models, migrations, serializers, services, views, URLs, tests, admin registration, and seed command are restored from the valid Score Management implementation represented by `9f49e3b`.

The repair removes only accidentally concatenated Exam Review sections. It does not redesign or take ownership of Score Management. Any unexpected difference from the valid Score Management source stops the repair for review instead of being resolved through new business rules.

### Exam Review boundary

Exam Review moves to `backend/apps/exam_reviews/` with its own:

- Django `AppConfig` and application label;
- models and admin registrations;
- serializers, services, views, and URLs;
- migration namespace beginning with `0001_initial`;
- focused backend tests; and
- idempotent `seed_exam_reviews` management command.

The existing Exam Review frontend pages, export service, and backend service remain feature-owned. Their transport paths do not change.

### Shared project wiring

Only the minimum project-level wiring changes are allowed:

- register `apps.results` exactly once;
- register `apps.exam_reviews` exactly once;
- include the Score Management results URLs exactly once;
- route `/api/v1/results/exam-reviews/` to `apps.exam_reviews.urls`; and
- declare the specific Exam Review route before the general Score Management results include.

The URL layout remains backward compatible even though the Django ownership changes internally.

## Connections and data flow

Separation does not make Exam Review a standalone service. It remains connected to the same Django project and database.

1. The frontend calls an existing `/api/v1/results/exam-reviews/...` endpoint.
2. Project URL configuration delegates the request to `apps.exam_reviews.urls`.
3. Exam Review views enforce the existing role and local-demo permissions.
4. `ExamReviewRecord` references `applications.StudentApplication` through a protected foreign key.
5. Account roles and authenticated actors come from `apps.accounts`.
6. Exam Review services read or update only Exam Review-owned tables and return the existing serializer contract.

Release retains current semantics: a fully graded review becomes `FINALIZED`. It does not write a Score Management candidate score, processing batch, rank, percentile, or release record. A real handoff requires a separately reviewed interface owned by both Exam Review and Score Management.

## API and behavior preservation

The following endpoint family remains stable:

- queue and detail reads;
- grading-status changes;
- subjective-item scoring;
- private answer-sheet upload;
- finalization; and
- existing frontend CSV/PDF export behavior.

Queue summaries continue to exclude exam content, answer keys, student answers, and private file paths. Detail responses remain restricted to authorized users and the local synthetic-data exception. Finalized records remain immutable for grading, rescoring, and uploads.

## Migration strategy

The canonical `apps.results` migration chain remains the Score Management chain from its valid `0001_initial` through its current Score Management leaf. Those migrations are restored rather than rewritten with Exam Review entities.

`apps.exam_reviews` receives an independent migration chain beginning at `0001_initial`. Its initial migration depends on the required Student Application migration and creates only Exam Review-owned tables with the new app's table namespace.

Before applying migrations, the implementation must inspect `showmigrations`, the migration graph, and the target database state. A developer database that previously applied Exam Review migrations under the old `results` label may contain incompatible synthetic tables or history. The repair must report that condition and stop before schema mutation.

No automatic table renaming, data deletion, migration faking, or database reset is authorized. Synthetic Exam Review data may be recreated with the repaired seed command only after the developer chooses an environment-specific recovery path. Production or shared-environment recovery requires separate review.

## Error handling and security

- Preserve deny-by-default role enforcement for admissions reviewers, exam administrators, university administrators, and system administrators.
- Preserve the local-only unauthenticated exception for the synthetic `DEMO-2026` cycle; it remains disabled by default and in production.
- Preserve private answer-sheet storage, byte-signature validation, the 10 MB limit, immutable upload versions, and safe response metadata.
- Preserve conflict responses that block invalid grading transitions, rescoring, rollback, or uploads after finalization.
- Keep answer keys, student responses, raw files, full applicant identifiers, and sensitive assessment content out of queue summaries and logs.
- Treat migration-history mismatches as blocking diagnostics rather than silently modifying data.
- Use only synthetic identities, applications, exams, responses, and files in tests and examples.

## Expected implementation boundary

The later implementation plan may change only:

- restored Score Management files under `backend/apps/results/`;
- the new `backend/apps/exam_reviews/` package;
- minimum registrations and URL wiring in backend configuration;
- Exam Review backend tests and directly affected Score Management regression tests;
- directly affected Exam Review API and architecture documentation; and
- frontend files only when a failing compatibility test proves a required adjustment.

Unrelated refactoring, dependency additions, UI redesign, Score Management behavior changes, Results Release roadmap implementation, and Student Portal work are excluded.

## Verification design

Implementation verification proceeds from the smallest boundary to the full system using the accepted Python 3.13 runtime:

1. Compile `apps.results` and `apps.exam_reviews`.
2. Run `python manage.py check --settings=config.settings.local`.
3. Inspect the migration graph and run `makemigrations --check` plus `migrate --plan` against disposable or test configuration.
4. Run focused `apps.exam_reviews` tests covering queue/detail authorization, grading transitions, subjective scoring, upload validation, finalization conflicts, seed repeatability, and safe serialization.
5. Run focused Score Management tests to prove restoration did not change its behavior.
6. Run the complete Django test suite and disclose all failures or skips.
7. Run the focused Exam Review frontend page, backend-service, and export-service tests.
8. Run frontend TypeScript checking and the production build, reporting unrelated pre-existing failures separately.
9. Inspect `git diff`, `git diff --check`, migration files, API documentation, and the implementation record before review.

## Delivery and rollback

Application changes must be made in `worktrees/p.malonzo/` on `p.malonzo/exam-review` after the implementation plan is approved. Repair phases should be committed separately so Score Management restoration, Exam Review isolation, wiring, and documentation can be reviewed and reverted independently.

Before deployment, rollback is ordinary commit reversion. After applying `exam_reviews` migrations, application rollback must follow the reviewed migration graph. Score Management migration history remains unchanged. An environment with incompatible historical `results` migrations stops before deployment and requires a separate recovery decision.

## Success criteria

- Django starts without duplicate application labels or results-package syntax errors.
- `apps.results` contains only valid Score Management behavior.
- `apps.exam_reviews` contains all Exam Review backend behavior.
- Existing Exam Review frontend API paths and contracts remain unchanged.
- Exam Review remains connected to Student Applications and account permissions.
- Focused Exam Review and Score Management tests pass under Python 3.13.
- Migration checks produce unambiguous app-specific leaves without fake migrations.
- Existing databases are not deleted or silently rewritten.
- Limitations remain explicit: answer recognition and a real Score Management handoff are not implemented by this repair.

## Review gate

This written specification requires P.Malonzo's review before an implementation plan is created. No application code, test, model, migration, or configuration repair is authorized by this document alone.
