# API Standards

## Status and scope

No production API exists. These standards define the proposed contract between the separated frontend and the future Django REST Framework API. Serializer, schema-generation, and versioning details are `TBD`.

## Conventions

- Use HTTPS outside local development and a versioned base path such as `/api/v1` once the versioning strategy is approved.
- Use resource-oriented URLs, standard HTTP methods, and meaningful status codes.
- Use JSON for ordinary request/response bodies. Use an explicit media type and limits for uploads.
- Use consistent field naming (`TBD`) and ISO 8601 UTC timestamps.
- Treat identifiers as opaque strings at the client boundary.
- Paginate collections and define stable filtering, sorting, and cursor conventions before implementation.
- Document every endpoint and contract in an agreed machine-readable format; OpenAPI tooling is `TBD`.

## Errors

Return a stable error shape containing a machine-readable code, a safe message, an optional field-error map, and a correlation identifier. Do not return stack traces, secrets, sensitive records, or internal integration details.

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request could not be processed.",
    "fields": {},
    "correlationId": "opaque-id"
  }
}
```

## Security and correctness

- The backend authenticates, authorizes, validates, and enforces workflow state; frontend validation is for usability only.
- Derive identity and permissions from verified server-side context, never client-supplied roles.
- Apply object-level authorization and data minimization to responses.
- Use idempotency keys for retryable creation or high-impact commands where appropriate.
- Define concurrency controls for mutable resources and audit sensitive changes.
- Never log credentials, tokens, government identifiers, exam content/answers, unreleased results, recordings, or sensitive payloads.

## Compatibility

Additive changes may be backward compatible when clients safely ignore new fields. Removing, renaming, or changing semantics requires a version/deprecation plan. Consumer/contract tests must cover implemented APIs.
