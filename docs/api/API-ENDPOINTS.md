# API Endpoints

## Current state

The baseline health and authentication boundaries plus the first student-application slice are implemented. The frontend currently uses mock/local services. Unimplemented business paths below remain a capability inventory rather than an approved contract. OpenAPI 3 through DRF Spectacular is the accepted machine-readable contract approach after [ADR-014](../decisions/ADR-014-API-SCHEMA-TOOLING-AND-PUBLICATION.md), but schema tooling is not installed yet.

## Implemented baseline endpoints

| Method | Path | Authentication | Permission | Purpose | Status |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health/` | Public; no credentials required | `AllowAny` | Safe service liveness smoke check | Implemented |
| `GET` | `/api/v1/auth/session/` | Required bearer access token | `IsAuthenticated` | Return server-derived session, role, permission, and scope claims | Implemented |
| `POST` | `/api/v1/auth/login/identifier/` | Public; no credentials required | `AllowAny` | Validate LRN/email format and start Step 1 identifier resolution | Implemented |
| `POST` | `/api/v1/auth/login/password/` | Public with Step-1 pending-auth token | `AllowAny` | Validate password-step payload and advance to OTP | Implemented |
| `POST` | `/api/v1/auth/login/otp/` | Public with OTP pending-auth token | `AllowAny` | Validate OTP-step payload and advance to selfie photo logging | Implemented |
| `POST` | `/api/v1/auth/login/otp/resend/` | Public with OTP pending-auth token | `AllowAny` | Resend the login email OTP with cooldown and resend limits | Implemented |
| `POST` | `/api/v1/auth/login/selfie/` | Public with selfie pending-auth token | `AllowAny` | Store the captured login selfie image and complete session issuance | Implemented |
| `POST` | `/api/v1/auth/logout/` | Required bearer access token | `IsAuthenticated` | Revoke current session and clear refresh cookie | Implemented |
| `POST` | `/api/v1/auth/token/refresh/` | Refresh cookie | `AllowAny` | Rotate refresh token and issue a new access token | Implemented |
| `POST` | `/api/v1/auth/token/revoke/` | Required bearer access token | `IsAuthenticated` | Revoke current or all token families for the authenticated account | Implemented |
| `POST` | `/api/v1/auth/activation/student-registration/` | Required bearer access token | `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN` | Create or reactivate a Student account for an approved registration | Implemented |
| `POST` | `/api/v1/auth/activation/staff/complete/` | Public activation link | `AllowAny` | Complete first-time staff/admin activation by setting the user's password | Implemented |
| `POST` | `/api/v1/auth/recovery/password/request/` | Public; no credentials required | `AllowAny` | Request password recovery instructions without account enumeration | Implemented |
| `POST` | `/api/v1/auth/recovery/password/inspect/` | Public recovery link | `AllowAny` | Return safe account display metadata for a valid recovery token | Implemented |
| `POST` | `/api/v1/auth/recovery/password/complete/` | Public recovery link | `AllowAny` | Complete password reset from a recovery link | Implemented |
| `POST` | `/api/v1/auth/recovery/admin/request/` | Required bearer access token | `SYSTEM_ADMIN` | Initiate staff/admin account recovery without setting a password for the user | Implemented |
| `GET`, `POST` | `/api/v1/auth/admin/users/` | Required bearer access token | `SYSTEM_ADMIN` | List or create non-student staff/admin accounts for User & Role Settings | Implemented |
| `PUT`, `DELETE` | `/api/v1/auth/admin/users/{userId}/` | Required bearer access token | `SYSTEM_ADMIN` | Update or deactivate a non-student staff/admin account | Implemented |
| `GET` | `/api/v1/auth/admin/roles/` | Required bearer access token | `SYSTEM_ADMIN` | List staff/admin role permission baselines for Role Settings | Implemented |
| `PUT` | `/api/v1/auth/admin/roles/{role}/permissions/` | Required bearer access token | `SYSTEM_ADMIN` | Update a role permission baseline or apply role-shaped permissions to assigned users | Implemented |
| `POST` | `/api/v1/applications/` | Public with LRN verification token; bearer token optional | `AllowAny` for initial registration | Create a registration draft, or create and submit final registration with `submitOnCreate` | Implemented |
| `GET` | `/api/v1/applications/{applicationId}/` | Required bearer access token | Owning `STUDENT`, or `ADMISSIONS_REVIEWER`/`SYSTEM_ADMIN` for non-draft applications | Read an application detail record | Implemented |
| `GET` | `/api/v1/applications/{applicationId}/identity-media/{mediaType}/` | Required bearer access token | Owning `STUDENT`, or `ADMISSIONS_REVIEWER`/`SYSTEM_ADMIN` for non-draft applications | Stream a private application identity image for authorized review/display | Implemented |
| `PATCH` | `/api/v1/applications/{applicationId}/` | Required bearer access token | Owning `STUDENT` | Update an editable owned application using optimistic concurrency | Implemented |
| `POST` | `/api/v1/applications/{applicationId}/submit/` | Required bearer access token | Owning `STUDENT` | Validate and submit or resubmit an application | Implemented |
| `GET` | `/api/v1/applications/review-queue/` | Required bearer access token | `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN` | List submitted registration applications for admissions review | Implemented |
| `POST` | `/api/v1/applications/{applicationId}/review-decision/` | Required bearer access token | `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN` | Persist reviewer decision as application status update | Implemented |
| `POST` | `/api/v1/applications/registration/lrn/verify/` | Public; device/network throttled | `AllowAny` | Verify an LRN through the configured registry boundary and return available profile fields | Implemented with synthetic local/test provider; production provider `TBD` |
| `POST` | `/api/v1/applications/registration/email-otp/request/` | Public; device/network throttled | `AllowAny` | Generate and send a registration email OTP | Implemented with Django email backend; local prints to console, production uses Azure Communication Services SMTP |
| `POST` | `/api/v1/applications/registration/email-otp/verify/` | Public; device/network throttled | `AllowAny` | Verify a registration email OTP and issue a short-lived email verification token | Implemented |
| `GET` | `/api/v1/configuration/fields/?module=student_registration` | Public | `AllowAny` | Return enabled configurable field rows used by Step 1 | Implemented |
| `GET` | `/api/v1/applications/registration/step-2/configuration/` | Public | `AllowAny` | Return the currently effective Step 2 requirements | Implemented |
| `GET`, `POST` | `/api/v1/applications/registration/step-2/` | Public with registration token | `AllowAny` | Read progress or upload one private JPEG/PNG identity image | Implemented |
| `POST` | `/api/v1/applications/registration/identity/manual-selfie-face/` | Public; device/network throttled | `AllowAny` | Validate a manual-registration captured selfie server-side without storing media | Implemented |
| `GET`, `POST` | `/api/v1/configuration/admin/fields/` | Bearer token | `SYSTEM_ADMIN` or `DEPED_ADMIN` | List or create configurable field maintenance rows; supports `?module=...` filtering | Implemented |
| `PUT`, `PATCH`, `DELETE` | `/api/v1/configuration/admin/fields/{fieldId}/` | Bearer token | `SYSTEM_ADMIN` or `DEPED_ADMIN` | Update or delete a configurable field maintenance row | Implemented |
| `GET`, `POST` | `/api/v1/applications/configuration/step-2/` | Bearer token | `SYSTEM_ADMIN` or `DEPED_ADMIN` | List configuration versions or create a new effective version | Implemented |
| `POST` | `/api/v1/applications/registration/step-2/{verificationId}/manual-decision/` | Bearer token | `SYSTEM_ADMIN`, `DEPED_ADMIN`, or `ADMISSIONS_REVIEWER` | Decide a pending manual identity review | Implemented |

### Student application draft and submission

Before draft creation, call `POST /api/v1/applications/registration/lrn/verify/`:

```json
{
  "lrn": "123456789012",
  "verificationCategory": "email",
  "verificationValue": "lovely@yopmail.com"
}
```

`verificationCategory` may be `email`, `birthday`, `student_id`, `mobile`, or `mother_name`. The backend compares `verificationValue` with the corresponding registered value in the configured LRN registry provider when those fields are supplied. A mismatch returns `400 LRN_VERIFICATION_FAILED`.

Local and test settings use a synthetic registry record for that LRN. A successful response contains an opaque, 15-minute `verificationToken`, the registry-sourced read-only profile, and an immutable snapshot of the active identity verification configuration. The profile contains the Step 1 high-priority information returned by the registry: LRN, birth date, first/middle/last name, extension name when applicable, sex, school ID, school name, grade level, enrollment status, and school year. The student must then complete the Step 1 Identity & Biometrics selfie flow using the same registration token. When a verification token is supplied during account creation, the backend overwrites those high-priority fields with verified registry values and marks the identity state as `VERIFIED`.

Step 1 Identity & Biometrics uses two token-protected selfie endpoints:

- `POST /api/v1/applications/registration/identity/selfie-face/` accepts `multipart/form-data` with `file` plus `X-Registration-Token` and returns server-side live-frame face validation without storing media, including `faceDetected`, `faceCount`, `confidence`, `boundingBox`, `faceCovered`, and per-check selfie quality results.
- `POST /api/v1/applications/registration/identity/selfie/` accepts `multipart/form-data` with `file`, validates that exactly one centered uncovered frontal face is present server-side, and stores the image as the student's enrolled biometric reference. The stored selfie response includes the same server validation details under `results.serverFaceValidation`.
- `POST /api/v1/applications/registration/identity/manual-selfie-face/` accepts `multipart/form-data` with `file` and validates manual-registration captured selfies server-side without storing media or requiring an LRN verification token. This endpoint is for the captured preview acceptance gate before the student can use the photo.
- Manual Step 1 selfie capture uses frontend live detection/countdown for camera timing, then backend captured-photo validation before the photo can be used.

The LRN-protected selfie endpoints require `X-Registration-Token` from successful LRN verification. Files are private, limited to 5 MB, and accepted only when their bytes have a JPEG or PNG signature. The OpenCV provider enforces exactly one face, minimum 480 x 360 px resolution in either portrait or landscape orientation, face size between 20% and 70% of the image, face-crop Laplacian blur variance above 20, acceptable brightness between 60 and 200, and centered framing. Landmark visibility, eye-open, and yaw/pitch/roll checks are returned as provider-dependent when the selected detector cannot evaluate them. Local development uses `STEP1_SELFIE_FACE_PROVIDER=opencv`, tests use a deterministic mock, and production refuses `mock` or `unavailable`. Registration selfie metadata is stored in `RegistrationSelfieMedia`; Student ID front/back metadata remains in `ApplicationIdentityMedia`. Manual-registration selfies are stored for admissions reviewer inspection only and do not mark identity as verified. File retention and production object storage remain `TBD`. Application payloads and images are excluded from audit and request logging.

Step 1 field visibility and priority are driven by the shared configurable field maintenance table. Public registration reads enabled rows from `GET /api/v1/configuration/fields/?module=student_registration`. The maintenance row shape is `{id, module, section, type, value, fieldSection, inputType, optionValues, priority, remarks, status, display_order}`. Student registration rows use `module: "student_registration"` and `section: "Step 1 Registration"`. `fieldSection` controls the panel where the field appears on the Step 1 form, such as `Personal Information`, `School Information`, or `Additional Information`. Rows with `type: "Student Registration Field"`, `priority: "High Priority"`, and enabled `status` are required during registration. `inputType` controls rendering, such as `text`, `date`, or `dropdown`; dropdown rows must include `optionValues`, for example `["Grade 11", "Grade 12"]`. Known fields returned by LRN are autopopulated when available; enabled high-priority fields that are not present in the LRN response remain visible and must be manually entered by the student. Low-priority rows are not required for account creation, but they still belong to the Step 1 registration configuration rather than a separate post-login section.

Student registration verification methods are also maintained as configurable rows with `type: "Verification Method"`. Exactly one enabled Step 1 verification method is allowed. Enabling LRN or Manual Entry automatically disables the other verification methods, and the API rejects attempts to disable or delete the last enabled verification method. PhilSys is predefined but locked until future feature development is complete; attempts to enable it return `400 BAD REQUEST`. Ordinary `Student Registration Field` rows keep independent enable/disable behavior.

The primary local test learner (`123456789012`, birthdate `2008-05-15`) is Lovely Mae R Chavez of Taysan High School and Child Development Center, Grade 12. Only Grade 12 learners are eligible. Synthetic LRN `901234567899` represents an ineligible Grade 11 learner. No synthetic registry provider is enabled by base or production settings, and production rejects `LRN_REGISTRY_PROVIDER=mock`; the real DepEd provider remains `TBD`.

Unknown LRNs return `400 LRN_VERIFICATION_FAILED`; an unavailable registry returns `503 LRN_REGISTRY_UNAVAILABLE`; an existing active application in `ACTIVE_EXAM_CYCLE_ID` returns `409 CONFLICT`. Five failed attempts for one LRN start a 15-minute `429 LRN_COOLDOWN`. A separate device/network throttle applies on top. A conditional database uniqueness constraint protects both LRN/cycle and owner/cycle against concurrent non-rejected registrations. LRN values and dates of birth are not written to request or audit logs.

Application request and response bodies use five public sections: `personal` (object), `address` (object), `school` (object), `coursePreferences` (array of `{university, course}` objects), and `reviewStep` (object). The backend persists those sections in structured student-application holding tables, not JSON columns, so review, validation, reporting, and account activation can query stable fields. Responses include a backend-generated, read-only `candidateId` in `PS-YYYY-XXXX-XXXX` format, where `YYYY` is the registration year and the final eight characters are a unique random code. Responses also include read-only `lrnProfile` when the application was created from a verified LRN token, allowing admissions review screens to display the registry-sourced identity and school values used during registration. Responses include read-only `photoUrl` when stored identity media exists; it points to the enrolled selfie first and falls back to the Student ID front image when no selfie is available. Create accepts either a successful LRN verification token or manual Step 1 high-priority information when LRN/PhilSys verification is unavailable. Manual Step 1 account creation requires first name, last name, birth date, sex, school ID, school name, grade level, enrollment status, school year, email, mobile number, and password. Manual records are marked `MANUAL_PENDING` so the student can later add LRN or PhilSys ID for identity verification. Initial registration does not require an existing account before submission. When submission succeeds, the backend stores the pending registration credentials on the application but does not create or activate the Student account. The account is created, activated, linked as `owner`, and cleared of the pending password hash only after an admissions reviewer or system admin approves the application. The registration password is accepted only as a write-only top-level `password` field and is never returned in the JSON payload or API response. A second active/non-rejected registration for the same non-blank LRN and exam cycle returns `409 CONFLICT`; blank manual LRN values do not collide with one another, but each submitted registration still requires a unique account email.

Final public registration submission is performed by adding `submitOnCreate: true` to the create request:

```json
{
  "verificationToken": "opaque-lrn-proof",
  "submitOnCreate": true,
  "password": "Password1!",
  "personal": {},
  "address": {},
  "school": {},
  "coursePreferences": [],
  "reviewStep": {}
}
```

When `submitOnCreate` is true for initial registration, the backend validates Step 1 high-priority information plus account credentials, stores the pending password hash, and returns a `SUBMITTED` registration record without creating an active Student account. The Student account becomes usable only after admissions approval. If validation fails, no draft is left behind. This is the expected path for applicants who do not yet have Student Portal accounts.

Before enabling mobile number and password entry, call `POST /api/v1/applications/registration/email-otp/request/`:

```json
{
  "email": "student@example.test"
}
```

The backend generates a six-digit OTP, stores only a keyed hash in the cache, and sends the raw OTP through Django email. Local development uses the console email backend, so the OTP appears in the Django terminal. Production must set `AUTH_EMAIL_PROVIDER=azure_communication_services_smtp` and Azure Communication Services SMTP credentials. The request response contains only the normalized email, expiration, and resend cooldown; it never contains the OTP.

Then call `POST /api/v1/applications/registration/email-otp/verify/`:

```json
{
  "email": "student@example.test",
  "code": "123456"
}
```

A successful verification returns `emailVerificationToken`. OTP verification attempts are not persisted in the application audit log. Initial registration submission with `submitOnCreate` must include that token as `emailVerificationToken`, and the backend verifies that the token matches the submitted `personal.email` before storing account credentials. Invalid or expired OTPs return `400 REGISTRATION_EMAIL_OTP_FAILED`; resend cooldown returns `429 REGISTRATION_EMAIL_OTP_COOLDOWN`.

Read and update require ownership. Publicly submitted registrations are not linked to a Student account until approval. Updates are allowed only in `DRAFT` or `FOR_CORRECTION`. Every `PATCH` must include the last observed integer `version`; a stale value returns `409 CONFLICT` without overwriting newer data. A successful update increments `version`.

Submission request:

```json
{
  "version": 3
}
```

Submission requires the documented personal contact/name fields, complete permanent address fields, school/LRN/academic fields, at least one complete course preference, privacy consent, and declaration acceptance. The LRN must contain exactly 12 digits. Invalid or missing data returns `400 VALIDATION_FAILED` with section errors. A `DRAFT` becomes `SUBMITTED`; a `FOR_CORRECTION` application becomes `RESUBMITTED`. Other states return `409 CONFLICT`. Successful submission increments `version` and sets `submittedAt`.

Step 2 accepts `multipart/form-data` containing `mediaType` (`STUDENT_ID_FRONT` or `STUDENT_ID_BACK`) and `file`, plus the LRN proof in `X-Registration-Token`, for configured identity review workflows that still require Student ID media. A replacement supersedes the prior image of the same type. Step 2 no longer accepts selfie upload or selfie face validation; all selfie capture, validation, and storage belongs to the Step 1 Identity & Biometrics endpoints above. OCR provider selection remains `TBD`; completed Student ID uploads therefore route to manual review when enabled or reject otherwise.

In Student ID mode, the backend extracts the Student ID name and compares its normalized value with the full name returned by the verified LRN record. The configured name threshold is authoritative. The API returns both compared names, the score, and `informationComparisonPassed`. Local/test settings use a deterministic mock recognizer for the Lovely Mae R Chavez fixture. Production explicitly rejects that mock provider and routes unavailable real recognition to manual review or rejection according to the captured configuration.

Admissions reviewers can load the review ledger with `GET /api/v1/applications/review-queue/`. The queue excludes `DRAFT` applications and includes submitted, resubmitted, correction, approved, and rejected registration records ordered by latest submission/creation time. Admissions reviewers and system admins can read a non-draft application detail with `GET /api/v1/applications/{applicationId}/`; draft detail remains limited to the owning student. Authorized callers can render application identity images through `GET /api/v1/applications/{applicationId}/identity-media/{mediaType}/`, where `mediaType` is a stored identity media value such as `SELFIE` or `STUDENT_ID_FRONT`. Student and unauthenticated callers are denied from the review queue.

The applicant registration audit log displays:

| Date & Time | Candidate ID | Session ID | IP Address | Activity | User | Details |
| --- | --- | --- | --- | --- | --- | --- |
| Backend-generated timestamp | Candidate ID when available | Request session ID | Student IP address | Account Credentials Created | Student | Student Portal credentials created. |
| Backend-generated timestamp | Candidate ID | Request session ID | Request IP address | Student Account Activated | Submitted applicant name | Student account activated after application approval. |
| Backend-generated timestamp | Candidate ID | Request session ID | Student IP address | Registration Submitted | Submitted applicant name | Registration submitted for admission review. |

Registration audit responses include `candidateId` for reviewer-facing display and `applicationId` for the internal UUID reference when an application exists. New submitted-registration and account-activation audit rows use the same candidate ID in `registrationId` and `applicantId` to match the permanent candidate identifier shown to the applicant. The current backend persistence slice captures `Student Account Activated` and `Registration Submitted`; account credential audit persistence remains `TBD`.

### `POST /api/v1/applications/registration/email-otp/request/`

Implemented in `backend/apps/applications/tests/test_registration_email_otp.py`.

### `POST /api/v1/applications/registration/email-otp/verify/`

Implemented in `backend/apps/applications/tests/test_registration_email_otp.py`.

Reviewer decisions are persisted through `POST /api/v1/applications/{applicationId}/review-decision/`:

```json
{
  "decision": "APPROVE",
  "reason": "Verified.",
  "requiredCorrections": []
}
```

Supported decisions are `APPROVE`, `REQUEST_CORRECTION`, and `REJECT`, which update the application status to `APPROVED`, `FOR_CORRECTION`, and `REJECTED` respectively. Reviewer approval creates and activates the Student account, links it to the application, and clears the pending password hash. A `REJECT` decision clears any remaining pending password hash without creating an account. Decisions are allowed only while the application is `SUBMITTED`, `RESUBMITTED`, or `FOR_CORRECTION`; other states return `409 CONFLICT`.

Test coverage: `backend/apps/applications/tests/test_application_endpoints.py` and `backend/apps/configuration/tests/test_configurable_field_endpoints.py`.

### `GET /api/v1/health/`

Use this endpoint for local smoke tests and lightweight service liveness checks.

Request:

- Body: none.
- Query parameters: none.
- Authentication: none.

Successful response:

```json
{
  "status": "ok"
}
```

Response behavior:

- `200 OK` returns only the static health status payload above.
- The response deliberately excludes database status, storage status, dependency status, infrastructure internals, secrets, credentials, hostnames, connection strings, and environment details.
- Supported response format follows the project JSON-only API baseline.
- Responses include the standard `X-Correlation-ID` header.
- CORS headers are returned only when the request origin is configured as allowed.
- Unsupported methods use the standard API error envelope with `METHOD_NOT_ALLOWED`.

Test coverage:

- Behavior tests: `backend/apps/core/tests/test_health.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `GET /api/v1/auth/session/`

Use this endpoint for frontend session bootstrap after the user has completed the full backend authentication flow. The endpoint returns only server-derived identity, role, permission, and scope claims. Clients must not supply roles, permissions, scopes, route selections, dashboard selections, or local-storage values as authorization evidence.

Current implementation status: the route, permission boundary, response contract, and tests exist. Real bearer-token validation remains pending until the login, refresh, and revocation workflows are implemented.

Request:

- Body: none.
- Query parameters: none.
- Authentication: bearer access token from the backend session flow.

Successful response:

```json
{
  "user": {
    "id": "opaque-user-id",
    "role": "STUDENT",
    "securityTier": 1,
    "permissions": [
      "applications:create",
      "applications:read-own"
    ],
    "scopes": {
      "studentId": "opaque-student-id"
    }
  },
  "session": {
    "authenticated": true,
    "expiresAt": null
  }
}
```

Response behavior:

- `200 OK` returns the current authenticated session context when backend token validation succeeds.
- `401 NOT_AUTHENTICATED` is returned when no credentials are supplied.
- `401 AUTHENTICATION_FAILED` is returned for supplied bearer tokens until token validation is implemented.
- Responses include the standard `X-Correlation-ID` header.
- The endpoint must not expose password state, OTP state, refresh tokens, pending-auth tokens, raw access tokens, internal user table names, infrastructure details, or sensitive personal data.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_session_endpoint.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/login/identifier/`

Use this endpoint for Step 1 of the shared login flow. It accepts one identifier field labeled "LRN or Email". The backend routes lookup by identifier format, not by user-selected role.

Current implementation status: request validation, account lookup, pending-auth token storage, safe error shape, and audit events exist.

Request:

```json
{
  "identifier": "123456789012"
}
```

Validation behavior:

- A 12-digit numeric identifier is accepted as LRN format.
- A valid email address is accepted as email format.
- Any other format returns `400 VALIDATION_FAILED`.

Current response behavior:

- Unknown, inactive, or invalid identifiers return `401 AUTHENTICATION_FAILED` with `Identifier not found or invalid. Please check and try again.`
- Active accounts with usable passwords receive a password-step pending token.
- Active staff/admin accounts without usable passwords receive an activation token for first-time password setup.
- The response must not reveal whether a rejected identifier belongs to a student, staff/admin user, inactive account, suspended account, or unverified account.

Password-step response:

```json
{
  "pendingAuthToken": "opaque-step-1-token",
  "nextStep": "password",
  "expiresInSeconds": 600
}
```

First-time staff/admin activation response:

```json
{
  "activationToken": "opaque-activation-token",
  "nextStep": "activation",
  "expiresInSeconds": 600
}
```

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_login_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/login/password/`

Use this endpoint for Step 2 of the shared login flow. It accepts the Step-1 pending-auth token and password.

Current implementation status: request validation, pending-token validation, password hash verification, OTP generation, OTP hashing, email dispatch, account OTP request limits, IP monitoring, safe error shape, and audit events are implemented.

Request:

```json
{
  "pendingAuthToken": "opaque-step-1-token",
  "password": "user-supplied-password"
}
```

Response behavior:

- Missing password returns `400 VALIDATION_FAILED`.
- Invalid or expired pending-auth tokens return `401 AUTHENTICATION_FAILED` with `Your session has expired. Please start again.`.
- Accepted password submissions count as OTP requests for account-level rate limits.
- Account OTP request limit violations return `429 OTP_RATE_LIMITED` with `meta.retryAfterSeconds`.
- Passwords must never be logged or returned.

Successful response:

```json
{
  "otpPendingAuthToken": "opaque-step-2-token",
  "nextStep": "otp",
  "expiresInSeconds": 300,
  "resendCooldownSeconds": 60
}
```

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_login_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/login/otp/`

Use this endpoint for Step 3 of the shared login flow. It accepts the OTP-scoped pending-auth token and a six-digit email OTP.

Current implementation status: request validation, OTP verification, OTP-attempt lockout, safe error shape, and tests exist. A successful OTP response does not issue a full session; it issues a selfie-scoped pending-auth token for the required login selfie photo log.

Request:

```json
{
  "otpPendingAuthToken": "opaque-step-2-token",
  "code": "123456"
}
```

Validation behavior:

- `code` must be a six-digit numeric string.
- Invalid format returns `400 VALIDATION_FAILED`.
- Invalid or expired OTPs return `401 AUTHENTICATION_FAILED`.
- The OTP is bound to the OTP pending-auth token, single-use, and consumed immediately on successful verification.
- Five failed OTP verification attempts invalidate the OTP pending-auth token.

Successful response:

```json
{
  "selfiePendingAuthToken": "opaque-step-4-token",
  "nextStep": "selfie",
  "expiresInSeconds": 600
}
```

### `POST /api/v1/auth/login/otp/resend/`

Use this endpoint to request a replacement email OTP for an active Step-3 login challenge.

Request:

```json
{
  "otpPendingAuthToken": "opaque-step-2-token"
}
```

Successful response:

```json
{
  "otpPendingAuthToken": "opaque-step-2-token",
  "nextStep": "otp",
  "expiresInSeconds": 300,
  "resendCooldownSeconds": 60
}
```

Validation behavior:

- Missing `otpPendingAuthToken` returns `400 VALIDATION_FAILED`.
- Invalid or expired pending OTP tokens return `401 AUTHENTICATION_FAILED`.
- Requests inside the resend cooldown return `429 OTP_COOLDOWN`.
- Resend resets the pending-auth inactivity timer but does not extend the absolute pending-auth expiry.
- Resend is rejected when less than 90 seconds remain before absolute pending-auth expiry.
- The replacement OTP invalidates the previous OTP. Its expiry is `min(5 minutes, remaining absolute pending-auth lifetime)`.
- Initial OTP sends and resends both count toward account OTP request limits: 5 per rolling 15 minutes and 20 per rolling 24 hours.
- Account request limit violations escalate backoff to 5 minutes, then 15 minutes, then 1 hour, and return `429 OTP_RATE_LIMITED` with `meta.retryAfterSeconds`.
- IP thresholds are monitored at 20 OTP requests per 15 minutes and 80 per 24 hours. Thresholds log safe security events and may add a short server delay, but do not hard-block by default.
- The backend never returns the OTP code outside local development settings.

### `POST /api/v1/auth/login/selfie/`

Use this endpoint for Step 4 of the shared login flow. It accepts `multipart/form-data` with the selfie-scoped pending-auth token and a captured camera image. The selfie is stored as login evidence only; it is not used for facial recognition or face matching.

Request:

```text
selfiePendingAuthToken=opaque-step-4-token
file=<JPEG or PNG image>
```

Successful response:

```json
{
  "accessToken": "jwt-access-token",
  "tokenType": "Bearer",
  "expiresInSeconds": 1200,
  "expiresAt": "2026-07-13T10:00:00Z"
}
```

The 7-day refresh JWT must be issued separately as an HttpOnly, Secure, SameSite=Strict cookie.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_login_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/logout/`

Use this endpoint to end the current authenticated session. It requires backend authentication and must not trust frontend-local session state.

Current implementation status: route, authentication boundary, refresh-cookie clearing, and tests exist. Durable refresh-token revocation, access-token family tracking, and logout audit events remain pending until the token store is implemented.

Request:

- Body: none.
- Authentication: bearer access token from the backend session flow.

Current successful response:

- `204 No Content`.
- Clears the `refreshToken` cookie with `SameSite=Strict`.

Error behavior:

- `401 NOT_AUTHENTICATED` is returned when no valid authenticated backend session exists.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_token_session_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/activation/student-registration/`

Use this endpoint only as an internal/protected fallback when an approved registration needs its associated Student account created or reactivated. Reviewer approval normally activates the account as part of the application decision.

Current implementation status: route, role boundary, request validation, approved-application lookup, student account persistence, role assignment, duplicate-account checks, and tests exist. Session invalidation and notification/audit side effects remain pending.

Request:

```json
{
  "registrationApplicationId": "opaque-application-id"
}
```

Response behavior:

- `401 NOT_AUTHENTICATED` is returned when no valid authenticated backend session exists.
- `403 PERMISSION_DENIED` is returned for roles other than `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN`.
- `201 Created` is returned after the Student account is created or an already linked account is reactivated.
- `409 CONFLICT` is returned when the registration is not approved, is missing account credentials, or conflicts with an existing email/LRN account.

The backend assigns the Student role automatically. Students must never be allowed to assign, modify, or elevate their own roles. The pending registration password hash is cleared after account activation.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_activation_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/recovery/password/request/`

Use this endpoint to request password recovery instructions for a Student or staff/admin account. The response must not reveal whether the identifier exists, whether the account is inactive, or which account table/role matched.

Current implementation status: route, identifier validation, anti-enumeration response, recovery-token generation, token hashing/storage, email delivery, auth recovery throttle scope, audit event, and tests exist.

Request:

```json
{
  "identifier": "student@example.test"
}
```

Validation behavior:

- A 12-digit numeric identifier is accepted as LRN format.
- A valid email address is accepted as email format.
- Any other format returns `400 VALIDATION_FAILED`.

Current successful response:

```json
{
  "detail": "If the account can be recovered, instructions will be sent to the verified email address."
}
```

Response status is `202 Accepted` for every well-formed identifier, regardless of account existence.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_recovery_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/recovery/password/inspect/`

Use this endpoint to show safe account context on the password reset page. The client must submit the opaque recovery token in the request body, not in a query string.

Current implementation status: route, recovery-token lookup, safe masked email display, safe expired-link response, and tests exist.

Request:

```json
{
  "recoveryToken": "opaque-recovery-token"
}
```

Successful response:

```json
{
  "accountLabel": "cha***@gmail.com",
  "maskedEmail": "cha***@gmail.com"
}
```

Response behavior:

- `200 OK` is returned for a valid, unused, unexpired recovery token.
- `401 AUTHENTICATION_FAILED` with `This recovery link has expired. Please request a new one.` is returned for missing, expired, already-used, or invalid recovery tokens.
- The response must not include raw recovery tokens, password state, internal user IDs, roles, or unmasked email addresses when no account display name is available.

### `POST /api/v1/auth/recovery/password/complete/`

Use this endpoint to complete password recovery from a secure, time-limited recovery link. Completing recovery must not create a session; the user must complete the normal three-step login flow after reset.

Current implementation status: route, password-policy validation, password-confirmation validation, recovery-token lookup, password hashing, single-use token consumption, refresh-session revocation, safe expired-link response, audit event, and tests exist.

Request:

```json
{
  "recoveryToken": "opaque-recovery-token",
  "password": "user-supplied-password",
  "confirmPassword": "user-supplied-password"
}
```

Validation behavior:

- `password` must be at least 8 characters and include uppercase, lowercase, number, and special character.
- `confirmPassword` must match `password`.
- Passwords and recovery tokens must never be logged or returned.

Current response behavior:

- `400 VALIDATION_FAILED` is returned for invalid password policy or mismatched confirmation.
- `401 AUTHENTICATION_FAILED` with `This recovery link has expired. Please request a new one.` is returned for missing, expired, already-used, or invalid recovery tokens.
- `204 No Content` is returned after the password is reset successfully.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_recovery_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/recovery/admin/request/`

Use this endpoint when an authorized System Admin initiates staff/admin account recovery. The System Admin must not set or know the user's password; the system sends a user-controlled recovery link to the account email when eligible.

Current implementation status: route, System Admin role boundary, email validation, anti-enumeration response, and tests exist. Account lookup, recovery-token generation/storage, email delivery, rate limits, and audit events remain pending.

Request:

```json
{
  "email": "staff@example.test"
}
```

Current successful response:

```json
{
  "detail": "If the account can be recovered, instructions will be sent to the verified email address."
}
```

Response status is `202 Accepted` for every well-formed email when called by a System Admin, regardless of account existence.

Error behavior:

- `401 NOT_AUTHENTICATED` is returned when no valid authenticated backend session exists.
- `403 PERMISSION_DENIED` is returned for roles other than `SYSTEM_ADMIN`.
- `400 VALIDATION_FAILED` is returned for invalid email format.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_recovery_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `GET /api/v1/auth/admin/roles/`

Use this endpoint to load backend-managed role permission baselines for the User & Role Settings screen. It returns fixed staff/admin `PortalRole` values only; dynamic custom-role persistence remains `TBD`.

Permissions are resolved from structured `RolePermission`, `AccountRoleAssignment`, and `AccountPermission` rows. The former account permission JSONField was removed in the structured permissions Phase 3 cleanup.

Request:

- Body: none.
- Authentication: bearer access token from the backend session flow.
- Permission: `SYSTEM_ADMIN`.

Successful response:

```json
{
  "roles": [
    {
      "id": "SYSTEM_ADMIN",
      "name": "SYSTEM_ADMIN",
      "moduleAccess": ["MOD_31_READ", "MOD_31_EDIT"],
      "assignedUserCount": 2
    }
  ]
}
```

Error behavior:

- `401 NOT_AUTHENTICATED` is returned when no valid authenticated backend session exists.
- `403 PERMISSION_DENIED` is returned for roles other than `SYSTEM_ADMIN`.

### `PUT /api/v1/auth/admin/roles/{role}/permissions/`

Use this endpoint when a System Admin changes a role's modular permission set. Permission codes are validated against the structured `MOD_{moduleId}_{action}` format, supported module IDs `1` through `56`, and supported actions for each module. The permission applicability catalog is backend-owned at `backend/apps/accounts/permission_catalog.json`; the frontend consumes a generated copy that must be refreshed with `python scripts/generate_permission_catalog.py` after catalog changes. Selected users must be active users currently assigned to `{role}`.

Request:

```json
{
  "moduleAccess": ["MOD_31_READ", "MOD_31_EDIT"],
  "scope": "baseline_only",
  "selectedUserIds": []
}
```

Supported `scope` values:

- `baseline_only`: update the role baseline and preserve existing effective permissions for users already assigned to the role.
- `all_assigned`: update the role baseline and apply the new permission set to every active user assigned to the role.
- `selected_users`: do not mutate the role baseline; apply the submitted permission set only to `selectedUserIds`.

Successful response:

```json
{
  "id": "SYSTEM_ADMIN",
  "name": "SYSTEM_ADMIN",
  "moduleAccess": ["MOD_31_READ", "MOD_31_EDIT"],
  "assignedUserCount": 2
}
```

Error behavior:

- `400 VALIDATION_FAILED` is returned for unsupported roles, unsupported permission codes, unsupported scope values, missing selected users for `selected_users`, or selected users outside the target role.
- `401 NOT_AUTHENTICATED` is returned when no valid authenticated backend session exists.
- `403 PERMISSION_DENIED` is returned for roles other than `SYSTEM_ADMIN`.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_admin_role_endpoints.py`.

### `POST /api/v1/auth/activation/staff/complete/`

Use this endpoint for first-time staff/admin activation from a secure, time-limited activation link sent during System Admin provisioning.

Current implementation status: route, request validation, password-policy validation, activation-token lookup, password hashing, activation completion, and safe expired-link response exist. Durable token revocation and delivery remain TBD.

Request:

```json
{
  "activationToken": "opaque-activation-token",
  "password": "user-supplied-password",
  "confirmPassword": "user-supplied-password"
}
```

Validation behavior:

- `password` must be at least 8 characters and include uppercase, lowercase, number, and special character.
- `confirmPassword` must match `password`.
- Passwords and activation tokens must never be logged or returned.

Current response behavior:

- `400 VALIDATION_FAILED` is returned for invalid password policy or mismatched confirmation.
- `401 AUTHENTICATION_FAILED` with `This activation link has expired. Please request a new one from your administrator.` is returned for expired, invalid, already-used, or ineligible activation tokens.

Successful response:

- `204 No Content`.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_activation_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/token/refresh/`

Use this endpoint to rotate a valid refresh token and issue a new access token. The refresh token must be read from an HttpOnly, Secure, SameSite=Strict cookie, not from frontend JavaScript storage.

Current implementation status: route, safe session-expired error, and tests exist. Refresh-token lookup, rotation, replay detection, cookie replacement, access-token issuance, and audit events remain pending until the token store is implemented.

Request:

- Body: none.
- Authentication: refresh token cookie.

Current response behavior:

- `401 AUTHENTICATION_FAILED` with `Your session has expired. Please log in again.` until refresh-token storage exists.

Future successful response:

```json
{
  "accessToken": "jwt-access-token",
  "tokenType": "Bearer",
  "expiresInSeconds": 1200
}
```

The rotated 7-day refresh JWT must be issued separately as an HttpOnly, Secure, SameSite=Strict cookie.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_token_session_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/token/revoke/`

Use this endpoint to revoke tokens for the authenticated account. The backend decides which tokens belong to the user; clients may only request the revocation scope.

Current implementation status: route, authentication boundary, request validation, and tests exist. Durable token-family revocation, real-time session invalidation across active tokens, and audit events remain pending until the token store is implemented.

Request:

```json
{
  "scope": "current"
}
```

Validation behavior:

- `scope` may be `current` or `all`.
- Missing `scope` defaults to `current`.
- Invalid scope returns `400 VALIDATION_FAILED`.

Current successful response:

- `204 No Content` for an authenticated request.

Error behavior:

- `401 NOT_AUTHENTICATED` is returned when no valid authenticated backend session exists.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_token_session_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

## Candidate endpoint groups

| Capability | Candidate base path | Status |
| --- | --- | --- |
| Authentication and sessions | `/api/v1/auth` | Partially implemented: current-session, three-step login, logout, refresh, revocation, activation, and recovery boundaries only; account storage, token storage, email delivery, durable revocation, and audit events remain `TBD` |
| Student registration/applications | `/api/v1/applications` | Partially implemented: owned draft create/read/update and submit/resubmit; documents and reviewer transitions remain `TBD` |
| Student and registry verification | `/api/v1/verifications` | `TBD` |
| Assessments and question banks | `/api/v1/assessments` | `TBD` |
| Exam schedules, attempts, responses | `/api/v1/exams` | `TBD` |
| Proctoring sessions and incidents | `/api/v1/proctoring` | `TBD` |
| Scores and result release | `/api/v1/results` | `TBD` |
| Administrative users/configuration | `/api/v1/administration` | `TBD` |
| External integrations | `/api/v1/integrations` | `TBD` |
| Authorized audit queries | `/api/v1/audit-events` | `TBD` |

Do not implement from this table alone. For each endpoint, approve the actor, authorization rule, request/response schema, validation, state transition, idempotency/concurrency behavior, audit event, errors, rate limit, privacy classification, retention, and tests.

## Contract workflow

1. Link the endpoint to approved requirements in [BRD](../BRD.md), [modules](../MODULES.md), or [user stories](../USER_STORY.md).
2. Define the contract according to [API standards](API-STANDARDS.md), then include it in the generated OpenAPI schema once the endpoint is implemented.
3. Review security and privacy implications.
4. Implement backend and frontend service adapters against the same contract.
5. Add backend, contract, and relevant frontend tests before marking it available.
6. Complete the [frontend adapter handoff](API-STANDARDS.md#frontend-adapter-handoff) before replacing any mock/local service with the backend endpoint.
