# US-SR-014 Score Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the backend-backed Score Management workflow for US-SR-014 by adding the Exam Review handoff, Application Review result synchronization, recipient-aware publication, and audit coverage around the existing ranking, release, listing, and export behavior.

**Architecture:** Keep `apps.results` authoritative for score rows, ranking, publication state, release recipients, and Score Management audit events. Keep `apps.exam_reviews` responsible for finalizing graded reviews, then call a narrow handoff service in `apps.results` to create or lock the corresponding `CandidateScore`. Keep Application Review synchronization as a small service that writes official result display data into the existing `StudentApplication.review_step` JSON payload to avoid a broad schema redesign.

**Tech Stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, Django test runner, PostgreSQL-compatible Django models, existing `/api/v1/results/score-management/` REST namespace.

## Global Constraints

- Score Management shall be accessible only to authorized System Administrators.
- Score Management must not allow raw score or final score editing.
- Only approved or finalized Exam Review records may be forwarded to Score Management.
- Ranking and percentile computation must remain backend-owned.
- Recipient targets for publication are `STUDENTS`, `SCHOOLS`, and `GOVERNMENT`.
- External student, school, DepEd, CHED, and TESDA delivery contracts are not implemented in this plan; this plan records release intent and exposes internal state for future consumers.
- Use synthetic data in tests and seed data.
- Do not add dependencies.
- API changes require tests and documentation updates.
- Data-model changes require Django migrations and rollback notes.
- Run focused backend tests and `python manage.py check --settings=config.settings.local` before reporting completion.

---

## Files And Responsibilities

- `backend/apps/results/models.py` - add general Score Management audit events and release recipient ledger models.
- `backend/apps/results/migrations/0004_score_management_release_audit_and_recipients.py` - create the new audit and recipient tables.
- `backend/apps/results/services.py` - add Exam Review handoff, processing audit events, Application Review synchronization, recipient-aware release, export audit logging, and distribution ledger creation.
- `backend/apps/results/serializers.py` - validate release recipient payloads.
- `backend/apps/results/views.py` - pass release recipient payload to the service, include publication metadata in batch/results responses, and record export events.
- `backend/apps/results/urls.py` - add a read-only distribution summary endpoint for System Admin.
- `backend/apps/results/tests/test_score_review_handoff.py` - cover Exam Review-to-Score Management transfer and locking expectations.
- `backend/apps/results/tests/test_score_management_sync.py` - cover Application Review synchronization.
- `backend/apps/results/tests/test_score_management_publication.py` - cover recipient-aware release, publication metadata, and distribution summary.
- `backend/apps/results/tests/test_score_management_audit.py` - cover processing, failed processing, release, export, and distribution audit events.
- `backend/apps/exam_reviews/services.py` - call the results handoff service after finalizing a graded review.
- `backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py` - update release expectations so finalization creates or reuses a Score Management score row.
- `docs/api/API-ENDPOINTS.md` - document recipient-aware release payload and distribution summary response.
- `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md` - update current-status rows after implementation.
- `docs/superpowers/a.depositar/implement/a.depositar.implement.md` - record implementation and verification evidence.

---

## Task 1: Add Score Management Audit And Recipient Models

**Files:**
- Modify: `backend/apps/results/models.py`
- Create: `backend/apps/results/migrations/0004_score_management_release_audit_and_recipients.py`
- Test: `backend/apps/results/tests/test_score_management_audit.py`

**Interfaces:**
- Produces: `ScoreManagementAuditEvent.objects.create(...)`
- Produces: `ScoreReleaseRecipient.objects.create(...)`
- Produces: enum values `ScoreManagementAuditEventType.PROCESSING_STARTED`, `PROCESSING_COMPLETED`, `PROCESSING_FAILED`, `RESULTS_RELEASED`, `RESULTS_EXPORTED`, `RESULTS_DISTRIBUTED`
- Produces: enum values `ScoreReleaseRecipientType.STUDENTS`, `SCHOOLS`, `GOVERNMENT`

- [ ] **Step 1: Write failing audit model tests**

Add this test file:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.results.models import (
    ExaminationSession,
    ExaminationSessionStatus,
    ScoreBatchStatus,
    ScoreManagementAuditEvent,
    ScoreManagementAuditEventType,
    ScoreReleaseRecipient,
    ScoreReleaseRecipientStatus,
    ScoreReleaseRecipientType,
)


class ScoreManagementAuditModelTests(TestCase):
    def test_audit_event_stores_safe_metadata(self):
        user = get_user_model().objects.create_user(username="score-auditor")
        session = ExaminationSession.objects.create(
            id="SESSION-AUDIT-001",
            name="Audit Session",
            status=ExaminationSessionStatus.CLOSED,
            scoring_status=ScoreBatchStatus.READY_FOR_PROCESSING,
        )

        event = ScoreManagementAuditEvent.objects.create(
            session=session,
            event_type=ScoreManagementAuditEventType.PROCESSING_STARTED,
            actor=user,
            actor_identifier=str(user.id),
            details={"totalCandidateCount": 2, "processingBatchId": "SCORE-PROC-AUDIT"},
        )

        self.assertEqual(event.session_id, "SESSION-AUDIT-001")
        self.assertEqual(event.event_type, "PROCESSING_STARTED")
        self.assertEqual(event.details["totalCandidateCount"], 2)
        self.assertTrue(event.created_at)

    def test_release_recipient_records_target_and_status(self):
        session = ExaminationSession.objects.create(
            id="SESSION-RECIPIENT-001",
            name="Recipient Session",
            status=ExaminationSessionStatus.CLOSED,
            scoring_status=ScoreBatchStatus.RESULTS_RELEASED,
        )

        recipient = ScoreReleaseRecipient.objects.create(
            session=session,
            recipient_type=ScoreReleaseRecipientType.STUDENTS,
            status=ScoreReleaseRecipientStatus.READY,
            released_count=10,
        )

        self.assertEqual(recipient.recipient_type, "STUDENTS")
        self.assertEqual(recipient.status, "READY")
        self.assertEqual(recipient.released_count, 10)
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_audit --settings=config.settings.test
```

Expected: import failure for missing `ScoreManagementAuditEvent` and `ScoreReleaseRecipient`.

- [ ] **Step 3: Add model classes**

Append these model classes to `backend/apps/results/models.py` after `ScoreReleaseAuditLog`:

```python
class ScoreManagementAuditEventType(models.TextChoices):
    PROCESSING_STARTED = "PROCESSING_STARTED", "Processing started"
    PROCESSING_COMPLETED = "PROCESSING_COMPLETED", "Processing completed"
    PROCESSING_FAILED = "PROCESSING_FAILED", "Processing failed"
    RESULTS_RELEASED = "RESULTS_RELEASED", "Results released"
    RESULTS_EXPORTED = "RESULTS_EXPORTED", "Results exported"
    RESULTS_DISTRIBUTED = "RESULTS_DISTRIBUTED", "Results distributed"


class ScoreReleaseRecipientType(models.TextChoices):
    STUDENTS = "STUDENTS", "Students"
    SCHOOLS = "SCHOOLS", "Schools"
    GOVERNMENT = "GOVERNMENT", "Government"


class ScoreReleaseRecipientStatus(models.TextChoices):
    READY = "READY", "Ready"
    FAILED = "FAILED", "Failed"


class ScoreManagementAuditEvent(models.Model):
    session = models.ForeignKey(ExaminationSession, on_delete=models.PROTECT, related_name="score_management_audit_events")
    event_type = models.CharField(max_length=32, choices=ScoreManagementAuditEventType.choices, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="score_management_audit_events",
    )
    actor_identifier = models.CharField(max_length=80, blank=True, default="")
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["session", "-created_at"]),
            models.Index(fields=["event_type", "-created_at"]),
        ]


class ScoreReleaseRecipient(models.Model):
    session = models.ForeignKey(ExaminationSession, on_delete=models.PROTECT, related_name="release_recipients")
    recipient_type = models.CharField(max_length=16, choices=ScoreReleaseRecipientType.choices)
    status = models.CharField(max_length=16, choices=ScoreReleaseRecipientStatus.choices, default=ScoreReleaseRecipientStatus.READY)
    released_count = models.PositiveIntegerField(default=0)
    failure_reason = models.CharField(max_length=240, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["session_id", "recipient_type"]
        constraints = [
            models.UniqueConstraint(fields=("session", "recipient_type"), name="unique_score_release_recipient_per_session"),
        ]
        indexes = [
            models.Index(fields=["session", "recipient_type"]),
            models.Index(fields=["status"]),
        ]
```

- [ ] **Step 4: Create and review migration**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py makemigrations results --settings=config.settings.local
```

Expected: a new migration creating `ScoreManagementAuditEvent` and `ScoreReleaseRecipient`.

Open the generated migration and confirm:

- it depends on `("results", "0003_candidatescore_results_can_session_739f12_idx_and_more")`;
- it creates only the two new tables plus indexes and unique constraint;
- it does not alter or drop existing score tables.

- [ ] **Step 5: Run test to verify it passes**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_audit --settings=config.settings.test
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/results/models.py backend/apps/results/migrations/0004_score_management_release_audit_and_recipients.py backend/apps/results/tests/test_score_management_audit.py
git commit -m "feat: add score management audit and release recipient models"
```

---

## Task 2: Implement Exam Review To Score Management Handoff

**Files:**
- Modify: `backend/apps/results/services.py`
- Modify: `backend/apps/exam_reviews/services.py`
- Test: `backend/apps/results/tests/test_score_review_handoff.py`
- Test: `backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py`

**Interfaces:**
- Consumes: `ExamReviewRecord` with `status=FINALIZED`, `application`, `exam_set_code`, `total_score`, `max_score`
- Produces: `sync_exam_review_to_score_management(*, review: ExamReviewRecord, actor: object) -> CandidateScore`
- Produces: `resolve_or_create_score_session(*, application: StudentApplication) -> ExaminationSession`
- Produces: `resolve_or_create_exam_set(*, session: ExaminationSession, exam_set_code: str) -> ExamSet`

- [ ] **Step 1: Write failing handoff tests**

Create `backend/apps/results/tests/test_score_review_handoff.py`:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.applications.models import ApplicationStatus, StudentApplication
from apps.exam_reviews.models import ExamReviewRecord, ExamReviewStatus
from apps.results.models import CandidateScore, ScoreManagementAuditEvent, ScoreReviewStatus
from apps.results.services import sync_exam_review_to_score_management


class ScoreReviewHandoffTests(TestCase):
    def test_finalized_exam_review_creates_locked_candidate_score(self):
        user = get_user_model().objects.create_user(username="handoff-admin")
        application = StudentApplication.objects.create(
            lrn="109000000111",
            exam_cycle_id="2027",
            status=ApplicationStatus.SUBMITTED,
            personal={"firstName": "Juan", "lastName": "Dela Cruz"},
            school={"lrn": "109000000111"},
            submitted_at=timezone.now(),
        )
        review = ExamReviewRecord.objects.create(
            application=application,
            attempt_code="ATT-HANDOFF-001",
            exam_set_code="ES-BP0001-2027A",
            submitted_at=timezone.now(),
            status=ExamReviewStatus.FINALIZED,
            total_score=190,
            system_initial_score=190,
            max_score=200,
            pending_subjective_items=0,
        )

        score = sync_exam_review_to_score_management(review=review, actor=user)

        self.assertEqual(score.candidate_id, application.candidate_id)
        self.assertEqual(score.lrn, "109000000111")
        self.assertEqual(score.exam_set.code, "ES-BP0001-2027A")
        self.assertEqual(score.raw_score, 190)
        self.assertEqual(score.max_score, 200)
        self.assertEqual(float(score.final_score), 95.0)
        self.assertEqual(score.review_status, ScoreReviewStatus.APPROVED)
        self.assertIsNone(score.overall_rank)
        self.assertTrue(
            ScoreManagementAuditEvent.objects.filter(
                session=score.session,
                event_type="EXAM_REVIEW_SYNCED",
            ).exists()
        )

    def test_non_finalized_exam_review_is_not_synced(self):
        application = StudentApplication.objects.create(
            lrn="109000000112",
            exam_cycle_id="2027",
            status=ApplicationStatus.SUBMITTED,
            submitted_at=timezone.now(),
        )
        review = ExamReviewRecord.objects.create(
            application=application,
            attempt_code="ATT-HANDOFF-002",
            exam_set_code="ES-BP0002-2027A",
            submitted_at=timezone.now(),
            status=ExamReviewStatus.GRADED,
            total_score=180,
            system_initial_score=180,
            max_score=200,
            pending_subjective_items=0,
        )

        with self.assertRaisesMessage(ValueError, "only finalized exam reviews can be synchronized"):
            sync_exam_review_to_score_management(review=review, actor="SYSTEM_ADMIN")

        self.assertFalse(CandidateScore.objects.filter(candidate_id=application.candidate_id).exists())
```

The first test expects a new audit event type. In Task 1, extend `ScoreManagementAuditEventType` with `EXAM_REVIEW_SYNCED = "EXAM_REVIEW_SYNCED", "Exam review synced"` before making this test pass.

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_review_handoff --settings=config.settings.test
```

Expected: import failure for missing `sync_exam_review_to_score_management`.

- [ ] **Step 3: Add handoff service**

In `backend/apps/results/services.py`, import `Decimal` and add these functions near the persistence services:

```python
from decimal import Decimal, ROUND_HALF_UP
```

```python
@transaction.atomic
def sync_exam_review_to_score_management(*, review, actor: object) -> CandidateScore:
    from apps.exam_reviews.models import ExamReviewStatus

    if review.status != ExamReviewStatus.FINALIZED:
        raise ValueError("only finalized exam reviews can be synchronized")

    application = review.application
    session = resolve_or_create_score_session(application=application)
    exam_set = resolve_or_create_exam_set(session=session, exam_set_code=review.exam_set_code)
    candidate_name = _candidate_name_for_application(application)
    final_score = _final_score_percent(raw_score=review.total_score, max_score=review.max_score)

    score, created = CandidateScore.objects.update_or_create(
        session=session,
        candidate_id=application.candidate_id,
        defaults={
            "id": f"SCORE-{application.candidate_id}",
            "ranking_population": exam_set.ranking_population,
            "exam_set": exam_set,
            "lrn": application.lrn or application.school.get("lrn", ""),
            "candidate_name": candidate_name,
            "raw_score": review.total_score,
            "max_score": review.max_score,
            "final_score": final_score,
            "review_status": ScoreReviewStatus.APPROVED,
            "overall_rank": None,
            "percentile": None,
            "processing_batch": None,
            "processed_at": None,
            "release_status": ScoreReleaseStatus.NOT_RELEASED,
            "released_at": None,
        },
    )
    _audit_score_event(
        session=session,
        event_type="EXAM_REVIEW_SYNCED",
        actor=actor,
        details={
            "candidateId": application.candidate_id,
            "examReviewId": str(review.id),
            "created": created,
        },
    )
    return score


def resolve_or_create_score_session(*, application) -> ExaminationSession:
    session_id = application.exam_cycle_id or "UNASSIGNED-EXAM-CYCLE"
    session, _ = ExaminationSession.objects.get_or_create(
        id=session_id,
        defaults={
            "name": f"Exam Cycle {session_id}",
            "status": ExaminationSessionStatus.CLOSED,
            "scoring_status": ScoreBatchStatus.READY_FOR_PROCESSING,
        },
    )
    return session


def resolve_or_create_exam_set(*, session: ExaminationSession, exam_set_code: str) -> ExamSet:
    ranking_population, _ = RankingPopulation.objects.get_or_create(
        id=f"{session.id}-REGULAR",
        defaults={"session": session, "name": f"{session.name} - Regular"},
    )
    exam_set, _ = ExamSet.objects.get_or_create(
        id=f"{session.id}-{exam_set_code}",
        defaults={
            "session": session,
            "ranking_population": ranking_population,
            "code": exam_set_code,
        },
    )
    return exam_set


def _final_score_percent(*, raw_score: int, max_score: int) -> Decimal:
    if max_score <= 0:
        raise ValueError("max_score must be positive")
    return (Decimal(raw_score) / Decimal(max_score) * Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _candidate_name_for_application(application) -> str:
    personal = application.personal or {}
    parts = [
        personal.get("firstName", ""),
        personal.get("middleName", ""),
        personal.get("lastName", ""),
        personal.get("suffix", ""),
    ]
    name = " ".join(part for part in parts if part).strip()
    return name or application.candidate_id
```

Also add `_audit_score_event` in Task 4. For this task, implement the helper locally with the final signature:

```python
def _audit_score_event(*, session: ExaminationSession, event_type: str, actor: object, details: dict) -> None:
    from .models import ScoreManagementAuditEvent

    ScoreManagementAuditEvent.objects.create(
        session=session,
        event_type=event_type,
        actor=_user_or_none(actor),
        actor_identifier=_actor_identifier(actor),
        details=details,
    )
```

- [ ] **Step 4: Wire Exam Review release to handoff**

In `backend/apps/exam_reviews/services.py`, after saving the finalized review in `release_exam_review`, call:

```python
    from apps.results.services import sync_exam_review_to_score_management

    sync_exam_review_to_score_management(review=record, actor=actor)
```

Place the import inside the function to avoid app import cycles.

- [ ] **Step 5: Update old Exam Review test expectation**

In `backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py`, replace the old expectation that release does not create Score Management records with an expectation that one approved score row exists for the released review's application:

```python
self.assertTrue(
    CandidateScore.objects.filter(
        candidate_id=record.application.candidate_id,
        review_status=ScoreReviewStatus.APPROVED,
    ).exists()
)
```

- [ ] **Step 6: Run tests**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_review_handoff apps.exam_reviews.tests.test_exam_review_seed_and_api --settings=config.settings.test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/results/services.py backend/apps/results/tests/test_score_review_handoff.py backend/apps/exam_reviews/services.py backend/apps/exam_reviews/tests/test_exam_review_seed_and_api.py
git commit -m "feat: sync finalized exam reviews to score management"
```

---

## Task 3: Synchronize Official Results Into Application Review Display Data

**Files:**
- Modify: `backend/apps/results/services.py`
- Modify: `backend/apps/results/views.py`
- Test: `backend/apps/results/tests/test_score_management_sync.py`
- Test: `backend/apps/results/tests/test_score_management_api.py`

**Interfaces:**
- Produces: `sync_application_review_result(*, score: CandidateScore) -> bool`
- Produces: `sync_application_review_results_for_session(*, session: ExaminationSession) -> int`
- Writes `StudentApplication.review_step["officialExamResult"]`

- [ ] **Step 1: Write failing synchronization tests**

Create `backend/apps/results/tests/test_score_management_sync.py`:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationStatus, StudentApplication
from apps.results.models import CandidateScore
from apps.results.services import REGULAR_SESSION_ID, seed_score_management_data, sync_application_review_results_for_session


def principal(user, role):
    user.role = role
    user.is_authenticated = True
    user.is_active = True
    return user


class ScoreManagementApplicationSyncTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_score_management_data(candidate_count=5, seed=2027)
        cls.user = get_user_model().objects.create_user(username="score-sync-admin")

    def test_processing_writes_official_exam_result_to_matching_application(self):
        score = CandidateScore.objects.get(session_id=REGULAR_SESSION_ID, candidate_id="PHL-2027-000001")
        application = StudentApplication.objects.create(
            lrn=score.lrn,
            exam_cycle_id="2027",
            status=ApplicationStatus.SUBMITTED,
            personal={"firstName": "Alon", "lastName": "Reyes"},
            school={"lrn": score.lrn},
            submitted_at=timezone.now(),
        )

        client = APIClient()
        client.force_authenticate(user=principal(self.user, PortalRole.SYSTEM_ADMIN.value))
        response = client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        self.assertEqual(response.status_code, 202)
        application.refresh_from_db()
        official = application.review_step["officialExamResult"]
        self.assertEqual(official["candidateId"], "PHL-2027-000001")
        self.assertEqual(official["assignedExamSet"], score.exam_set_id)
        self.assertIn("finalExaminationScore", official)
        self.assertIn("percentileRank", official)
        self.assertIn("overallRank", official)
        self.assertIn("processingBatchId", official)

    def test_sync_skips_ambiguous_application_matches(self):
        score = CandidateScore.objects.get(session_id=REGULAR_SESSION_ID, candidate_id="PHL-2027-000001")
        StudentApplication.objects.create(lrn=score.lrn, exam_cycle_id="2026", status=ApplicationStatus.SUBMITTED, submitted_at=timezone.now())
        StudentApplication.objects.create(lrn=score.lrn, exam_cycle_id="2027", status=ApplicationStatus.SUBMITTED, submitted_at=timezone.now())

        synced_count = sync_application_review_results_for_session(session=score.session)

        self.assertEqual(synced_count, 0)
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_sync --settings=config.settings.test
```

Expected: import failure for missing `sync_application_review_results_for_session`.

- [ ] **Step 3: Add synchronization services**

In `backend/apps/results/services.py`, add:

```python
def sync_application_review_results_for_session(*, session: ExaminationSession) -> int:
    synced_count = 0
    scores = CandidateScore.objects.filter(
        session=session,
        review_status=ScoreReviewStatus.APPROVED,
        overall_rank__isnull=False,
        percentile__isnull=False,
    ).select_related("exam_set", "processing_batch")
    for score in scores.iterator(chunk_size=1000):
        if sync_application_review_result(score=score):
            synced_count += 1
    _audit_score_event(
        session=session,
        event_type="APPLICATION_REVIEW_SYNCED",
        actor="SYSTEM",
        details={"syncedCount": synced_count},
    )
    return synced_count


def sync_application_review_result(*, score: CandidateScore) -> bool:
    from apps.applications.models import ApplicationStatus, StudentApplication

    applications = list(
        StudentApplication.objects.filter(lrn=score.lrn)
        .exclude(status__in=[ApplicationStatus.DRAFT, ApplicationStatus.REJECTED])
        .order_by("-submitted_at", "-created_at")[:2]
    )
    if len(applications) != 1:
        return False

    application = applications[0]
    review_step = dict(application.review_step or {})
    review_step["officialExamResult"] = {
        "candidateId": score.candidate_id,
        "assignedExamSet": score.exam_set_id,
        "rawScore": score.raw_score,
        "maxScore": score.max_score,
        "finalExaminationScore": float(score.final_score),
        "percentileRank": float(score.percentile),
        "overallRank": score.overall_rank,
        "processingTimestamp": score.processed_at.isoformat() if score.processed_at else "",
        "processingBatchId": score.processing_batch_id or "",
        "publicationStatus": score.release_status,
        "releasedAt": score.released_at.isoformat() if score.released_at else "",
    }
    application.review_step = review_step
    application.save(update_fields=["review_step", "updated_at"])
    return True
```

Extend `ScoreManagementAuditEventType` with:

```python
APPLICATION_REVIEW_SYNCED = "APPLICATION_REVIEW_SYNCED", "Application review synced"
```

- [ ] **Step 4: Call synchronization after processing**

In `process_score_session`, after `session.save(...)` and before `return batch`, call:

```python
    sync_application_review_results_for_session(session=session)
```

- [ ] **Step 5: Include synchronized official result in candidate profile**

In `backend/apps/results/views.py`, add `officialExamResult` to `PROFILE_REVIEW_FIELDS`:

```python
PROFILE_REVIEW_FIELDS = ("reviewerReason", "reason", "reviewNotes", "requiredCorrections", "officialExamResult")
```

- [ ] **Step 6: Run tests**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_sync apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/results/services.py backend/apps/results/views.py backend/apps/results/tests/test_score_management_sync.py backend/apps/results/tests/test_score_management_api.py
git commit -m "feat: sync official score results to application review"
```

---

## Task 4: Add Processing, Failed Processing, Export, And Release Audit Events

**Files:**
- Modify: `backend/apps/results/models.py`
- Modify: `backend/apps/results/services.py`
- Modify: `backend/apps/results/views.py`
- Test: `backend/apps/results/tests/test_score_management_audit.py`

**Interfaces:**
- Consumes: `_audit_score_event(*, session, event_type, actor, details) -> None`
- Produces: audit events for processing started, processing completed, processing failed, results released, results exported

- [ ] **Step 1: Extend failing audit tests**

Append to `ScoreManagementAuditModelTests` or create a new test class in `backend/apps/results/tests/test_score_management_audit.py`:

```python
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.results.models import CandidateScore, ScoreManagementAuditEvent
from apps.results.services import REGULAR_SESSION_ID, seed_score_management_data


class ScoreManagementAuditEventTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_score_management_data(candidate_count=10, seed=2027)
        cls.user = get_user_model().objects.create_user(username="score-audit-admin")

    def setUp(self):
        self.client = APIClient()
        self.user.role = PortalRole.SYSTEM_ADMIN.value
        self.user.is_active = True
        self.client.force_authenticate(user=self.user)

    def test_processing_records_started_and_completed_events(self):
        response = self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        self.assertEqual(response.status_code, 202)
        event_types = list(
            ScoreManagementAuditEvent.objects.filter(session_id=REGULAR_SESSION_ID)
            .order_by("created_at")
            .values_list("event_type", flat=True)
        )
        self.assertIn("PROCESSING_STARTED", event_types)
        self.assertIn("PROCESSING_COMPLETED", event_types)

    def test_failed_processing_records_failure_event(self):
        CandidateScore.objects.filter(session_id=REGULAR_SESSION_ID).update(review_status="REJECTED")

        response = self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        self.assertEqual(response.status_code, 400)
        failure = ScoreManagementAuditEvent.objects.get(session_id=REGULAR_SESSION_ID, event_type="PROCESSING_FAILED")
        self.assertEqual(failure.details["reason"], "approved examination scores are not available")

    def test_export_records_export_event(self):
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.get(reverse("results:score-management-export", args=[REGULAR_SESSION_ID]))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            ScoreManagementAuditEvent.objects.filter(session_id=REGULAR_SESSION_ID, event_type="RESULTS_EXPORTED").exists()
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_audit --settings=config.settings.test
```

Expected: missing audit events.

- [ ] **Step 3: Add started, completed, and failed events**

In `process_score_session`, after the session is loaded and before validations that can fail on existing records, call:

```python
    _audit_score_event(
        session=session,
        event_type=ScoreManagementAuditEventType.PROCESSING_STARTED,
        actor=processed_by,
        details={"allowReprocessing": allow_reprocessing, "totalCandidateCount": session.candidate_scores.count()},
    )
```

Wrap these existing statements in `process_score_session` with `try`/`except ScoreProcessingError`: loading `records`, `_validate_score_relationships(records)`, building `session_seed`, building `seed_records`, creating `result`, creating `batch`, resetting candidate score fields, bulk updating approved scores, saving the batch, saving the session, and calling `sync_application_review_results_for_session(session=session)`.

The except block must be:

```python
    except ScoreProcessingError as exc:
        _audit_score_event(
            session=session,
            event_type=ScoreManagementAuditEventType.PROCESSING_FAILED,
            actor=processed_by,
            details={"reason": str(exc)},
        )
        raise
```

After successful bulk update and Application Review sync, call:

```python
    _audit_score_event(
        session=session,
        event_type=ScoreManagementAuditEventType.PROCESSING_COMPLETED,
        actor=processed_by,
        details={
            "processingBatchId": batch.id,
            "processedRecordCount": batch.processed_record_count,
            "excludedRecordCount": batch.excluded_record_count,
        },
    )
```

- [ ] **Step 4: Add release audit event**

In `release_score_session`, after `ScoreReleaseAuditLog.objects.create(...)`, call:

```python
    _audit_score_event(
        session=session,
        event_type=ScoreManagementAuditEventType.RESULTS_RELEASED,
        actor=released_by,
        details={
            "processingBatchId": batch.id,
            "releasedCount": released_count,
        },
    )
```

- [ ] **Step 5: Add export audit function and call it from view**

In `backend/apps/results/services.py`, add:

```python
def record_score_export(*, session_id: str, exported_by: object, exported_count: int) -> None:
    session = ExaminationSession.objects.get(id=session_id)
    _audit_score_event(
        session=session,
        event_type=ScoreManagementAuditEventType.RESULTS_EXPORTED,
        actor=exported_by,
        details={"format": "CSV", "exportedCount": exported_count},
    )
```

In `ScoreManagementBatchExportView.get`, compute `exported_count = scores.count()` before `rows()` and call:

```python
        record_score_export(session_id=session_id, exported_by=request.user, exported_count=exported_count)
```

Import `record_score_export`.

- [ ] **Step 6: Run tests**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_audit apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/results/models.py backend/apps/results/services.py backend/apps/results/views.py backend/apps/results/tests/test_score_management_audit.py
git commit -m "feat: audit score processing release and export"
```

---

## Task 5: Implement Recipient-Aware Publication

**Files:**
- Modify: `backend/apps/results/serializers.py`
- Modify: `backend/apps/results/services.py`
- Modify: `backend/apps/results/views.py`
- Modify: `backend/apps/results/urls.py`
- Test: `backend/apps/results/tests/test_score_management_publication.py`

**Interfaces:**
- Consumes request payload `{ "recipientTargets": ["STUDENTS", "SCHOOLS", "GOVERNMENT"] }`
- Produces: `release_score_session(*, session_id: str, released_by: object, recipient_targets: Sequence[str]) -> int`
- Produces: `get_release_distribution_summary(*, session_id: str) -> dict[str, object]`
- Produces endpoint `GET /api/v1/results/score-management/batches/{sessionId}/release/recipients/`

- [ ] **Step 1: Write failing publication tests**

Create `backend/apps/results/tests/test_score_management_publication.py`:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import PortalRole
from apps.results.models import ScoreManagementAuditEvent, ScoreReleaseRecipient, ScoreReleaseStatus
from apps.results.services import REGULAR_SESSION_ID, seed_score_management_data


class ScoreManagementPublicationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_score_management_data(candidate_count=20, seed=2027)
        cls.user = get_user_model().objects.create_user(username="score-release-admin")

    def setUp(self):
        self.user.role = PortalRole.SYSTEM_ADMIN.value
        self.user.is_active = True
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

    def test_release_records_selected_recipient_targets(self):
        response = self.client.post(
            reverse("results:score-management-release", args=[REGULAR_SESSION_ID]),
            {"recipientTargets": ["STUDENTS", "SCHOOLS"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "RESULTS_RELEASED")
        self.assertCountEqual(response.data["recipientTargets"], ["STUDENTS", "SCHOOLS"])
        self.assertEqual(
            set(ScoreReleaseRecipient.objects.filter(session_id=REGULAR_SESSION_ID).values_list("recipient_type", flat=True)),
            {"STUDENTS", "SCHOOLS"},
        )
        self.assertTrue(
            ScoreManagementAuditEvent.objects.filter(
                session_id=REGULAR_SESSION_ID,
                event_type="RESULTS_DISTRIBUTED",
                details__recipientTargets=["STUDENTS", "SCHOOLS"],
            ).exists()
        )

    def test_release_defaults_to_student_recipient(self):
        response = self.client.post(reverse("results:score-management-release", args=[REGULAR_SESSION_ID]), format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["recipientTargets"], ["STUDENTS"])

    def test_release_rejects_unknown_recipient_target(self):
        response = self.client.post(
            reverse("results:score-management-release", args=[REGULAR_SESSION_ID]),
            {"recipientTargets": ["PUBLIC"]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_admin_can_read_release_recipient_summary(self):
        self.client.post(
            reverse("results:score-management-release", args=[REGULAR_SESSION_ID]),
            {"recipientTargets": ["STUDENTS", "GOVERNMENT"]},
            format="json",
        )

        response = self.client.get(reverse("results:score-management-release-recipients", args=[REGULAR_SESSION_ID]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["sessionId"], REGULAR_SESSION_ID)
        self.assertCountEqual(
            [recipient["recipientType"] for recipient in response.data["recipients"]],
            ["STUDENTS", "GOVERNMENT"],
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_publication --settings=config.settings.test
```

Expected: serializer/view/service failures for missing recipient support and summary endpoint.

- [ ] **Step 3: Add release serializer**

In `backend/apps/results/serializers.py`, add:

```python
class ScoreReleaseRequestSerializer(serializers.Serializer):
    recipientTargets = serializers.ListField(
        child=serializers.ChoiceField(choices=("STUDENTS", "SCHOOLS", "GOVERNMENT")),
        default=["STUDENTS"],
        allow_empty=False,
        required=False,
    )

    def validate_recipientTargets(self, value):
        deduped = list(dict.fromkeys(value))
        return deduped
```

- [ ] **Step 4: Extend release service**

Change `release_score_session` signature:

```python
def release_score_session(*, session_id: str, released_by, recipient_targets: Sequence[str] = ("STUDENTS",)) -> int:
```

After `released_count` is computed, create recipient rows:

```python
    ScoreReleaseRecipient.objects.filter(session=session).delete()
    recipients = [
        ScoreReleaseRecipient(
            session=session,
            recipient_type=target,
            status=ScoreReleaseRecipientStatus.READY,
            released_count=released_count,
        )
        for target in recipient_targets
    ]
    ScoreReleaseRecipient.objects.bulk_create(recipients)
    _audit_score_event(
        session=session,
        event_type=ScoreManagementAuditEventType.RESULTS_DISTRIBUTED,
        actor=released_by,
        details={
            "recipientTargets": list(recipient_targets),
            "distributedCount": released_count,
            "failureCount": 0,
        },
    )
```

Import `ScoreReleaseRecipient`, `ScoreReleaseRecipientStatus`, and `ScoreManagementAuditEventType`.

- [ ] **Step 5: Add distribution summary service**

In `backend/apps/results/services.py`, add:

```python
def get_release_distribution_summary(*, session_id: str) -> dict[str, object]:
    session = ExaminationSession.objects.get(id=session_id)
    recipients = [
        {
            "recipientType": row.recipient_type,
            "status": row.status,
            "releasedCount": row.released_count,
            "failureReason": row.failure_reason,
            "createdAt": row.created_at.isoformat(),
        }
        for row in session.release_recipients.order_by("recipient_type")
    ]
    return {"sessionId": session.id, "status": session.scoring_status, "recipients": recipients}
```

- [ ] **Step 6: Wire views and URL**

In `backend/apps/results/views.py`:

- import `ScoreReleaseRequestSerializer`;
- import `get_release_distribution_summary`;
- validate request payload in `ScoreManagementBatchReleaseView.post`;
- pass `recipient_targets=serializer.validated_data["recipientTargets"]`;
- include `"recipientTargets"` in the response;
- add `ScoreManagementReleaseRecipientSummaryView`.

Use this view:

```python
class ScoreManagementReleaseRecipientSummaryView(ScoreManagementBaseView):
    def get(self, request, session_id: str) -> Response:
        try:
            summary = get_release_distribution_summary(session_id=session_id)
        except ExaminationSession.DoesNotExist as exc:
            raise NotFound("Examination session not found.") from exc
        return Response(summary)
```

In `backend/apps/results/urls.py`, add:

```python
path(
    "score-management/batches/<str:session_id>/release/recipients/",
    ScoreManagementReleaseRecipientSummaryView.as_view(),
    name="score-management-release-recipients",
),
```

- [ ] **Step 7: Run tests**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_publication apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/results/serializers.py backend/apps/results/services.py backend/apps/results/views.py backend/apps/results/urls.py backend/apps/results/tests/test_score_management_publication.py
git commit -m "feat: add recipient aware score release"
```

---

## Task 6: Surface Publication Metadata In Score Management API

**Files:**
- Modify: `backend/apps/results/views.py`
- Test: `backend/apps/results/tests/test_score_management_api.py`

**Interfaces:**
- Produces batch fields `releasedAt`, `releasedBy`, `releasedCount`, `recipientTargets`
- Produces score fields `releasedAt`

- [ ] **Step 1: Write failing API assertions**

In `test_release_persists_after_processing`, after release response assertions, fetch batch list and assert:

```python
batches = self.client.get(reverse("results:score-management-batches"))
batch = next(row for row in batches.data["results"] if row["id"] == REGULAR_SESSION_ID)
self.assertEqual(batch["status"], "RESULTS_RELEASED")
self.assertIsNotNone(batch["releasedAt"])
self.assertTrue(batch["releasedBy"])
self.assertEqual(batch["releasedCount"], 114)
self.assertEqual(batch["recipientTargets"], ["STUDENTS"])
```

In `test_results_can_filter_by_release_status`, after releasing the batch, fetch one released row and assert:

```python
self.assertIsNotNone(response.data["results"][0]["releasedAt"])
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: missing response fields.

- [ ] **Step 3: Add latest release annotations**

In `ScoreManagementBatchListView.get`, add subqueries for the latest `ScoreReleaseAuditLog` and prefetch recipient rows. The serialized batch should include:

```python
"releasedAt": latest_released_at.isoformat() if latest_released_at else None,
"releasedBy": latest_released_by,
"releasedCount": released_count,
"recipientTargets": [recipient.recipient_type for recipient in session.release_recipients.all()],
```

Use `prefetch_related("release_recipients")` so the batch list does not add one query per session.

- [ ] **Step 4: Add score release timestamp**

In `_serialize_score`, add:

```python
"releasedAt": score.released_at.isoformat() if score.released_at else None,
```

- [ ] **Step 5: Run tests**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/results/views.py backend/apps/results/tests/test_score_management_api.py
git commit -m "feat: expose score publication metadata"
```

---

## Task 7: Update API Documentation And Product Spec Status

**Files:**
- Modify: `docs/api/API-ENDPOINTS.md`
- Modify: `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md`
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Documents release payload `{ "recipientTargets": ["STUDENTS"] }`
- Documents release recipient summary endpoint
- Documents implemented and remaining boundaries after Tasks 1-6

- [ ] **Step 1: Update API endpoint table**

In `docs/api/API-ENDPOINTS.md`, add a row after the release endpoint:

```markdown
| `GET` | `/api/v1/results/score-management/batches/{sessionId}/release/recipients/` | Bearer token | `SYSTEM_ADMIN` | Return selected release recipient targets and delivery ledger status for a released score batch | Implemented |
```

- [ ] **Step 2: Update release endpoint docs**

Replace the release paragraph with:

```markdown
`POST /api/v1/results/score-management/batches/{sessionId}/release/` is allowed only after processing. It accepts an optional `recipientTargets` array containing `STUDENTS`, `SCHOOLS`, and/or `GOVERNMENT`; if omitted, it defaults to `["STUDENTS"]`. The endpoint marks processed approved scores as `RELEASED`, updates the session status to `RESULTS_RELEASED`, records release and Score Management audit rows, and creates internal recipient ledger rows. External student portal, school, and government delivery contracts are owned by downstream modules and are not called by this endpoint.
```

Add response example:

```json
{
  "id": "SESSION-2027-REGULAR",
  "status": "RESULTS_RELEASED",
  "releasedCount": 188394,
  "recipientTargets": ["STUDENTS", "SCHOOLS"]
}
```

- [ ] **Step 3: Document recipient summary**

Add:

```markdown
`GET /api/v1/results/score-management/batches/{sessionId}/release/recipients/` returns the internal recipient ledger for the selected score batch:

```json
{
  "sessionId": "SESSION-2027-REGULAR",
  "status": "RESULTS_RELEASED",
  "recipients": [
    {
      "recipientType": "STUDENTS",
      "status": "READY",
      "releasedCount": 188394,
      "failureReason": "",
      "createdAt": "2026-08-06T10:30:00+00:00"
    }
  ]
}
```
```

- [ ] **Step 4: Update product spec current status**

In `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md`, move these from partial to implemented:

- Exam Review finalization creates or reuses Score Management rows.
- Application Review display payload receives official exam result data.
- Publication records selected recipient targets in an internal ledger.
- Processing, release, export, synchronization, and distribution audit events are recorded.

Keep this future boundary explicit:

```markdown
External delivery to Student Portal, schools, DepEd, CHED, and TESDA remains owned by downstream Results Release and System Integration contracts.
```

- [ ] **Step 5: Update implementation log**

Append a section to `docs/superpowers/a.depositar/implement/a.depositar.implement.md`:

```markdown
## 2026-08-06 - US-SR-014 Score Management implementation plan

Plan: `docs/superpowers/a.depositar/plans/2026-08-06-us-sr-014-score-management-implementation.md`

Scope prepared:

- Exam Review-to-Score Management handoff.
- Application Review official result synchronization.
- Recipient-aware Score Management publication.
- Score Management audit events for processing, failure, release, export, synchronization, and distribution.
- API documentation updates.

Execution status: plan prepared; code implementation pending approval.
```

- [ ] **Step 6: Run documentation review commands**

Run from repo root:

```bash
Select-String -Path docs\api\API-ENDPOINTS.md,docs\superpowers\a.depositar\specs\2026-08-06-us-sr-014-score-management.md -Pattern "recipientTargets|release/recipients|External delivery"
git diff -- docs\api\API-ENDPOINTS.md docs\superpowers\a.depositar\specs\2026-08-06-us-sr-014-score-management.md docs\superpowers\a.depositar\implement\a.depositar.implement.md
```

Expected: docs mention recipient targets, recipient summary endpoint, and external delivery boundary.

- [ ] **Step 7: Commit**

```bash
git add docs/api/API-ENDPOINTS.md docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md docs/superpowers/a.depositar/implement/a.depositar.implement.md
git commit -m "docs: update score management release contract"
```

---

## Final Verification

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py check --settings=config.settings.local
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_models apps.results.tests.test_score_management_seed_command apps.results.tests.test_score_management_api apps.results.tests.test_score_review_handoff apps.results.tests.test_score_management_sync apps.results.tests.test_score_management_audit apps.results.tests.test_score_management_publication apps.exam_reviews.tests.test_exam_review_seed_and_api --settings=config.settings.test
```

Expected:

- Django system check reports no issues.
- Focused Score Management and Exam Review handoff tests pass.
- No migration prompts remain.

Run from repo root:

```bash
git status --short
git diff --stat
```

Expected:

- Only planned files are modified or added, plus migration files generated by Task 1.
- No unrelated frontend, settings, or dependency changes are introduced.

## Rollback Notes

- If Task 1 migration has not been applied to a shared database, rollback is deleting the migration and reverting model/test changes.
- If Task 1 migration has been applied locally, rollback is `..\venv\Scripts\python.exe manage.py migrate results 0003 --settings=config.settings.local`, then revert the related files.
- In a shared or production database, prefer forward recovery with a reviewed corrective migration instead of dropping audit or recipient tables that may contain release evidence.

## Coverage Map

- AC-01, AC-09: Task 2 creates the Exam Review handoff and resets rank/release fields when a finalized score is synced.
- AC-02, AC-03, AC-05, AC-06, AC-10: existing Score Management tests remain in the final verification suite.
- AC-04, BR-07: Task 3 synchronizes official result data to Application Review display payload.
- AC-07, BR-09: Task 5 records selected recipient targets during release.
- AC-08, BR-10: Task 6 exposes publication metadata in the admin API.
- BR-12 and audit events: Tasks 1, 4, and 5 add audit event storage and event writes.
