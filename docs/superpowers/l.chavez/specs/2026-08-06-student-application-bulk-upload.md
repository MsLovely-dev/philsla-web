# Student Application Bulk Upload

Owner: L.Chavez
Date: 2026-08-06
Status: Ready for review

## Intent

Admissions reviewers need a controlled way to create many student applications without making each student complete the public registration form first. The feature belongs in the Review Applications module and should create official submitted application records while preserving backend validation, row-level traceability, and the existing approval-to-account-activation boundary.

Bulk upload must not activate Student accounts. Student accounts are still created or activated only after admissions approval. Bulk-uploaded students complete remaining portal profile, identity, and document requirements after the application record exists.

## Scope

In scope:

- Add a bulk upload entry point in the Review Applications module at `/admin/reviewer/applications`.
- Allow only `ADMISSIONS_REVIEWER` and `SYSTEM_ADMIN` users to validate and confirm imports.
- Accept CSV only for the first version.
- Generate a current CSV template for reviewer download.
- Validate the full CSV before import.
- Store a durable validation/import batch and row-level results.
- Require reviewer confirmation before creating applications.
- Import only rows that passed validation and still pass final conflict checks.
- Create imported applications with `status = SUBMITTED`, `submissionSource = ADMISSIONS_BULK_UPLOAD`, and `completionStatus = PENDING_STUDENT_COMPLETION`.
- Keep duplicate or conflicting rows out of the import while allowing valid non-conflicting rows to continue.
- Expose an error CSV based on stored row results.

Out of scope:

- Selfie upload.
- Student ID front/back upload.
- Dynamic registration document upload.
- ZIP package upload.
- Student account creation before approval.
- Automatic email invitation, password generation, or notification delivery.
- Replacing the existing public student registration flow.

## User Flow

1. An admissions reviewer opens Review Applications.
2. The reviewer clicks Bulk Upload.
3. The reviewer downloads the current CSV template.
4. The reviewer uploads a completed CSV.
5. The backend creates a batch, validates every row, and stores row-level results.
6. The UI shows validation counts, failed rows, conflicts, and a downloadable error CSV.
7. The reviewer confirms the validated batch.
8. The backend imports eligible rows, rechecking critical conflicts inside transactions.
9. Imported applications appear in Review Applications under Pending Student Completion.

## CSV Format

The first column is the template version so the backend can reject stale or incompatible files.

```csv
templateVersion,firstName,middleName,lastName,suffix,dateOfBirth,sex,email,mobile,region,province,city,barangay,street,postalCode,lrn,schoolId,schoolName,academicTrack,gradeLevel,enrollmentStatus,schoolYear,gwa,firstChoiceUniversity,firstChoiceCourse,secondChoiceUniversity,secondChoiceCourse,thirdChoiceUniversity,thirdChoiceCourse,privacyConsent,declarationAccepted
```

Required fields:

- `templateVersion`
- `firstName`
- `lastName`
- `dateOfBirth`
- `sex`
- `email`
- `mobile`
- `region`
- `province`
- `city`
- `barangay`
- `street`
- `postalCode`
- `schoolId`
- `schoolName`
- `gradeLevel`
- `enrollmentStatus`
- `schoolYear`
- `firstChoiceUniversity`
- `firstChoiceCourse`
- `privacyConsent`
- `declarationAccepted`

Optional fields:

- `middleName`
- `suffix`
- `lrn`
- `academicTrack`
- `gwa`
- second and third course choices

Validation rules:

- `dateOfBirth` uses `YYYY-MM-DD`.
- `lrn` may be blank for manual records, but when present it must contain exactly 12 digits.
- `privacyConsent` and `declarationAccepted` must be true values.
- Course preference pairs must be complete. A university without a course, or a course without a university, is invalid.
- At least the first course preference is required.
- CSV headers must match the active template.
- Unknown columns are errors, not warnings.

## Application State

Imported rows create student applications as submitted but not ready for final admissions approval.

Application fields:

```text
status = SUBMITTED
completionStatus = PENDING_STUDENT_COMPLETION
submissionSource = ADMISSIONS_BULK_UPLOAD
submittedByUserId = uploader user id
bulkUploadBatchId = batch id
bulkUploadRowNumber = CSV row number
```

`status` remains the admissions lifecycle state. `completionStatus` tracks whether required student-side profile, identity, and document steps are complete.

Review Applications should support filters:

- All
- Ready for Review
- Pending Student Completion
- For Correction
- Approved
- Rejected

Approving an application should be blocked while `completionStatus = PENDING_STUDENT_COMPLETION`. Reviewers may still open the application to inspect imported data.

## Batch Lifecycle

The batch record is durable. The externally returned batch identifier is opaque and can be used for validation results, confirmation, and error CSV download.

Batch statuses:

```text
UPLOADED
VALIDATING
VALIDATED
CONFIRMING
COMPLETED
COMPLETED_WITH_ERRORS
EXPIRED
FAILED
```

Batch fields:

```text
id
templateVersion
examCycleId
status
uploadedByUserId
performedByRoleSnapshot
createdAt
expiresAt
confirmedAt
completedAt
summaryCounts
```

Confirmation must fail when the batch is expired, already confirmed, failed, or owned by another reviewer. `SYSTEM_ADMIN` may access batches according to normal administrative authorization, but the original uploader and role snapshot remain preserved.

## Row Results

Each CSV row gets a stored result record.

```text
rowNumber
status = VALID | FIELD_ERROR | CONFLICT | IMPORTED | IMPORT_FAILED
applicationId
submittedLrn
submittedEmail
errors[]
```

Each error contains:

```text
field
submittedValue
code
reason
```

`CONFLICT` is reserved for duplicate LRN/email or existing application/account conflicts. CSV value problems use `FIELD_ERROR`. Unexpected application creation failures use `IMPORT_FAILED`.

The stored row snapshot is the source for confirmation and error CSV generation. Confirmation must not rerun full CSV parsing from the uploaded file.

## Conflict Handling

Validation rejects only the affected row for:

- Existing active or non-rejected application with the same non-blank LRN in the active exam cycle.
- Existing submitted/imported row with the same non-blank LRN in the same CSV.
- Existing application or account using the submitted email.
- Another row in the same CSV using the submitted email.

Confirmation rechecks LRN and email conflicts inside a transaction because records may have changed after validation. Newly detected conflicts reject only that row and allow the remaining valid rows to continue.

Confirmation must be idempotent. Repeating confirmation for the same batch must not create duplicate applications.

## API Shape

Candidate endpoints:

```text
GET  /api/v1/applications/bulk-upload/template/
POST /api/v1/applications/bulk-upload/validate/
GET  /api/v1/applications/bulk-upload/{batchId}/
GET  /api/v1/applications/bulk-upload/{batchId}/errors.csv
POST /api/v1/applications/bulk-upload/{batchId}/confirm/
```

All endpoints require bearer authentication and allow only `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN`.

The validation response should include:

```json
{
  "batchId": "opaque-id",
  "status": "VALIDATED",
  "totalRows": 100,
  "validRows": 87,
  "failedRows": 13,
  "conflictRows": 5,
  "fieldErrorRows": 8,
  "canConfirm": true
}
```

## Frontend Design

The Review Applications page gains a Bulk Upload action near the existing review/export controls.

The bulk upload panel or modal includes:

- Template download.
- CSV file selector.
- Validate button.
- Validation summary.
- Row-level error table.
- Download error CSV.
- Confirm Import button when at least one row is valid.

After confirmation, the UI refreshes the Review Applications ledger and surfaces imported records under Pending Student Completion.

## Security and Privacy

- The feature is authenticated and role-restricted.
- CSV data can include personal data and must not be logged in request bodies, audit bodies, or error telemetry.
- Error CSVs should include only the submitted row values needed for correction.
- Batch records retain uploader identity, role snapshot, exam cycle, counts, and row errors for audit.
- The feature does not accept files in this version, reducing upload attack surface.
- Backend permissions and validation remain authoritative.

## Testing

Backend tests should cover:

- Admissions reviewer can validate a correct CSV.
- System admin can validate a correct CSV.
- Student and unauthenticated users are denied.
- Missing required fields produce `FIELD_ERROR`.
- Invalid LRN and invalid date format produce row errors.
- Duplicate LRN/email within the CSV produce `CONFLICT`.
- Existing application/account conflicts produce `CONFLICT`.
- Confirm imports only valid rows.
- Confirm rechecks conflicts and rejects only newly conflicting rows.
- Confirm is idempotent.
- Imported applications have `SUBMITTED`, `PENDING_STUDENT_COMPLETION`, and `ADMISSIONS_BULK_UPLOAD` metadata.
- Approval is blocked while completion is pending.

Frontend tests should cover:

- Bulk Upload action is visible to admissions reviewers.
- Template download action calls the backend service.
- Validation results render counts and row errors.
- Confirm Import is disabled when there are no valid rows.
- Successful confirmation refreshes the application list.
- Pending Student Completion filter displays imported incomplete records.

## Deferred Scope

No business decision remains open for version 1. Notification, account invitation, file upload, and automated completion transitions are explicitly deferred.
