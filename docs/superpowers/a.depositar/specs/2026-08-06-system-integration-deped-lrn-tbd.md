# System Integration - DepEd LRN API TBD

Date: 2026-08-06
Owner: A.Depositar
Status: Sprint documentation

## Purpose

This document records the current System Integration scope for the Learner Reference Number (LRN) verification path. The important distinction is that PhilSLA already has an internal LRN verification endpoint, but the external DepEd LRN API contract is not yet available.

For the sprint demo, System Integration is documentation-only. Score Management remains A.Depositar's primary build priority.

## Current State

PhilSLA exposes an internal registration endpoint:

```text
POST /api/v1/applications/registration/lrn/verify/
```

That endpoint validates the applicant's LRN through the configured registry provider boundary and returns an opaque verification token plus allowed learner profile fields when verification succeeds.

Local and test settings use a synthetic registry provider. Production does not use the synthetic provider, and production rejects `LRN_REGISTRY_PROVIDER=mock`. The real DepEd LRN provider remains `TBD`.

## External DepEd LRN API Assumption

The external DepEd LRN API is not yet contracted or integrated.

The following DepEd API details are `TBD`:

- Base URL and environment URLs.
- Authentication method.
- Authorization model and allowed PhilSLA client identity.
- Request payload shape.
- Response payload shape.
- Required search keys, such as LRN, birth date, or other verification fields.
- Returned learner fields.
- Eligibility signals, such as grade level, enrollment status, school year, and school identity.
- Error codes and error semantics.
- Rate limits and throttling rules.
- Availability target, timeout expectations, and maintenance windows.
- Retry rules and idempotency expectations.
- Data retention and audit requirements.
- Security review and production credential handling.

Until these are defined, PhilSLA must treat DepEd LRN integration as an external dependency, not a completed production integration.

## Current Demo Behavior

For local and test demo purposes:

- PhilSLA can verify known synthetic LRNs through the configured synthetic provider.
- A successful verification returns a short-lived verification token.
- The token is used to continue registration without exposing raw integration payloads.
- Unknown LRNs return a safe verification failure.
- Registry unavailability is represented by `LRN_REGISTRY_UNAVAILABLE`.
- Failed verification attempts are throttled and can enter cooldown.
- LRN values and dates of birth must not be written to request logs or audit logs.

This is demo-safe behavior only. It proves PhilSLA's internal adapter boundary and registration flow, not the real DepEd API connection.

## Future Integration Boundary

The real DepEd integration should remain behind the existing registry provider boundary used by the application service. The internal PhilSLA API contract should not expose DepEd-specific payloads directly to the frontend.

Expected backend boundary:

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

## Error Mapping Target

PhilSLA should preserve stable internal error behavior even after the real DepEd API is connected.

| Condition | PhilSLA behavior |
| --- | --- |
| LRN format invalid | `400 VALIDATION_FAILED` |
| LRN not found or verification mismatch | `400 LRN_VERIFICATION_FAILED` |
| Too many failed attempts | `429 LRN_COOLDOWN` |
| DepEd provider unavailable or timed out | `503 LRN_REGISTRY_UNAVAILABLE` |
| Existing active application for same cycle | `409 CONFLICT` |

The exact mapping from DepEd-specific errors to these PhilSLA errors remains `TBD` until DepEd provides the API contract.

## Related Integrations

| Integration | Current status | Notes |
| --- | --- | --- |
| DepEd LRN verification | Internal PhilSLA endpoint exists; external DepEd API `TBD` | Production provider contract, credentials, and response mapping are not yet available. |
| PhilSys verification | Locked for future feature development | Configuration prevents enabling PhilSys today. |
| DepEd/CHED/TESDA reporting | `TBD` | Current analytics are computed from PhilSLA application data and do not call agency reporting APIs. |
| Email OTP | Implemented through Django email backend locally and configured production SMTP direction | Not part of the DepEd LRN dependency. |

## Risks

- DepEd may return a different field set than PhilSLA currently models.
- DepEd may require verification factors that differ from the current categories.
- Rate limits may require queueing, caching, or stricter frontend throttling.
- DepEd downtime could block LRN-based registration unless manual entry fallback remains available.
- Production credential handling may require additional deployment and security review.
- Contract changes may require API documentation, tests, and possibly schema or model updates.

## Open Decisions

- What DepEd API endpoint and environment will PhilSLA use?
- What credentials or trust mechanism will DepEd require?
- Which learner fields may PhilSLA store?
- Which learner fields may PhilSLA display back to applicants and reviewers?
- What is the approved retention period for verification references?
- What is the approved fallback when DepEd is unavailable during registration?
- Should successful DepEd responses be cached, and if so, for how long?
- What operational monitoring is required for DepEd integration health?

## Sprint Talking Points

- PhilSLA's internal LRN verification endpoint is implemented.
- The current demo uses synthetic local/test LRN provider behavior.
- The real DepEd LRN API is the external dependency and remains `TBD`.
- The frontend should not integrate with DepEd directly.
- The backend must own the DepEd adapter, error mapping, throttling, and safe response shaping.
- Production readiness depends on receiving and reviewing the official DepEd API contract.
