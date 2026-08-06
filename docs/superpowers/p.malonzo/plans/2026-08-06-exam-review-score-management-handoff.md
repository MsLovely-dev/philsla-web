# Exam Review to Score Management Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Exam Review release atomically create or safely update the matching Score Management `CandidateScore` before finalizing the review.

**Architecture:** Score Management owns a synchronous intake service that resolves one target ExamSet, validates that its session and any existing score are still unprocessed, and writes the candidate score. Exam Review calls this service inside its release transaction; any conflict rolls back the score write and leaves the review graded.

**Tech Stack:** Python 3.13-compatible Django, Django REST Framework, Django `TestCase`, React 19, TypeScript, Vitest, Testing Library

## Global Constraints

- Keep all implementation, tests, plans, and documentation uncommitted and unstaged unless the owner later explicitly authorizes a commit.
- Do not push during implementation.
- `apps.results` remains the sole owner of `CandidateScore` write rules.
- Match exactly one Score Management ExamSet by `ExamSet.code == ExamReviewRecord.exam_set_code`.
- Never alter ranked, processed, or released score data through this handoff.
- Finalize the Exam Review only after the Score Management write succeeds in the same transaction.
- Do not add a database model, migration, dependency, asynchronous worker, ranking behavior, or student-facing results release.

---

### Task 1: Score Management intake service

**Files:**
- Create: `backend/apps/results/tests/test_exam_review_score_intake.py`
- Modify: `backend/apps/results/services.py`

**Interfaces:**
- Consumes: existing `ExaminationSession`, `RankingPopulation`, `ExamSet`, and `CandidateScore` models.
- Produces: `ExamReviewScoreInput`, `ScoreIntakeConflict`, and `accept_exam_review_score(*, payload: ExamReviewScoreInput) -> CandidateScore` in `apps.results.services`.

- [ ] **Step 1: Write failing creation and percentage tests**

Create a focused Django test fixture with one `READY_FOR_PROCESSING` session, one population, and one Score Management ExamSet. Assert that the wished-for service creates an approved, not-released CandidateScore and rounds `83 / 120 * 100` half-up to `69.17`.

```python
payload = ExamReviewScoreInput(
    review_id=uuid4(),
    exam_set_code="SET-2026-A",
    candidate_id="PHL-2026-ABC123",
    lrn="109000000001",
    candidate_name="Ada M. Lovelace",
    raw_score=83,
    max_score=120,
)
score = accept_exam_review_score(payload=payload)
self.assertEqual(score.id, f"EXAM-REVIEW-{payload.review_id}")
self.assertEqual(score.session, self.session)
self.assertEqual(score.ranking_population, self.population)
self.assertEqual(score.exam_set, self.exam_set)
self.assertEqual(score.final_score, Decimal("69.17"))
self.assertEqual(score.review_status, ScoreReviewStatus.APPROVED)
self.assertEqual(score.release_status, ScoreReleaseStatus.NOT_RELEASED)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
& '.\.venv\Scripts\python.exe' manage.py test apps.results.tests.test_exam_review_score_intake --settings=config.settings.test --verbosity 2
```

Expected: import failure because `ExamReviewScoreInput` and `accept_exam_review_score` do not exist.

- [ ] **Step 3: Implement the minimal intake types and creation path**

Add an immutable payload dataclass, a `ScoreIntakeConflict(ValueError)`, half-up Decimal percentage calculation, exact ExamSet resolution, input validation, row locking, and CandidateScore creation. Use `EXAM-REVIEW-{review_id}` as the new primary key.

```python
@dataclass(frozen=True)
class ExamReviewScoreInput:
    review_id: UUID
    exam_set_code: str
    candidate_id: str
    lrn: str
    candidate_name: str
    raw_score: int
    max_score: int


@transaction.atomic
def accept_exam_review_score(*, payload: ExamReviewScoreInput) -> CandidateScore:
    # validate identity and numeric bounds
    # resolve exactly one locked ExamSet and lock its session
    # create the approved, not-released CandidateScore
    return score
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Task 1 command and require all current tests in the new module to pass.

- [ ] **Step 5: Write failing safe-update and protection tests**

Add separate tests proving:

- an existing unprocessed `(session, candidate_id)` row is updated without increasing the row count;
- zero matches and two same-code matches raise `ScoreIntakeConflict` without writes;
- a session whose `scoring_status` is `SCORING_PROCESSED` is rejected;
- an existing score with `processing_batch`, `processed_at`, `overall_rank`, `released_at`, or `RELEASED` state is rejected; and
- a missing/invalid candidate ID, non-12-digit LRN, zero maximum, negative score, score above maximum, or value above 32767 is rejected.

The production change that makes these tests pass is the guarded update branch; each test must assert persisted database state, not internal calls.

- [ ] **Step 6: Run protection tests and verify RED**

Run the Task 1 command. Expected: safe-update/protection assertions fail because only the creation path exists.

- [ ] **Step 7: Implement guarded update behavior**

Lock the existing score selected by `(session, candidate_id)`. Permit updates only while the session is `READY_FOR_PROCESSING` and all derived processing/release fields remain empty/not released. Update identity snapshot, ExamSet, population, raw/max/final score, review status, and release status. Raise a stable `ScoreIntakeConflict` message for every rejected state.

- [ ] **Step 8: Run the complete intake module and verify GREEN**

Run the Task 1 command and require every intake test to pass.

---

### Task 2: Atomic Exam Review release integration

**Files:**
- Modify: `backend/apps/exam_reviews/services.py`
- Modify: `backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py`

**Interfaces:**
- Consumes: `ExamReviewScoreInput`, `ScoreIntakeConflict`, and `accept_exam_review_score` from Task 1.
- Produces: the existing `release_exam_review(*, review_id, actor) -> ExamReviewRecord` with real handoff semantics and unchanged API response shape.

- [ ] **Step 1: Replace the obsolete no-handoff test with a failing creation assertion**

Replace `test_release_finalizes_without_creating_score_management_record`. Create a matching Score Management session/population/ExamSet for the graded review, ensure its linked application has a valid LRN, POST the existing release endpoint, and assert one CandidateScore has the mapped identity, score, percentage, session, population, ExamSet, `APPROVED`, and `NOT_RELEASED` values before asserting the review is `FINALIZED`.

- [ ] **Step 2: Run the single API test and verify RED**

Run:

```powershell
& '.\.venv\Scripts\python.exe' manage.py test apps.exam_reviews.tests.test_exam_review_seed_and_api.ExamReviewQueueApiTests.test_release_creates_score_management_record --settings=config.settings.test --verbosity 2
```

Expected: CandidateScore remains absent because release currently only finalizes the review.

- [ ] **Step 3: Wire the intake service into release**

Build the candidate display name from `application.personal_info` values with whitespace-normalized non-empty parts. Call `accept_exam_review_score` after readiness validation and before setting `FINALIZED`. Translate `ScoreIntakeConflict` into `ExamReviewReleaseConflict` so the endpoint returns the existing structured HTTP `409` envelope.

```python
try:
    accept_exam_review_score(payload=ExamReviewScoreInput(...))
except ScoreIntakeConflict as exc:
    raise ExamReviewReleaseConflict(str(exc)) from exc
```

- [ ] **Step 4: Run the single API test and verify GREEN**

Run the Step 2 command and require it to pass.

- [ ] **Step 5: Add failing rollback and safe-update API tests**

Add tests that POST release and assert:

- missing Score Management ExamSet returns `409`, creates no score, and leaves the review `GRADED`;
- ambiguous same-code ExamSets return `409`, create no score, and leave the review `GRADED`;
- a processed target session/score returns `409`, preserves the prior CandidateScore exactly, and leaves the review `GRADED`; and
- an eligible existing CandidateScore is updated once and the review becomes `FINALIZED`.

- [ ] **Step 6: Run the new API tests and verify RED where behavior is missing**

Run the selected test methods with the Django test runner. Confirm each failure reflects missing rollback/update behavior rather than fixture errors.

- [ ] **Step 7: Complete integration error handling and locking**

Make only the minimal service changes needed for the rollback/update tests. Preserve the current grading-state and pending-subjective checks ahead of handoff resolution.

- [ ] **Step 8: Run all Exam Review and intake tests and verify GREEN**

Run:

```powershell
& '.\.venv\Scripts\python.exe' manage.py test apps.exam_reviews.tests apps.results.tests.test_exam_review_score_intake --settings=config.settings.test --verbosity 2
```

Require zero failures and zero errors.

---

### Task 3: Demonstrable seed and frontend conflict behavior

**Files:**
- Modify: `backend/apps/exam_reviews/management/commands/seed_exam_reviews.py`
- Modify: `backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py`
- Modify: `frontend/src/pages/admin/hub/ExamReviewDetail.test.tsx`
- Modify only if the test exposes a gap: `frontend/src/pages/admin/hub/ExamReviewDetail.tsx`

**Interfaces:**
- Consumes: the existing Score Management seed identifiers `REGULAR_SESSION_ID` and `ES-BP0001` data contract.
- Produces: Exam Review demo records that can hand off after both independent seed commands have run; frontend-visible backend conflict feedback.

- [ ] **Step 1: Write a failing seed-alignment assertion**

Extend `ExamReviewSeedTests` to assert all synthetic applications have distinct 12-digit LRNs and all synthetic reviews use `ES-BP0001`, a code created by the existing Score Management seed.

- [ ] **Step 2: Run the seed test and verify RED**

Run:

```powershell
& '.\.venv\Scripts\python.exe' manage.py test apps.exam_reviews.tests.test_exam_review_seed_and_api.ExamReviewSeedTests --settings=config.settings.test --verbosity 2
```

Expected: current applications have blank LRNs and reviews use `DEMO-SET-2026`.

- [ ] **Step 3: Align synthetic Exam Review data**

Assign deterministic LRNs `109000000001` through `109000000007` and change the synthetic review ExamSet code to `ES-BP0001`. Keep the Exam Review seed independent: it must not create, reset, or delete Score Management records.

- [ ] **Step 4: Run the seed test and verify GREEN**

Run the Step 2 command and require it to pass.

- [ ] **Step 5: Add or confirm the frontend release-conflict test**

Mock `backendExamReviewService.release` with a conflict result for a completed graded review. Click `Release to Score Management`; assert the returned message is displayed, the release button remains present, and `Released to Score Management` is absent.

- [ ] **Step 6: Run the detail test and verify RED or characterize existing behavior**

Run:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' test -- src/pages/admin/hub/ExamReviewDetail.test.tsx
```

If the test passes immediately, record it as existing characterized behavior and do not change production frontend code. If it fails for the intended missing behavior, make the smallest UI correction and rerun to GREEN.

---

### Task 4: Documentation and final verification

**Files:**
- Modify: `docs/api/API-ENDPOINTS.md`
- Modify: `docs/architecture/BACKEND-ARCHITECTURE.md`
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`
- Modify: `build_plan.md` and its case-variant tracked copy as represented by Git on Windows

**Interfaces:**
- Consumes: verified implementation and test output from Tasks 1–3.
- Produces: truthful API/architecture/status documentation and an exact uncommitted verification record.

- [ ] **Step 1: Correct the release contract documentation**

Document that Exam Review finalization atomically creates or updates an unprocessed CandidateScore, matches exactly one Score Management ExamSet by code, returns `409` on configuration/processing conflicts, and does not rank or release student results.

- [ ] **Step 2: Update the owner implementation/status record**

Replace statements that finalization does not create a CandidateScore. Record the new intake ownership boundary, mappings, rollback behavior, tests, and limitations. Mark the working changes uncommitted.

- [ ] **Step 3: Run focused backend verification**

```powershell
& '.\.venv\Scripts\python.exe' manage.py test apps.exam_reviews.tests apps.results.tests.test_exam_review_score_intake --settings=config.settings.test --verbosity 2
& '.\.venv\Scripts\python.exe' manage.py check --settings=config.settings.local
```

- [ ] **Step 4: Run focused frontend and production-build verification**

```powershell
& 'C:\Program Files\nodejs\npm.cmd' test -- src/services/backendExamReviewService.test.ts src/pages/admin/hub/ExamReviewList.test.tsx src/pages/admin/hub/ExamReviewDetail.test.tsx
& 'C:\Program Files\nodejs\npm.cmd' run build
& 'C:\Program Files\nodejs\npm.cmd' run lint
```

Disclose repository-wide failures exactly and confirm whether any diagnostic references a changed Exam Review file.

- [ ] **Step 5: Verify diff and Git state**

```powershell
git diff --check
git diff --cached --check
git status --short --branch
git diff --stat
```

Require no staged files, no merge/rebase state, and no accidental migration or dependency changes. Do not commit or push.
