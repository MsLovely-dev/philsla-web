# API Endpoints

## Current state

The baseline health endpoint and current-session endpoint boundary are implemented. The frontend currently uses mock/local services, and every business path below remains a capability inventory rather than an approved contract. OpenAPI 3 through DRF Spectacular is the accepted machine-readable contract approach after [ADR-014](../decisions/ADR-014-API-SCHEMA-TOOLING-AND-PUBLICATION.md), but schema tooling is not installed yet.

## Implemented baseline endpoints

| Method | Path | Authentication | Permission | Purpose | Status |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health/` | Public; no credentials required | `AllowAny` | Safe service liveness smoke check | Implemented |
| `GET` | `/api/v1/auth/session/` | Required bearer access token | `IsAuthenticated` | Return server-derived session, role, permission, and scope claims | Implemented boundary; token validation pending |

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

## Candidate endpoint groups

| Capability | Candidate base path | Status |
| --- | --- | --- |
| Authentication and sessions | `/api/v1/auth` | Partially implemented: current-session boundary only; login/logout/refresh remain `TBD` |
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
