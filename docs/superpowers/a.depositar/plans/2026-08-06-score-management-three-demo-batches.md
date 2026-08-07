# Score Management Three Demo Batches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Score Management seed create three deterministic demo batches so the batch list has at least three selectable sessions.

**Architecture:** Extend the existing score seed service instead of inserting local-only data. The seed should keep deterministic score generation, create unique session/population/exam-set/candidate identifiers per batch, and remain compatible with existing Score Management APIs.

**Tech Stack:** Django 5.2 management commands, existing `apps.results` service/model layer, Django test runner.

## Global Constraints

- Use synthetic data only.
- Do not add dependencies.
- Do not create a new CLI option unless required by tests.
- Keep `SESSION-2027-REGULAR` available for existing tests and demo links.
- Candidate IDs, LRNs, score IDs, ranking populations, and exam sets must not collide across batches.
- Existing focused Score Management tests must pass.

---

### Task 1: Deterministic Three-Batch Score Seed

**Files:**
- Modify: `backend/apps/results/services.py`
- Modify: `backend/apps/results/management/commands/seed_score_management.py`
- Modify: `backend/apps/results/tests/test_score_management_seed_command.py`
- Modify if needed: `backend/apps/results/tests/test_score_management_api.py`

**Interfaces:**
- Consumes: `seed_score_management --count N --seed S --reset`
- Produces: three seeded `ExaminationSession` rows and `N` `CandidateScore` rows per session.

- [ ] **Step 1: Write failing test for three seeded batches**

Add a test that calls `seed_score_management` with `count=5`, then asserts there are three sessions, each session has five candidate scores, and all `CandidateScore.id`, `candidate_id`, and `lrn` values are unique.

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_seed_command --settings=config.settings.test
```

Expected: fail because the current seed creates one session only.

- [ ] **Step 3: Implement deterministic three-session seed data**

Update `generate_score_seed_data` and `seed_score_management_data` so the default seed produces three sessions:

- `SESSION-2027-REGULAR`
- `SESSION-2027-STEM`
- `SESSION-2027-SPECIAL`

Each session should have its own ranking population IDs, exam set IDs, score IDs, candidate IDs, and LRNs.

- [ ] **Step 4: Verify focused seed tests pass**

Run:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_seed_command --settings=config.settings.test
```

Expected: all seed command tests pass.

- [ ] **Step 5: Verify focused Score Management API tests pass**

Run:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: Score Management API tests pass with the original regular session still available.

- [ ] **Step 6: Verify Django system check**

Run:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py check --settings=config.settings.local
```

Expected: system check identifies no issues.
