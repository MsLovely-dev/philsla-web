# Exam Review End-to-End Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove and document the complete Exam Review-to-student-result workflow after the baseline, student-results, release-orchestration, and analytics plans are implemented.

**Architecture:** Add one mocked-contract Playwright journey spanning the protected administrative and student screens, then run backend/frontend regression suites and production builds. Rehearse transactional behavior on PostgreSQL-compatible storage separately from the incompatible local SQLite database.

**Tech Stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, PostgreSQL-compatible storage, React 19, TypeScript 5.8, Vite 6, Vitest, Playwright.

## Global Constraints

- Execute this plan only after the other four 2026-08-07 plans pass review and implementation.
- Never delete, reset, migrate, or fake migration history in `backend/db.sqlite3`.
- Use synthetic accounts, candidate identifiers, examination content, and result values.
- Record exact commands, counts, exit codes, retries, skips, and unrelated failures.
- Do not claim PostgreSQL or Python 3.13 verification unless those exact environments were used.

---

### Task 1: Add the critical browser journey

**Files:**
- Create: `frontend/e2e/exam-review-results-release.spec.ts`
- Modify: `frontend/src/routing/routes.tsx`
- Modify: `frontend/src/routing/routes.test.tsx`

**Interfaces:**
- Consumes: Exam Review detail, Results Release, Student Results, and Reporting Matrix routes plus their API contracts.
- Produces: a repeatable protected-route journey proving the UI transition sequence and data minimization.

- [ ] **Step 1: Write the failing Playwright journey**

Use synthetic route fixtures and count mutation requests:

```typescript
test('review, process, release, student read, and aggregate reporting form one workflow', async ({ page }) => {
  await useSession(page, examAdministrator);
  await mockExamReviewApi(page, { status: 'GRADED', pendingSubjectiveItems: 0 });
  await mockReleaseApi(page);

  await page.goto('/admin/hub/review/review-id');
  await page.getByRole('button', { name: 'Release to Score Management' }).click();
  await expect(page.getByText('Released to Score Management')).toBeVisible();

  await page.goto('/admin/hub/results-release');
  await page.getByRole('button', { name: 'Process scores' }).click();
  await page.getByRole('button', { name: 'Confirm processing' }).click();
  await page.getByRole('button', { name: 'Release results' }).click();
  await page.getByRole('button', { name: 'Confirm release' }).click();
  await expect(page.getByText('Results released')).toBeVisible();

  await useSession(page, student);
  await page.goto('/student/results');
  await expect(page.getByText('Synthetic 2027 Session')).toBeVisible();
  await expect(page.getByText(/qualified|eligible|cutoff/i)).toHaveCount(0);

  await useSession(page, executive);
  await page.goto('/admin/results/matrix');
  await expect(page.getByText('Released Results Overview')).toBeVisible();
  await expect(page.getByText(/candidate id|lrn/i)).toHaveCount(0);
});
```

The route fixtures must return the exact response types defined in the approved plans and must assert one request per mutation.

- [ ] **Step 2: Run the journey to verify missing integrations fail**

```powershell
npm run test:e2e -- e2e/exam-review-results-release.spec.ts
```

Expected before the four feature plans: FAIL on the mock Results Release or Student Results screens. Expected after them: PASS.

- [ ] **Step 3: Complete route authorization assertions**

Add `EXAM_ADMINISTRATOR` to the Reporting Matrix route while preserving the frontend `GOVERNMENT` role that maps authenticated agency backend roles into the UI. Add route-table cases proving:

```typescript
expect(APP_ROUTES.find(route => route.path === '/admin/hub/results-release')?.allowedRoles)
  .toEqual(['EXAM_ADMINISTRATOR', 'SYSTEM_ADMIN']);
expect(APP_ROUTES.find(route => route.path === '/student/results')?.allowedRoles)
  .toEqual(['STUDENT']);
expect(APP_ROUTES.find(route => route.path === '/admin/results/matrix')?.allowedRoles)
  .toEqual(['EXECUTIVE', 'GOVERNMENT', 'UNIVERSITY_ADMIN', 'EXAM_ADMINISTRATOR', 'SYSTEM_ADMIN']);
```

Use the existing route-test helpers and backend-role mapping rather than introducing a second authorization table.

- [ ] **Step 4: Run browser and route tests**

```powershell
npm test -- src/routing/routes.test.tsx --run
npm run test:e2e -- e2e/exam-review.spec.ts e2e/exam-review-results-release.spec.ts
```

Expected: route tests and all Exam Review/result release browser journeys pass.

- [ ] **Step 5: Commit the browser coverage**

```powershell
git add frontend/e2e/exam-review-results-release.spec.ts frontend/src/routing/routes.tsx frontend/src/routing/routes.test.tsx
git commit -m "test(results): cover review-to-release journey"
```

### Task 2: Update architecture, API, security, and implementation records

**Files:**
- Modify: `docs/api/API-ENDPOINTS.md`
- Modify: `docs/architecture/BACKEND-ARCHITECTURE.md`
- Modify: `docs/architecture/FRONTEND-ARCHITECTURE.md`
- Modify: `docs/architecture/SECURITY-ARCHITECTURE.md`
- Modify: `docs/superpowers/p.malonzo/p.malonzo.task.md`
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**
- Consumes: shipped contracts and observed verification results.
- Produces: factual source-of-truth documentation and rollback notes.

- [ ] **Step 1: Update API documentation**

Document exact methods, paths, roles, query parameters, response fields, empty behavior, error statuses, sensitive-field exclusions, and examples for:

```text
GET /api/v1/results/me/
GET /api/v1/results/release-summary/
GET /api/v1/results/analytics/overview/
POST /api/v1/results/score-management/batches/{sessionId}/process/
POST /api/v1/results/score-management/batches/{sessionId}/release/
```

- [ ] **Step 2: Update architecture and security boundaries**

Record that `apps.exam_reviews` ends at atomic score intake, `apps.results` owns processing/publication/student reads/aggregates, student resolution starts from the authenticated account, and aggregate responses exclude candidate rows. State that qualification, appeals/holds, external distribution, OCR/OMR, and official ranking approval remain excluded decisions.

- [ ] **Step 3: Update task and implementation status**

Record every commit, changed contract, exact test command/result, Python version, database engine, skipped PostgreSQL check, baseline failure, and rollback rule. Remove obsolete statements that Student Results, Results Release, or result analytics remain mock-only only when the corresponding shipped code and tests prove otherwise.

- [ ] **Step 4: Run documentation consistency checks**

```powershell
rg -n "no backend entity|mock-only|mock data|localStorage|qualification|cutoff|/api/v1/results/me/|release-summary|analytics/overview" docs frontend/src/pages/ResultsPage.tsx frontend/src/pages/admin/hub/ResultsRelease.tsx frontend/src/pages/results/ReportingMatrix.tsx
git diff --check
```

Expected: no active documentation contradicts the shipped contracts; excluded policy words appear only in explicit exclusion statements; diff check exits `0`.

- [ ] **Step 5: Commit documentation**

```powershell
git add docs/api/API-ENDPOINTS.md docs/architecture/BACKEND-ARCHITECTURE.md docs/architecture/FRONTEND-ARCHITECTURE.md docs/architecture/SECURITY-ARCHITECTURE.md docs/superpowers/p.malonzo/p.malonzo.task.md docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "docs(results): record end-to-end release workflow"
```

### Task 3: Run final backend verification

**Files:**
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**
- Consumes: all backend changes from the approved plans.
- Produces: exact focused/full-suite and migration evidence.

- [ ] **Step 1: Run focused checks**

```powershell
py -3.13 manage.py check --settings=config.settings.local
py -3.13 manage.py makemigrations --check --dry-run --settings=config.settings.local
py -3.13 manage.py test apps.exam_reviews.tests apps.results.tests --settings=config.settings.test
```

Expected: check passes, no migrations are detected, and focused tests pass.

- [ ] **Step 2: Run the complete backend suite**

```powershell
py -3.13 manage.py test --settings=config.settings.test
```

Expected: complete suite passes. Any unrelated failure is recorded with its exact test and traceback; no assertion is removed.

- [ ] **Step 3: Rehearse PostgreSQL-compatible behavior**

Using a disposable PostgreSQL-compatible database URL containing synthetic data only:

```powershell
if (-not $env:PHILSA_POSTGRES_TEST_DATABASE_URL) { throw 'PHILSA_POSTGRES_TEST_DATABASE_URL is required for the approved disposable PostgreSQL test database.' }
$env:DATABASE_URL=$env:PHILSA_POSTGRES_TEST_DATABASE_URL
py -3.13 manage.py migrate --settings=config.settings.test
py -3.13 manage.py test apps.exam_reviews.tests apps.results.tests --settings=config.settings.test
Remove-Item Env:DATABASE_URL
```

Expected: migrations and focused tests pass on PostgreSQL-compatible storage. If no approved disposable database is available, skip this step and record the release blocker; do not substitute the incompatible local SQLite database.

- [ ] **Step 4: Append exact backend evidence**

Record engine, interpreter, commands, test counts, durations, exit codes, and skipped checks in the implementation record.

### Task 4: Run final frontend verification and inspect the diff

**Files:**
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**
- Consumes: all frontend changes from the approved plans.
- Produces: final test, lint, build, browser, accessibility, and diff evidence.

- [ ] **Step 1: Run focused feature tests**

```powershell
npm test -- src/services/backendExamReviewService.test.ts src/services/examReviewExportService.test.ts src/services/studentResultsService.test.ts src/services/resultsReleaseService.test.ts src/services/resultsAnalyticsService.test.ts src/pages/admin/hub/ExamReviewList.test.tsx src/pages/admin/hub/ExamReviewDetail.test.tsx src/pages/admin/hub/ResultsRelease.test.tsx src/pages/ResultsPage.test.tsx src/pages/results/ReportingMatrix.test.tsx src/routing/routes.test.tsx --run
```

Expected: all focused files pass.

- [ ] **Step 2: Run complete frontend checks**

```powershell
npm test
npm run lint
npm run build
npm run test:e2e -- e2e/exam-review.spec.ts e2e/exam-review-results-release.spec.ts
```

Expected: tests, TypeScript no-emit lint, build, and browser journeys pass. Record pre-existing failures separately with exact diagnostics.

- [ ] **Step 3: Inspect scope and whitespace**

```powershell
git status --short
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected: changes are limited to the approved result workflow, tests, plans/spec, and documentation; diff check exits `0`; no secret, real identity, real examination content, or private environment value appears.

- [ ] **Step 4: Commit final evidence**

```powershell
git add docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "docs(results): record final verification"
```
