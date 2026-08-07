# Student Profile Completion for Bulk-Uploaded Students

## Intent

Students created through Admissions Reviewer Bulk Upload already receive active Student accounts with temporary passwords. Those applications are stored as submitted records with `completion_status=PENDING_STUDENT_COMPLETION`, but the Student Portal does not yet give those students a backend-backed place to finish missing registration and application requirements before review.

This feature adds a Student Portal Profile module that lets only those pending bulk-upload students complete their remaining application information, save drafts, upload configured documents, submit the completed profile, and unlock eligible portal features after the backend marks the application complete.

## Current Context

The backend already has the main data boundary:

- `StudentApplication.completion_status` has `COMPLETE` and `PENDING_STUDENT_COMPLETION`.
- `StudentApplication.submission_source` has `STUDENT_REGISTRATION` and `ADMISSIONS_BULK_UPLOAD`.
- Bulk upload creates applications with `status=SUBMITTED`, `completion_status=PENDING_STUDENT_COMPLETION`, `submission_source=ADMISSIONS_BULK_UPLOAD`, and then calls `activate_bulk_uploaded_student_account`.
- Bulk-upload activation creates an active Student account with `AccountProfile.must_change_password=True` and emails the temporary password.
- Login already forces temporary password change before OTP/selfie login can continue.
- Reviewer approval already rejects pending-completion applications.
- Dynamic Student Registration fields are stored in `ConfigurableField` rows under `module=student_registration`, `section=Step 1 Registration`, and `type=Student Registration Field`.
- Required dynamic fields are represented by enabled rows with `priority=High Priority`.
- Dynamic file uploads are stored as `StudentApplicationAdditionalAttachment` and validated as private PDF, PNG, or JPEG files up to the configured size limit.

The frontend already has route guarding, backend auth services, backend application services, and maintenance UI for registration configuration. The current student dashboard and application page are still heavily mock/prototype oriented, so the Profile module should use a focused backend service path instead of refactoring the entire student dashboard.

## Approach

Use the existing application record as the source of truth. A bulk-uploaded student profile is not a separate domain object; it is the student's existing `StudentApplication` while `submission_source=ADMISSIONS_BULK_UPLOAD` and `completion_status=PENDING_STUDENT_COMPLETION`.

The Profile module displays all relevant configured sections and fields. Values imported from bulk upload are prefilled and count as completed when they satisfy the current validation rules. Prefilled values remain editable because the current bulk-upload flow does not store verified-source metadata for imported fields. Missing required values, invalid dropdown selections, missing required file attachments, missing course preferences, and missing declarations remain blocking requirements.

This keeps the implementation aligned with existing models, validation helpers, attachment storage, review queue behavior, and reviewer approval rules.

## Backend Design

Add authenticated student-owned profile completion endpoints under:

- `GET /api/v1/applications/profile/`
- `PATCH /api/v1/applications/profile/`
- `POST /api/v1/applications/profile/attachments/`
- `POST /api/v1/applications/profile/submit/`

`GET /profile/` returns the active owned application requiring profile completion, enabled Student Registration field configuration, existing dynamic attachments, and computed completion progress. If the authenticated user is not a Student, return `403`. If the Student has no pending owned bulk-upload application, return `404` rather than exposing whether unrelated applications exist.

`PATCH /profile/` saves a draft. It accepts the same public application sections already used by `ApplicationSerializer`: `personal`, `address`, `school`, `coursePreferences`, and `reviewStep`, plus required `version`. It is allowed only when the authenticated Student owns an `ADMISSIONS_BULK_UPLOAD` application with `completion_status=PENDING_STUDENT_COMPLETION`. It must use optimistic concurrency and increment `version`.

`POST /profile/attachments/` uploads one configured file field directly to the owned pending application. It accepts multipart fields `fieldName` and `file`. It reuses the existing attachment validation rules and replaces any previous attachment for that application, section, and field key.

`POST /profile/submit/` validates the latest stored draft using the same business rules as full registration completion, adjusted for bulk-uploaded students:

- Required static personal fields must be present.
- Required static address fields must be present.
- Required static school fields must be present.
- LRN, if present, must be exactly 12 numeric digits.
- At least one complete course preference is required.
- Every supplied course preference must include both university and course.
- Privacy consent and declaration acceptance are required.
- Every enabled high-priority Student Registration dynamic field must be complete.
- Enabled high-priority dynamic file fields must have an application-owned attachment.
- Dropdown values must match configured options.
- PWD-dependent fields are required only when the student indicates PWD status.

On successful submit, the backend sets `completion_status=COMPLETE`, keeps `status=SUBMITTED`, updates `submitted_at` to the completion submission time, increments `version`, and records an audit event such as `bulk_upload_profile_completed`. The application then appears in the normal admissions review flow as reviewable.

Reviewer approval remains blocked if `completion_status=PENDING_STUDENT_COMPLETION`; this existing safeguard stays authoritative.

## Progress Calculation

The backend returns progress in a deterministic response object:

```json
{
  "completed": 17,
  "total": 24,
  "percent": 71,
  "remaining": [
    {
      "section": "School Information",
      "fieldKey": "gwa",
      "label": "GWA",
      "type": "field",
      "required": true
    }
  ]
}
```

`total` counts only blocking requirements. Optional and low-priority fields are displayed but are not included in the denominator. File requirements count as complete when the matching application-owned attachment exists. PWD-dependent requirements count only when PWD status is truthy. If there are zero blocking requirements, `percent` is `100`.

## Frontend Design

Add a new page:

- `frontend/src/pages/student/StudentProfile.tsx`

Add backend service methods to `backendApplicationService`:

- `getStudentProfileCompletion()`
- `saveStudentProfileDraft(input)`
- `uploadStudentProfileAttachment(fieldName, file)`
- `submitStudentProfile(version)`

Add route:

- `/student/profile`

Add Student Portal sidebar item:

- `Profile`

The page should render the actual work surface as the first screen:

- A compact header with candidate ID and completion progress.
- A notification banner when completion is required.
- Form sections for personal, address, school, course preferences, dynamic fields, file uploads, and declarations.
- Prefilled imported values shown as editable controlled inputs.
- Required markers and inline validation errors.
- Draft save and final submit actions.
- Existing uploaded dynamic files with filename, size, and replacement upload control.

The UI should stay operational and dense, matching the current dashboard style. It should not be a landing page or marketing screen.

## Access Gating

Backend state remains authoritative. Frontend gating is only a user-experience layer.

After authenticated session initialization, the frontend checks the pending profile endpoint for Student users. If it returns a pending profile, protected student routes that require a complete application redirect to `/student/profile`.

Allowed while incomplete:

- `/dashboard`, but it should show a completion-required notice and link to Profile.
- `/student/profile`
- logout and account/session flows

Restricted while incomplete:

- `/student/permit`
- `/student/results`
- `/student/take-exam`
- `/exam/live`
- any future student feature that requires completed application data

Restricted routes show or redirect with a message that profile completion is required before continuing.

## Data Flow

1. Admissions Reviewer confirms a bulk upload batch.
2. Backend creates submitted, pending-completion applications and activates Student accounts with temporary passwords.
3. Student logs in with the temporary password.
4. Login requires password change, then continues OTP/selfie login.
5. Frontend initializes the session and detects pending profile completion.
6. Student is routed to `/student/profile`.
7. Profile page loads the application, current enabled registration field configuration, attachments, and progress.
8. Student saves draft changes through `PATCH /profile/`.
9. Student uploads dynamic file requirements through `POST /profile/attachments/`.
10. Student submits profile through `POST /profile/submit/`.
11. Backend validates all required rules and sets `completion_status=COMPLETE`.
12. Student gains access to eligible student portal features.
13. Admissions Review queue can process the application through the normal review decision endpoint.

## Error Handling

Validation errors return the existing DRF error envelope and section-based field errors where possible.

Expected errors:

- `401` for unauthenticated access.
- `403` for non-Student roles.
- `404` when no pending owned bulk-upload profile exists.
- `400` for missing or invalid fields, files, dropdown values, or declarations.
- `409` for stale version or non-editable completion state.

File upload errors must not include file contents or sensitive path details. Audit logs must not include request or response bodies, document contents, personal data, LRN values, or uploaded media metadata beyond safe operational identifiers.

## Testing

Backend tests should cover:

- Pending bulk-upload student can read profile completion state.
- Non-student roles cannot access profile completion endpoints.
- Student cannot access another student's application.
- Ordinary student-registration applications do not use the bulk profile endpoint.
- Draft save updates owned pending profile and increments version.
- Stale draft save returns conflict.
- Dynamic high-priority text/dropdown/file requirements affect progress and submission validation.
- Optional and low-priority fields do not block submission.
- Required file upload validates content type and size.
- Successful submit sets `completion_status=COMPLETE`, keeps `status=SUBMITTED`, increments version, and records audit.
- Reviewer approval remains blocked before completion and allowed after completion.

Frontend tests should cover:

- Student Profile route renders backend-loaded pending fields.
- Prefilled imported values count toward progress.
- Missing required fields and files show remaining requirements.
- Draft save calls the profile endpoint with version.
- File upload calls the profile attachment endpoint.
- Successful submit redirects or unlocks feature access.
- Incomplete profile redirects restricted student routes to `/student/profile`.
- Completed profile does not redirect restricted student routes.

Relevant verification commands:

- Backend focused tests for `apps.applications`.
- `python manage.py check --settings=config.settings.local`
- Frontend focused Vitest tests for route guard, service adapter, and profile page.
- `npm run lint`
- `npm run build`

## Risks and Tradeoffs

The existing registration page is large and handles public registration, session storage, camera capture, OTP, and LRN verification. Reusing that page directly would reduce new UI code but would couple authenticated profile completion to public-registration assumptions. The safer tradeoff is a focused Profile page that reuses service contracts and mapping concepts, not the entire page.

Dynamic field configuration can change after a student was bulk uploaded. This design intentionally validates against the current active Student Registration configuration, as requested. That means a student may need to provide a field that did not exist when the CSV was uploaded. This is acceptable because the profile module is meant to complete pending requirements against current policy.

The bulk upload template currently collects many required fields, but not every dynamic field or document requirement. Progress therefore cannot be derived only from the import row; it must be computed from the current application plus current configuration.

## Out of Scope

This feature does not implement a new profile domain model.

This feature does not change the temporary password login flow, because it already exists.

This feature does not refactor the entire student dashboard away from mock data.

This feature does not add PhilSys verification or a production DepEd provider.

This feature does not change reviewer decision semantics except continuing to enforce the existing pending-completion approval block.
