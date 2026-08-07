# Score Management Friday Demo-Freeze Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the backend-backed Score Management demo path, verify what is already implemented, and document remaining production gates without adding unapproved product behavior.

**Architecture:** Keep `apps.results` authoritative for scoring, ranking, percentile computation, release state, CSV export, release notification queuing, and Score Management audit records that already exist. Treat Application Review synchronization, recipient-target publication beyond student availability notifications, expanded audit ledgers, and PostgreSQL scale rehearsal as follow-up work that requires separate reviewed plans before code changes.

**Tech Stack:** Python 3.13 target, Django 5.2, Django REST Framework 3.16, Django test runner, PostgreSQL-compatible models, Django RQ with Redis for release email dispatch, React 19 and Vite 6 for existing frontend wiring.

## Global Constraints

- Score Management is A.Depositar's primary sprint scope.
- Friday scope is demo freeze, verification, and documentation only unless a P0 demo blocker is found.
- Score Management is System Admin-only.
- Raw score and final score editing must remain outside Score Management.
- Ranking, percentile, release status, export content, and audit decisions must remain backend-owned.
- Release email must notify students that results are available and link to the Student Portal; it must not include score, rank, percentile, LRN, answer content, or qualification details.
- External school, government, DepEd, CHED, TESDA, and Student Portal result-display contracts are outside this sprint unless their APIs are formally provided and separately approved.
- Use synthetic data only in seeds, tests, docs, and screenshots.
- Do not add migrations, dependencies, endpoints, or product behavior from this plan.
- Do not claim verification passed unless the exact command was run and the output was observed.

---

## Current Build State

Implemented:

- Backend-owned score batch listing.
- Backend-owned score processing.
- Competition ranking and percentile computation by ranking population.
- Read-only score result listing with pagination, search, sort, and release-status filter.
- Candidate profile lookup anchored to the selected score record.
- Three deterministic demo batches in seed data.
- Linked student account/application seed path for demo records.
- Batch release that marks processed approved scores as released.
- Student release availability email through a durable outbox.
- Django RQ/Redis background dispatch for release emails.
- Claimed `PROCESSING` notification state before SMTP send.
- CSV export for processed approved scores.
- Score Management API docs and implementation log.

Remaining build gates:

- Application Review result synchronization storage and field mapping require product/architecture confirmation.
- Recipient targets beyond student availability notifications require downstream delivery contracts or an approved internal-ledger design.
- Expanded audit coverage for failed processing, export, synchronization, and distribution intent requires a separate reviewed implementation plan.
- PostgreSQL-compatible scale rehearsal remains required before production readiness claims.
- Final ranking and percentile methodology must be confirmed by the examination authority before production use.

---

## Task 1: Normalize Build Status And Acceptance Mapping

**Files:**
- Modify: `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md`
- Modify: `docs/superpowers/a.depositar/a.depositar.task.md`
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Consumes: current Score Management implementation evidence from `docs/superpowers/a.depositar/implement/a.depositar.implement.md`
- Produces: qualitative status language that separates implemented demo behavior from follow-up production gates

- [x] **Step 1: Review current status language**

Run:

```powershell
rg -n "AC-|BR-|Current Implementation Status|Remaining build gates|Score Management|Friday Deliverables|Demo Path" docs\superpowers\a.depositar\specs\2026-08-06-us-sr-014-score-management.md docs\superpowers\a.depositar\a.depositar.task.md docs\superpowers\a.depositar\implement\a.depositar.implement.md
```

Expected: output identifies current status rows, Friday deliverables, and implementation evidence.

- [x] **Step 2: Update status wording only where stale**

Use these labels consistently:

```text
Implemented
Partial
Blocked by external contract
Production rehearsal required
Out of scope for this sprint
```

Do not mark Application Review synchronization, recipient-target publication beyond student availability notifications, expanded audit coverage, or PostgreSQL-scale readiness as implemented unless a separate approved plan has been executed and verified.

- [x] **Step 3: Record the Friday freeze stance**

Update `docs/superpowers/a.depositar/a.depositar.task.md` so Friday scope is explicit:

```text
No new Score Management product behavior after freeze unless it is a P0 demo blocker and receives PR review.
```

Expected: the task brief aligns with the current Friday deliverables and does not imply unapproved implementation work.

---

## Task 2: Run Focused Backend Verification

**Files:**
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Consumes: existing Score Management backend tests and Django configuration
- Produces: fresh backend verification evidence for the Friday demo path

- [x] **Step 1: Run Django local check**

Run from `backend/`:

```powershell
..\venv\Scripts\python.exe manage.py check --settings=config.settings.local
```

Expected: `System check identified no issues (0 silenced).`

- [x] **Step 2: Run focused Score Management backend tests**

Run from `backend/`:

```powershell
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_seed_command apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models --settings=config.settings.test
```

Expected: focused Score Management tests pass.

- [x] **Step 3: Run migration check**

Run from `backend/`:

```powershell
..\venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local
```

Expected: no model changes are detected.

- [x] **Step 4: Record observed results**

Append exact commands and observed output summaries to:

```text
docs/superpowers/a.depositar/implement/a.depositar.implement.md
```

If any command fails, classify whether it is a Score Management demo blocker, unrelated repository debt, or an environment issue.

---

## Task 3: Run Focused Frontend Verification

**Files:**
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Consumes: existing frontend Score Management page and service tests
- Produces: fresh frontend verification evidence for the Friday demo path

- [x] **Step 1: Run focused Score Management frontend tests**

Run from `frontend/`:

```powershell
npm test -- ScoreManagement ScoreCandidateDetail scoreManagementService
```

Expected: focused Score Management frontend tests pass.

- [x] **Step 2: Run frontend lint only if the team requires repo-wide status**

Run from `frontend/`:

```powershell
npm run lint
```

Expected: if this still fails on unrelated TypeScript errors or missing export dependencies, record the exact failure as repository-wide debt and do not treat it as a Score Management demo blocker unless it breaks the demo path.

- [x] **Step 3: Record observed results**

Append exact commands and observed output summaries to:

```text
docs/superpowers/a.depositar/implement/a.depositar.implement.md
```

---

## Task 4: Rehearse The Demo Path

**Files:**
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Consumes: existing local seed commands, backend API endpoints, frontend Score Management UI, and System Admin access path
- Produces: demo rehearsal notes with blockers and fallback talking points

- [x] **Step 1: Prepare synthetic demo data**

Run the existing local seed flow needed by the demo environment. Use only synthetic data.

Expected: the demo environment has at least three Score Management batches and linked synthetic candidate profile data.

- [x] **Step 2: Rehearse the approved demo path**

Walk through:

```text
1. Open Score Management as SYSTEM_ADMIN.
2. Load available examination sessions.
3. Select a batch.
4. Show backend-paginated candidate score results.
5. Search, filter, and sort candidate results.
6. Process scoring for a ready batch, or explain processed state for seeded demo data.
7. Open candidate detail and show read-only score/profile context.
8. Release processed results.
9. Export processed score results.
```

Expected: each step is either demo-ready or has a documented fallback.

- [x] **Step 3: Record rehearsal result**

Append:

```text
demo environment
seed commands used
backend URL
frontend URL
demo account type
steps passed
blockers
fallback talking points
```

to:

```text
docs/superpowers/a.depositar/implement/a.depositar.implement.md
```

---

## Task 5: Freeze And Follow-Up Classification

**Files:**
- Modify: `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md`
- Modify: `docs/superpowers/a.depositar/a.depositar.task.md`
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Consumes: verification and rehearsal evidence from Tasks 1 through 4
- Produces: final Friday build-status documentation and follow-up backlog boundaries

- [x] **Step 1: Classify remaining work**

Use these categories:

```text
Demo blocker
P0 post-freeze fix
Post-demo implementation plan required
External contract required
Production rehearsal required
Out of scope for this sprint
```

- [x] **Step 2: Keep follow-up implementation out of Friday freeze**

Document these as follow-up plans, not current tasks:

```text
Application Review result synchronization
Recipient-target release ledger for SCHOOLS and GOVERNMENT
Expanded Score Management audit event model
PostgreSQL-compatible 200,000-candidate rehearsal
Official ranking and percentile methodology confirmation
```

- [x] **Step 3: Update final Friday status**

Update `docs/superpowers/a.depositar/a.depositar.task.md`:

```text
Freeze status:
- Demo path verified: yes/no
- P0 blockers: list or none
- Follow-up plans required: list
```

- [x] **Step 4: Final documentation diff review**

Run from repo root:

```powershell
git diff -- docs\superpowers\a.depositar\plans\2026-08-07-score-management-build-plan.md docs\superpowers\a.depositar\specs\2026-08-06-us-sr-014-score-management.md docs\superpowers\a.depositar\a.depositar.task.md docs\superpowers\a.depositar\implement\a.depositar.implement.md
```

Expected: diff contains only Friday demo-freeze documentation and observed verification evidence.

---

## Execution Order

1. Task 1: Normalize build status and acceptance mapping.
2. Task 2: Run focused backend verification.
3. Task 3: Run focused frontend verification.
4. Task 4: Rehearse the demo path.
5. Task 5: Freeze and follow-up classification.

## Known Risks

- Full backend test suite currently has unrelated failures; use focused Score Management evidence for demo readiness and record unrelated failures separately.
- Local Python runtime may differ from the repository's Python 3.13 target.
- Redis must be running for automatic background email dispatch; without it, notifications remain queued and retryable.
- Frontend repo-wide lint may still fail on unrelated TypeScript/export dependency debt.
- External school/government delivery remains outside Score Management until contracts are provided.
- PostgreSQL-compatible scale rehearsal is not part of the Friday demo-freeze plan and remains required before production readiness claims.

## Deferred Follow-Up Plans

Create separate reviewed plans before implementing any of these:

- Application Review official result synchronization.
- Recipient-target release ledger and API behavior for `SCHOOLS` and `GOVERNMENT`.
- Expanded Score Management audit model for failed processing, export, synchronization, and distribution intent.
- PostgreSQL-compatible large-batch rehearsal and tuning.
- Official ranking and percentile methodology confirmation and any resulting processing changes.
