# Released Results Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unsupported result-reporting mock data with privacy-safe national and session aggregates derived only from approved released scores.

**Architecture:** Add a read-only aggregate endpoint in `apps.results` with explicit roles and fixed score bands. Return national/session aggregates only, then replace the current university, demographic, qualification, and regional mock dashboard with a focused released-results overview.

**Tech Stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, Django ORM aggregation, React 19, TypeScript 5.8, Recharts, Vitest, Testing Library.

## Global Constraints

- Aggregate only `APPROVED` and `RELEASED` candidate scores in `RESULTS_RELEASED` sessions.
- Expose no candidate row, name, candidate ID, LRN, answer, rank list, institution, demographic, region, agency, qualification, or admission decision.
- Use fixed score bands: `0-59.99`, `60-69.99`, `70-79.99`, `80-89.99`, and `90-100`.
- Add no model, migration, analytics store, or inferred relationship.

---

### Task 1: Add the aggregate results API

**Files:**
- Create: `backend/apps/results/analytics_views.py`
- Create: `backend/apps/results/tests/test_results_analytics_api.py`
- Modify: `backend/apps/results/urls.py`
- Modify: `docs/api/API-ENDPOINTS.md`

**Interfaces:**
- Consumes: released `CandidateScore` and `ExaminationSession` rows.
- Produces: `GET /api/v1/results/analytics/overview/`.

- [ ] **Step 1: Write failing aggregate and permission tests**

```python
def test_authorized_role_reads_released_only_aggregates(self):
    self.authenticate_as(PortalRole.EXECUTIVE.value)
    response = self.client.get(reverse("results:results-analytics-overview"))
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["releasedCandidates"], 3)
    self.assertEqual(response.data["releasedSessions"], 1)
    self.assertEqual(response.data["meanFinalScore"], 82.5)
    self.assertEqual(sum(band["count"] for band in response.data["scoreBands"]), 3)
    self.assertNotIn("candidates", response.data)

def test_overview_returns_zero_safe_empty_aggregates(self):
    CandidateScore.objects.update(release_status=ScoreReleaseStatus.NOT_RELEASED)
    response = self.client.get(reverse("results:results-analytics-overview"))
    self.assertEqual(response.data["releasedCandidates"], 0)
    self.assertIsNone(response.data["meanFinalScore"])
    self.assertEqual(response.data["sessions"], [])

def test_student_and_unauthenticated_callers_are_denied(self):
    self.authenticate_as(PortalRole.STUDENT.value)
    self.assertEqual(self.client.get(reverse("results:results-analytics-overview")).status_code, 403)
    self.client.force_authenticate(user=None)
    self.assertEqual(self.client.get(reverse("results:results-analytics-overview")).status_code, 401)
```

Loop the success assertion across `CHED_ADMIN`, `DEPED_ADMIN`, `TESDA_ADMIN`, `EXECUTIVE`, `UNIVERSITY_ADMIN`, `EXAM_ADMINISTRATOR`, and `SYSTEM_ADMIN`.

- [ ] **Step 2: Run tests to verify the route is missing**

```powershell
py -3.13 manage.py test apps.results.tests.test_results_analytics_api --settings=config.settings.test
```

Expected: FAIL because the analytics route is not registered.

- [ ] **Step 3: Implement released-only ORM aggregates**

Create:

```python
class ResultsAnalyticsOverviewView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(
        PortalRole.CHED_ADMIN,
        PortalRole.DEPED_ADMIN,
        PortalRole.TESDA_ADMIN,
        PortalRole.EXECUTIVE,
        PortalRole.UNIVERSITY_ADMIN,
        PortalRole.EXAM_ADMINISTRATOR,
        PortalRole.SYSTEM_ADMIN,
    )
```

Use the base filter:

```python
released_scores = CandidateScore.objects.filter(
    review_status=ScoreReviewStatus.APPROVED,
    release_status=ScoreReleaseStatus.RELEASED,
    session__scoring_status=ScoreBatchStatus.RESULTS_RELEASED,
)
```

Return:

```python
{
    "releasedCandidates": released_scores.count(),
    "releasedSessions": released_scores.values("session_id").distinct().count(),
    "meanFinalScore": float(mean) if mean is not None else None,
    "scoreBands": build_score_bands(released_scores),
    "sessions": serialize_session_aggregates(released_scores),
}
```

Each session row contains only `sessionId`, `sessionName`, `releasedCandidates`, `meanFinalScore`, and `releasedAt` from its latest release audit.

- [ ] **Step 4: Run focused tests and verify no identity fields**

```powershell
py -3.13 manage.py test apps.results.tests.test_results_analytics_api apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: all tests pass; recursively serialized response keys contain none of `candidateId`, `candidateName`, `lrn`, `answer`, or `email`.

- [ ] **Step 5: Document and commit the analytics contract**

```powershell
git add backend/apps/results/analytics_views.py backend/apps/results/tests/test_results_analytics_api.py backend/apps/results/urls.py docs/api/API-ENDPOINTS.md
git commit -m "feat(results): add released score analytics"
```

### Task 2: Add the typed analytics service

**Files:**
- Create: `frontend/src/services/resultsAnalyticsService.ts`
- Create: `frontend/src/services/resultsAnalyticsService.test.ts`

**Interfaces:**
- Consumes: `GET /api/v1/results/analytics/overview/`.
- Produces: `getResultsAnalyticsOverview(): Promise<ServiceResult<ResultsAnalyticsOverview>>`.

- [ ] **Step 1: Write the failing service test**

```typescript
it('loads released-results aggregates', async () => {
  const result = await service.getOverview();
  expect(result).toEqual({ ok: true, data: overview });
  expect(fetcher).toHaveBeenCalledWith(
    'http://backend.test/api/v1/results/analytics/overview/',
    expect.objectContaining({ credentials: 'include' }),
  );
});
```

- [ ] **Step 2: Run the service test to verify it fails**

```powershell
npm test -- src/services/resultsAnalyticsService.test.ts --run
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement exact frontend types**

```typescript
export interface ResultsScoreBand { label: string; minimum: number; maximum: number; count: number }
export interface ResultsSessionAggregate { sessionId: string; sessionName: string; releasedCandidates: number; meanFinalScore: number | null; releasedAt: string | null }
export interface ResultsAnalyticsOverview {
  releasedCandidates: number;
  releasedSessions: number;
  meanFinalScore: number | null;
  scoreBands: ResultsScoreBand[];
  sessions: ResultsSessionAggregate[];
}
```

Implement `ResultsAnalyticsService.getOverview()` using `ApiClient` and export a singleton.

- [ ] **Step 4: Run and commit service tests**

```powershell
npm test -- src/services/resultsAnalyticsService.test.ts --run
git add frontend/src/services/resultsAnalyticsService.ts frontend/src/services/resultsAnalyticsService.test.ts
git commit -m "feat(results): add released analytics service"
```

### Task 3: Replace unsupported Reporting Matrix mocks

**Files:**
- Modify: `frontend/src/pages/results/ReportingMatrix.tsx`
- Create: `frontend/src/pages/results/ReportingMatrix.test.tsx`

**Interfaces:**
- Consumes: `resultsAnalyticsService.getOverview()`.
- Produces: accessible released-candidate totals, released-session totals, mean score, score-band chart/table, and session summary.

- [ ] **Step 1: Write failing component tests**

```typescript
it('renders persisted released-result aggregates without unsupported breakdowns', async () => {
  vi.mocked(resultsAnalyticsService.getOverview).mockResolvedValue({ ok: true, data: overview });
  render(<ReportingMatrix />);
  expect(await screen.findByText('Released Results Overview')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.queryByText(/qualified candidates|regional distribution|university quota/i)).not.toBeInTheDocument();
});

it('renders empty and safe-error states', async () => {
  vi.mocked(resultsAnalyticsService.getOverview).mockResolvedValue({ ok: true, data: emptyOverview });
  render(<ReportingMatrix />);
  expect(await screen.findByText('No released result data yet')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify the mock dashboard fails**

```powershell
npm test -- src/pages/results/ReportingMatrix.test.tsx --run
```

Expected: FAIL because the current page renders hard-coded university, region, demographic, and qualification data.

- [ ] **Step 3: Implement the focused aggregate dashboard**

Remove all `SUBJECT_PERFORMANCE`, `REGIONAL_DISTRIBUTION`, `BATCH_COMPARISON`, `MOCK_UNIVERSITIES`, and `MOCK_ANALYTICS_DATA` constants. Fetch once on mount with retry support. Render a textual score-band table alongside the chart so values are not conveyed by color alone. Render `Unavailable until metric definitions and data relationships are approved` for excluded breakdowns only when navigation still exposes their old section.

- [ ] **Step 4: Run focused tests and build**

```powershell
npm test -- src/services/resultsAnalyticsService.test.ts src/pages/results/ReportingMatrix.test.tsx --run
npm run build
```

Expected: focused tests and production build pass.

- [ ] **Step 5: Commit the analytics dashboard**

```powershell
git add frontend/src/pages/results/ReportingMatrix.tsx frontend/src/pages/results/ReportingMatrix.test.tsx
git commit -m "feat(results): connect released results analytics"
```
