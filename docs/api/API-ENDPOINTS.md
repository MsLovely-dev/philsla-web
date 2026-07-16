# API Endpoints

## Current state

The baseline health and authentication boundaries plus the first student-application slice are implemented. The frontend currently uses mock/local services. Unimplemented business paths below remain a capability inventory rather than an approved contract. OpenAPI 3 through DRF Spectacular is the accepted machine-readable contract approach after [ADR-014](../decisions/ADR-014-API-SCHEMA-TOOLING-AND-PUBLICATION.md), but schema tooling is not installed yet.

## Implemented baseline endpoints

| Method | Path | Authentication | Permission | Purpose | Status |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health/` | Public; no credentials required | `AllowAny` | Safe service liveness smoke check | Implemented |
| `GET` | `/api/v1/auth/session/` | Required bearer access token | `IsAuthenticated` | Return server-derived session, role, permission, and scope claims | Implemented boundary; token validation pending |
| `POST` | `/api/v1/auth/login/identifier/` | Public; no credentials required | `AllowAny` | Validate LRN/email format and start Step 1 identifier resolution | Implemented boundary; account lookup pending |
| `POST` | `/api/v1/auth/login/password/` | Public with Step-1 pending-auth token | `AllowAny` | Validate password-step payload and advance to OTP | Implemented boundary; pending-token/password verification pending |
| `POST` | `/api/v1/auth/login/otp/` | Public with OTP pending-auth token | `AllowAny` | Validate OTP-step payload and complete session issuance | Implemented boundary; OTP/session issuance pending |
| `POST` | `/api/v1/auth/logout/` | Required bearer access token | `IsAuthenticated` | Revoke current session and clear refresh cookie | Implemented boundary; durable revocation pending |
| `POST` | `/api/v1/auth/token/refresh/` | Refresh cookie | `AllowAny` | Rotate refresh token and issue a new access token | Implemented boundary; token store pending |
| `POST` | `/api/v1/auth/token/revoke/` | Required bearer access token | `IsAuthenticated` | Revoke current or all token families for the authenticated account | Implemented boundary; durable revocation pending |
| `POST` | `/api/v1/auth/activation/student-registration/` | Required bearer access token | `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN` | Create or reactivate a Student account for a submitted registration | Implemented |
| `POST` | `/api/v1/auth/activation/staff/complete/` | Public activation link | `AllowAny` | Complete first-time staff/admin activation by setting the user's password | Implemented boundary; activation-token storage pending |
| `POST` | `/api/v1/auth/recovery/password/request/` | Public; no credentials required | `AllowAny` | Request password recovery instructions without account enumeration | Implemented boundary; email/token storage pending |
| `POST` | `/api/v1/auth/recovery/password/complete/` | Public recovery link | `AllowAny` | Complete password reset from a recovery link | Implemented boundary; recovery-token storage pending |
| `POST` | `/api/v1/auth/recovery/admin/request/` | Required bearer access token | `SYSTEM_ADMIN` | Initiate staff/admin account recovery without setting a password for the user | Implemented boundary; email/token storage pending |
| `POST` | `/api/v1/applications/` | Public with LRN verification token; bearer token optional | `AllowAny` for initial registration | Create a registration draft, or create and submit final registration with `submitOnCreate` | Implemented |
| `GET` | `/api/v1/applications/{applicationId}/` | Required bearer access token | Owning `STUDENT` | Read an owned application | Implemented |
| `PATCH` | `/api/v1/applications/{applicationId}/` | Required bearer access token | Owning `STUDENT` | Update an editable owned application using optimistic concurrency | Implemented |
| `POST` | `/api/v1/applications/{applicationId}/submit/` | Required bearer access token | Owning `STUDENT` | Validate and submit or resubmit an application | Implemented |
| `GET` | `/api/v1/applications/review-queue/` | Required bearer access token | `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN` | List submitted registration applications for admissions review | Implemented |
| `POST` | `/api/v1/applications/{applicationId}/review-decision/` | Required bearer access token | `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN` | Persist reviewer decision as application status update | Implemented |
| `POST` | `/api/v1/applications/registration/lrn/verify/` | Public; device/network throttled | `AllowAny` | Verify an LRN through the configured registry boundary and return available profile fields | Implemented with synthetic local/test provider; production provider `TBD` |
| `GET` | `/api/v1/configuration/fields/?module=student_registration` | Public | `AllowAny` | Return enabled configurable field rows used by Step 1 | Implemented |
| `GET` | `/api/v1/applications/registration/step-2/configuration/` | Public | `AllowAny` | Return the currently effective Step 2 requirements | Implemented |
| `GET`, `POST` | `/api/v1/applications/registration/step-2/` | Public with registration token | `AllowAny` | Read progress or upload one private JPEG/PNG identity image | Implemented |
| `GET`, `POST` | `/api/v1/configuration/admin/fields/` | Bearer token | `SYSTEM_ADMIN` or `DEPED_ADMIN` | List or create configurable field maintenance rows; supports `?module=...` filtering | Implemented |
| `PUT`, `PATCH`, `DELETE` | `/api/v1/configuration/admin/fields/{fieldId}/` | Bearer token | `SYSTEM_ADMIN` or `DEPED_ADMIN` | Update or delete a configurable field maintenance row | Implemented |
| `GET`, `POST` | `/api/v1/applications/configuration/step-2/` | Bearer token | `SYSTEM_ADMIN` or `DEPED_ADMIN` | List configuration versions or create a new effective version | Implemented |
| `POST` | `/api/v1/applications/registration/step-2/{verificationId}/manual-decision/` | Bearer token | `SYSTEM_ADMIN`, `DEPED_ADMIN`, or `ADMISSIONS_REVIEWER` | Decide a pending manual identity review | Implemented |

### Student application draft and submission

Before draft creation, call `POST /api/v1/applications/registration/lrn/verify/`:

```json
{
  "lrn": "123456789012"
}
```

Local and test settings use a synthetic registry record for that LRN. A successful response contains an opaque, 15-minute `verificationToken`, the registry-sourced read-only profile, and an immutable snapshot of the active Step 2 configuration. The profile contains the Step 1 high-priority information returned by the registry: LRN, birth date, first/middle/last name, extension name when applicable, sex, school ID, school name, grade level, enrollment status, and school year. When a verification token is supplied during account creation, the backend overwrites those high-priority fields with verified registry values and marks the identity state as `VERIFIED`.

Step 1 field visibility and priority are driven by the shared configurable field maintenance table. Public registration reads enabled rows from `GET /api/v1/configuration/fields/?module=student_registration`. The maintenance row shape is `{id, module, section, type, value, fieldSection, inputType, optionValues, priority, remarks, status, display_order}`. Student registration rows use `module: "student_registration"` and `section: "Step 1 Registration"`. `fieldSection` controls the panel where the field appears on the Step 1 form, such as `Personal Information`, `School Information`, or `Additional Information`. Rows with `type: "Student Registration Field"`, `priority: "High Priority"`, and enabled `status` are required during registration. `inputType` controls rendering, such as `text`, `date`, or `dropdown`; dropdown rows must include `optionValues`, for example `["Grade 11", "Grade 12"]`. Known fields returned by LRN are autopopulated when available; enabled high-priority fields that are not present in the LRN response remain visible and must be manually entered by the student. Low-priority rows are not required for account creation, but they still belong to the Step 1 registration configuration rather than a separate post-login section.

Student registration verification methods are also maintained as configurable rows with `type: "Verification Method"`. Exactly one enabled Step 1 verification method is allowed. Enabling LRN or Manual Entry automatically disables the other verification methods, and the API rejects attempts to disable or delete the last enabled verification method. PhilSys is predefined but locked until future feature development is complete; attempts to enable it return `400 BAD REQUEST`. Ordinary `Student Registration Field` rows keep independent enable/disable behavior.

The primary local test learner (`123456789012`, birthdate `2008-05-15`) is Lovely Mae R Chavez of Taysan High School and Child Development Center, Grade 12. Only Grade 12 learners are eligible. Synthetic LRN `901234567899` represents an ineligible Grade 11 learner. No synthetic registry provider is enabled by base or production settings, and production rejects `LRN_REGISTRY_PROVIDER=mock`; the real DepEd provider remains `TBD`.

Unknown LRNs return `400 LRN_VERIFICATION_FAILED`; an unavailable registry returns `503 LRN_REGISTRY_UNAVAILABLE`; an existing active application in `ACTIVE_EXAM_CYCLE_ID` returns `409 CONFLICT`. Five failed attempts for one LRN start a 15-minute `429 LRN_COOLDOWN`. A separate device/network throttle applies on top. A conditional database uniqueness constraint protects both LRN/cycle and owner/cycle against concurrent non-rejected registrations. LRN values and dates of birth are not written to request or audit logs.

Application bodies persist five sections: `personal` (object), `address` (object), `school` (object), `coursePreferences` (array of `{university, course}` objects), and `reviewStep` (object). Create accepts either a successful LRN verification token or manual Step 1 high-priority information when LRN/PhilSys verification is unavailable. Manual Step 1 account creation requires first name, last name, birth date, sex, school ID, school name, grade level, enrollment status, school year, email, mobile number, and password. Manual records are marked `MANUAL_PENDING` so the student can later add LRN or PhilSys ID for identity verification. Initial registration does not require an existing account before submission. When submission succeeds, the backend creates and activates the Student account immediately, links it as `owner`, and clears the pending password hash. The registration password is accepted only as a write-only top-level `password` field and is never returned in the JSON payload or API response. A second active/non-rejected registration for the same non-blank LRN and exam cycle returns `409 CONFLICT`; blank manual LRN values do not collide with one another, but each submitted registration still requires a unique account email.

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

When `submitOnCreate` is true for initial account creation, the backend validates Step 1 high-priority information plus account credentials, creates the Student account, activates it immediately, links it to the submitted registration, and returns a `SUBMITTED` registration record. Low-priority application details such as address, course preferences, and other profile fields can be completed after login. If validation or account activation fails, no draft is left behind. This is the expected path for applicants who do not yet have Student Portal accounts.

Read and update require ownership. Publicly submitted registrations are linked to the newly activated Student account before the response is returned. Updates are allowed only in `DRAFT` or `FOR_CORRECTION`. Every `PATCH` must include the last observed integer `version`; a stale value returns `409 CONFLICT` without overwriting newer data. A successful update increments `version`.

Submission request:

```json
{
  "version": 3
}
```

Submission requires the documented personal contact/name fields, complete permanent address fields, school/LRN/academic fields, at least one complete course preference, privacy consent, and declaration acceptance. The LRN must contain exactly 12 digits. Invalid or missing data returns `400 VALIDATION_FAILED` with section errors. A `DRAFT` becomes `SUBMITTED`; a `FOR_CORRECTION` application becomes `RESUBMITTED`. Other states return `409 CONFLICT`. Successful submission increments `version` and sets `submittedAt`.

Step 2 accepts `multipart/form-data` containing `mediaType` (`STUDENT_ID_FRONT`, `STUDENT_ID_BACK`, or `SELFIE`) and `file`, plus the LRN proof in `X-Registration-Token`. Files are private, limited to 5 MB, and accepted only when their bytes have a JPEG or PNG signature. A replacement supersedes the prior image of the same type. In Selfie-Only Mode, a valid selfie submission completes Step 2 without claiming identity or facial verification. In Student ID and Selfie Mode, the portrait extracted from `STUDENT_ID_FRONT` is the only permitted facial reference for comparison with `SELFIE`; the ID back must never be used as a facial reference. OCR and facial provider selection remains `TBD`; completed uploads therefore route to manual review when enabled or reject otherwise. Step 2 remains available for configured identity review workflows, but successful LRN or PhilSys Step 1 verification is sufficient for the new initial account-creation path. File retention and production object storage remain `TBD`. Application payloads and images are excluded from audit and request logging.

Before selfie submission in Student ID mode, the backend extracts the Student ID name and compares its normalized value with the full name returned by the verified LRN record. The configured name threshold is authoritative. The API returns both compared names, the score, and `informationComparisonPassed`; selfie upload is rejected until this is true. Local/test settings use a deterministic mock recognizer for the Lovely Mae R Chavez fixture. Production explicitly rejects that mock provider and routes unavailable real recognition to manual review or rejection according to the captured configuration.

Admissions reviewers can load the review ledger with `GET /api/v1/applications/review-queue/`. The queue excludes `DRAFT` applications and includes submitted, resubmitted, correction, approved, and rejected registration records ordered by latest submission/creation time. Student and unauthenticated callers are denied.

Reviewer decisions are persisted through `POST /api/v1/applications/{applicationId}/review-decision/`:

```json
{
  "decision": "APPROVE",
  "reason": "Verified.",
  "requiredCorrections": []
}
```

Supported decisions are `APPROVE`, `REQUEST_CORRECTION`, and `REJECT`, which update the application status to `APPROVED`, `FOR_CORRECTION`, and `REJECTED` respectively. Reviewer approval no longer controls Student account activation; the account is activated when registration submission succeeds. A `REJECT` decision clears any remaining pending password hash without creating an account. Decisions are allowed only while the application is `SUBMITTED`, `RESUBMITTED`, or `FOR_CORRECTION`; other states return `409 CONFLICT`.

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

Current implementation status: request validation, route, safe error shape, and tests exist. Account lookup, anti-enumeration timing controls, pending-auth token storage, and audit events remain pending until the account model and token store are implemented.

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

- Well-formed identifiers return `401 AUTHENTICATION_FAILED` with `Identifier not found or invalid. Please check and try again.` until account lookup exists.
- The response must not reveal whether an identifier belongs to a student, staff/admin user, inactive account, suspended account, or unverified account.

Future successful response:

```json
{
  "pendingAuthToken": "opaque-step-1-token",
  "nextStep": "password",
  "expiresInSeconds": 600
}
```

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_login_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/login/password/`

Use this endpoint for Step 2 of the shared login flow. It accepts the Step-1 pending-auth token and password.

Current implementation status: request validation, route, safe error shape, and tests exist. Pending-auth token validation, password hash verification, failed-attempt lockout, OTP generation, OTP hashing, email dispatch, and audit events remain pending.

Request:

```json
{
  "pendingAuthToken": "opaque-step-1-token",
  "password": "user-supplied-password"
}
```

Current response behavior:

- Missing password returns `400 VALIDATION_FAILED`.
- Any submitted pending-auth token currently returns `401 AUTHENTICATION_FAILED` with `Your session has expired. Please start again.` until the pending-token store exists.
- Passwords must never be logged or returned.

Future successful response:

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

Current implementation status: request validation, route, safe error shape, and tests exist. OTP verification, OTP-attempt lockout, refresh-token rotation, secure refresh cookie issuance, access-token issuance, session audit events, and role landing behavior remain pending.

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

Current response behavior:

- Any well-formed code currently returns `401 AUTHENTICATION_FAILED` with `Invalid or expired code. Please try again.` until OTP storage and verification exist.

Future successful response:

```json
{
  "accessToken": "opaque-access-token",
  "tokenType": "Bearer",
  "expiresInSeconds": 900,
  "session": {
    "authenticated": true
  }
}
```

The refresh token must be issued separately as an HttpOnly, Secure, SameSite=Strict cookie.

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

Use this endpoint only as an internal/protected fallback when a submitted registration needs its associated Student account created or reactivated. Public self-registration normally activates the account during successful submission.

Current implementation status: route, role boundary, request validation, submitted-application lookup, student account persistence, role assignment, duplicate-account checks, and tests exist. Session invalidation and notification/audit side effects remain pending.

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
- `409 CONFLICT` is returned when the registration is not submitted, is missing account credentials, or conflicts with an existing email/LRN account.

The backend assigns the Student role automatically. Students must never be allowed to assign, modify, or elevate their own roles. The pending registration password hash is cleared after account activation.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_activation_endpoints.py`.
- Contract guard: `backend/apps/core/tests/test_api_contract.py`.

### `POST /api/v1/auth/recovery/password/request/`

Use this endpoint to request password recovery instructions for a Student or staff/admin account. The response must not reveal whether the identifier exists, whether the account is inactive, or which account table/role matched.

Current implementation status: route, identifier validation, anti-enumeration response, and tests exist. Recovery-token generation, token hashing/storage, email delivery, rate limits, and audit events remain pending.

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

### `POST /api/v1/auth/recovery/password/complete/`

Use this endpoint to complete password recovery from a secure, time-limited recovery link. Completing recovery must not create a session; the user must complete the normal three-step login flow after reset.

Current implementation status: route, password-policy validation, password-confirmation validation, safe expired-link response, and tests exist. Recovery-token lookup, password hashing, session revocation, and audit events remain pending.

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
- `401 AUTHENTICATION_FAILED` with `This recovery link has expired. Please request a new one.` is returned until recovery-token storage exists.

Future successful response:

- `204 No Content`.

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

### `POST /api/v1/auth/activation/staff/complete/`

Use this endpoint for first-time staff/admin activation from a secure, time-limited activation link sent during System Admin provisioning.

Current implementation status: route, request validation, password-policy validation, safe expired-link response, and tests exist. Staff/admin account storage, activation-token hashing, token expiry/revocation, password hashing, activation completion, session revocation, and audit events remain pending until the account/token store slices exist.

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
- `401 AUTHENTICATION_FAILED` with `This activation link has expired. Please request a new one from your administrator.` is returned until activation-token storage exists.

Future successful response:

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
  "accessToken": "opaque-access-token",
  "tokenType": "Bearer",
  "expiresInSeconds": 900
}
```

The rotated refresh token must be issued separately as an HttpOnly, Secure, SameSite=Strict cookie.

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
