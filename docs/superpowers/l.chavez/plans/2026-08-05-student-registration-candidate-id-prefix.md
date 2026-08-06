# Student Registration Candidate ID Prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change new Student Registration candidate IDs from `PS-YYYY-XXXX-XXXX` to `PHL-YYYY-XXXXXX`.

**Architecture:** Keep candidate ID generation backend-owned in `backend/apps/applications/models.py`. Update tests and documentation at the registration contract boundary, and update the frontend display helper so client-side fallback formatting matches the backend contract.

**Tech Stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, React 19, TypeScript 5.8, Vitest.

## Global Constraints

- Do not add dependencies.
- Do not change existing persisted candidate IDs.
- Do not create a migration for this story.
- Do not change registration authorization, validation, account activation, or admissions-review state transitions.
- Keep `StudentApplication.candidate_id` at its current `max_length=17`.
- Target candidate ID format is exactly `PHL-YYYY-XXXXXX`.
- Use synthetic data only in tests and documentation.
- Do not commit secrets, credentials, real LRN data, real candidate records, real exam content, answer keys, proctoring evidence, or sensitive payloads.

---

## Files In Scope

- Modify: `backend/apps/applications/models.py`
  - Owns `generate_candidate_id` and new `StudentApplication` ID assignment.
- Modify: `backend/apps/applications/tests/test_application_endpoints.py`
  - Owns registration endpoint contract tests and audit ID assertions.
- Modify: `backend/apps/applications/migrations/0009_studentapplication_candidate_id.py`
  - Owns fresh-database backfill formatting for the existing `candidate_id` field.
- Modify: `frontend/src/lib/utils.ts`
  - Owns frontend fallback candidate ID formatting.
- Modify: `frontend/src/lib/utils.test.ts`
  - Owns frontend candidate ID utility tests.
- Modify: `docs/api/API-ENDPOINTS.md`
  - Owns documented registration request and response contract.
- Modify: `docs/superpowers/l.chavez/implement/l.chavez.implement.md`
  - Records execution and verification evidence.

## Task 1: Backend Candidate ID Generation

**Files:**
- Modify: `backend/apps/applications/tests/test_application_endpoints.py`
- Modify: `backend/apps/applications/models.py`

**Interfaces:**
- Consumes: `generate_candidate_id(year: int | None = None) -> str`
- Produces: `generate_candidate_id` returning strings matching `^PHL-\d{4}-[A-Z0-9]{6}$`

- [ ] **Step 1: Add a focused backend unit test for the generator**

Add this import near the other application imports in `backend/apps/applications/tests/test_application_endpoints.py`:

```python
from apps.applications.models import generate_candidate_id
```

Add this test method to the existing registration endpoint test class that already covers application creation:

```python
def test_generate_candidate_id_uses_phl_prefix(self):
    candidate_id = generate_candidate_id(year=2027)

    self.assertRegex(candidate_id, r"^PHL-2027-[A-Z0-9]{6}$")
    self.assertNotIn("PS-", candidate_id)
```

- [ ] **Step 2: Run the focused backend test and confirm it fails**

From `backend/`, run:

```bash
python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test
```

Expected result before implementation: at least one failure showing the generated candidate ID still starts with `PS-`.

- [ ] **Step 3: Update `generate_candidate_id`**

Change `backend/apps/applications/models.py` from eight random characters split as four and four to six random characters with the `PHL` prefix:

```python
def generate_candidate_id(year: int | None = None) -> str:
    registration_year = year or timezone.now().year
    code = "".join(choice(CANDIDATE_CODE_ALPHABET) for _ in range(6))
    return f"PHL-{registration_year}-{code}"
```

- [ ] **Step 4: Update fresh-database migration formatter**

In `backend/apps/applications/migrations/0009_studentapplication_candidate_id.py`, update `_hash_to_candidate_code` to generate six characters and update `_format_candidate_id` plus duplicate fallback formatting to return `PHL-{year}-{code}`. Do not create a new migration for this story.

- [ ] **Step 5: Update existing backend response regex assertions**

In `backend/apps/applications/tests/test_application_endpoints.py`, replace registration candidate ID regex expectations:

```python
r"^PS-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$"
```

with:

```python
r"^PHL-\d{4}-[A-Z0-9]{6}$"
```

Keep existing assertions that audit log `registration_id`, `applicant_id`, and pending `account_id` equal the response candidate ID. Those assertions prove audit rows follow the generated ID without hardcoding either prefix.

- [ ] **Step 6: Run focused backend application tests**

From `backend/`, run:

```bash
python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test
```

Expected result: all tests in `test_application_endpoints.py` pass.

## Task 2: Frontend Candidate ID Formatting

**Files:**
- Modify: `frontend/src/lib/utils.test.ts`
- Modify: `frontend/src/lib/utils.ts`

**Interfaces:**
- Consumes: `formatCandidateId(applicationId: string, submittedAt?: string) => string`
- Produces: formatted candidate IDs matching `PHL-YYYY-XXXXXX`

- [ ] **Step 1: Update the frontend utility tests first**

In `frontend/src/lib/utils.test.ts`, update the candidate ID formatting expectations to this shape:

```typescript
expect(formatCandidateId('8f4k92xm', '2026-07-22T10:15:00.000Z')).toBe('PHL-2026-8F4K92');
```

Update the random UUID fallback assertion:

```typescript
expect(formatted).toMatch(/^PHL-2026-[A-Z0-9]{6}$/);
```

Update the preservation case:

```typescript
expect(formatCandidateId('PHL-2026-H72Q4J')).toBe('PHL-2026-H72Q4J');
```

- [ ] **Step 2: Run the focused frontend test and confirm it fails**

From `frontend/`, run:

```bash
npm test -- utils
```

Expected result before implementation: tests fail because `formatCandidateId` still emits or preserves `PS-YYYY-XXXX-XXXX`.

- [ ] **Step 3: Update `formatCandidateId`**

In `frontend/src/lib/utils.ts`, update the preservation regex to:

```typescript
if (/^PHL-\d{4}-[A-Z0-9]{6}$/.test(applicationId)) return applicationId;
```

Update the return value to:

```typescript
return `PHL-${year}-${code.slice(0, 6)}`;
```

Keep the existing uppercase and non-alphanumeric stripping behavior so fallback formatting remains stable for UUIDs and legacy application IDs.

- [ ] **Step 4: Run the focused frontend utility test**

From `frontend/`, run:

```bash
npm test -- utils
```

Expected result: focused utility tests pass.

## Task 3: Registration Contract Documentation

**Files:**
- Modify: `docs/api/API-ENDPOINTS.md`

**Interfaces:**
- Consumes: registration API contract text.
- Produces: documented `candidateId` format `PHL-YYYY-XXXXXX`.

- [ ] **Step 1: Update the registration contract paragraph**

In `docs/api/API-ENDPOINTS.md`, update the Student Application contract sentence that currently says responses include `candidateId` in `PS-YYYY-XXXX-XXXX` format.

Replace that portion with:

```markdown
Responses include a backend-generated, read-only `candidateId` in `PHL-YYYY-XXXXXX` format, where `YYYY` is the registration year and the final six characters are a unique random code.
```

- [ ] **Step 2: Search registration docs for stale `PS-` contract references**

From the repository root, run:

```bash
rg -n "PS-" docs/api/API-ENDPOINTS.md backend/apps/applications frontend/src/lib
```

Expected result after Tasks 1 to 3: no `PS-` references remain in those scoped registration contract, backend application, or frontend utility files except the intentional negative assertion `self.assertNotIn("PS-", candidate_id)`.

## Task 4: Verification And Implementation Log

**Files:**
- Modify: `docs/superpowers/l.chavez/implement/l.chavez.implement.md`

**Interfaces:**
- Consumes: task results from Tasks 1 to 3.
- Produces: implementation log with exact commands and observed results.

- [ ] **Step 1: Run backend system check**

From `backend/`, run:

```bash
python manage.py check --settings=config.settings.local
```

Expected result: `System check identified no issues`.

- [ ] **Step 2: Run focused backend tests**

From `backend/`, run:

```bash
python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test
```

Expected result: focused application endpoint tests pass.

- [ ] **Step 3: Run focused frontend tests**

From `frontend/`, run:

```bash
npm test -- utils
```

Expected result: focused utility tests pass.

- [ ] **Step 4: Run broader checks if application files changed outside the planned scope**

Run the broader checks only if the implementation touches files outside this plan:

```bash
python manage.py test apps.applications --settings=config.settings.test
npm run lint
npm run build
```

Expected result: disclose exact pass or fail status. Do not weaken or remove unrelated assertions to force a pass.

- [ ] **Step 5: Update implementation log**

Append a dated entry to `docs/superpowers/l.chavez/implement/l.chavez.implement.md` using the exact observed execution details. The entry must include these headings:

```markdown
## 2026-08-05 - Student Registration Candidate ID Prefix

Approved plan:

- `docs/superpowers/l.chavez/plans/2026-08-05-student-registration-candidate-id-prefix.md`

Work completed:

- Changed new registration candidate IDs to `PHL-YYYY-XXXXXX`.
- Updated backend registration tests.
- Updated frontend candidate ID utility tests.
- Updated API registration contract documentation.

Commands run:

- `python manage.py check --settings=config.settings.local`
- `python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test`
- `npm test -- utils`

Observed results:

- Record the exact pass or fail output observed for each command.
- If a command fails because of missing local dependencies or sandbox restrictions, record that exact failure and the rerun command used.

Files changed:

- `backend/apps/applications/models.py`
- `backend/apps/applications/tests/test_application_endpoints.py`
- `backend/apps/applications/migrations/0009_studentapplication_candidate_id.py`
- `frontend/src/lib/utils.ts`
- `frontend/src/lib/utils.test.ts`
- `docs/api/API-ENDPOINTS.md`
- `docs/superpowers/l.chavez/implement/l.chavez.implement.md`
```

## Self-Review

- Spec coverage: Tasks 1 through 4 cover backend generation, fresh-database migration formatting, frontend formatting, API documentation, search verification, and implementation logging.
- Placeholder scan: No placeholder tasks remain. The implementation log step requires exact observed command output at execution time.
- Type consistency: The plan uses the existing `generate_candidate_id(year: int | None = None) -> str` and `formatCandidateId(applicationId: string, submittedAt?: string) => string` interfaces.

## Approval Gate

- [x] Scope approved by L.Chavez on 2026-08-05.
- [ ] Human reviewer approves this plan before application code execution.
- [ ] Any code change after approval must stay within this plan or require a new reviewed plan.
