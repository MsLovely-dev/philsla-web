# Score Release Email Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a safe student notification email after Score Management successfully releases processed examination results.

**Architecture:** Keep Score Management responsible for the release decision and notification trigger. Add a focused notification helper inside `apps.results.services` that resolves released `CandidateScore` rows to matching non-draft, non-rejected `StudentApplication` records and sends a no-score email through Django's existing email backend. Do not add a new delivery provider, dependency, frontend page, or external distribution API.

**Tech Stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, Django locmem email backend in tests, existing `settings.FRONTEND_BASE_URL`, existing Score Management release endpoint.

## Global Constraints

- Email must be sent only after `release_score_session()` succeeds.
- Email must not include raw score, final score, percentile, rank, answer content, LRN, or sensitive application data.
- Email must include only availability notice text and a Student Portal results link.
- Email is sent only to released candidates with exactly one matching non-draft, non-rejected `StudentApplication`.
- Ambiguous or missing application matches are skipped.
- Release must remain successful even if one notification send fails.
- Notification failures must be counted and returned to the caller for audit/demo visibility.
- Use Django's configured email backend; do not add dependencies.
- Tests must use Django's locmem email backend and inspect `mail.outbox`.
- Use synthetic emails in tests.

---

## Files And Responsibilities

- `backend/apps/results/services.py` - add notification dataclass/helper, call it after release, build safe email body, resolve application email/name, and return release notification counts.
- `backend/apps/results/views.py` - include notification summary in release API response.
- `backend/apps/results/tests/test_score_management_api.py` - add API-level assertions for release email behavior.
- `docs/api/API-ENDPOINTS.md` - document release notification behavior and response fields.
- `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md` - update status that student email availability notification is implemented while portal display remains separate.
- `docs/superpowers/a.depositar/implement/a.depositar.implement.md` - record implementation and verification evidence.

---

## Task 1: Add Release Email Notification Service

**Files:**
- Modify: `backend/apps/results/services.py`
- Test: `backend/apps/results/tests/test_score_management_api.py`

**Interfaces:**
- Produces: `ScoreReleaseResult(released_count: int, notification_sent_count: int, notification_skipped_count: int, notification_failed_count: int)`
- Produces: `notify_released_score_candidates(*, session: ExaminationSession, portal_url: str) -> ScoreReleaseNotificationResult`
- Changes: `release_score_session(*, session_id: str, released_by) -> ScoreReleaseResult`

- [ ] **Step 1: Write failing test that release sends safe student email**

In `backend/apps/results/tests/test_score_management_api.py`, import Django mail and add a test method to `ScoreManagementApiTests`:

```python
from django.core import mail
```

```python
    def test_release_sends_result_available_email_without_scores(self):
        score = CandidateScore.objects.get(session_id=REGULAR_SESSION_ID, candidate_id="PHL-2027-000001")
        StudentApplication.objects.create(
            owner=None,
            lrn=score.lrn,
            status=ApplicationStatus.SUBMITTED,
            submitted_at=timezone.now(),
            personal={
                "firstName": "Juan",
                "lastName": "Dela Cruz",
                "email": "juan.delacruz@example.test",
            },
            school={"lrn": score.lrn},
        )
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.post(reverse("results:score-management-release", args=[REGULAR_SESSION_ID]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["notificationSentCount"], 1)
        self.assertEqual(response.data["notificationFailedCount"], 0)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["juan.delacruz@example.test"])
        self.assertEqual(message.subject, "Your PhilSLA Examination Results Are Now Available")
        self.assertIn("Dear Juan Dela Cruz,", message.body)
        self.assertIn("Your PhilSLA examination results have been released.", message.body)
        self.assertIn("/student/results", message.body)
        self.assertNotIn(str(score.raw_score), message.body)
        self.assertNotIn(str(score.final_score), message.body)
        self.assertNotIn(str(score.overall_rank), message.body)
        self.assertNotIn(str(score.percentile), message.body)
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api.ScoreManagementApiTests.test_release_sends_result_available_email_without_scores --settings=config.settings.test
```

Expected: fails because release response has no `notificationSentCount` and no email is sent.

- [ ] **Step 3: Add result dataclasses and notification helper**

In `backend/apps/results/services.py`, add imports:

```python
from dataclasses import dataclass
from django.conf import settings
from django.core.mail import send_mail
```

The file already imports `dataclass`; only add `settings` and `send_mail`.

Add dataclasses near existing service dataclasses:

```python
@dataclass(frozen=True)
class ScoreReleaseNotificationResult:
    sent_count: int
    skipped_count: int
    failed_count: int


@dataclass(frozen=True)
class ScoreReleaseResult:
    released_count: int
    notification_sent_count: int
    notification_skipped_count: int
    notification_failed_count: int
```

Add helper:

```python
def notify_released_score_candidates(*, session: ExaminationSession, portal_url: str) -> ScoreReleaseNotificationResult:
    from apps.applications.models import ApplicationStatus, StudentApplication

    sent_count = 0
    skipped_count = 0
    failed_count = 0
    scores = CandidateScore.objects.filter(
        session=session,
        review_status=ScoreReviewStatus.APPROVED,
        release_status=ScoreReleaseStatus.RELEASED,
        overall_rank__isnull=False,
    ).order_by("candidate_id")

    for score in scores.iterator(chunk_size=1000):
        applications = list(
            StudentApplication.objects.filter(lrn=score.lrn)
            .exclude(status__in=[ApplicationStatus.DRAFT, ApplicationStatus.REJECTED])
            .order_by("-submitted_at", "-created_at")[:2]
        )
        if len(applications) != 1:
            skipped_count += 1
            continue

        application = applications[0]
        recipient_email = _application_email(application)
        if not recipient_email:
            skipped_count += 1
            continue

        try:
            send_mail(
                subject="Your PhilSLA Examination Results Are Now Available",
                message=_score_release_email_body(application=application, portal_url=portal_url),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )
        except Exception:
            failed_count += 1
        else:
            sent_count += 1

    return ScoreReleaseNotificationResult(
        sent_count=sent_count,
        skipped_count=skipped_count,
        failed_count=failed_count,
    )
```

Add helpers:

```python
def _application_email(application) -> str:
    personal = application.personal or {}
    email = personal.get("email", "")
    if isinstance(email, str):
        return email.strip()
    return ""


def _application_display_name(application) -> str:
    personal = application.personal or {}
    parts = [
        personal.get("firstName", ""),
        personal.get("middleName", ""),
        personal.get("lastName", ""),
        personal.get("suffix", ""),
    ]
    name = " ".join(part.strip() for part in parts if isinstance(part, str) and part.strip())
    return name or "Student"


def _score_release_email_body(*, application, portal_url: str) -> str:
    return (
        f"Dear {_application_display_name(application)},\n\n"
        "Your PhilSLA examination results have been released.\n\n"
        "To securely view your official results, including your score, subject breakdown, "
        "and qualification status, please log in to the Student Portal.\n\n"
        f"View Results: {portal_url}\n"
    )
```

- [ ] **Step 4: Call notification helper after release succeeds**

Change `release_score_session` return type to `ScoreReleaseResult`.

After `ScoreReleaseAuditLog.objects.create(...)`, add:

```python
    notification_result = notify_released_score_candidates(
        session=session,
        portal_url=f"{settings.FRONTEND_BASE_URL.rstrip('/')}/student/results",
    )
    return ScoreReleaseResult(
        released_count=released_count,
        notification_sent_count=notification_result.sent_count,
        notification_skipped_count=notification_result.skipped_count,
        notification_failed_count=notification_result.failed_count,
    )
```

Replace the old `return released_count`.

- [ ] **Step 5: Update release API response**

In `backend/apps/results/views.py`, change:

```python
released_count = release_score_session(session_id=session_id, released_by=request.user)
```

to:

```python
release_result = release_score_session(session_id=session_id, released_by=request.user)
```

Update the response body:

```python
{
    "id": session_id,
    "status": ScoreBatchStatus.RESULTS_RELEASED,
    "releasedCount": release_result.released_count,
    "notificationSentCount": release_result.notification_sent_count,
    "notificationSkippedCount": release_result.notification_skipped_count,
    "notificationFailedCount": release_result.notification_failed_count,
}
```

- [ ] **Step 6: Run the focused failing test**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api.ScoreManagementApiTests.test_release_sends_result_available_email_without_scores --settings=config.settings.test
```

Expected: test passes.

---

## Task 2: Cover Skip Behavior And Existing Release Regression

**Files:**
- Modify: `backend/apps/results/tests/test_score_management_api.py`

**Interfaces:**
- Consumes: `notificationSkippedCount` release response field.
- Confirms: candidates without one clear application email do not block release.

- [ ] **Step 1: Add missing-email/ambiguous-match test**

Add test method:

```python
    def test_release_skips_email_when_application_match_is_missing_or_ambiguous(self):
        score = CandidateScore.objects.get(session_id=REGULAR_SESSION_ID, candidate_id="PHL-2027-000001")
        StudentApplication.objects.create(
            owner=None,
            lrn=score.lrn,
            status=ApplicationStatus.SUBMITTED,
            submitted_at=timezone.now(),
            personal={"firstName": "First", "email": "first@example.test"},
            school={"lrn": score.lrn},
        )
        StudentApplication.objects.create(
            owner=None,
            lrn=score.lrn,
            status=ApplicationStatus.SUBMITTED,
            submitted_at=timezone.now(),
            personal={"firstName": "Second", "email": "second@example.test"},
            school={"lrn": score.lrn},
        )
        self.client.post(reverse("results:score-management-process", args=[REGULAR_SESSION_ID]), format="json")

        response = self.client.post(reverse("results:score-management-release", args=[REGULAR_SESSION_ID]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "RESULTS_RELEASED")
        self.assertEqual(response.data["notificationSentCount"], 0)
        self.assertGreaterEqual(response.data["notificationSkippedCount"], 1)
        self.assertEqual(len(mail.outbox), 0)
```

- [ ] **Step 2: Run the new test**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api.ScoreManagementApiTests.test_release_skips_email_when_application_match_is_missing_or_ambiguous --settings=config.settings.test
```

Expected: passes after Task 1 implementation.

- [ ] **Step 3: Update existing release test expectations**

In `test_release_persists_after_processing`, assert the new response fields exist:

```python
self.assertIn("notificationSentCount", response.data)
self.assertIn("notificationSkippedCount", response.data)
self.assertIn("notificationFailedCount", response.data)
```

- [ ] **Step 4: Run Score Management API tests**

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test
```

Expected: all API tests pass.

---

## Task 3: Document Release Email Behavior

**Files:**
- Modify: `docs/api/API-ENDPOINTS.md`
- Modify: `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md`
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Documents release response fields:
  - `notificationSentCount`
  - `notificationSkippedCount`
  - `notificationFailedCount`

- [ ] **Step 1: Update API release docs**

In `docs/api/API-ENDPOINTS.md`, update the Score Management release section to state:

```markdown
After a successful release, Score Management sends a no-score availability email to each released candidate with exactly one matching non-draft, non-rejected application email. The email says results are available and links to the Student Portal results page. It must not include raw score, final score, rank, percentile, LRN, answer content, or qualification details. Missing or ambiguous application matches are skipped and counted. Email send failures are counted but do not roll back the release.
```

Add response example:

```json
{
  "id": "SESSION-2027-REGULAR",
  "status": "RESULTS_RELEASED",
  "releasedCount": 188394,
  "notificationSentCount": 188000,
  "notificationSkippedCount": 394,
  "notificationFailedCount": 0
}
```

- [ ] **Step 2: Update US-SR-014 status**

In `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md`, add implemented status:

```markdown
- Student release availability email is sent after Score Management release. The email does not contain score values and links students to the Student Portal result page.
```

Keep this boundary:

```markdown
- Student Portal result display and school/government distribution remain separate downstream work.
```

- [ ] **Step 3: Update implementation log**

Append:

```markdown
## 2026-08-06 - Score release email notification

Scope:

- Added student email availability notification after successful Score Management release.
- Email links to the Student Portal results page and does not include score, rank, percentile, LRN, answer content, or qualification details.
- Missing, ambiguous, or failed email delivery is counted without rolling back the release.

Verification:

- Pending execution.
```

- [ ] **Step 4: Review docs**

Run from repo root:

```bash
Select-String -Path docs\api\API-ENDPOINTS.md,docs\superpowers\a.depositar\specs\2026-08-06-us-sr-014-score-management.md -Pattern "notificationSentCount|Student Portal result|availability email"
```

Expected: both docs mention the release notification behavior.

---

## Final Verification

Run from `backend/`:

```bash
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test
..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_seed_command apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models --settings=config.settings.test
..\venv\Scripts\python.exe manage.py check --settings=config.settings.local
```

Expected:

- Score Management API tests pass.
- Focused Score Management backend suite passes.
- Django system check reports no issues.

Run from repo root:

```bash
git diff -- backend/apps/results/services.py backend/apps/results/views.py backend/apps/results/tests/test_score_management_api.py docs/api/API-ENDPOINTS.md docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md docs/superpowers/a.depositar/implement/a.depositar.implement.md
```

Expected:

- Only release notification, response field, tests, and docs changed.
- No secrets, real emails, raw scores in email body, or unrelated refactors.

