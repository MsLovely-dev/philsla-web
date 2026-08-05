# Exam Review Isolation Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the valid Score Management backend and move the complete Exam Review backend into an independent `apps.exam_reviews` Django app without changing either module's public API behavior.

**Architecture:** `apps.results` becomes Score Management-only, using commit `9f49e3b` as its valid source. Exam Review behavior from commit `5594e8e` moves to `apps.exam_reviews`, while project URL wiring preserves `/api/v1/results/exam-reviews/...` and explicit foreign-key and permission connections preserve the workflow.

**Tech Stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, SQLite for isolated tests, PostgreSQL-compatible production migrations, React 19, TypeScript 5.8, Vite 6, and Vitest.

**Specification:** `../specs/2026-08-05-exam-review-repair-design.md`

**Execution record:** `../implement/p.malonzo.implement.md`

**Status:** Approved and executed; latest-main integration and verification limitations are recorded in the implementation log.

## Global Constraints

- Execute only in `worktrees/p.malonzo/` on `p.malonzo/exam-review`; invoke `superpowers:using-git-worktrees` before Task 0 and base the worktree on the reviewed commit containing this plan.
- Use Python 3.13 for every backend command. Do not use the current Python 3.14 virtual environment as verification evidence.
- Preserve the public `/api/v1/results/exam-reviews/...` paths and existing frontend request and response contracts.
- Preserve Score Management models, ranking, processing, release behavior, endpoint paths, and migration history from `9f49e3b`.
- Use commit `5594e8e` as the behavioral source for Exam Review; change only imports, app ownership, table namespace, URL-relative paths, and test namespaces required by isolation.
- Keep the local unauthenticated exception restricted to synthetic `DEMO-2026` rows and disabled outside local settings.
- Do not delete a database, fake migrations, rename historical tables automatically, or discard another developer's files.
- Use only synthetic identities, applications, exams, answers, and files in tests and seed data.
- Do not add dependencies, redesign the UI, implement answer recognition, implement Results Release & Analytics, or implement Student Portal.
- Update `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md` after every task with exact commands and observed results.
- Each task ends at its review gate; do not continue after an unexpected failure or diff.
- Run Django and Python commands from `backend/`, npm commands from `frontend/`, and root-relative Git staging/diff commands from the worktree root; each command block below changes directories explicitly where needed.

---

## File map

### Score Management-owned files restored from `9f49e3b`

- `backend/apps/results/apps.py` — Django app configuration.
- `backend/apps/results/models.py` — sessions, ranking populations, exam sets, batches, candidate scores, and release audit rows.
- `backend/apps/results/serializers.py` — processing and result-query validation.
- `backend/apps/results/services.py` — deterministic seed generation, processing, ranking, and batch release.
- `backend/apps/results/views.py` — Score Management list, process, results, profile, release, and CSV endpoints.
- `backend/apps/results/urls.py` — Score Management routes only.
- `backend/apps/results/migrations/0001_initial.py` through `0003_candidatescore_results_can_session_739f12_idx_and_more.py` — canonical Score Management migration chain.
- `backend/apps/results/management/commands/seed_score_management.py` — Score Management seed command.
- `backend/apps/results/tests/test_score_management_api.py`, `test_score_management_models.py`, `test_score_management_seed_command.py`, and `test_score_processing.py` — Score Management regressions.

### Exam Review-owned files created under `apps.exam_reviews`

- `backend/apps/exam_reviews/apps.py` — `ExamReviewsConfig` with `name = "apps.exam_reviews"`.
- `backend/apps/exam_reviews/models.py` — review record, item, answer sheet, status, subject, item type, template source, and private upload path.
- `backend/apps/exam_reviews/admin.py` — Exam Review admin registrations.
- `backend/apps/exam_reviews/serializers.py` — queue, detail, upload, grading-status, and item-score contracts.
- `backend/apps/exam_reviews/services.py` — finalization, grading transitions, subjective scoring, and answer-sheet validation/storage.
- `backend/apps/exam_reviews/views.py` — role and synthetic-demo access plus API orchestration.
- `backend/apps/exam_reviews/urls.py` — paths relative to `/api/v1/results/exam-reviews/`.
- `backend/apps/exam_reviews/migrations/0001_initial.py` — final Exam Review schema in the new namespace.
- `backend/apps/exam_reviews/management/commands/seed_exam_reviews.py` — repeatable synthetic seed data.
- `backend/apps/exam_reviews/tests/test_model_boundary.py` and `test_exam_review_seed_and_api.py` — model ownership and behavioral regressions.

### Shared wiring and regression files

- `backend/config/settings/base.py` — one `apps.results` and one `apps.exam_reviews` entry.
- `backend/config/urls.py` — specific Exam Review include before the general Score Management include.
- `backend/apps/core/tests/test_result_app_boundaries.py` — ownership and route regression tests.
- `docs/api/API-ENDPOINTS.md` — app and migration ownership without changing the contract.
- `docs/architecture/BACKEND-ARCHITECTURE.md` and `docs/architecture/DATABASE-DESIGN.md` — separated module boundaries.
- `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md` — exact execution evidence.

---

### Task 0: Create the isolated execution environment and record the broken baseline

**Files:**

- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**

- Consumes: approved specification and this plan.
- Produces: clean `p.malonzo/exam-review` worktree, Python 3.13 environment, and reproducible baseline evidence.

- [ ] **Step 1: Invoke the isolation workflow**

Use `superpowers:using-git-worktrees` to create or verify `worktrees/p.malonzo/` on `p.malonzo/exam-review` from the reviewed commit containing this plan. Confirm that commit is based on the latest reviewed `origin/main`. Do not reuse `feat/exam-review` for application changes.

- [ ] **Step 2: Verify Git isolation**

Run from the P.Malonzo worktree:

```powershell
git rev-parse --show-toplevel
git rev-parse --git-dir
git rev-parse --git-common-dir
git branch --show-current
git status --short
```

Expected: the top-level path ends in `worktrees/p.malonzo`, the branch is `p.malonzo/exam-review`, and status is empty.

- [ ] **Step 3: Create or verify the Python 3.13 environment**

```powershell
py -3.13 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe --version
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements\tooling.txt
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements\dev.txt
```

Expected: `Python 3.13.x`. If the launcher cannot find Python 3.13, stop and record the runtime blocker; do not substitute Python 3.14.

- [ ] **Step 4: Reproduce the backend failure**

```powershell
Set-Location backend
.\.venv\Scripts\python.exe manage.py check --settings=config.settings.local
.\.venv\Scripts\python.exe -m compileall -q apps\results
```

Expected red baseline: Django reports duplicate `results` application labels, and compilation reports the five malformed results files recorded in the specification.

- [ ] **Step 5: Record Task 0 evidence**

Append the exact worktree path, branch, Python version, commands, exit codes, and errors to the Task 0 section of `p.malonzo.implement.md`.

- [ ] **Step 6: Commit the baseline record**

```powershell
Set-Location ..
git add docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "docs: record exam review repair baseline"
```

---

### Task 1: Restore the Score Management application boundary

**Files:**

- Create: `backend/apps/core/tests/test_result_app_boundaries.py`
- Modify: `backend/config/settings/base.py`
- Modify: `backend/config/urls.py`
- Replace from `9f49e3b`: Score Management files listed in the file map.
- Remove from `apps.results`: Exam Review-only migrations, seed command, test, admin content, models, serializers, services, views, and URLs.
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**

- Consumes: canonical Score Management tree at `9f49e3b`.
- Produces: runnable `apps.results` containing only `ExaminationSession`, `RankingPopulation`, `ExamSet`, `ScoreProcessingBatch`, `CandidateScore`, and `ScoreReleaseAuditLog` plus the existing Score Management endpoints.

- [ ] **Step 1: Write the failing ownership regression test**

Create `backend/apps/core/tests/test_result_app_boundaries.py`:

```python
from django.apps import apps
from django.conf import settings
from django.test import SimpleTestCase


class ResultAppBoundaryTests(SimpleTestCase):
    def test_results_app_is_registered_once_and_owns_only_score_models(self):
        self.assertEqual(settings.INSTALLED_APPS.count("apps.results"), 1)
        model_names = {
            model.__name__
            for model in apps.get_app_config("results").get_models()
        }
        self.assertEqual(
            model_names,
            {
                "ExaminationSession",
                "RankingPopulation",
                "ExamSet",
                "ScoreProcessingBatch",
                "CandidateScore",
                "ScoreReleaseAuditLog",
            },
        )
```

- [ ] **Step 2: Run the test and confirm the red state**

```powershell
Set-Location backend
.\.venv\Scripts\python.exe manage.py test apps.core.tests.test_result_app_boundaries --settings=config.settings.test
```

Expected: Django fails during setup with the duplicate `results` label.

- [ ] **Step 3: Restore the canonical Score Management package**

Use these read-only comparisons to obtain the exact source, then apply the contents with reviewed patches:

```powershell
Set-Location ..
git diff 9f49e3b -- backend/apps/results
git show 9f49e3b:backend/apps/results/models.py
git show 9f49e3b:backend/apps/results/services.py
git show 9f49e3b:backend/apps/results/views.py
git show 9f49e3b:backend/apps/results/urls.py
```

Restore every Score Management file listed in the file map. Keep only these migrations:

```text
0001_initial.py
0002_candidatescore_results_candidate_score_max_score_positive_and_more.py
0003_candidatescore_results_can_session_739f12_idx_and_more.py
```

Remove the Exam Review migration files, `seed_exam_reviews.py`, and `test_exam_review_seed_and_api.py` from `apps.results`; their behavior returns under `apps.exam_reviews` in Tasks 2 and 3.

- [ ] **Step 4: Remove duplicate shared wiring**

Make the installed-app and URL fragments exactly:

```python
# backend/config/settings/base.py
"apps.results",
```

```python
# backend/config/urls.py
path(
    "api/v1/results/",
    include(("apps.results.urls", "results"), namespace="results"),
),
```

Preserve all unrelated installed apps and URL includes already on `main`.

- [ ] **Step 5: Run the Score Management boundary and focused tests**

```powershell
Set-Location backend
.\.venv\Scripts\python.exe manage.py check --settings=config.settings.local
.\.venv\Scripts\python.exe manage.py test apps.core.tests.test_result_app_boundaries apps.results.tests.test_score_management_models apps.results.tests.test_score_processing apps.results.tests.test_score_management_seed_command apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: Django check passes, the boundary test passes, and all Score Management focused tests pass with zero failures and errors.

- [ ] **Step 6: Inspect and record the Task 1 result**

```powershell
Set-Location ..
git diff --check
git diff -- backend/apps/results backend/config/settings/base.py backend/config/urls.py backend/apps/core/tests/test_result_app_boundaries.py
```

Record exact test totals and confirm that no Score Management contract changed.

- [ ] **Step 7: Commit the Score Management restoration**

```powershell
git add backend/apps/results backend/config/settings/base.py backend/config/urls.py backend/apps/core/tests/test_result_app_boundaries.py docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "fix: restore score management app boundary"
```

---

### Task 2: Create the independent Exam Review model and migration boundary

**Files:**

- Create: `backend/apps/exam_reviews/__init__.py`
- Create: `backend/apps/exam_reviews/apps.py`
- Create: `backend/apps/exam_reviews/models.py`
- Create: `backend/apps/exam_reviews/admin.py`
- Create: `backend/apps/exam_reviews/migrations/__init__.py`
- Create: `backend/apps/exam_reviews/migrations/0001_initial.py`
- Create: `backend/apps/exam_reviews/tests/__init__.py`
- Create: `backend/apps/exam_reviews/tests/test_model_boundary.py`
- Modify: `backend/config/settings/base.py`
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**

- Consumes: `applications.StudentApplication`, `settings.AUTH_USER_MODEL`, and the final Exam Review model behavior from `5594e8e`.
- Produces: `ExamReviewRecord`, `ExamReviewItem`, `ExamReviewAnswerSheet`, their enums, `answer_sheet_upload_to`, and one new app-specific migration leaf.

- [ ] **Step 1: Write the failing model-boundary test**

```python
from django.apps import apps
from django.db.models.deletion import PROTECT
from django.test import SimpleTestCase


class ExamReviewModelBoundaryTests(SimpleTestCase):
    def test_exam_review_models_use_their_own_app_and_table_namespace(self):
        app_config = apps.get_app_config("exam_reviews")
        models = list(app_config.get_models())
        self.assertEqual(
            {model.__name__ for model in models},
            {"ExamReviewRecord", "ExamReviewItem", "ExamReviewAnswerSheet"},
        )
        self.assertTrue(
            all(model._meta.db_table.startswith("exam_reviews_") for model in models)
        )
        application_field = app_config.get_model("ExamReviewRecord")._meta.get_field(
            "application"
        )
        self.assertEqual(
            application_field.remote_field.model._meta.label,
            "applications.StudentApplication",
        )
        self.assertIs(application_field.remote_field.on_delete, PROTECT)
```

- [ ] **Step 2: Run the model test and confirm it fails**

```powershell
Set-Location backend
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews.tests.test_model_boundary --settings=config.settings.test
```

Expected: import or app-lookup failure because `apps.exam_reviews` does not exist yet.

- [ ] **Step 3: Create the app configuration**

```python
from django.apps import AppConfig


class ExamReviewsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.exam_reviews"
```

Add `"apps.exam_reviews"` exactly once to `INSTALLED_APPS`, immediately before `"apps.results"` so the ownership boundary is visible.

- [ ] **Step 4: Port the final Exam Review models**

Use `git show 5594e8e:backend/apps/results/models.py` as the exact behavioral source. Move only these interfaces into `apps.exam_reviews.models`:

- `ExamReviewStatus(models.TextChoices)`
- `ExamReviewRecord(models.Model)`
- `ExamReviewSubject(models.TextChoices)`
- `ExamReviewItemType(models.TextChoices)`
- `ExamReviewItem(models.Model)`
- `answer_sheet_upload_to(instance, filename)`
- `ExamReviewTemplateSource(models.TextChoices)`
- `ExamReviewAnswerSheet(models.Model)`

Preserve field definitions, constraints, protected foreign keys, private generated upload paths, and ordering. Do not copy any Score Management class.

- [ ] **Step 5: Generate and inspect the new migration**

```powershell
.\.venv\Scripts\python.exe manage.py makemigrations exam_reviews --name initial --settings=config.settings.local
Get-Content -Raw apps\exam_reviews\migrations\0001_initial.py
```

Expected migration properties:

```python
dependencies = [
    ("applications", "0013_studentapplicationadditionalattachment"),
]
```

It creates only `ExamReviewRecord`, `ExamReviewItem`, and `ExamReviewAnswerSheet`; imports use `apps.exam_reviews.models`; no `results` model or table is altered.

- [ ] **Step 6: Port the Exam Review admin registrations**

Move the registrations from `5594e8e:backend/apps/results/admin.py` to `apps.exam_reviews.admin`, changing only the model import path.

- [ ] **Step 7: Run model and migration checks**

```powershell
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews.tests.test_model_boundary --settings=config.settings.test
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local
.\.venv\Scripts\python.exe -m compileall -q apps\results apps\exam_reviews
```

Expected: model test passes, no new migration is detected, and both packages compile.

- [ ] **Step 8: Record and commit the model boundary**

```powershell
Set-Location ..
git add backend/apps/exam_reviews backend/config/settings/base.py docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git diff --cached --check
git commit -m "feat: isolate exam review models and migrations"
```

---

### Task 3: Port the Exam Review services, API, seed command, and behavioral tests

**Files:**

- Create: `backend/apps/exam_reviews/serializers.py`
- Create: `backend/apps/exam_reviews/services.py`
- Create: `backend/apps/exam_reviews/views.py`
- Create: `backend/apps/exam_reviews/urls.py`
- Create: `backend/apps/exam_reviews/management/__init__.py`
- Create: `backend/apps/exam_reviews/management/commands/__init__.py`
- Create: `backend/apps/exam_reviews/management/commands/seed_exam_reviews.py`
- Create: `backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py`
- Modify: `backend/apps/core/tests/test_result_app_boundaries.py`
- Modify: `backend/config/urls.py`
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**

- Consumes: Exam Review models from Task 2, `RoleRequiredPermission`, `require_roles`, `StudentApplication`, and existing settings `EXAM_REVIEW_MAX_ANSWER_SHEET_BYTES` and `EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS`.
- Produces: unchanged queue/detail payloads and the service functions `release_exam_review`, `set_exam_review_grading_status`, `score_exam_review_item`, and `upload_exam_review_answer_sheet`.

- [ ] **Step 1: Port the existing behavioral tests first**

Copy the complete test behavior from `5594e8e:backend/apps/results/tests/test_exam_review_seed_and_api.py` into the new test module. Make only these ownership changes:

```python
from apps.exam_reviews.models import (
    ExamReviewAnswerSheet,
    ExamReviewItem,
    ExamReviewRecord,
    ExamReviewTemplateSource,
)

reverse("exam_reviews:exam-review-queue")
reverse("exam_reviews:exam-review-detail", args=[record.id])
reverse("exam_reviews:exam-review-release", args=[record.id])
reverse("exam_reviews:exam-review-grading-status", args=[record.id])
reverse("exam_reviews:exam-review-answer-sheet-upload", args=[record.id])
reverse("exam_reviews:exam-review-item-score", args=[record.id, item.id])
```

Retain all 17 behavioral cases covering seed repeatability, roles, local-demo isolation, grading, subjective scoring, finalization, and answer-sheet validation.

Import `CandidateScore`, then add an explicit regression method to `ExamReviewQueueApiTests` proving finalization does not create a Score Management row:

```python
from apps.results.models import CandidateScore


    def test_release_finalizes_without_creating_score_management_record(self):
        self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
        record = ExamReviewRecord.objects.filter(status="GRADED").first()
        score_count_before = CandidateScore.objects.count()

        response = self.client.post(
            reverse("exam_reviews:exam-review-release", args=[record.id])
        )

        self.assertEqual(response.status_code, 200)
        record.refresh_from_db()
        self.assertEqual(record.status, "FINALIZED")
        self.assertEqual(CandidateScore.objects.count(), score_count_before)
```

- [ ] **Step 2: Extend the route ownership regression and run red tests**

Add:

```python
from django.urls import resolve

def test_exam_review_and_score_management_routes_have_distinct_owners(self):
    exam_match = resolve("/api/v1/results/exam-reviews/")
    score_match = resolve("/api/v1/results/score-management/batches/")
    self.assertEqual(exam_match.namespace, "exam_reviews")
    self.assertEqual(score_match.namespace, "results")
```

Run:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews.tests.test_exam_review_seed_and_api apps.core.tests.test_result_app_boundaries --settings=config.settings.test
```

Expected: URL reverse or resolution failures because Exam Review serializers, services, views, URLs, and project include are not present.

- [ ] **Step 3: Port serializers and services from the valid Exam Review commit**

Use the complete contents of these sources and change relative ownership imports only:

```powershell
git show 5594e8e:backend/apps/results/serializers.py
git show 5594e8e:backend/apps/results/services.py
```

Required service signatures remain:

- `release_exam_review(*, review_id, actor: object) -> ExamReviewRecord`
- `set_exam_review_grading_status(*, review_id, status: str, actor: object) -> ExamReviewRecord`
- `score_exam_review_item(*, review_id, item_id, points: int, actor: object) -> ExamReviewRecord`
- `upload_exam_review_answer_sheet(*, review_id, uploaded_file, template_source: str, actor: object) -> ExamReviewRecord`

Preserve atomic state changes, byte-signature checks, the configured size limit, immutable file versions, score aggregation, and conflict exceptions.

- [ ] **Step 4: Port views and use URL-relative paths**

Port the six view classes from `5594e8e:backend/apps/results/views.py`. Keep the role list and synthetic-demo query restriction unchanged.

Create `apps.exam_reviews.urls` with paths relative to the project prefix:

```python
from django.urls import path

from .views import (
    ExamReviewAnswerSheetUploadView,
    ExamReviewDetailView,
    ExamReviewGradingStatusView,
    ExamReviewItemScoreView,
    ExamReviewQueueView,
    ExamReviewReleaseView,
)

urlpatterns = [
    path("", ExamReviewQueueView.as_view(), name="exam-review-queue"),
    path("<uuid:review_id>/", ExamReviewDetailView.as_view(), name="exam-review-detail"),
    path("<uuid:review_id>/release/", ExamReviewReleaseView.as_view(), name="exam-review-release"),
    path("<uuid:review_id>/grading-status/", ExamReviewGradingStatusView.as_view(), name="exam-review-grading-status"),
    path("<uuid:review_id>/answer-sheets/", ExamReviewAnswerSheetUploadView.as_view(), name="exam-review-answer-sheet-upload"),
    path("<uuid:review_id>/items/<uuid:item_id>/score/", ExamReviewItemScoreView.as_view(), name="exam-review-item-score"),
]
```

- [ ] **Step 5: Add the specific project URL include**

Place this include before the general `apps.results` include:

```python
path(
    "api/v1/results/exam-reviews/",
    include(("apps.exam_reviews.urls", "exam_reviews"), namespace="exam_reviews"),
),
path(
    "api/v1/results/",
    include(("apps.results.urls", "results"), namespace="results"),
),
```

- [ ] **Step 6: Port the seed command**

Move the complete command from `5594e8e:backend/apps/results/management/commands/seed_exam_reviews.py`, changing its Exam Review model imports to `apps.exam_reviews.models`. Preserve `DEMO-2026`, seven repeatable applications/reviews, 20 items per exam, and idempotency.

- [ ] **Step 7: Run focused Exam Review and boundary tests**

```powershell
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews.tests.test_exam_review_seed_and_api apps.exam_reviews.tests.test_model_boundary apps.core.tests.test_result_app_boundaries --settings=config.settings.test
.\.venv\Scripts\python.exe manage.py check --settings=config.settings.local
```

Expected: all 18 Exam Review behavioral tests plus model and boundary tests pass; Django reports no system-check issues.

- [ ] **Step 8: Record and commit the Exam Review API port**

```powershell
Set-Location ..
git add backend/apps/exam_reviews backend/apps/core/tests/test_result_app_boundaries.py backend/config/urls.py docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git diff --cached --check
git commit -m "feat: isolate exam review API and services"
```

---

### Task 4: Prove the migration graph is unambiguous and non-destructive

**Files:**

- Create: `backend/apps/core/tests/test_result_migration_boundaries.py`
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**

- Consumes: canonical Score Management migrations and the new Exam Review initial migration.
- Produces: regression coverage for one migration leaf per app and recorded environment diagnostics before any local schema change.

- [ ] **Step 1: Write the migration-leaf regression test**

```python
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase


class ResultMigrationBoundaryTests(TestCase):
    def test_results_and_exam_reviews_have_independent_leaf_nodes(self):
        executor = MigrationExecutor(connection)
        leaves = set(executor.loader.graph.leaf_nodes())
        self.assertIn(
            ("results", "0003_candidatescore_results_can_session_739f12_idx_and_more"),
            leaves,
        )
        self.assertIn(("exam_reviews", "0001_initial"), leaves)
        self.assertEqual(sum(app == "results" for app, _ in leaves), 1)
        self.assertEqual(sum(app == "exam_reviews" for app, _ in leaves), 1)
```

- [ ] **Step 2: Run the graph test**

```powershell
Set-Location backend
.\.venv\Scripts\python.exe manage.py test apps.core.tests.test_result_migration_boundaries --settings=config.settings.test
```

Expected: pass with one leaf for each app. If the generated Exam Review migration has a different final name, rename it to `0001_initial` before application and rerun; do not weaken the assertion.

- [ ] **Step 3: Inspect migration state without mutating the database**

```powershell
.\.venv\Scripts\python.exe manage.py showmigrations results exam_reviews --settings=config.settings.local
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local
.\.venv\Scripts\python.exe manage.py migrate --plan --settings=config.settings.local
```

Expected: canonical Score Management migrations, one new Exam Review initial migration, no model drift, and a forward plan without fake operations. If local history reports incompatible old `results` Exam Review migrations or tables, stop before `migrate` and record the exact mismatch.

- [ ] **Step 4: Run migrations only against test/disposable state**

```powershell
.\.venv\Scripts\python.exe manage.py test apps.core.tests.test_result_migration_boundaries apps.exam_reviews.tests apps.results.tests --settings=config.settings.test
```

Expected: the test database builds and all focused backend tests pass. Do not apply the new migration to a shared or production database in this task.

- [ ] **Step 5: Record and commit migration safeguards**

```powershell
Set-Location ..
git add backend/apps/core/tests/test_result_migration_boundaries.py docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "test: protect result migration boundaries"
```

---

### Task 5: Verify the unchanged Exam Review frontend contract

**Files:**

- Verify only: `frontend/src/services/backendExamReviewService.ts`
- Verify only: `frontend/src/services/backendExamReviewService.test.ts`
- Verify only: `frontend/src/services/examReviewExportService.ts`
- Verify only: `frontend/src/services/examReviewExportService.test.ts`
- Verify only: `frontend/src/pages/admin/hub/ExamReviewList.tsx` and its test.
- Verify only: `frontend/src/pages/admin/hub/ExamReviewDetail.tsx` and its test.
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**

- Consumes: unchanged `/api/v1/results/exam-reviews/...` backend paths and response contracts.
- Produces: evidence that backend ownership changed without requiring frontend transport or UI changes.

- [ ] **Step 1: Run all focused Exam Review frontend tests**

```powershell
Set-Location frontend
npm test -- src/services/backendExamReviewService.test.ts src/services/examReviewExportService.test.ts src/pages/admin/hub/ExamReviewList.test.tsx src/pages/admin/hub/ExamReviewDetail.test.tsx
```

Expected: four files and 16 tests pass. The backend-service tests must continue to assert the exact existing URL strings.

- [ ] **Step 2: Enforce the no-change frontend boundary**

```powershell
git diff --exit-code -- src/services/backendExamReviewService.ts src/services/examReviewExportService.ts src/pages/admin/hub/ExamReviewList.tsx src/pages/admin/hub/ExamReviewDetail.tsx
```

Expected: exit code `0`. If a focused test fails, stop and record the failure; do not change the public contract or UI without an approved plan amendment.

- [ ] **Step 3: Record and commit the verification evidence**

```powershell
Set-Location ..
git add docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "docs: record exam review frontend verification"
```

---

### Task 6: Align API and architecture documentation

**Files:**

- Modify: `docs/api/API-ENDPOINTS.md`
- Modify: `docs/architecture/BACKEND-ARCHITECTURE.md`
- Modify: `docs/architecture/DATABASE-DESIGN.md`
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**

- Consumes: verified app, URL, migration, and behavior boundaries from Tasks 1 through 5.
- Produces: accurate module ownership and migration references without claiming a Score Management handoff or answer recognition.

- [ ] **Step 1: Update API ownership language**

Keep all Exam Review endpoint tables and payload descriptions unchanged. Replace old migration/app statements with explicit ownership:

```text
Exam Review endpoints are implemented by apps.exam_reviews and retain the
/api/v1/results/exam-reviews/ public prefix. Exam Review release changes the
review status to FINALIZED; it does not create or update a Score Management row.
```

Reference `exam_reviews.0001_initial` instead of the old `results.0002` through `results.0005` Exam Review migrations.

- [ ] **Step 2: Update architecture boundaries**

Document:

```text
apps.results owns Score Management processing, ranking, batch release, and CSV export.
apps.exam_reviews owns review queue/detail, grading, answer sheets, and finalization.
apps.exam_reviews depends on applications.StudentApplication and apps.accounts permissions.
```

Do not describe the modules as separate services or databases.

- [ ] **Step 3: Scan for stale ownership claims**

```powershell
rg -n "results\.000[2-5].*exam|apps\.results.*Exam Review|Exam Review.*apps\.results" docs
git diff --check
```

Expected: no stale migration or shared-ownership claim remains in directly affected documentation; unrelated historical commit references are left intact.

- [ ] **Step 4: Record and commit documentation alignment**

```powershell
git add docs/api/API-ENDPOINTS.md docs/architecture/BACKEND-ARCHITECTURE.md docs/architecture/DATABASE-DESIGN.md docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "docs: document exam review app boundary"
```

---

### Task 7: Run full verification and complete the implementation record

**Files:**

- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**

- Consumes: all repaired backend code, unchanged frontend contract, and aligned documentation.
- Produces: final evidence for review; it does not merge, push, or deploy automatically.

- [ ] **Step 1: Run backend compilation and configuration checks**

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m compileall -q apps\results apps\exam_reviews
.\.venv\Scripts\python.exe manage.py check --settings=config.settings.local
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local
```

Expected: all commands exit `0`, Django reports no issues, and no migration changes are detected.

- [ ] **Step 2: Run focused and complete backend tests**

```powershell
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews apps.results apps.core.tests.test_result_app_boundaries apps.core.tests.test_result_migration_boundaries --settings=config.settings.test
.\.venv\Scripts\python.exe manage.py test --settings=config.settings.test
```

Expected: focused tests pass. Record the full-suite total, failures, errors, and skips exactly; disclose unrelated baseline failures rather than weakening assertions.

- [ ] **Step 3: Run frontend tests, TypeScript, and build**

```powershell
Set-Location ..\frontend
npm test -- src/services/backendExamReviewService.test.ts src/services/examReviewExportService.test.ts src/pages/admin/hub/ExamReviewList.test.tsx src/pages/admin/hub/ExamReviewDetail.test.tsx
npm run lint
npm run build
```

Expected: focused tests, TypeScript checking, and the production build exit `0`. Record any unrelated pre-existing failure separately.

- [ ] **Step 4: Inspect the complete diff and commit history**

```powershell
Set-Location ..
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD
git log --oneline --decorate origin/main..HEAD
```

Expected: changes are limited to Score Management restoration, `apps.exam_reviews`, minimal shared wiring, focused boundary tests, affected docs, and the P.Malonzo execution record.

- [ ] **Step 5: Complete the implementation record**

Record every command and result, migration diagnostic, skipped check, remaining limitation, commit hash, and rollback note. Mark the record complete only if all required work is implemented and no undisclosed failure remains.

- [ ] **Step 6: Commit final verification evidence**

```powershell
git add docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "docs: complete exam review repair record"
```

- [ ] **Step 7: Stop for code review**

Do not push, merge, deploy, migrate a shared database, or start the Results Release roadmap until P.Malonzo reviews the final diff and verification evidence.

---

## Definition of done

- [ ] Work ran in `worktrees/p.malonzo/` on `p.malonzo/exam-review` using Python 3.13.
- [ ] `apps.results` contains only the canonical Score Management implementation and focused tests pass.
- [ ] `apps.exam_reviews` contains all valid Exam Review behavior and focused tests pass.
- [ ] Public Exam Review paths and frontend contracts are unchanged.
- [ ] Score Management and Exam Review have one independent migration leaf each.
- [ ] No database was deleted, reset, or modified with fake migrations.
- [ ] Full backend and frontend checks have exact recorded outcomes.
- [ ] Documentation states that finalization is not a real Score Management handoff and answer recognition is not implemented.
- [ ] `p.malonzo.implement.md` contains the complete execution and rollback evidence.
- [ ] Final code review is complete before any push or merge.

## Rollback

- Revert Task 3 before Task 2 if the new Exam Review API must be removed.
- Revert Task 2 only after confirming no environment applied `exam_reviews.0001_initial`.
- Keep Score Management migrations unchanged; revert Task 1 only as an application commit, never by rewriting applied migration history.
- If an environment has incompatible old Exam Review tables under `results`, stop deployment and create an environment-specific recovery plan.
- Frontend rollback is unnecessary when Task 5 confirms no frontend production file changed.
