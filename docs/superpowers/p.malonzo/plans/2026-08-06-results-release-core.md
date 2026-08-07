# Results Release Core Implementation Plan

> **SUPERSEDED — 2026-08-07.** Retained only as planning history; do not execute its persistence, policy, hold, publication, notification, or migration tasks. It was replaced by the approved minimal [`2026-08-07-results-release-orchestration.md`](2026-08-07-results-release-orchestration.md) plan, which reuses the existing Score Management models and process/release services without adding models or migrations.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin Results Release mock/localStorage workflow with database-backed policy, readiness, hold, partial-publication, and publication-history APIs and a connected React page.

**Architecture:** Extend `apps.results` with versioned release-policy and immutable-publication models while keeping Score Management as the source of approved processed scores. Focused domain services resolve application/account/preference data and publish eligible candidates transactionally; thin DRF adapters expose versioned contracts consumed only through a typed frontend service.

**Tech Stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, PostgreSQL-compatible persistence, React 19, TypeScript 5.8, Vite 6, Vitest, React Testing Library, and Playwright.

## Global Constraints

- Work only on `p.malonzo/results-release` in the current P.Malonzo checkout.
- Keep `apps.results` authoritative for Results Release and do not change Exam Review scoring or Score Management rank/percentile computation.
- Reference `apps.configuration.University` and `apps.configuration.CollegeCourse`; do not consolidate the duplicate `apps.universities` registry in this plan.
- Use synthetic data in migrations, tests, screenshots, seed commands, and documentation.
- Never log or expose LRN, contact details, result payloads, notification bodies, credentials, tokens, or exam content.
- Backend permissions and object scope are authoritative; frontend routes are usability controls only.
- API changes require contract documentation and success, invalid-input, unauthenticated, role-denial, object-denial, not-found, conflict, and safe-error tests.
- Data-model changes require reviewed migrations, PostgreSQL-compatible rehearsal, rollout impact, and rollback instructions.
- Do not begin the student portal, PDF, notification delivery, or analytics slices in this plan; each receives its own reviewed plan after the core slice passes review.
- Do not stage or commit the Windows `BUILD_PLAN.md`/`build_plan.md` case-collision artifact.

## Planned File Structure

- `backend/apps/results/models.py` — persistent policy, hold, batch, publication, decision, and audit records.
- `backend/apps/results/release_readiness.py` — source resolution, policy selection, decision calculation, and readiness projection.
- `backend/apps/results/release_publication.py` — hold transitions and atomic/idempotent publication orchestration.
- `backend/apps/results/release_serializers.py` — request/query validation and response serialization for release contracts.
- `backend/apps/results/release_permissions.py` — role and university-scope checks for release endpoints.
- `backend/apps/results/release_views.py` — thin DRF views for policies, readiness, holds, batches, and publications.
- `backend/apps/results/urls.py` — `/api/v1/results/` release routes.
- `backend/apps/results/management/commands/seed_results_release.py` — repeatable synthetic core demo data.
- `backend/apps/results/tests/results_release_fixtures.py` — shared synthetic fixtures used by focused release tests.
- `backend/apps/results/tests/test_results_release_models.py` — database constraints and state tests.
- `backend/apps/results/tests/test_results_release_readiness.py` — business-rule tests below HTTP.
- `backend/apps/results/tests/test_results_release_publication.py` — transaction, partial release, hold, and idempotency tests.
- `backend/apps/results/tests/test_results_release_api.py` — API contract, permission, scope, and error tests.
- `backend/apps/results/tests/test_results_release_seed.py` — seed repeatability tests.
- `frontend/src/services/resultsReleaseService.ts` — typed admin transport mapping.
- `frontend/src/services/resultsReleaseService.test.ts` — service URL/body/error mapping tests.
- `frontend/src/pages/admin/hub/ResultsRelease.tsx` — connected admin presentation.
- `frontend/src/pages/admin/hub/ResultsRelease.test.tsx` — component behavior and accessibility coverage.
- `frontend/e2e/results-release.spec.ts` — critical admin browser journey.
- `docs/api/API-ENDPOINTS.md` — release API contracts.
- `docs/architecture/BACKEND-ARCHITECTURE.md` — release module boundary.
- `docs/architecture/DATABASE-DESIGN.md` — models, ownership, constraints, indexes, migration, and rollback.
- `docs/security/SECURITY-BASELINE.md` — release permission, audit, and sensitive-data behavior.
- `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md` — implementation and verification record.

---

### Task 1: Add Core Release Persistence and Migration

**Files:**
- Modify: `backend/apps/results/models.py`
- Create: `backend/apps/results/migrations/0004_results_release_core.py`
- Create: `backend/apps/results/tests/results_release_fixtures.py`
- Create: `backend/apps/results/tests/test_results_release_models.py`

**Interfaces:**
- Consumes: existing `ExaminationSession`, `CandidateScore`, `AccountProfile`, `StudentApplication`, `apps.configuration.University`, and `apps.configuration.CollegeCourse` models.
- Produces: `ReleasePolicy`, `ReleaseHold`, `PublicationBatch`, `ResultPublication`, `ResultDecision`, `ResultAuditEvent`, and `ScoreBatchStatus.PARTIALLY_RELEASED`.

The fixture module initially produces `ReleaseFixture`, `make_release_fixture()`, and `make_policy()` for model tests; Task 2 extends it with score/application helpers.

- [ ] **Step 1: Write failing model tests**

Create tests proving threshold validation, one active policy per session/university, one current publication per score, immutable version ordering, and protected foreign keys:

```python
class ReleaseModelTests(TestCase):
    def test_active_policy_is_unique_per_session_and_university(self):
        fixture = make_release_fixture()
        ReleasePolicy.objects.create(
            session=fixture.session,
            university=fixture.university,
            metric=ReleaseMetric.PERCENTILE,
            qualified_threshold=Decimal("85.00"),
            waitlist_enabled=True,
            waitlist_lower_threshold=Decimal("80.00"),
            status=ReleasePolicyStatus.ACTIVE,
            version=1,
            created_by=fixture.admin,
            activated_by=fixture.admin,
            activated_at=timezone.now(),
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ReleasePolicy.objects.create(
                    session=fixture.session,
                    university=fixture.university,
                    metric=ReleaseMetric.PERCENTILE,
                    qualified_threshold=Decimal("90.00"),
                    status=ReleasePolicyStatus.ACTIVE,
                    version=2,
                    created_by=fixture.admin,
                )

    def test_waitlist_threshold_must_be_below_qualified_threshold(self):
        policy = make_policy(
            qualified_threshold=Decimal("85.00"),
            waitlist_enabled=True,
            waitlist_lower_threshold=Decimal("85.00"),
        )
        with self.assertRaises(ValidationError):
            policy.full_clean()
```

- [ ] **Step 2: Run the focused model tests and confirm red state**

Run from `backend/`:

```powershell
python manage.py test apps.results.tests.test_results_release_models --settings=config.settings.test
```

Expected: import failure because the release models do not exist.

- [ ] **Step 3: Add enums and model classes**

Add exact state enums and model boundaries:

```python
class ReleaseMetric(models.TextChoices):
    FINAL_SCORE = "FINAL_SCORE", "Final score"
    PERCENTILE = "PERCENTILE", "Percentile"


class ReleasePolicyStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    RETIRED = "RETIRED", "Retired"


class ReleaseHoldStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    RESOLVED = "RESOLVED", "Resolved"


class PublicationStatus(models.TextChoices):
    PUBLISHED = "PUBLISHED", "Published"
    SUPERSEDED = "SUPERSEDED", "Superseded"


class DecisionOutcome(models.TextChoices):
    QUALIFIED = "QUALIFIED", "Qualified"
    WAITLISTED = "WAITLISTED", "Waitlisted"
    FAILED = "FAILED", "Failed"
```

Implement the fields and constraints from the approved specification. Use conditional `UniqueConstraint` rows for one active policy per `(session, university)` and one current `PUBLISHED` publication per score. Add indexes for policy scope/status, active holds by score/university, batches by session/date, publications by account/status/date, and decisions by university/outcome.

- [ ] **Step 4: Generate the migration**

Run:

```powershell
python manage.py makemigrations results --name results_release_core --settings=config.settings.local
```

Expected: one additive migration creating six tables, constraints, and indexes and altering the session scoring-status choices.

- [ ] **Step 5: Inspect the migration before running it**

Confirm the migration contains no data deletion, score rewrite, destructive rename, or dependency on `apps.universities`. Confirm every foreign key uses the deletion behavior from the specification.

- [ ] **Step 6: Run model and migration checks**

```powershell
python manage.py test apps.results.tests.test_results_release_models --settings=config.settings.test
python manage.py check --settings=config.settings.local
python manage.py makemigrations --check --dry-run --settings=config.settings.local
```

Expected: focused tests pass, Django check reports no issues, and no uncommitted migration is detected.

- [ ] **Step 7: Commit the persistence slice**

```powershell
git add backend/apps/results/models.py backend/apps/results/migrations/0004_results_release_core.py backend/apps/results/tests/results_release_fixtures.py backend/apps/results/tests/test_results_release_models.py
git commit -m "feat(results): add release policy and publication models"
```

---

### Task 2: Implement Policy Activation and Readiness Projection

**Files:**
- Create: `backend/apps/results/release_readiness.py`
- Modify: `backend/apps/results/tests/results_release_fixtures.py`
- Create: `backend/apps/results/tests/test_results_release_readiness.py`

**Interfaces:**
- Consumes: Task 1 models and existing application/account/configuration registries.
- Produces: `activate_policy(*, policy_id: UUID, actor) -> ReleasePolicy`, `calculate_decision(*, policy: ReleasePolicy, score: CandidateScore) -> DecisionProjection`, and `get_release_readiness(*, session_id: str, university_id: UUID) -> ReleaseReadiness`.

- [ ] **Step 1: Add reusable synthetic fixtures**

Define a `ReleaseFixture` dataclass and `make_release_fixture()` that creates a closed processed session, configuration university/course, approved CandidateScore, matching StudentApplication preference, matching Student account/profile, and draft policy. Keep all names, LRN values, contacts, and scores synthetic.

```python
@dataclass(frozen=True)
class ReleaseFixture:
    admin: object
    student: object
    session: ExaminationSession
    university: University
    course: CollegeCourse
    application: StudentApplication
    score: CandidateScore
    policy: ReleasePolicy


def make_release_fixture(
    *,
    metric=ReleaseMetric.PERCENTILE,
    key: str = "one",
    session: ExaminationSession | None = None,
    university: University | None = None,
) -> ReleaseFixture:
    """Create one internally consistent synthetic release candidate."""


def make_policy(**overrides) -> ReleasePolicy:
    """Return an unsaved valid policy with explicit field overrides."""


def score_at(value: str, *, fixture: ReleaseFixture | None = None) -> CandidateScore:
    """Return a saved processed score whose percentile equals value."""


def duplicate_application_for(score: CandidateScore) -> StudentApplication:
    """Create a second active synthetic application matching score linkage."""
```

- [ ] **Step 2: Write failing decision and readiness tests**

```python
class ReleaseReadinessTests(TestCase):
    def test_percentile_policy_calculates_qualified_waitlisted_and_failed(self):
        fixture = make_release_fixture()
        self.assertEqual(calculate_decision(policy=fixture.policy, score=score_at("90.00")).outcome, "QUALIFIED")
        self.assertEqual(calculate_decision(policy=fixture.policy, score=score_at("82.00")).outcome, "WAITLISTED")
        self.assertEqual(calculate_decision(policy=fixture.policy, score=score_at("79.99")).outcome, "FAILED")

    def test_readiness_blocks_ambiguous_application_linkage(self):
        fixture = make_release_fixture()
        duplicate_application_for(fixture.score)
        readiness = get_release_readiness(session_id=fixture.session.id, university_id=fixture.university.id)
        self.assertEqual(readiness.rows[0].state, "NOT_READY")
        self.assertIn("AMBIGUOUS_APPLICATION", readiness.rows[0].reason_codes)
```

Cover missing/ambiguous application, missing student account, unresolved preference, inactive course/university, missing active policy, unprocessed score, active hold, and published score.

- [ ] **Step 3: Run readiness tests and confirm red state**

```powershell
python manage.py test apps.results.tests.test_results_release_readiness --settings=config.settings.test
```

Expected: import failure for `release_readiness`.

- [ ] **Step 4: Implement immutable projection types**

```python
@dataclass(frozen=True)
class DecisionProjection:
    outcome: str
    metric: str
    metric_value: Decimal
    qualified_threshold: Decimal
    waitlist_lower_threshold: Decimal | None


@dataclass(frozen=True)
class CandidateReadiness:
    score_id: str
    candidate_id: str
    state: str
    reason_codes: tuple[str, ...]
    application_id: UUID | None
    student_user_id: int | None
    course_id: UUID | None
    decision: DecisionProjection | None


@dataclass(frozen=True)
class ReleaseReadiness:
    session_id: str
    university_id: UUID
    eligible_count: int
    held_count: int
    blocked_count: int
    published_count: int
    rows: tuple[CandidateReadiness, ...]
```

- [ ] **Step 5: Implement policy activation and source resolution**

`activate_policy()` must lock all policies in the same scope, validate thresholds, retire the previous active policy, assign the next version, and activate the requested draft in one transaction. `get_release_readiness()` must match CandidateScore to StudentApplication by both `candidate_id` and LRN, match one active Student AccountProfile by LRN, normalize preference strings, and resolve one configuration University and CollegeCourse. Never use candidate-name fallback.

- [ ] **Step 6: Run readiness tests**

```powershell
python manage.py test apps.results.tests.test_results_release_readiness --settings=config.settings.test
```

Expected: all readiness and policy tests pass.

- [ ] **Step 7: Commit readiness behavior**

```powershell
git add backend/apps/results/release_readiness.py backend/apps/results/tests/results_release_fixtures.py backend/apps/results/tests/test_results_release_readiness.py
git commit -m "feat(results): calculate release readiness and decisions"
```

---

### Task 3: Implement Holds and Atomic Partial Publication

**Files:**
- Create: `backend/apps/results/release_publication.py`
- Create: `backend/apps/results/tests/test_results_release_publication.py`

**Interfaces:**
- Consumes: `get_release_readiness()` and Task 1 models.
- Produces: `create_manual_hold()`, `resolve_hold()`, and `publish_results()`.

- [ ] **Step 1: Write failing hold and publication tests**

```python
class ResultPublicationTests(TestCase):
    def test_publication_releases_ready_candidate_and_preserves_held_candidate(self):
        ready = make_release_fixture(key="ready")
        held = make_release_fixture(key="held", session=ready.session, university=ready.university)
        create_manual_hold(score_id=held.score.id, university_id=held.university.id, reason_code="MANUAL_REVIEW", safe_note="Review required.", actor=held.admin)

        result = publish_results(
            session_id=ready.session.id,
            university_ids=(ready.university.id,),
            idempotency_key="core-release-001",
            actor=ready.admin,
        )

        self.assertEqual(result.status, "PARTIALLY_RELEASED")
        self.assertEqual(result.published_count, 1)
        self.assertEqual(result.held_count, 1)
        self.assertTrue(ResultPublication.objects.filter(score=ready.score, status="PUBLISHED").exists())
        self.assertFalse(ResultPublication.objects.filter(score=held.score, status="PUBLISHED").exists())

    def test_same_idempotency_key_returns_original_batch(self):
        fixture = make_release_fixture()
        first = publish_results(session_id=fixture.session.id, university_ids=(fixture.university.id,), idempotency_key="same-key", actor=fixture.admin)
        second = publish_results(session_id=fixture.session.id, university_ids=(fixture.university.id,), idempotency_key="same-key", actor=fixture.admin)
        self.assertEqual(first.id, second.id)
        self.assertEqual(ResultPublication.objects.count(), 1)
```

Add conflict coverage for same key/different scope, stale readiness, unprocessed session, unsafe hold note, double hold resolution, and concurrent publication.

- [ ] **Step 2: Run publication tests and confirm red state**

```powershell
python manage.py test apps.results.tests.test_results_release_publication --settings=config.settings.test
```

Expected: import failure for `release_publication`.

- [ ] **Step 3: Define stable domain errors and result type**

```python
class ReleaseConflict(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


@dataclass(frozen=True)
class PublicationResult:
    id: UUID
    status: str
    eligible_count: int
    published_count: int
    held_count: int
    excluded_count: int
```

- [ ] **Step 4: Implement hold transitions**

`create_manual_hold()` accepts only approved reason codes and rejects notes containing 12-digit LRN-like values or more than 500 characters. `resolve_hold()` locks the row, rejects an already resolved hold with `HOLD_ALREADY_RESOLVED`, records actor/timestamp, and writes a safe `ResultAuditEvent`.

- [ ] **Step 5: Implement transactional publication**

```python
@transaction.atomic
def publish_results(*, session_id: str, university_ids: tuple[UUID, ...], idempotency_key: str, actor) -> PublicationResult:
    session = ExaminationSession.objects.select_for_update().get(id=session_id)
    existing = PublicationBatch.objects.filter(idempotency_key=idempotency_key).first()
    if existing is not None:
        return _validate_and_return_existing(existing, session_id, university_ids)
    scores = list(CandidateScore.objects.select_for_update().filter(session=session, review_status=ScoreReviewStatus.APPROVED))
    readiness = _calculate_locked_readiness(session, university_ids, scores)
    return _persist_publication(session=session, readiness=readiness, university_ids=university_ids, idempotency_key=idempotency_key, actor=actor)
```

Persist canonical snapshot fields and SHA-256 digest, one ResultDecision per resolved preference, and safe batch/publication audit events. Set CandidateScore release status only for published scores. Set the session to `PARTIALLY_RELEASED` while approved unpublished candidates remain and `RESULTS_RELEASED` only when none remain.

- [ ] **Step 6: Run publication and existing Score Management tests**

```powershell
python manage.py test apps.results.tests.test_results_release_publication apps.results.tests.test_score_processing apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: new publication tests pass and existing score processing remains green. If the existing batch-release contract must change to report partial release, update its focused test in the same task without weakening assertions.

- [ ] **Step 7: Commit publication behavior**

```powershell
git add backend/apps/results/release_publication.py backend/apps/results/tests/test_results_release_publication.py backend/apps/results/tests/test_score_management_api.py
git commit -m "feat(results): publish eligible results atomically"
```

---

### Task 4: Expose Versioned Admin Release APIs

**Files:**
- Create: `backend/apps/results/release_permissions.py`
- Create: `backend/apps/results/release_serializers.py`
- Create: `backend/apps/results/release_views.py`
- Modify: `backend/apps/results/urls.py`
- Create: `backend/apps/results/tests/test_results_release_api.py`
- Modify: `docs/api/API-ENDPOINTS.md`

**Interfaces:**
- Consumes: policy/readiness/publication services from Tasks 2–3.
- Produces: release-policy, readiness, hold, publication-batch, and publication-history HTTP contracts under `/api/v1/results/`.

- [ ] **Step 1: Write failing endpoint and permission tests**

Cover every route from the core specification. Include `SYSTEM_ADMIN`, `EXAM_ADMINISTRATOR`, in-scope and out-of-scope `UNIVERSITY_ADMIN`, `STUDENT`, unauthenticated, missing record, validation failure, conflict code, and safe error-envelope assertions.

```python
def test_out_of_scope_university_admin_cannot_preview_readiness(self):
    fixture = make_release_fixture()
    self.authenticate(PortalRole.UNIVERSITY_ADMIN, scopes={"universityIds": [str(uuid.uuid4())]})
    response = self.client.get(reverse("results:release-readiness"), {"sessionId": fixture.session.id, "universityId": fixture.university.id})
    self.assertEqual(response.status_code, 403)

def test_publication_requires_idempotency_key(self):
    fixture = make_release_fixture()
    response = self.client.post(reverse("results:publication-batches"), {"sessionId": fixture.session.id, "universityIds": [fixture.university.id]}, format="json")
    self.assertEqual(response.status_code, 400)
    self.assertEqual(response.data["error"]["code"], "VALIDATION_FAILED")
```

- [ ] **Step 2: Run API tests and confirm red state**

```powershell
python manage.py test apps.results.tests.test_results_release_api --settings=config.settings.test
```

Expected: URL reverse/import failure.

- [ ] **Step 3: Implement request/query serializers**

Create explicit serializers for policy create/update, readiness query, hold create/resolve, publication request, and paginated publication list. Use camelCase transport fields and typed validated dictionaries. Thresholds are decimals bounded from 0 to 100; safe notes are at most 500 characters; `universityIds` is a non-empty unique UUID list.

- [ ] **Step 4: Implement role and university scope checks**

```python
def allowed_university_ids(user) -> frozenset[UUID] | None:
    role = get_user_role(user)
    if role in {PortalRole.SYSTEM_ADMIN.value, PortalRole.EXAM_ADMINISTRATOR.value}:
        return None
    if role == PortalRole.UNIVERSITY_ADMIN.value:
        raw_ids = getattr(getattr(user, "account_profile", None), "scopes", {}).get("universityIds", [])
        return frozenset(UUID(value) for value in raw_ids)
    return frozenset()
```

`None` means global access; an empty set denies every university. Malformed scope UUIDs deny access rather than widening it.

- [ ] **Step 5: Implement thin views and routes**

Views validate transport data, call one domain service, and serialize its result. Convert `ReleaseConflict` to a DRF `APIException` with status `409` and stable error code. Do not log request bodies or result data.

- [ ] **Step 6: Document contracts next to implementation**

Add each method/path, allowed roles, request/response examples using synthetic identifiers, pagination rules, readiness reason codes, hold lifecycle, idempotency behavior, error codes, and object-scope behavior to `docs/api/API-ENDPOINTS.md`.

- [ ] **Step 7: Run API, core contract, and Django checks**

```powershell
python manage.py test apps.results.tests.test_results_release_api apps.core.tests.test_api_contract --settings=config.settings.test
python manage.py check --settings=config.settings.local
```

Expected: all focused endpoint/contract tests pass and Django reports no issues.

- [ ] **Step 8: Commit the API slice**

```powershell
git add backend/apps/results/release_permissions.py backend/apps/results/release_serializers.py backend/apps/results/release_views.py backend/apps/results/urls.py backend/apps/results/tests/test_results_release_api.py docs/api/API-ENDPOINTS.md
git commit -m "feat(results): expose release administration APIs"
```

---

### Task 5: Add Repeatable Synthetic Core Demo Data

**Files:**
- Create: `backend/apps/results/management/commands/seed_results_release.py`
- Create: `backend/apps/results/tests/test_results_release_seed.py`

**Interfaces:**
- Consumes: existing score seed command and Task 1 core models.
- Produces: `python manage.py seed_results_release --reset` with deterministic ready, held, blocked, and published synthetic cases.

- [ ] **Step 1: Write failing seed-command tests**

```python
class ResultsReleaseSeedTests(TestCase):
    def test_seed_is_repeatable_and_contains_each_core_state(self):
        call_command("seed_results_release", "--reset")
        call_command("seed_results_release")
        self.assertEqual(ReleasePolicy.objects.filter(status="ACTIVE").count(), 1)
        university_id = University.objects.get(code=DEMO_UNIVERSITY_CODE).id
        readiness = get_release_readiness(session_id=DEMO_SESSION_ID, university_id=university_id)
        self.assertGreaterEqual(readiness.eligible_count, 1)
        self.assertGreaterEqual(readiness.held_count, 1)
        self.assertGreaterEqual(readiness.blocked_count, 1)
```

- [ ] **Step 2: Run the seed test and confirm red state**

```powershell
python manage.py test apps.results.tests.test_results_release_seed --settings=config.settings.test
```

Expected: command-not-found failure.

- [ ] **Step 3: Implement the command**

Use `transaction.atomic()`, deterministic IDs, and `update_or_create()`. `--reset` deletes only records with the command's documented synthetic ID prefix and must verify that prefix before deletion. Never delete arbitrary application, account, registry, or score rows.

- [ ] **Step 4: Verify command repeatability**

```powershell
python manage.py test apps.results.tests.test_results_release_seed --settings=config.settings.test
python manage.py seed_results_release --reset --settings=config.settings.local
python manage.py seed_results_release --settings=config.settings.local
```

Expected: tests pass and both local command executions complete without duplicate rows.

- [ ] **Step 5: Commit demo data**

```powershell
git add backend/apps/results/management/commands/seed_results_release.py backend/apps/results/tests/test_results_release_seed.py
git commit -m "test(results): seed release workflow demo states"
```

---

### Task 6: Add the Typed Frontend Results Release Service

**Files:**
- Create: `frontend/src/services/resultsReleaseService.ts`
- Create: `frontend/src/services/resultsReleaseService.test.ts`

**Interfaces:**
- Consumes: Task 4 API contracts and `sharedApiClient`.
- Produces: typed policy, readiness, hold, batch, and publication methods for the admin page.

- [ ] **Step 1: Write failing service contract tests**

```typescript
it('publishes through the versioned endpoint with an idempotency key', async () => {
  requestMock.mockResolvedValue({ ok: true, data: publicationBatchResponse });
  await service.publish({ sessionId: 'SESSION-2027', universityIds: ['00000000-0000-0000-0000-000000000101'] }, 'release-key-001');
  expect(requestMock).toHaveBeenCalledWith('/api/v1/results/publication-batches/', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'release-key-001' },
    body: JSON.stringify({ sessionId: 'SESSION-2027', universityIds: ['00000000-0000-0000-0000-000000000101'] }),
  });
});
```

Cover URL encoding, query construction, policy activation, hold create/resolve, readiness mapping, pagination, conflict propagation, and network failure.

- [ ] **Step 2: Run the service test and confirm red state**

Run from `frontend/`:

```powershell
npm test -- src/services/resultsReleaseService.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Define transport and view types**

```typescript
export type ReadinessState = 'NOT_READY' | 'READY' | 'HELD' | 'PUBLISHED' | 'SUPERSEDED';
export type DecisionOutcome = 'QUALIFIED' | 'WAITLISTED' | 'FAILED';

export interface ReleaseReadinessRow {
  scoreId: string;
  candidateId: string;
  candidateName: string;
  state: ReadinessState;
  reasonCodes: string[];
  finalScore: number;
  percentile: number | null;
  outcome: DecisionOutcome | null;
}

export interface ReleaseReadiness {
  sessionId: string;
  universityId: string;
  eligibleCount: number;
  heldCount: number;
  blockedCount: number;
  publishedCount: number;
  rows: ReleaseReadinessRow[];
}

export interface PublicationBatch {
  id: string;
  sessionId: string;
  status: 'PARTIALLY_RELEASED' | 'RESULTS_RELEASED';
  eligibleCount: number;
  publishedCount: number;
  heldCount: number;
  excludedCount: number;
  publishedAt: string;
}

export interface PublicationPage {
  count: number;
  page: number;
  pageSize: number;
  results: PublicationBatch[];
}
```

- [ ] **Step 4: Implement `ResultsReleaseService`**

Use one class with injectable `ApiClient` and methods `listPolicies`, `createPolicy`, `activatePolicy`, `getReadiness`, `createHold`, `resolveHold`, `publish`, and `listPublications`. Return `Promise<ServiceResult<T>>` without throwing transport errors.

- [ ] **Step 5: Run service tests and TypeScript lint**

```powershell
npm test -- src/services/resultsReleaseService.test.ts
npm run lint
```

Expected: service tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit the frontend service**

```powershell
git add frontend/src/services/resultsReleaseService.ts frontend/src/services/resultsReleaseService.test.ts
git commit -m "feat(results): add typed release administration service"
```

---

### Task 7: Replace the Admin Results Release Mock Page

**Files:**
- Modify: `frontend/src/pages/admin/hub/ResultsRelease.tsx`
- Create: `frontend/src/pages/admin/hub/ResultsRelease.test.tsx`

**Interfaces:**
- Consumes: `resultsReleaseService` from Task 6.
- Produces: real loading, empty, readiness, held, partial-release, published, conflict, permission-denied, and retry states at `/admin/hub/results-release`.

- [ ] **Step 1: Write failing component behavior tests**

Mock only the service boundary, not browser storage or domain calculations.

Define `renderResultsRelease()` in the test file as a helper that renders `<ResultsRelease />` inside the same router/context wrappers used by other admin hub component tests. Import `serviceSuccess` from `frontend/src/services/serviceResult.ts`.

```typescript
it('loads readiness and publishes eligible candidates after confirmation', async () => {
  getReadinessMock.mockResolvedValue(serviceSuccess(readinessFixture));
  publishMock.mockResolvedValue(serviceSuccess(partialBatchFixture));
  renderResultsRelease();

  expect(await screen.findByText('Ready for release')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /release eligible results/i }));
  await userEvent.click(screen.getByRole('button', { name: /confirm publication/i }));

  expect(publishMock).toHaveBeenCalledWith(
    { sessionId: 'SESSION-2027', universityIds: ['00000000-0000-0000-0000-000000000101'] },
    expect.any(String),
  );
  expect(await screen.findByText(/published 1 result; 1 remains held/i)).toBeInTheDocument();
});
```

Also cover loading, no sessions/policies, blocker reason display, hold creation/resolution, conflict without optimistic UI mutation, permission denial, network retry, responsive table labels, focus return, Escape handling, and keyboard submission.

- [ ] **Step 2: Run the component test and confirm red state**

```powershell
npm test -- src/pages/admin/hub/ResultsRelease.test.tsx
```

Expected: assertions fail because the page still reads mock/localStorage state.

- [ ] **Step 3: Replace browser-local authority**

Remove `useMockData`, every `localStorage` read, every `any` model, fabricated notification purposes, fake contact details, and the simulated “Dispatched via SMS & Email Gateway” claim. Load policy/readiness/publication state through the service and update UI only after successful responses.

- [ ] **Step 4: Add explicit presentation states**

Use existing shared feedback components where possible. Render:

```typescript
type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; readiness: ReleaseReadiness; publications: PublicationPage }
  | { kind: 'empty'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'error'; message: string; retryable: boolean };
```

The confirmation dialog must show eligible, held, and blocked counts and state that held/blocked candidates remain private. Generate a new opaque idempotency key only when opening a fresh confirmation; reuse it for retries of the same attempted scope.

- [ ] **Step 5: Run component and related route tests**

```powershell
npm test -- src/pages/admin/hub/ResultsRelease.test.tsx src/routing/routes.test.tsx
npm run lint
npm run build
```

Expected: tests, TypeScript, and Vite build pass.

- [ ] **Step 6: Commit the real admin page**

```powershell
git add frontend/src/pages/admin/hub/ResultsRelease.tsx frontend/src/pages/admin/hub/ResultsRelease.test.tsx
git commit -m "feat(results): connect release administration page"
```

---

### Task 8: Add Browser Coverage, Architecture/Security Docs, and Core Verification

**Files:**
- Create: `frontend/e2e/results-release.spec.ts`
- Modify: `docs/architecture/BACKEND-ARCHITECTURE.md`
- Modify: `docs/architecture/DATABASE-DESIGN.md`
- Modify: `docs/security/SECURITY-BASELINE.md`
- Modify: `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`

**Interfaces:**
- Consumes: Tasks 1–7 complete core workflow.
- Produces: critical browser evidence, migration/rollback documentation, and exact verification record.

- [ ] **Step 1: Write the failing Playwright core journey**

```typescript
const systemAdmin = {
  id: 'results-release-admin',
  email: 'results.release.admin@example.test',
  firstName: 'Synthetic',
  lastName: 'Administrator',
  role: 'SYSTEM_ADMIN',
};

async function useSystemAdminSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('philsa_user', JSON.stringify(session));
  }, systemAdmin);
}

test('administrator publishes ready results while a held candidate remains private', async ({ page }) => {
  await useSystemAdminSession(page);
  await routeSyntheticReleaseApis(page);
  await page.goto('/admin/hub/results-release');
  await expect(page.getByText('Ready for release')).toBeVisible();
  await expect(page.getByText('Held')).toBeVisible();
  await page.getByRole('button', { name: /release eligible results/i }).click();
  await page.getByRole('button', { name: /confirm publication/i }).click();
  await expect(page.getByText(/published 1 result; 1 remains held/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the journey and confirm red state before fixture/server alignment**

```powershell
npm run test:e2e -- results-release.spec.ts
```

Expected: failure until the documented release API route fixtures are connected.

- [ ] **Step 3: Connect the browser fixture without production shortcuts**

Define `routeSyntheticReleaseApis(page: Page)` in the spec file to fulfill the documented readiness, publication-list, and publication POST contracts with synthetic data. Use localStorage only for the repository's existing frontend authentication fixture; never inject score, hold, policy, or publication state into browser storage. Backend authorization and persistence remain covered by focused Django API and transaction tests.

- [ ] **Step 4: Update architecture, database, and security documentation**

Document model ownership, transaction boundary, immutable snapshots, role/object scope, safe audit fields, migration rollout, destructive rollback consequences, and the deliberate exclusion of student/PDF/notification/analytics slices from this core plan.

- [ ] **Step 5: Run complete core verification**

From `backend/`:

```powershell
python manage.py check --settings=config.settings.local
python manage.py test apps.results --settings=config.settings.test
python manage.py test --settings=config.settings.test
python manage.py makemigrations --check --dry-run --settings=config.settings.local
```

From `frontend/`:

```powershell
npm test
npm run lint
npm run build
npm run test:e2e -- results-release.spec.ts
```

Expected: all relevant checks pass. Record any pre-existing failures without weakening assertions or claiming success.

- [ ] **Step 6: Rehearse the migration on PostgreSQL-compatible storage**

With a synthetic, non-production `DATABASE_URL`, run:

```powershell
python manage.py migrate --settings=config.settings.local
python manage.py check --settings=config.settings.local
python manage.py test apps.results.tests.test_results_release_publication --settings=config.settings.test
```

Expected: migration and focused transaction behavior succeed against PostgreSQL-compatible storage. If no such environment is available, record this check as skipped and keep production readiness open.

- [ ] **Step 7: Inspect the final diff and update implementation log**

Record every command, exit result, skipped check, pre-existing failure, migration identifier, API contract change, and rollback warning in `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md`.

- [ ] **Step 8: Commit final core verification artifacts**

```powershell
git add frontend/e2e/results-release.spec.ts docs/architecture/BACKEND-ARCHITECTURE.md docs/architecture/DATABASE-DESIGN.md docs/security/SECURITY-BASELINE.md docs/superpowers/p.malonzo/implement/p.malonzo.implement.md
git commit -m "test(results): verify core release workflow"
```

## Follow-Up Plan Boundaries

After this core plan passes review, create separate reviewed plans in this order:

1. `results-release-student` — `/api/v1/results/me/`, student ownership, real `ResultsPage.tsx`, and not-released states.
2. `results-release-documents-notifications` — ReportLab lock update, on-demand certificate, email delivery, disabled/configured SMS adapter, retry command, and delivery UI.
3. `results-release-analytics` — publication-snapshot aggregates, government/university scope, and real `ReportingMatrix.tsx`.

Each plan must preserve the core contracts and add its own focused backend, frontend, browser, migration, documentation, and rollback verification.
