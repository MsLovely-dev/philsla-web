# Results Release Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock Results Release screen with backend-owned session readiness, processing, and release operations for Exam Administrators and System Administrators.

**Architecture:** Add a paginated read-only release-summary endpoint over existing score/session/audit models. Keep existing process and batch-release services authoritative, expand only those mutation views to the operational Exam Administrator role, and consume all three contracts through one typed frontend service.

**Tech Stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, React 19, TypeScript 5.8, Vitest, Testing Library, Playwright.

## Global Constraints

- Do not add individual score release or client-computed readiness.
- Keep candidate profile, raw result browsing, and CSV export restricted to `SYSTEM_ADMIN`.
- Permit `EXAM_ADMINISTRATOR` only for release summary, processing, and batch release.
- Do not expose candidate names, LRNs, emails, scores, or notification bodies in the summary.
- Add no model or migration.

---

### Task 1: Add the administrative release-summary API

**Files:**
- Create: `backend/apps/results/release_views.py`
- Create: `backend/apps/results/tests/test_results_release_api.py`
- Modify: `backend/apps/results/urls.py`
- Modify: `docs/api/API-ENDPOINTS.md`

**Interfaces:**
- Consumes: `ExaminationSession`, `CandidateScore`, `ScoreProcessingBatch`, `ScoreReleaseAuditLog`.
- Produces: `GET /api/v1/results/release-summary/?page=1&pageSize=25&status=&search=`.

- [ ] **Step 1: Write failing summary tests**

Create synthetic sessions representing ready, processed, and released states. Assert the exact contract:

```python
def test_exam_administrator_reads_paginated_release_summary(self):
    self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
    response = self.client.get(reverse("results:release-summary"), {"page": 1, "pageSize": 2})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["page"], 1)
    self.assertEqual(response.data["pageSize"], 2)
    row = response.data["results"][0]
    self.assertCountEqual(row, (
        "id", "name", "status", "isClosed", "totalCandidates", "approvedScores",
        "excludedScores", "processedScores", "releasedScores", "processedAt",
        "releasedAt", "processingReady", "releaseReady",
    ))

def test_summary_search_and_status_filters_are_backend_owned(self):
    response = self.client.get(reverse("results:release-summary"), {"search": "regular", "status": "SCORING_PROCESSED"})
    self.assertTrue(all("regular" in row["name"].lower() or "regular" in row["id"].lower() for row in response.data["results"]))
    self.assertTrue(all(row["status"] == "SCORING_PROCESSED" for row in response.data["results"]))

def test_student_and_anonymous_callers_cannot_read_release_summary(self):
    self.authenticate_as(PortalRole.STUDENT.value)
    self.assertEqual(self.client.get(reverse("results:release-summary")).status_code, 403)
    self.client.force_authenticate(user=None)
    self.assertEqual(self.client.get(reverse("results:release-summary")).status_code, 401)
```

- [ ] **Step 2: Run tests to verify the route is missing**

```powershell
py -3.13 manage.py test apps.results.tests.test_results_release_api --settings=config.settings.test
```

Expected: FAIL because `results:release-summary` is not registered.

- [ ] **Step 3: Implement validated query and annotations**

Create:

```python
class ReleaseSummaryQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(default=1, min_value=1, required=False)
    pageSize = serializers.IntegerField(default=25, min_value=1, max_value=100, required=False)
    status = serializers.ChoiceField(choices=ScoreBatchStatus.choices, required=False)
    search = serializers.CharField(default="", allow_blank=True, trim_whitespace=True, required=False)


class ResultsReleaseSummaryView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.EXAM_ADMINISTRATOR, PortalRole.SYSTEM_ADMIN)
```

Build one annotated `ExaminationSession` query using filtered `Count` values and latest `ScoreProcessingBatch`/`ScoreReleaseAuditLog` subqueries. Compute:

```python
processing_ready = session.is_closed and approved_scores > 0 and session.scoring_status == ScoreBatchStatus.READY_FOR_PROCESSING
release_ready = processed_scores > 0 and released_scores == 0 and session.scoring_status == ScoreBatchStatus.SCORING_PROCESSED
```

Return `{count, page, pageSize, results}` and register:

```python
path("release-summary/", ResultsReleaseSummaryView.as_view(), name="release-summary")
```

- [ ] **Step 4: Run summary tests and verify query count**

```powershell
py -3.13 manage.py test apps.results.tests.test_results_release_api --settings=config.settings.test
```

Expected: all tests pass and the list test asserts a bounded query count independent of session count.

- [ ] **Step 5: Document and commit the summary contract**

```powershell
git add backend/apps/results/release_views.py backend/apps/results/tests/test_results_release_api.py backend/apps/results/urls.py docs/api/API-ENDPOINTS.md
git commit -m "feat(results): add release readiness summary"
```

### Task 2: Align process and release permissions with the protected route

**Files:**
- Modify: `backend/apps/results/views.py`
- Modify: `backend/apps/results/tests/test_results_release_api.py`
- Modify: `docs/api/API-ENDPOINTS.md`

**Interfaces:**
- Consumes: existing `process_score_session` and `release_score_session` services.
- Produces: process and batch release access for `EXAM_ADMINISTRATOR` and `SYSTEM_ADMIN`; all other Score Management views stay system-only.

- [ ] **Step 1: Add failing permission tests**

```python
def test_exam_administrator_can_process_and_release_a_ready_session(self):
    self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
    processed = self.client.post(reverse("results:score-management-process", args=[self.session.id]), {"allowReprocessing": False}, format="json")
    self.assertEqual(processed.status_code, 202)
    released = self.client.post(reverse("results:score-management-release", args=[self.session.id]))
    self.assertEqual(released.status_code, 200)

def test_exam_administrator_still_cannot_browse_candidate_profiles_or_export(self):
    self.authenticate_as(PortalRole.EXAM_ADMINISTRATOR.value)
    self.assertEqual(self.client.get(reverse("results:score-management-profile", args=[self.session.id, self.score.candidate_id])).status_code, 403)
    self.assertEqual(self.client.get(reverse("results:score-management-export", args=[self.session.id])).status_code, 403)
```

- [ ] **Step 2: Run tests to verify current permission denial**

```powershell
py -3.13 manage.py test apps.results.tests.test_results_release_api --settings=config.settings.test
```

Expected: the process/release test fails with `403`; profile/export assertions pass.

- [ ] **Step 3: Add a focused release-operator base view**

```python
class ScoreReleaseOperatorBaseView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.EXAM_ADMINISTRATOR, PortalRole.SYSTEM_ADMIN)


class ScoreManagementProcessView(ScoreReleaseOperatorBaseView):
    # Keep the existing post implementation unchanged.


class ScoreManagementBatchReleaseView(ScoreReleaseOperatorBaseView):
    # Keep the existing post implementation unchanged.
```

Leave `ScoreManagementBaseView` as `SYSTEM_ADMIN` only and keep list/results/profile/export views on it.

- [ ] **Step 4: Run focused and existing Score Management API tests**

```powershell
py -3.13 manage.py test apps.results.tests.test_results_release_api apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: all tests pass. Update the old assertion named `test_exam_administrator_cannot_access_score_management` only to continue checking the batch-list endpoint, not process/release.

- [ ] **Step 5: Commit the permission alignment**

```powershell
git add backend/apps/results/views.py backend/apps/results/tests/test_results_release_api.py backend/apps/results/tests/test_score_management_api.py docs/api/API-ENDPOINTS.md
git commit -m "feat(results): authorize exam release operators"
```

### Task 3: Add the release orchestration frontend service

**Files:**
- Create: `frontend/src/services/resultsReleaseService.ts`
- Create: `frontend/src/services/resultsReleaseService.test.ts`

**Interfaces:**
- Consumes: release summary, existing process endpoint, and existing release endpoint.
- Produces: `list`, `process`, and `release` methods returning `ServiceResult` values without throwing.

- [ ] **Step 1: Write failing transport tests**

```typescript
it('loads a paginated release summary', async () => {
  await service.list({ page: 1, pageSize: 25, search: 'regular' });
  expect(fetcher).toHaveBeenCalledWith(
    'http://backend.test/api/v1/results/release-summary/?page=1&pageSize=25&search=regular',
    expect.objectContaining({ credentials: 'include' }),
  );
});

it('processes and releases only by session id', async () => {
  await service.process('SESSION-1');
  await service.release('SESSION-1');
  expect(fetcher).toHaveBeenNthCalledWith(1, expect.stringContaining('/SESSION-1/process/'), expect.objectContaining({ method: 'POST' }));
  expect(fetcher).toHaveBeenNthCalledWith(2, expect.stringContaining('/SESSION-1/release/'), expect.objectContaining({ method: 'POST' }));
});
```

- [ ] **Step 2: Run the test to verify the service is missing**

```powershell
npm test -- src/services/resultsReleaseService.test.ts --run
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement exact service types**

```typescript
export interface ResultsReleaseSummary {
  id: string;
  name: string;
  status: 'READY_FOR_PROCESSING' | 'SCORING_PROCESSED' | 'RESULTS_RELEASED';
  isClosed: boolean;
  totalCandidates: number;
  approvedScores: number;
  excludedScores: number;
  processedScores: number;
  releasedScores: number;
  processedAt: string | null;
  releasedAt: string | null;
  processingReady: boolean;
  releaseReady: boolean;
}
```

Implement `ResultsReleaseService.list`, `.process`, and `.release` with `ApiClient` and encoded session IDs.

- [ ] **Step 4: Run and commit service tests**

```powershell
npm test -- src/services/resultsReleaseService.test.ts --run
git add frontend/src/services/resultsReleaseService.ts frontend/src/services/resultsReleaseService.test.ts
git commit -m "feat(results): add release orchestration service"
```

### Task 4: Replace the mock Results Release screen

**Files:**
- Modify: `frontend/src/pages/admin/hub/ResultsRelease.tsx`
- Create: `frontend/src/pages/admin/hub/ResultsRelease.test.tsx`

**Interfaces:**
- Consumes: `resultsReleaseService.list/process/release`.
- Produces: authoritative session table with loading, empty, error, confirmation, pending, and refreshed success states.

- [ ] **Step 1: Write failing component tests**

Cover summary rendering, empty state, safe error, processing confirmation, release confirmation, duplicate-submit prevention, and post-success refetch:

```typescript
it('confirms and releases a ready processed session once', async () => {
  vi.mocked(resultsReleaseService.list).mockResolvedValue({ ok: true, data: pageWith(releaseReadySession) });
  vi.mocked(resultsReleaseService.release).mockResolvedValue({ ok: true, data: releaseResponse });
  const user = userEvent.setup();
  render(<ResultsRelease />);
  await user.click(await screen.findByRole('button', { name: 'Release results' }));
  await user.click(screen.getByRole('button', { name: 'Confirm release' }));
  expect(resultsReleaseService.release).toHaveBeenCalledTimes(1);
  expect(resultsReleaseService.list).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run the test to verify the mock screen fails**

```powershell
npm test -- src/pages/admin/hub/ResultsRelease.test.tsx --run
```

Expected: FAIL because the current screen reads mock context and `localStorage`.

- [ ] **Step 3: Implement the authoritative screen**

Remove `useMockData`, local storage, candidate rows, notification-body previews, invented purposes, and SMS claims. Render session summary rows. Enable `Process scores` only when `processingReady`; enable `Release results` only when `releaseReady`; show `Results released` when status is final. Use a modal with a named cancel button and named confirmation button. Disable both action buttons while a request is active and refetch after success.

- [ ] **Step 4: Run focused tests and build**

```powershell
npm test -- src/services/resultsReleaseService.test.ts src/pages/admin/hub/ResultsRelease.test.tsx --run
npm run build
```

Expected: focused tests and production build pass.

- [ ] **Step 5: Commit the Results Release screen**

```powershell
git add frontend/src/pages/admin/hub/ResultsRelease.tsx frontend/src/pages/admin/hub/ResultsRelease.test.tsx
git commit -m "feat(results): connect release operations screen"
```
