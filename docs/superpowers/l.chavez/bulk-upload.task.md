# Bulk Upload Student Applications Task Brief

Owner: L.Chavez
Branch: `l.chavez/review-application`
Spec: `docs/superpowers/l.chavez/specs/2026-08-06-student-application-bulk-upload.md`

## Intent

Complete the Review Applications bulk upload feature for student applications. Admissions reviewers and system admins should be able to upload a CSV, validate all rows first, confirm the valid rows, and create submitted applications that remain pending student completion.

## Approved Direction

- Place the feature in the Review Applications module at `/admin/reviewer/applications`.
- Allow `ADMISSIONS_REVIEWER` and `SYSTEM_ADMIN`.
- Use CSV only for version 1.
- Do not upload selfie, Student ID, or document files.
- Validate the CSV before import.
- Require reviewer confirmation before creating applications.
- Store durable batch and row-level validation/import results.
- Skip duplicate or conflicting rows while importing valid rows.
- Create imported records as `status = SUBMITTED`.
- Add `completionStatus = PENDING_STUDENT_COMPLETION`.
- Add structured source metadata with `submissionSource = ADMISSIONS_BULK_UPLOAD`.
- Create active Student accounts on bulk-upload confirmation with temporary first-login passwords.
- Send account activation email after bulk-upload confirmation and standard approval.
- Require bulk-uploaded students to change their temporary password on first login.
- Block approval while student completion is pending.

## CSV Columns

```csv
templateVersion,firstName,middleName,lastName,suffix,dateOfBirth,sex,email,mobile,region,province,city,barangay,street,postalCode,lrn,schoolId,schoolName,academicTrack,gradeLevel,enrollmentStatus,schoolYear,gwa,firstChoiceUniversity,firstChoiceCourse,secondChoiceUniversity,secondChoiceCourse,thirdChoiceUniversity,thirdChoiceCourse,privacyConsent,declarationAccepted
```

## Backend Tasks

- [x] Add application metadata fields:
  - [x] `completionStatus`
  - [x] `submissionSource`
  - [x] `submittedByUserId`
  - [x] `bulkUploadBatchId`
  - [x] `bulkUploadRowNumber`
- [x] Add migrations for new application metadata.
- [x] Add durable bulk upload batch model.
- [x] Add durable row result model.
- [x] Add CSV template endpoint.
- [x] Add CSV validation endpoint.
- [x] Add batch detail endpoint.
- [x] Add error CSV endpoint.
- [x] Add confirm import endpoint.
- [x] Implement CSV header and `templateVersion` validation.
- [x] Implement required field validation.
- [x] Implement date, LRN, email, consent, and course preference validation.
- [x] Implement duplicate LRN/email checks within the uploaded CSV.
- [x] Implement existing application/account conflict checks.
- [x] Implement transactional confirmation with final LRN/email conflict recheck.
- [x] Make confirmation idempotent.
- [x] Block approval when `completionStatus = PENDING_STUDENT_COMPLETION`.
- [x] Create active Student accounts for imported bulk-upload rows.
- [x] Generate temporary first-login passwords for imported bulk-upload accounts.
- [x] Require temporary-password users to change their password before OTP/session access.
- [x] Send activation email with temporary credentials for bulk-uploaded students.
- [x] Include direct first-login link in bulk-upload activation email.
- [x] Send activation email without temporary credentials for standard approved applications.
- [ ] Add safe audit events for validation, confirmation, imported rows, and rejected rows.
- [x] Update API documentation.

## Frontend Tasks

- [x] Add a Bulk Upload action to Review Applications.
- [x] Add bulk upload modal or panel.
- [x] Add template download action.
- [x] Add CSV file selector.
- [x] Add validate action and service method.
- [x] Render validation summary counts.
- [x] Render row-level validation errors.
- [x] Add error CSV download action.
- [x] Add confirm import action.
- [x] Refresh Review Applications after confirmation.
- [x] Add Pending Student Completion filter.
- [ ] Show completion status in the application ledger.
- [x] Disable or block approval for pending-completion applications.

## Backend Tests

- [x] Reviewer can download template.
- [x] Reviewer can validate a correct CSV.
- [x] System admin can validate a correct CSV.
- [x] Student and unauthenticated users are denied.
- [x] Missing required fields produce row errors.
- [x] Invalid LRN produces row errors.
- [x] Invalid date format produces row errors.
- [x] Incomplete course preference pair produces row errors.
- [x] Duplicate LRN/email inside CSV produces conflicts.
- [x] Existing application/account conflicts are rejected per row.
- [x] Confirm imports only valid rows.
- [x] Confirm rechecks conflicts and rejects only newly conflicting rows.
- [x] Confirm is idempotent.
- [x] Imported applications have submitted status, pending completion status, and bulk upload source metadata.
- [x] Approval is blocked while completion is pending.
- [x] Bulk upload confirmation creates active Student accounts with temporary-password flag.
- [x] Temporary-password login requires password change before OTP.
- [x] Temporary-password change clears the flag and continues to OTP.
- [x] Standard approval sends an activation email using existing credentials.

## Frontend Tests

- [x] Bulk Upload action is visible to admissions reviewers.
- [x] Template download calls the backend service.
- [x] Validation results render counts and row errors.
- [x] Confirm Import is disabled when there are no valid rows.
- [x] Successful confirmation refreshes the application list.
- [ ] Pending Student Completion filter displays imported incomplete records.
- [x] Approval action is unavailable or blocked for pending-completion applications.
- [x] Bulk activation link pre-fills the student email on Login.

## Verification Commands

Backend:

```text
cd backend
python manage.py check --settings=config.settings.local
python manage.py test apps.applications --settings=config.settings.test
```

Frontend:

```text
cd frontend
npm test -- src/pages/reviewer src/services
npm run lint
npm run build
```

## Notes

- Do not log CSV row personal data in request logs, audit payloads, or telemetry.
- Create active Student accounts during bulk-upload confirmation only after row validation and final conflict checks pass.
- Do not add file upload support in this version.
- Do not silently ignore unknown CSV columns.
