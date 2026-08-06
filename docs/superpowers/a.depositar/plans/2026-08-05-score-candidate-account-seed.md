# Score Candidate Account Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the score candidate profile seed so synthetic Score Management candidates have linked student accounts and owned application profiles.

**Architecture:** Reuse the existing `seed_score_candidate_profiles` command and add account provisioning inside its transaction. The command reads deterministic score seed data, creates or reuses user/account/profile records by LRN, assigns inherited student role metadata, and links each created application to the matching user.

**Tech Stack:** Django 5.2 management commands, Django auth user model, existing accounts/application/results models, Django test runner.

## Global Constraints

- Use synthetic data only.
- Do not delete existing accounts during reset.
- Do not add dependencies.
- Keep backend authorization metadata in `AccountProfile` and `AccountRoleAssignment`.
- Verify with focused Django tests before claiming completion.

---

### Task 1: Account-Linked Score Candidate Profile Seed

**Files:**
- Modify: `backend/apps/applications/management/commands/seed_score_candidate_profiles.py`
- Modify: `backend/apps/results/tests/test_score_management_seed_command.py`

**Interfaces:**
- Consumes: `generate_score_seed_data(candidate_count: int, seed: int)`
- Produces: `seed_score_candidate_profiles --count N --seed S --reset`, which creates users, student account profiles, role assignments, and owned approved applications.

- [x] **Step 1: Write failing test for linked student accounts**

Add a test that runs `seed_score_management` and `seed_score_candidate_profiles`, then asserts that every seeded application has an owner, the owner has a `STUDENT` `AccountProfile` with matching LRN, and the profile has an inherited `AccountRoleAssignment`.

- [x] **Step 2: Run test to verify failure**

Run:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_seed_command --settings=config.settings.test
```

Observed: failed because seeded applications had `owner=None`.

- [x] **Step 3: Implement account provisioning**

In `seed_score_candidate_profiles.py`, create helper functions to:

- derive deterministic username and email from candidate seed data;
- get or create the user;
- set a usable synthetic password;
- get or create `AccountProfile(role=STUDENT, lrn=<score lrn>)`;
- get or create `AccountRoleAssignment(permission_mode=INHERIT)`;
- assign the created user to `StudentApplication.owner`.

- [x] **Step 4: Run focused seed tests**

Run:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_seed_command --settings=config.settings.test
```

Observed: passed, 2 tests.

- [x] **Step 5: Run focused Score Management API tests**

Run:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test
```

Observed: passed, 23 tests.

- [x] **Step 6: Run Django check**

Run:

```bash
..\venv\Scripts\python.exe manage.py check --settings=config.settings.local
```

Observed: passed, `System check identified no issues (0 silenced).`
