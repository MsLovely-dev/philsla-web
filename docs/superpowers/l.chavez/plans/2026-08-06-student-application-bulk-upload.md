# Student Application Bulk Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CSV-only bulk upload for student applications in Review Applications, with validation-first import, durable batch/row results, reviewer confirmation, and pending student completion safeguards.

**Architecture:** Extend `apps.applications` because bulk upload creates `StudentApplication` records and belongs to the existing admissions review boundary. Put parsing, validation, conflict checks, confirmation, and CSV rendering in a new backend service module so DRF views stay thin; expose frontend calls through `backendApplicationService` and keep UI state inside `ReviewApplications`.

**Tech Stack:** Django 5.2, Django REST Framework 3.16, PostgreSQL-compatible models, React 19, TypeScript 5.8, Vite 6, Vitest, React Testing Library.

## Global Constraints

- Feature route is `/admin/reviewer/applications`.
- API routes are under `/api/v1/applications/bulk-upload/`.
- Allowed roles are `ADMISSIONS_REVIEWER` and `SYSTEM_ADMIN`.
- CSV only for version 1.
- Do not upload selfie, Student ID, or document files.
- Validate the CSV before import.
- Require reviewer confirmation before creating applications.
- Store durable batch and row-level validation/import results.
- Skip duplicate or conflicting rows while importing valid rows.
- Create imported records as `status = SUBMITTED`.
- Add `completionStatus = PENDING_STUDENT_COMPLETION`.
- Add `submissionSource = ADMISSIONS_BULK_UPLOAD`.
- Keep Student account creation only after admissions approval.
- Block approval while `completionStatus = PENDING_STUDENT_COMPLETION`.
- Do not log CSV row personal data in request logs, audit payloads, or telemetry.
- Do not silently ignore unknown CSV columns.
- Active exam cycle comes from `settings.ACTIVE_EXAM_CYCLE_ID`.

---

### Task 1: Application Metadata And Bulk Upload Models

**Files:**
- Modify: `backend/apps/applications/models.py`
- Modify: `backend/apps/applications/admin.py`
- Create: `backend/apps/applications/migrations/0014_bulk_upload_application_metadata.py`
- Test: `backend/apps/applications/tests/test_bulk_upload_models.py`

**Interfaces:**
- Produces: `ApplicationCompletionStatus`, `ApplicationSubmissionSource`, `BulkUploadBatchStatus`, `BulkUploadRowStatus`.
- Produces: `StudentApplication.completion_status`, `submission_source`, `submitted_by_user`, `bulk_upload_batch`, `bulk_upload_row_number`.
- Produces: `ApplicationBulkUploadBatch` and `ApplicationBulkUploadRowResult`.

- [ ] **Step 1: Write failing model tests**

Add `backend/apps/applications/tests/test_bulk_upload_models.py`:

```python
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.accounts.roles import PortalRole
from apps.applications.models import (
    ApplicationBulkUploadBatch,
    ApplicationBulkUploadRowResult,
    ApplicationCompletionStatus,
    ApplicationStatus,
    ApplicationSubmissionSource,
    BulkUploadBatchStatus,
    BulkUploadRowStatus,
    StudentApplication,
)


class BulkUploadModelTests(TestCase):
    def test_application_metadata_defaults_to_student_registration(self):
        application = StudentApplication.objects.create(status=ApplicationStatus.SUBMITTED)

        self.assertEqual(application.completion_status, ApplicationCompletionStatus.COMPLETE)
        self.assertEqual(application.submission_source, ApplicationSubmissionSource.STUDENT_REGISTRATION)
        self.assertIsNone(application.submitted_by_user_id)
        self.assertIsNone(application.bulk_upload_batch_id)
        self.assertIsNone(application.bulk_upload_row_number)

    def test_bulk_upload_batch_and_row_result_store_validation_state(self):
        uploader = get_user_model().objects.create_user(username="reviewer", email="reviewer@example.test")
        batch = ApplicationBulkUploadBatch.objects.create(
            template_version="2026-08-06.v1",
            exam_cycle_id="2026",
            status=BulkUploadBatchStatus.VALIDATED,
            uploaded_by_user=uploader,
            performed_by_role_snapshot=PortalRole.ADMISSIONS_REVIEWER.value,
            expires_at=timezone.now(),
            summary_counts={"totalRows": 1, "validRows": 0, "failedRows": 1, "conflictRows": 0, "fieldErrorRows": 1},
        )

        row = ApplicationBulkUploadRowResult.objects.create(
            batch=batch,
            row_number=2,
            status=BulkUploadRowStatus.FIELD_ERROR,
            submitted_lrn="123",
            submitted_email="student@example.test",
            row_snapshot={"firstName": ""},
            errors=[{"field": "firstName", "submittedValue": "", "code": "required", "reason": "First name is required."}],
        )

        self.assertEqual(str(batch.id), batch.public_id)
        self.assertEqual(row.errors[0]["field"], "firstName")
```

- [ ] **Step 2: Run model tests to verify RED**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_models --settings=config.settings.test`

Expected: FAIL because the metadata choices and bulk upload models do not exist.

- [ ] **Step 3: Add model fields and choices**

In `backend/apps/applications/models.py`, add:

```python
class ApplicationCompletionStatus(models.TextChoices):
    COMPLETE = "COMPLETE", "Complete"
    PENDING_STUDENT_COMPLETION = "PENDING_STUDENT_COMPLETION", "Pending student completion"


class ApplicationSubmissionSource(models.TextChoices):
    STUDENT_REGISTRATION = "STUDENT_REGISTRATION", "Student registration"
    ADMISSIONS_BULK_UPLOAD = "ADMISSIONS_BULK_UPLOAD", "Admissions bulk upload"
```

Add fields to `StudentApplication`:

```python
completion_status = models.CharField(
    max_length=40,
    choices=ApplicationCompletionStatus.choices,
    default=ApplicationCompletionStatus.COMPLETE,
)
submission_source = models.CharField(
    max_length=40,
    choices=ApplicationSubmissionSource.choices,
    default=ApplicationSubmissionSource.STUDENT_REGISTRATION,
)
submitted_by_user = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.PROTECT,
    related_name="submitted_bulk_applications",
    null=True,
    blank=True,
)
bulk_upload_batch = models.ForeignKey(
    "ApplicationBulkUploadBatch",
    on_delete=models.PROTECT,
    related_name="imported_applications",
    null=True,
    blank=True,
)
bulk_upload_row_number = models.PositiveIntegerField(null=True, blank=True)
```

Add models:

```python
class BulkUploadBatchStatus(models.TextChoices):
    UPLOADED = "UPLOADED", "Uploaded"
    VALIDATING = "VALIDATING", "Validating"
    VALIDATED = "VALIDATED", "Validated"
    CONFIRMING = "CONFIRMING", "Confirming"
    COMPLETED = "COMPLETED", "Completed"
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS", "Completed with errors"
    EXPIRED = "EXPIRED", "Expired"
    FAILED = "FAILED", "Failed"


class BulkUploadRowStatus(models.TextChoices):
    VALID = "VALID", "Valid"
    FIELD_ERROR = "FIELD_ERROR", "Field error"
    CONFLICT = "CONFLICT", "Conflict"
    IMPORTED = "IMPORTED", "Imported"
    IMPORT_FAILED = "IMPORT_FAILED", "Import failed"


class ApplicationBulkUploadBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template_version = models.CharField(max_length=40)
    exam_cycle_id = models.CharField(max_length=64)
    status = models.CharField(max_length=40, choices=BulkUploadBatchStatus.choices, default=BulkUploadBatchStatus.UPLOADED)
    uploaded_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="application_bulk_upload_batches")
    performed_by_role_snapshot = models.CharField(max_length=80)
    expires_at = models.DateTimeField()
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    summary_counts = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def public_id(self) -> str:
        return str(self.id)


class ApplicationBulkUploadRowResult(models.Model):
    batch = models.ForeignKey(ApplicationBulkUploadBatch, on_delete=models.CASCADE, related_name="row_results")
    row_number = models.PositiveIntegerField()
    status = models.CharField(max_length=40, choices=BulkUploadRowStatus.choices)
    application = models.ForeignKey(StudentApplication, null=True, blank=True, on_delete=models.SET_NULL, related_name="bulk_upload_row_results")
    submitted_lrn = models.CharField(max_length=12, blank=True, default="")
    submitted_email = models.EmailField(blank=True, default="")
    row_snapshot = models.JSONField(default=dict, blank=True)
    errors = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["row_number", "id"]
        constraints = [
            models.UniqueConstraint(fields=("batch", "row_number"), name="unique_bulk_upload_row_number_per_batch"),
        ]
```

- [ ] **Step 4: Add migration and admin registration**

Create the migration with the fields and models above. Register `ApplicationBulkUploadBatch` and `ApplicationBulkUploadRowResult` in `admin.py` with list displays that avoid printing row personal data.

- [ ] **Step 5: Run tests to verify GREEN**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_models --settings=config.settings.test`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add backend/apps/applications/models.py backend/apps/applications/admin.py backend/apps/applications/migrations/0014_bulk_upload_application_metadata.py backend/apps/applications/tests/test_bulk_upload_models.py
git commit -m "feat: add application bulk upload metadata models"
```

### Task 2: CSV Template, Validation Service, And Durable Row Results

**Files:**
- Create: `backend/apps/applications/bulk_upload.py`
- Modify: `backend/apps/applications/tests/test_bulk_upload_models.py`
- Test: `backend/apps/applications/tests/test_bulk_upload_service.py`

**Interfaces:**
- Consumes: models from Task 1.
- Produces: `BULK_UPLOAD_TEMPLATE_VERSION = "2026-08-06.v1"`.
- Produces: `BULK_UPLOAD_COLUMNS`, `build_bulk_upload_template_csv()`, `validate_bulk_upload_csv(uploaded_file, actor)`.
- Produces validation response keys: `batchId`, `status`, `totalRows`, `validRows`, `failedRows`, `conflictRows`, `fieldErrorRows`, `canConfirm`.

- [ ] **Step 1: Write failing service tests**

Create `backend/apps/applications/tests/test_bulk_upload_service.py` with tests for template headers, valid CSV validation, missing required fields, invalid LRN, invalid date, incomplete preference pair, duplicate LRN/email, existing application conflicts, existing account conflicts, and unknown columns.

Use this helper:

```python
import csv
from io import StringIO
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from apps.accounts.models import AccountProfile
from apps.accounts.roles import PortalRole
from apps.applications.bulk_upload import BULK_UPLOAD_COLUMNS, BULK_UPLOAD_TEMPLATE_VERSION, build_bulk_upload_template_csv, validate_bulk_upload_csv
from apps.applications.models import ApplicationBulkUploadBatch, ApplicationBulkUploadRowResult, ApplicationStatus, BulkUploadRowStatus, StudentApplication


def actor(user, role=PortalRole.ADMISSIONS_REVIEWER.value):
    return SimpleNamespace(id=user.id, user_id=user.id, role=role, is_authenticated=True, is_active=True)


def csv_file(rows):
    stream = StringIO()
    writer = csv.DictWriter(stream, fieldnames=BULK_UPLOAD_COLUMNS)
    writer.writeheader()
    for row in rows:
        writer.writerow({column: row.get(column, "") for column in BULK_UPLOAD_COLUMNS})
    return SimpleUploadedFile("bulk.csv", stream.getvalue().encode("utf-8"), content_type="text/csv")


def valid_row(**overrides):
    row = {
        "templateVersion": BULK_UPLOAD_TEMPLATE_VERSION,
        "firstName": "Bulk",
        "middleName": "",
        "lastName": "Learner",
        "suffix": "",
        "dateOfBirth": "2008-05-15",
        "sex": "Female",
        "email": "bulk.student@example.test",
        "mobile": "09171234567",
        "region": "Region IV-A",
        "province": "Batangas",
        "city": "Batangas City",
        "barangay": "Poblacion",
        "street": "Test Street",
        "postalCode": "4200",
        "lrn": "123456789012",
        "schoolId": "301234",
        "schoolName": "Test School",
        "academicTrack": "STEM",
        "gradeLevel": "Grade 12",
        "enrollmentStatus": "Enrolled",
        "schoolYear": "2026-2027",
        "gwa": "92.5",
        "firstChoiceUniversity": "UP Diliman",
        "firstChoiceCourse": "BS Physics",
        "secondChoiceUniversity": "",
        "secondChoiceCourse": "",
        "thirdChoiceUniversity": "",
        "thirdChoiceCourse": "",
        "privacyConsent": "true",
        "declarationAccepted": "true",
    }
    row.update(overrides)
    return row
```

One required assertion:

```python
class BulkUploadServiceTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="reviewer", email="reviewer@example.test")
        self.actor = actor(self.user)

    def test_reviewer_can_validate_a_correct_csv(self):
        result = validate_bulk_upload_csv(uploaded_file=csv_file([valid_row()]), actor=self.actor)

        self.assertEqual(result["status"], "VALIDATED")
        self.assertEqual(result["validRows"], 1)
        self.assertTrue(result["canConfirm"])
        self.assertEqual(ApplicationBulkUploadBatch.objects.count(), 1)
        self.assertEqual(ApplicationBulkUploadRowResult.objects.get().status, BulkUploadRowStatus.VALID)
```

- [ ] **Step 2: Run service tests to verify RED**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_service --settings=config.settings.test`

Expected: FAIL because `apps.applications.bulk_upload` does not exist.

- [ ] **Step 3: Implement parsing and validation**

In `bulk_upload.py`, use Python `csv.DictReader` over decoded UTF-8 text. Reject non-CSV filenames/content types, empty files, headers that differ from `BULK_UPLOAD_COLUMNS`, stale `templateVersion`, unknown columns, missing required fields, invalid `YYYY-MM-DD`, invalid 12-digit LRN, invalid email via Django email validation, false consent/declaration values, and incomplete second/third preference pairs.

Normalize email to lowercase and trim all strings. Store only row snapshots and row errors in the row result table; do not write log messages containing row values.

- [ ] **Step 4: Implement conflict checks**

Within validation, classify these as `CONFLICT` row errors:

```python
StudentApplication.objects.filter(
    lrn=lrn,
    exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID,
).exclude(status=ApplicationStatus.REJECTED).exists()
```

Check existing application email through `personal_info__email__iexact`. Check existing account email through `get_user_model().objects.filter(email__iexact=email).exists()` and `AccountProfile.objects.filter(lrn=lrn, role=PortalRole.STUDENT.value).exists()` when LRN is non-blank.

- [ ] **Step 5: Run service tests to verify GREEN**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_service --settings=config.settings.test`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add backend/apps/applications/bulk_upload.py backend/apps/applications/tests/test_bulk_upload_service.py
git commit -m "feat: validate student application bulk upload csv"
```

### Task 3: Bulk Upload API Endpoints

**Files:**
- Modify: `backend/apps/applications/serializers.py`
- Modify: `backend/apps/applications/views.py`
- Modify: `backend/apps/applications/urls.py`
- Test: `backend/apps/applications/tests/test_bulk_upload_endpoints.py`

**Interfaces:**
- Consumes: `build_bulk_upload_template_csv()` and `validate_bulk_upload_csv()` from Task 2.
- Produces: endpoint names `bulk-upload-template`, `bulk-upload-validate`, `bulk-upload-detail`, `bulk-upload-errors`, `bulk-upload-confirm`.

- [ ] **Step 1: Write failing endpoint tests**

Create tests for reviewer template download, reviewer validation, system admin validation, student denial, unauthenticated denial, batch detail, error CSV, and confirm placeholder response returning `409` until Task 4 implements confirmation.

Core examples:

```python
response = self.client.get(reverse("applications:bulk-upload-template"))
self.assertEqual(response.status_code, 200)
self.assertEqual(response["Content-Type"], "text/csv")
self.assertIn("templateVersion,firstName", response.content.decode())
```

```python
response = self.client.post(reverse("applications:bulk-upload-validate"), {"file": csv_file([valid_row()])}, format="multipart")
self.assertEqual(response.status_code, 200)
self.assertEqual(response.data["validRows"], 1)
self.assertTrue(response.data["canConfirm"])
```

- [ ] **Step 2: Run endpoint tests to verify RED**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_endpoints --settings=config.settings.test`

Expected: FAIL because URLs/views do not exist.

- [ ] **Step 3: Add serializers and views**

Add serializers:

```python
class BulkUploadValidateSerializer(serializers.Serializer):
    file = serializers.FileField()


class BulkUploadBatchSerializer(serializers.ModelSerializer):
    batchId = serializers.CharField(source="public_id", read_only=True)
    totalRows = serializers.SerializerMethodField()
    validRows = serializers.SerializerMethodField()
    failedRows = serializers.SerializerMethodField()
    conflictRows = serializers.SerializerMethodField()
    fieldErrorRows = serializers.SerializerMethodField()
    canConfirm = serializers.SerializerMethodField()
```

Add API views with `RoleRequiredPermission` and `require_roles(PortalRole.ADMISSIONS_REVIEWER, PortalRole.SYSTEM_ADMIN)`. Use `FileResponse` or `HttpResponse` with `text/csv` for template/errors.

- [ ] **Step 4: Wire URLs before application-id UUID routes**

Add paths before `"<uuid:application_id>/..."`:

```python
path("bulk-upload/template/", BulkUploadTemplateView.as_view(), name="bulk-upload-template"),
path("bulk-upload/validate/", BulkUploadValidateView.as_view(), name="bulk-upload-validate"),
path("bulk-upload/<uuid:batch_id>/", BulkUploadBatchDetailView.as_view(), name="bulk-upload-detail"),
path("bulk-upload/<uuid:batch_id>/errors.csv", BulkUploadErrorsCsvView.as_view(), name="bulk-upload-errors"),
path("bulk-upload/<uuid:batch_id>/confirm/", BulkUploadConfirmView.as_view(), name="bulk-upload-confirm"),
```

- [ ] **Step 5: Run endpoint tests to verify GREEN for template, validate, detail, errors, and denial**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_endpoints --settings=config.settings.test`

Expected: PASS for implemented endpoints; confirmation tests should expect the Task 3 placeholder behavior.

- [ ] **Step 6: Commit**

Run:

```bash
git add backend/apps/applications/serializers.py backend/apps/applications/views.py backend/apps/applications/urls.py backend/apps/applications/tests/test_bulk_upload_endpoints.py
git commit -m "feat: expose application bulk upload validation endpoints"
```

### Task 4: Transactional Confirmation And Approval Blocking

**Files:**
- Modify: `backend/apps/applications/bulk_upload.py`
- Modify: `backend/apps/applications/services.py`
- Modify: `backend/apps/applications/views.py`
- Test: `backend/apps/applications/tests/test_bulk_upload_endpoints.py`
- Test: `backend/apps/applications/tests/test_bulk_upload_service.py`

**Interfaces:**
- Consumes: valid row snapshots from Task 2.
- Produces: `confirm_bulk_upload_batch(batch_id, actor)` returning the same summary shape plus imported/rejected counts.
- Produces: `ApplicationConflict("Student completion is pending for this bulk-uploaded application.")` when approval is attempted on pending completion.

- [ ] **Step 1: Write failing confirmation tests**

Add tests proving:

```python
response = self.client.post(reverse("applications:bulk-upload-confirm", args=[batch_id]))
self.assertEqual(response.status_code, 200)
self.assertEqual(StudentApplication.objects.count(), 1)
application = StudentApplication.objects.get()
self.assertEqual(application.status, ApplicationStatus.SUBMITTED)
self.assertEqual(application.completion_status, ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION)
self.assertEqual(application.submission_source, ApplicationSubmissionSource.ADMISSIONS_BULK_UPLOAD)
self.assertEqual(application.owner_id, None)
self.assertEqual(application.submitted_by_user_id, self.reviewer.id)
self.assertEqual(application.bulk_upload_row_number, 2)
```

Add tests for importing only valid rows, final conflict recheck, idempotent repeated confirm, and denial when a different reviewer owns the batch while `SYSTEM_ADMIN` can read/confirm.

- [ ] **Step 2: Write failing approval-blocking test**

In `test_application_endpoints.py` or `test_bulk_upload_endpoints.py`, create a `SUBMITTED` application with `completion_status=PENDING_STUDENT_COMPLETION`, authenticate as admissions reviewer, approve it, and assert:

```python
self.assertEqual(response.status_code, 409)
self.assertIn("Student completion is pending", response.data["error"]["message"])
```

- [ ] **Step 3: Run tests to verify RED**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_endpoints apps.applications.tests.test_application_endpoints --settings=config.settings.test`

Expected: FAIL because confirmation and approval blocking are missing.

- [ ] **Step 4: Implement confirmation**

In `confirm_bulk_upload_batch`, lock the batch with `select_for_update()`, reject expired/failed/wrong-owner states, return the existing summary without creating rows when already completed, and process each `VALID` row in deterministic row-number order. For each row, recheck LRN/email conflicts inside `transaction.atomic()`. Newly conflicting rows become `CONFLICT`; valid rows create `StudentApplication` with:

```python
status=ApplicationStatus.SUBMITTED
completion_status=ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION
submission_source=ApplicationSubmissionSource.ADMISSIONS_BULK_UPLOAD
submitted_by_user_id=getattr(actor, "user_id", getattr(actor, "id", None))
bulk_upload_batch=batch
bulk_upload_row_number=row_result.row_number
submitted_at=timezone.now()
exam_cycle_id=settings.ACTIVE_EXAM_CYCLE_ID
owner=None
password_hash=""
```

Set `personal`, `address`, `school`, `course_preferences`, and `review_step` from the stored row snapshot. Leave student account creation untouched.

- [ ] **Step 5: Block approval**

In `decide_application`, before `APPROVE` transitions, reject applications whose `completion_status` is `PENDING_STUDENT_COMPLETION`.

- [ ] **Step 6: Add safe audit events**

Use `record_application_event` from views for validation and confirmation events with non-PII outcomes only. For row-level imported/rejected audit rows, record event/action names and batch/row identifiers through `registration_id` or `correlation_id`; do not include submitted CSV values.

- [ ] **Step 7: Run backend tests to verify GREEN**

Run: `cd backend; python manage.py test apps.applications --settings=config.settings.test`

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add backend/apps/applications/bulk_upload.py backend/apps/applications/services.py backend/apps/applications/views.py backend/apps/applications/tests/test_bulk_upload_endpoints.py backend/apps/applications/tests/test_bulk_upload_service.py backend/apps/applications/tests/test_application_endpoints.py
git commit -m "feat: confirm student application bulk uploads"
```

### Task 5: Backend Serialization, Review Queue Filter, And API Documentation

**Files:**
- Modify: `backend/apps/applications/serializers.py`
- Modify: `backend/apps/applications/views.py`
- Modify: `docs/api/API-ENDPOINTS.md`
- Test: `backend/apps/applications/tests/test_bulk_upload_endpoints.py`

**Interfaces:**
- Consumes: metadata fields from Task 1.
- Produces response fields: `completionStatus`, `submissionSource`, `submittedByUserId`, `bulkUploadBatchId`, `bulkUploadRowNumber`.
- Produces review queue filter `status=PENDING_STUDENT_COMPLETION`.

- [ ] **Step 1: Write failing serializer/filter tests**

Add assertions that imported application detail includes metadata fields and `GET /api/v1/applications/review-queue/?status=PENDING_STUDENT_COMPLETION` returns only pending-completion rows.

- [ ] **Step 2: Run tests to verify RED**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_endpoints --settings=config.settings.test`

Expected: FAIL because serializer fields and filter mapping are absent.

- [ ] **Step 3: Add serializer fields**

Extend `ApplicationSerializer` with read-only mapped names:

```python
completionStatus = serializers.CharField(source="completion_status", read_only=True)
submissionSource = serializers.CharField(source="submission_source", read_only=True)
submittedByUserId = serializers.CharField(source="submitted_by_user_id", read_only=True, allow_null=True)
bulkUploadBatchId = serializers.CharField(source="bulk_upload_batch_id", read_only=True, allow_null=True)
bulkUploadRowNumber = serializers.IntegerField(source="bulk_upload_row_number", read_only=True, allow_null=True)
```

- [ ] **Step 4: Add queue filter**

In `ApplicationReviewQueueView`, handle `status_filter == "PENDING_STUDENT_COMPLETION"` by filtering `completion_status=ApplicationCompletionStatus.PENDING_STUDENT_COMPLETION`.

- [ ] **Step 5: Document endpoints**

Update `docs/api/API-ENDPOINTS.md` table and application section with the five bulk upload endpoints, CSV columns, response shape, confirmation behavior, and approval blocking.

- [ ] **Step 6: Run backend tests and docs review**

Run: `cd backend; python manage.py test apps.applications.tests.test_bulk_upload_endpoints --settings=config.settings.test`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add backend/apps/applications/serializers.py backend/apps/applications/views.py backend/apps/applications/tests/test_bulk_upload_endpoints.py docs/api/API-ENDPOINTS.md
git commit -m "docs: document application bulk upload api"
```

### Task 6: Frontend Service Contract And Mapping

**Files:**
- Modify: `frontend/src/services/backendApplicationService.ts`
- Modify: `frontend/src/services/backendApplicationService.test.ts`
- Modify: `frontend/src/types.ts`

**Interfaces:**
- Consumes: backend endpoints from Tasks 3-5.
- Produces: `BulkUploadValidationSummary`, `BulkUploadRowError`, `BulkUploadBatchDetail`, `downloadBulkUploadTemplate()`, `validateBulkUploadCsv(file)`, `getBulkUploadBatch(batchId)`, `downloadBulkUploadErrors(batchId)`, `confirmBulkUpload(batchId)`.
- Produces: frontend application field `completionStatus?: "COMPLETE" | "PENDING_STUDENT_COMPLETION"`.

- [ ] **Step 1: Write failing frontend service tests**

Add tests for template download, validate upload, error CSV download, confirm import, and mapping `completionStatus`.

Example:

```typescript
it('validates a bulk upload CSV through the backend', async () => {
  const fetcher = vi.fn().mockResolvedValue(jsonResponse({ batchId: 'batch-id', status: 'VALIDATED', totalRows: 1, validRows: 1, failedRows: 0, conflictRows: 0, fieldErrorRows: 0, canConfirm: true }, { status: 200 }));
  const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));
  const file = new File(['templateVersion,firstName'], 'students.csv', { type: 'text/csv' });

  const result = await service.validateBulkUploadCsv(file);

  expect(result.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledWith(
    'http://backend.test/api/v1/applications/bulk-upload/validate/',
    expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
  );
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `cd frontend; npm test -- src/services/backendApplicationService.test.ts`

Expected: FAIL because methods and types do not exist.

- [ ] **Step 3: Add service types and methods**

Add typed interfaces in `backendApplicationService.ts`. Use `requestBlob` for template and errors CSV, `FormData` for validation, JSON-free POST for confirm, and pass `status=PENDING_STUDENT_COMPLETION` through `listReviewQueue` unchanged.

- [ ] **Step 4: Extend mapping**

Add `completionStatus` to `BackendApplication` and `Application`; map backend `completionStatus` to frontend rows.

- [ ] **Step 5: Run tests to verify GREEN**

Run: `cd frontend; npm test -- src/services/backendApplicationService.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add frontend/src/services/backendApplicationService.ts frontend/src/services/backendApplicationService.test.ts frontend/src/types.ts
git commit -m "feat: add application bulk upload frontend service"
```

### Task 7: Review Applications Bulk Upload UI

**Files:**
- Modify: `frontend/src/pages/reviewer/ReviewApplications.tsx`
- Create: `frontend/src/pages/reviewer/ReviewApplications.test.tsx`

**Interfaces:**
- Consumes: frontend service methods from Task 6.
- Produces: Bulk Upload action, modal/panel, CSV selector, validate action, summary, row errors, error CSV download, confirm import, refresh, pending student completion filter, approval disabled for pending completion.

- [ ] **Step 1: Write failing UI tests**

Mock `backendApplicationService` and test:

```typescript
expect(await screen.findByRole('button', { name: /bulk upload/i })).toBeInTheDocument();
```

Then test selecting a CSV enables Validate, validation summary renders counts and row errors, Confirm Import is disabled when `validRows` is `0`, successful confirm calls `listReviewQueue`, and pending-completion rows do not render the approve button.

- [ ] **Step 2: Run UI tests to verify RED**

Run: `cd frontend; npm test -- src/pages/reviewer/ReviewApplications.test.tsx`

Expected: FAIL because the UI does not exist.

- [ ] **Step 3: Add modal state and actions**

In `ReviewApplications.tsx`, add `activeModal` value `BULK_UPLOAD` or separate modal state. Add handlers:

```typescript
const refreshReviewQueue = async () => {
  setIsLoadingQueue(true);
  setQueueError('');
  const result = await backendApplicationService.listReviewQueue(reviewQueueFilters());
  setIsLoadingQueue(false);
  if (result.ok === false) {
    setQueueError(result.error.message);
    return;
  }
  setApps(mapBackendApplicationsToReviewRows(result.data));
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const handleDownloadBulkTemplate = async () => {
  const result = await backendApplicationService.downloadBulkUploadTemplate();
  if (result.ok === false) {
    setBulkUploadError(result.error.message);
    return;
  }
  downloadBlob(result.data, 'student-application-bulk-upload-template.csv');
};

const handleValidateBulkUpload = async () => {
  if (!bulkUploadFile) return;
  const result = await backendApplicationService.validateBulkUploadCsv(bulkUploadFile);
  if (result.ok === false) {
    setBulkUploadError(result.error.message);
    return;
  }
  setBulkUploadBatch(result.data);
};

const handleDownloadBulkErrors = async () => {
  if (!bulkUploadBatch?.batchId) return;
  const result = await backendApplicationService.downloadBulkUploadErrors(bulkUploadBatch.batchId);
  if (result.ok === false) {
    setBulkUploadError(result.error.message);
    return;
  }
  downloadBlob(result.data, `student-application-bulk-upload-errors-${bulkUploadBatch.batchId}.csv`);
};

const handleConfirmBulkUpload = async () => {
  if (!bulkUploadBatch?.batchId) return;
  const result = await backendApplicationService.confirmBulkUpload(bulkUploadBatch.batchId);
  if (result.ok === false) {
    setBulkUploadError(result.error.message);
    return;
  }
  setBulkUploadBatch(result.data);
  await refreshReviewQueue();
};
```

Keep object URL cleanup local to each download action.

- [ ] **Step 4: Render controls**

Place a `Bulk Upload` button next to `Export Batch`. In the modal, render file selector, Validate button, summary counts, row error table with row number, field, code, and reason, error CSV download, and Confirm Import button disabled when `validRows === 0` or no batch exists.

- [ ] **Step 5: Add pending filter and approval guard**

Add status filter option `PENDING_STUDENT_COMPLETION`. Treat `app.completionStatus === "PENDING_STUDENT_COMPLETION"` as not approvable in the row action and approval modal entry point.

- [ ] **Step 6: Run UI tests to verify GREEN**

Run: `cd frontend; npm test -- src/pages/reviewer/ReviewApplications.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add frontend/src/pages/reviewer/ReviewApplications.tsx frontend/src/pages/reviewer/ReviewApplications.test.tsx
git commit -m "feat: add review applications bulk upload ui"
```

### Task 8: Final Verification And Implementation Log

**Files:**
- Modify: `docs/superpowers/l.chavez/implement/l.chavez.implement-review-application.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: final verification evidence and implementation log entry.

- [ ] **Step 1: Run backend checks**

Run:

```bash
cd backend
python manage.py check --settings=config.settings.local
python manage.py test apps.applications --settings=config.settings.test
```

Expected: both commands exit 0. If there are pre-existing unrelated failures, capture exact failing test names and error summaries.

- [ ] **Step 2: Run frontend checks**

Run:

```bash
cd frontend
npm test -- src/pages/reviewer src/services
npm run lint
npm run build
```

Expected: focused tests pass. If repo-wide TypeScript or build has pre-existing unrelated failures, capture exact diagnostics and confirm whether changed files are implicated.

- [ ] **Step 3: Inspect diff**

Run:

```bash
git status -sb
git diff --stat
git diff --check
```

Expected: no whitespace errors; changed files are limited to applications backend, Review Applications frontend/service/types/tests, API docs, migrations, and implementation log.

- [ ] **Step 4: Update implementation log**

Append a dated entry to `docs/superpowers/l.chavez/implement/l.chavez.implement-review-application.md` listing changed files, key decisions, exact verification commands, and results.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/superpowers/l.chavez/implement/l.chavez.implement-review-application.md
git commit -m "docs: record application bulk upload implementation"
```
