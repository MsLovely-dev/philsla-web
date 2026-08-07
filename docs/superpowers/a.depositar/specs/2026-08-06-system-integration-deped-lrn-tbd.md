# System Integration - DepEd LRN API

Date: 2026-08-06
Owner: A.Depositar
Status: Implemented backend provider boundary

## Purpose

This document records the current System Integration scope for the Learner Reference Number (LRN) verification path. PhilSLA owns a stable internal LRN verification endpoint, and the backend now includes a configured DepEd LRN test-provider adapter behind the registry boundary.

## Current State

PhilSLA exposes an internal registration endpoint:

```text
POST /api/v1/applications/registration/lrn/verify/
```

That endpoint validates the applicant's LRN through the configured registry provider boundary and returns an opaque verification token plus allowed learner profile fields when verification succeeds.

Local and test settings can use a synthetic registry provider. Production does not use the synthetic provider, and production rejects `LRN_REGISTRY_PROVIDER=mock`. Environments using the DepEd provider set:

```text
LRN_REGISTRY_PROVIDER=deped
LRN_DEPED_VERIFY_URL=<backend-only DepEd verify URL>
LRN_DEPED_API_TOKEN=<backend-only token>
```

The frontend never calls DepEd directly and never receives the provider URL, token, or raw provider payload.

## DepEd Provider Contract Used By PhilSLA

The current backend adapter posts JSON to `LRN_DEPED_VERIFY_URL` with a bearer token and a generated request ID:

```json
{
  "lrn": "817222062752",
  "dateOfBirth": "2012-08-07"
}
```

The adapter accepts successful provider responses shaped like:

```json
{
  "verified": true,
  "message": "Verification successful",
  "transactionReference": "VRF-20260807-5E4EE2",
  "verifiedAt": "2026-08-07T16:20:45.344Z",
  "learner": {
    "lrn": "817222062752",
    "fullName": "Juan Garcia",
    "dateOfBirth": "2012-08-07",
    "sex": "F",
    "schoolId": "TEST-0001",
    "schoolName": "Sample National High School",
    "gradeLevel": "Grade 12",
    "enrollmentStatus": "ENROLLED"
  }
}
```

The backend maps the provider payload into PhilSLA's stable internal response:

- `learner.fullName` is split into first, middle, and last name fields.
- `sex` values `F` and `M` are normalized to `Female` and `Male`.
- `enrollmentStatus: "ENROLLED"` is normalized to `Enrolled`.
- Missing `schoolYear` is derived from `ACTIVE_EXAM_CYCLE_ID` when it is numeric, for example `2026` becomes `2026-2027`; otherwise it remains `TBD`.
- A response whose `learner.lrn` does not match the requested LRN is rejected as verification failure.
- Provider secrets, `transactionReference`, `verifiedAt`, and raw provider payloads are not returned to the browser.

## Current Behavior

For local, test, and configured DepEd-provider environments:

- PhilSLA can verify known synthetic LRNs through the configured synthetic provider.
- PhilSLA can verify configured DepEd test-provider LRNs through the backend adapter.
- A successful verification returns a short-lived verification token.
- The token is used to continue registration without exposing raw integration payloads.
- Unknown LRNs return a safe verification failure.
- Registry unavailability is represented by `LRN_REGISTRY_UNAVAILABLE`.
- Failed verification attempts are throttled and can enter cooldown.
- LRN values and dates of birth must not be written to request logs or audit logs.

## Integration Boundary

The DepEd integration remains behind the existing registry provider boundary used by the application service. The internal PhilSLA API contract does not expose DepEd-specific payloads directly to the frontend.

Backend boundary:

```text
Frontend
  -> PhilSLA internal endpoint
  -> application service
  -> LRN registry provider interface
  -> DepEd LRN API adapter
```

The frontend should continue calling PhilSLA's internal endpoint only. The backend should translate between PhilSLA's stable internal verification response and the DepEd-specific request/response contract.

## Data Handling Rules

The DepEd integration must follow the repository security rules:

- Do not commit DepEd credentials, tokens, endpoint secrets, or certificates.
- Do not log raw DepEd request or response payloads.
- Do not expose raw DepEd payloads to the browser.
- Store only approved minimal verification references and profile fields.
- Keep errors safe and non-enumerating.
- Use synthetic data in local development, tests, fixtures, screenshots, and demos.
- Treat LRN, birth date, school record data, and verification results as sensitive student information.

## Error Mapping

PhilSLA preserves stable internal error behavior for synthetic and DepEd-backed providers.

| Condition | PhilSLA behavior |
| --- | --- |
| LRN format invalid | `400 VALIDATION_FAILED` |
| LRN not found or verification mismatch | `400 LRN_VERIFICATION_FAILED` |
| Too many failed attempts | `429 LRN_COOLDOWN` |
| DepEd provider unavailable or timed out | `503 LRN_REGISTRY_UNAVAILABLE` |
| Existing active application for same cycle | `409 CONFLICT` |

## Related Integrations

| Integration | Current status | Notes |
| --- | --- | --- |
| DepEd LRN verification | Implemented behind PhilSLA backend registry boundary | Requires backend-only URL/token configuration and fails closed when not configured. |
| PhilSys verification | Locked for future feature development | Configuration prevents enabling PhilSys today. |
| DepEd/CHED/TESDA reporting | `TBD` | Current analytics are computed from PhilSLA application data and do not call agency reporting APIs. |
| Email OTP | Implemented through Django email backend locally and configured production SMTP direction | Not part of the DepEd LRN dependency. |

## Risks

- DepEd may change the field set or semantics PhilSLA currently maps.
- DepEd may require verification factors beyond LRN plus birth date.
- Rate limits may require queueing, caching, or stricter frontend throttling.
- DepEd downtime could block LRN-based registration unless manual entry fallback remains available.
- Production credential handling may require additional deployment and security review.
- Contract changes may require API documentation, tests, and possibly schema or model updates.

## Open Decisions

- Which learner fields may PhilSLA store?
- Which learner fields may PhilSLA display back to applicants and reviewers?
- What is the approved retention period for verification references?
- What is the approved fallback when DepEd is unavailable during registration?
- Should successful DepEd responses be cached, and if so, for how long?
- What operational monitoring is required for DepEd integration health?
- What are the production SLA, rate-limit, maintenance-window, and incident-response requirements?
- What is the final production credential rotation and access-review process?

## Sprint Talking Points

- PhilSLA's internal LRN verification endpoint is implemented.
- Local/test can use synthetic LRN provider behavior.
- Configured environments can use the DepEd LRN test-provider adapter.
- The frontend should not integrate with DepEd directly.
- The backend must own the DepEd adapter, error mapping, throttling, and safe response shaping.
- Production readiness still depends on approved credentials, deployment configuration, monitoring, and operational review.

## 2026-08-07 Provider Placeholder Preparation

PhilSLA added provider-readiness statuses so the frontend System Integration screen can show backend readiness without exposing external URLs, tokens, or raw registry payloads. LRN now reports `available` only when the DepEd provider URL and backend-only token are configured. When `LRN_REGISTRY_PROVIDER=deped` is selected without those settings, LRN reports `placeholder`. PhilSys remains locked or placeholder until its separate feature work is approved.

## 2026-08-08 DepEd LRN Integration Completion

The DepEd LRN provider boundary is implemented for the verified test-provider request and response shape. The backend owns request construction, bearer-token authentication, timeout handling, response mapping, safe error envelopes, duplicate active-LRN checks, cooldown behavior, and frontend-safe profile shaping. The frontend registration path should continue treating PhilSLA's internal verification response as the source of truth and must not call DepEd directly.
