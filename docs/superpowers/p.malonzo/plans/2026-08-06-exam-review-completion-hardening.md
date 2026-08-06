# Exam Review Completion Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent incomplete subjective grading from being marked graded or released, reflect the invariant in the Exam Review UI, provide a missing-rubric fallback, and correct the active sprint status.

**Architecture:** Django remains authoritative for grading and release readiness. The backend transition services enforce the persisted pending-subjective count under the existing record lock; React mirrors the invariant for immediate user feedback while preserving backend conflict handling for stale clients. No model, API route, transport type, or dependency changes are required.

**Tech Stack:** Python 3.13 target, Django 5.2, Django REST Framework 3.16, React 19, TypeScript 5.8, Vitest, React Testing Library.

## Global Constraints

- Do not create commits. Keep all implementation and plan changes uncommitted unless the owner explicitly authorizes a commit.
- Do not add dependencies or change models, migrations, routes, permissions, seed data, or public response shapes.
- Preserve `/api/v1/results/exam-reviews/` and the existing frontend service contract.
- Keep Results Release & Analytics unbuilt and separate from this Exam Review hardening task.
- Use only synthetic test data and safe conflict messages; never include candidate identity, responses, answer keys, or scores in readiness errors.
- Do not fix unrelated TypeScript diagnostics or other developers' modules.

## File Map

- `backend/apps/exam_reviews/services.py`: authoritative grading and release transition guards.
- `backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py`: backend API regressions and valid-transition coverage.
- `frontend/src/pages/admin/hub/ExamReviewList.tsx`: incomplete-grading action state and accessible explanation.
- `frontend/src/pages/admin/hub/ExamReviewList.test.tsx`: queue behavior regression.
- `frontend/src/pages/admin/hub/ExamReviewDetail.tsx`: release-readiness notice and missing-rubric fallback.
- `frontend/src/pages/admin/hub/ExamReviewDetail.test.tsx`: detail behavior regressions.
- `build_plan.md`: current P.Malonzo status and remaining-work correction.
- `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`: append exact verification evidence after implementation.

---

### Task 1: Enforce grading readiness in the backend

**Files:**
- Modify: `backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py`
- Modify: `backend/apps/exam_reviews/services.py`

**Interfaces:**
- Consumes: `ExamReviewRecord.pending_subjective_items`, `ExamReviewStatus`, and the existing grading-status and release endpoints.
- Produces: `409` conflict responses for incomplete `GRADED` and `FINALIZED` transitions while preserving successful complete-review transitions.

- [ ] **Step 1: Add the failing incomplete-grading API regression**

Extend the existing model import so the tests use the domain enum:

```python
from apps.exam_reviews.models import (
    ExamReviewAnswerSheet,
    ExamReviewItem,
    ExamReviewRecord,
    ExamReviewStatus,
)
```

Then add this method to `ExamReviewQueueApiTests`:

```python
@override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
def test_review_with_pending_subjective_items_cannot_be_marked_graded(self):
    record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")

    response = self.client.post(
        reverse("exam_reviews:exam-review-grading-status", args=[record.id]),
        {"status": "GRADED"},
        format="json",
    )

    self.assertEqual(response.status_code, 409)
    self.assertIn("2 subjective items", response.data["error"]["message"])
    record.refresh_from_db()
    self.assertEqual(record.status, ExamReviewStatus.SUBMITTED)
```

- [ ] **Step 2: Add the failing incomplete-release API regression**

Add this independent defense-in-depth case:

```python
@override_settings(EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS=True)
def test_graded_review_with_pending_subjective_items_cannot_be_released(self):
    record = ExamReviewRecord.objects.get(attempt_code="DEMO-ATTEMPT-001")
    record.status = ExamReviewStatus.GRADED
    record.save(update_fields=("status", "updated_at"))

    response = self.client.post(
        reverse("exam_reviews:exam-review-release", args=[record.id]),
        format="json",
    )

    self.assertEqual(response.status_code, 409)
    self.assertIn("2 subjective items", response.data["error"]["message"])
    record.refresh_from_db()
    self.assertEqual(record.status, ExamReviewStatus.GRADED)
```

- [ ] **Step 3: Make the existing valid grading transition explicitly complete**

In `test_local_prototype_session_can_mark_graded_and_return_to_pending`, set the denormalized readiness state to complete before the first request:

```python
record.pending_subjective_items = 0
record.save(update_fields=("pending_subjective_items", "updated_at"))
```

- [ ] **Step 4: Run the three focused tests and verify RED**

Run from `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py test `
  apps.exam_reviews.tests.test_exam_review_seed_and_api.ExamReviewQueueApiTests.test_review_with_pending_subjective_items_cannot_be_marked_graded `
  apps.exam_reviews.tests.test_exam_review_seed_and_api.ExamReviewQueueApiTests.test_graded_review_with_pending_subjective_items_cannot_be_released `
  apps.exam_reviews.tests.test_exam_review_seed_and_api.ExamReviewQueueApiTests.test_local_prototype_session_can_mark_graded_and_return_to_pending `
  --settings=config.settings.test --verbosity 2
```

Expected: the two new tests fail because the API returns `200`; the adjusted valid transition passes.

- [ ] **Step 5: Add the minimal backend guards**

In `services.py`, add a focused message helper near the conflict classes:

```python
def _pending_subjective_message(record: ExamReviewRecord, *, action: str) -> str:
    count = record.pending_subjective_items
    noun = "item" if count == 1 else "items"
    return f"Score the remaining {count} subjective {noun} before this Exam Review can be {action}."
```

Guard release after the status check and before mutation:

```python
if record.pending_subjective_items:
    raise ExamReviewReleaseConflict(_pending_subjective_message(record, action="released"))
```

Guard only the transition to `GRADED` in `set_exam_review_grading_status`:

```python
if status == ExamReviewStatus.GRADED and record.pending_subjective_items:
    raise ExamReviewGradingStatusConflict(_pending_subjective_message(record, action="marked graded"))
```

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run the exact command from Step 4. Expected: 3 tests pass.

- [ ] **Step 7: Run the complete Exam Review backend suite**

```powershell
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews.tests --settings=config.settings.test --verbosity 2
```

Expected: all prior 19 tests plus the 2 new regressions pass.

- [ ] **Step 8: Record an uncommitted checkpoint**

Run `git diff -- backend/apps/exam_reviews/services.py backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py` and confirm only the readiness invariant and its tests changed. Do not commit.

---

### Task 2: Prevent incomplete grading from the review queue

**Files:**
- Modify: `frontend/src/pages/admin/hub/ExamReviewList.test.tsx`
- Modify: `frontend/src/pages/admin/hub/ExamReviewList.tsx`

**Interfaces:**
- Consumes: `ExamReviewQueueItem.pendingSubjectiveItems` and `backendExamReviewService.setGradingStatus`.
- Produces: a disabled grading action with an accessible pending-count explanation for incomplete records.

- [ ] **Step 1: Add the failing queue regression**

The existing happy-path test currently uses `pendingAttempt`, whose `pendingSubjectiveItems` value is `3`. First keep that happy path valid by overriding the fixture inside `requires confirmation before checking an exam`:

```tsx
const completedAttempt = { ...pendingAttempt, pendingSubjectiveItems: 0 };
listMock.mockResolvedValue({ ok: true, data: [completedAttempt, gradedAttempt] });
setGradingStatusMock.mockResolvedValue({
  ok: true,
  data: { ...completedAttempt, status: 'GRADED' },
});
```

Then add a separate regression using the unchanged incomplete `pendingAttempt` fixture:

```tsx
it('prevents grading while subjective items are pending', async () => {
  renderList();

  const gradeButton = await screen.findByRole('button', {
    name: 'Mark Demo Candidate 004 as Graded',
  });

  expect(gradeButton).toBeDisabled();
  expect(gradeButton).toHaveAttribute(
    'title',
    'Score 3 pending subjective items before marking this exam as Graded',
  );
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(setGradingStatusMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the queue test and verify RED**

From `frontend/`:

```powershell
npm test -- src/pages/admin/hub/ExamReviewList.test.tsx
```

Expected: FAIL because the button is currently enabled and has the generic title.

- [ ] **Step 3: Add a focused readiness helper inside the component module**

Before the component, add:

```tsx
function gradingActionTitle(attempt: ExamReviewQueueItem): string {
  if (attempt.status === 'FINALIZED') return 'Released records are locked';
  if (attempt.pendingSubjectiveItems > 0) {
    const noun = attempt.pendingSubjectiveItems === 1 ? 'item' : 'items';
    return `Score ${attempt.pendingSubjectiveItems} pending subjective ${noun} before marking this exam as Graded`;
  }
  return 'Check and mark as Graded';
}
```

Update the grade button:

```tsx
disabled={
  attempt.status === 'GRADED'
  || attempt.status === 'FINALIZED'
  || attempt.pendingSubjectiveItems > 0
  || updatingAttemptId === attempt.id
}
title={gradingActionTitle(attempt)}
```

- [ ] **Step 4: Run the queue test and verify GREEN**

Run the Step 2 command. Expected: every `ExamReviewList` test passes.

- [ ] **Step 5: Record an uncommitted checkpoint**

Review the two-file diff and confirm search, filters, upload, export, rejection, and valid grading behavior are unchanged. Do not commit.

---

### Task 3: Explain release readiness and missing rubrics in detail view

**Files:**
- Modify: `frontend/src/pages/admin/hub/ExamReviewDetail.test.tsx`
- Modify: `frontend/src/pages/admin/hub/ExamReviewDetail.tsx`

**Interfaces:**
- Consumes: `ExamReviewDetailItem.status`, `pendingSubjectiveItems`, and subjective `rubric` text.
- Produces: no release action for incomplete graded records, a readiness notice, and non-empty rubric presentation.

- [ ] **Step 1: Add the failing release-readiness regression**

Before the new tests, extract this helper from the duplicated current render blocks:

```tsx
function renderExamReviewDetail() {
  render(
    <MemoryRouter initialEntries={['/admin/hub/review/review-id']}>
      <Routes>
        <Route path="/admin/hub/review/:id" element={<ExamReviewDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}
```

Update the existing tests to call this helper without changing their assertions.

First add a characterization proving the valid completed-review path remains available:

```tsx
it('releases a completed graded review through the backend', async () => {
  const user = userEvent.setup();
  const completedReview: ExamReviewDetailItem = {
    ...review,
    status: 'GRADED',
    pendingSubjectiveItems: 0,
  };
  vi.mocked(backendExamReviewService.get).mockResolvedValue({ ok: true, data: completedReview });
  vi.mocked(backendExamReviewService.release).mockResolvedValue({
    ok: true,
    data: { ...completedReview, status: 'FINALIZED' },
  });
  renderExamReviewDetail();

  await user.click(await screen.findByRole('button', { name: 'Release to Score Management' }));
  expect(backendExamReviewService.release).toHaveBeenCalledWith('review-id');
  expect(await screen.findByText('Released to Score Management')).toBeInTheDocument();
});
```

Then add the incomplete legacy-record regression:

```tsx
it('blocks release in the UI when a graded review still has pending subjective items', async () => {
  vi.mocked(backendExamReviewService.get).mockResolvedValue({
    ok: true,
    data: { ...review, status: 'GRADED', pendingSubjectiveItems: 1 },
  });
  renderExamReviewDetail();

  expect(await screen.findByText('1 subjective item still requires an official score before release.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Release to Score Management' })).not.toBeInTheDocument();
  expect(backendExamReviewService.release).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Add the failing rubric fallback regression**

```tsx
it('shows a fallback when a subjective item has no rubric text', async () => {
  const user = userEvent.setup();
  vi.mocked(backendExamReviewService.get).mockResolvedValue({
    ok: true,
    data: {
      ...review,
      examItems: review.examItems.map(item =>
        item.id === 'english-item' ? { ...item, rubric: '' } : item,
      ),
    },
  });
  renderExamReviewDetail();

  await user.click(await screen.findByRole('button', { name: /English/ }));
  expect(screen.getByText('No rubric provided for this item.')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the detail tests and verify RED**

```powershell
npm test -- src/pages/admin/hub/ExamReviewDetail.test.tsx
```

Expected: the incomplete-release and rubric-fallback tests fail because release is shown for every graded record and an empty rubric renders blank; the completed-release characterization passes.

- [ ] **Step 4: Add the release-readiness presentation**

After calculating `manualScore`, derive:

```tsx
const isReleaseReady = review.status === 'GRADED' && review.pendingSubjectiveItems === 0;
```

Render the existing release button only when `isReleaseReady`. Near the existing release error region, add:

```tsx
{review.status === 'GRADED' && review.pendingSubjectiveItems > 0 && (
  <p role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
    <Info className="h-4 w-4" />
    {review.pendingSubjectiveItems} subjective {review.pendingSubjectiveItems === 1 ? 'item still requires' : 'items still require'} an official score before release.
  </p>
)}
```

Also change `handleRelease` to return unless `review.status === 'GRADED' && review.pendingSubjectiveItems === 0`.

- [ ] **Step 5: Add the rubric fallback**

Replace the raw rubric render with:

```tsx
<p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
  {item.rubric.trim() || 'No rubric provided for this item.'}
</p>
```

- [ ] **Step 6: Run the detail tests and verify GREEN**

Run the Step 3 command. Expected: every `ExamReviewDetail` test passes.

- [ ] **Step 7: Record an uncommitted checkpoint**

Review the two-file diff and confirm scoring, upload, subject navigation, answer display, and valid release behavior remain intact. Do not commit.

---

### Task 4: Correct the active sprint status and implementation record

**Files:**
- Modify: `build_plan.md`
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**
- Consumes: implemented backend/frontend evidence and exact verification output from Tasks 1-3.
- Produces: an accurate current P.Malonzo status without rewriting the historical sprint brief.

- [ ] **Step 1: Correct the Exam Review roster row**

Replace the P.Malonzo Exam Review row with:

```markdown
| **Prince Barachiel Malonzo (P.Malonzo)** | Exam Review | BRD-05 Scoring & Results | ~95% complete; completion hardening in progress | 🟢 real backend/API grading, item scoring, answer-sheet upload, and release path | `worktrees/p.malonzo/` | `p.malonzo/exam-review` | `docs/superpowers/p.malonzo/p.malonzo.task.md` |
```

- [ ] **Step 2: Replace the stale P.Malonzo scope statement**

Replace the claim that `backend/apps/results` is an empty stub and the screens are mock-only with:

```markdown
- Confirm the implemented `backend/apps/exam_reviews` boundary and backend-connected `ExamReviewList.tsx` / `ExamReviewDetail.tsx` flow: persisted review records, grading status, subjective scoring, answer-sheet upload, and release are real; Results Release & Analytics remains a separate roadmap.
```

Update the following scope line so Exam Review is implementation hardening while Results Release stays narrative-only:

```markdown
- On branch `p.malonzo/exam-review`, complete grading-readiness enforcement and the backend-connected list → detail walkthrough; keep `p.malonzo/results-release` as a roadmap narrative, not a build.
```

- [ ] **Step 3: Replace the obsolete Thursday work item**

Use:

```markdown
- **AM–Midday, on `exam-review`:** Complete backend and frontend grading-readiness guards, verify list → detail scoring and release, and polish the missing-rubric display.
```

- [ ] **Step 4: Append exact implementation evidence**

Add a dated section to `p.malonzo.implement.md` containing only observed command results from Tasks 1-3 and final verification. Include test counts, build result, TypeScript diagnostics status, and the fact that changes remain uncommitted by owner instruction.

- [ ] **Step 5: Verify active-plan stale claims are gone**

```powershell
rg -n -C 2 "P\.Malonzo|Prince Barachiel Malonzo|Exam Review" build_plan.md
rg -n "no backend entity|empty stub|entirely on mock data|broken mock-data references" build_plan.md
```

Expected: the second command has no match in the P.Malonzo Exam Review sections. Matches for other owners or the separate Results Release story are outside scope and remain unchanged.

- [ ] **Step 6: Record an uncommitted checkpoint**

Review the documentation diff for factual consistency. Do not edit `PhilSLA_Friday_Sprint_Task_Briefs (5) 1.md` and do not commit.

---

### Task 5: Final verification and handoff

**Files:**
- Verify all files listed in Tasks 1-4.

**Interfaces:**
- Consumes: the complete uncommitted implementation.
- Produces: fresh evidence that the invariant works across backend and frontend and that unrelated repository failures are disclosed accurately.

- [ ] **Step 1: Run the focused backend suite**

From `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py test apps.exam_reviews.tests --settings=config.settings.test --verbosity 2
```

Expected: all Exam Review tests pass with no failures or errors.

- [ ] **Step 2: Run the focused frontend suite**

From `frontend/`:

```powershell
npm test -- src/services/backendExamReviewService.test.ts src/pages/admin/hub/ExamReviewList.test.tsx src/pages/admin/hub/ExamReviewDetail.test.tsx
```

Expected: all focused service and component tests pass.

- [ ] **Step 3: Run the TypeScript check**

```powershell
npm run lint
```

Expected repository baseline: the command may remain nonzero because of existing diagnostics in unrelated modules. Confirm no diagnostic points to `ExamReviewList.tsx`, `ExamReviewDetail.tsx`, their tests, or `backendExamReviewService.ts`; record every observed changed-file diagnostic if this expectation is wrong.

- [ ] **Step 4: Run the production frontend build**

```powershell
npm run build
```

Expected: exit code `0`; record any existing chunk-size warning separately.

- [ ] **Step 5: Run Django system check**

From `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py check --settings=config.settings.local
```

Expected: system check reports no issues.

- [ ] **Step 6: Inspect diff hygiene and scope**

From the repository root:

```powershell
git diff --check
git status --short
git diff --stat
git diff -- backend/apps/exam_reviews frontend/src/pages/admin/hub/ExamReviewList.tsx frontend/src/pages/admin/hub/ExamReviewList.test.tsx frontend/src/pages/admin/hub/ExamReviewDetail.tsx frontend/src/pages/admin/hub/ExamReviewDetail.test.tsx build_plan.md docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
```

Expected: no whitespace errors; only approved Exam Review, plan-status, implementation-record, spec, and plan files differ. Keep everything uncommitted.

- [ ] **Step 7: Report the uncommitted handoff**

Report the root cause, changed behavior, exact verification commands/results, pre-existing unrelated failures, and current `git status`. Explicitly state that no implementation commit or push was made.
