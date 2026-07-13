# API Endpoints

## Current state

The baseline health endpoint, current-session endpoint boundary, three-step login endpoint boundaries, session token management endpoint boundaries, and account activation endpoint boundaries are implemented. The frontend currently uses mock/local services, and every business path below remains a capability inventory rather than an approved contract. OpenAPI 3 through DRF Spectacular is the accepted machine-readable contract approach after [ADR-014](../decisions/ADR-014-API-SCHEMA-TOOLING-AND-PUBLICATION.md), but schema tooling is not installed yet.

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
| `POST` | `/api/v1/auth/activation/student-registration/` | Required bearer access token | `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN` | Create and activate a Student account after registration approval | Implemented boundary; registration/account storage pending |
| `POST` | `/api/v1/auth/activation/staff/complete/` | Public activation link | `AllowAny` | Complete first-time staff/admin activation by setting the user's password | Implemented boundary; activation-token storage pending |

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

Use this endpoint boundary when an approved registration workflow needs to create and activate the associated Student account. This is not public self-registration; it is an internal/protected backend action after registration approval.

Current implementation status: route, role boundary, request validation, safe conflict response, and tests exist. Registration approval storage, student account persistence, role assignment, duplicate-account checks, session invalidation, and audit events remain pending until the registration/account model slices exist.

Request:

```json
{
  "registrationApplicationId": "opaque-application-id"
}
```

Current response behavior:

- `401 NOT_AUTHENTICATED` is returned when no valid authenticated backend session exists.
- `403 PERMISSION_DENIED` is returned for roles other than `ADMISSIONS_REVIEWER` or `SYSTEM_ADMIN`.
- `409 CONFLICT` is returned until registration approval/account storage exists.

Future successful response:

```json
{
  "accountId": "opaque-account-id",
  "role": "STUDENT",
  "status": "active"
}
```

The backend must assign the Student role automatically. Students must never be allowed to assign, modify, or elevate their own roles.

Test coverage:

- Behavior tests: `backend/apps/accounts/tests/test_activation_endpoints.py`.
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
| Authentication and sessions | `/api/v1/auth` | Partially implemented: current-session, three-step login, logout, refresh, revocation, and activation boundaries only; account storage, token storage, email delivery, durable revocation, and audit events remain `TBD` |
| Student registration/applications | `/api/v1/applications` | `TBD` |
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
