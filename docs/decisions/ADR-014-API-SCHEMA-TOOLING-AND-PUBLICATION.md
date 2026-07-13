# ADR-014: API Schema Tooling and Publication

- Status: Accepted for the backend foundation
- Date: 2026-07-13
- Decision owners: `TBD`

## Context

PhilSA needs a machine-readable API contract before the frontend replaces mock/local services with backend APIs. The backend uses Django REST Framework and URL-based API versioning through `/api/v1/`.

The current API inventory is intentionally not a contract for business endpoints. Each implemented endpoint needs reviewed request and response schemas, authentication requirements, permission rules, errors, and tests.

## Decision

Use OpenAPI 3 as the machine-readable API contract format.

Use DRF Spectacular as the OpenAPI schema generation tool for Django REST Framework.

Publication approach:

- Generate a versioned OpenAPI document for each major API version, starting with `/api/v1/`.
- The generated schema must describe only implemented and supported endpoints, not candidate endpoints.
- Commit or publish reviewed schema artifacts through an agreed CI/release process before frontend adapters depend on them. The exact hosted schema location is `TBD` until deployment and documentation hosting are selected.
- Keep human-readable endpoint notes in `docs/api/API-ENDPOINTS.md`, but treat the OpenAPI document as the machine-readable contract once schema generation is implemented.
- API schema changes that remove, rename, or change field semantics require review under the API versioning policy in [ADR-005](ADR-005-API-VERSIONING.md).

Schema requirements:

- Every implemented endpoint must declare authentication, authorization expectations, request bodies, response bodies, status codes, pagination shape, and standard error envelopes where applicable.
- Endpoint descriptions must not include secrets, real personal data, exam content, credentials, internal connection strings, or sensitive operational details.
- File upload/download endpoints must declare media types, limits, privacy classification, and authorization behavior before frontend integration.
- Schema examples must use synthetic data only.

Implementation plan:

- Add DRF Spectacular to the backend dependency manifests and lock files.
- Configure DRF `DEFAULT_SCHEMA_CLASS`.
- Add schema generation and validation commands to the backend README.
- Expose local schema endpoints or commands for development only after security review.
- Add schema checks or contract tests before frontend adapters consume a backend endpoint.

## Consequences

- Frontend and backend can align on a stable OpenAPI contract before replacing mock services.
- Candidate endpoint inventories remain planning documents, not generated API contracts.
- The API contract process checklist can move forward without inventing unimplemented endpoint schemas.

## Alternatives considered

- Handwritten OpenAPI only: rejected because handwritten schemas can drift from DRF serializers and views.
- DRF's built-in schema generator only: rejected because the project will need richer OpenAPI customization and DRF ecosystem support.
- Generate schemas for planned endpoints: rejected because planned endpoints are not contracts until implemented and tested.
