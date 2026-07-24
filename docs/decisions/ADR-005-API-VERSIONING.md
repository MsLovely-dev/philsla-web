# ADR-005: API Versioning

- Status: Accepted for the backend foundation
- Date: 2026-07-10
- Decision owners: `TBD`

## Context

The frontend and backend are independently deployable and require a stable, explicit contract boundary. The backend foundation previously exposed an unversioned `/api/health/` route while API versioning remained undecided.

## Decision

Use URL-based major versioning with `/api/v1/` as the root namespace for the initial API, including the baseline health endpoint at `/api/v1/health/`.

Within a major version, prefer backward-compatible additive changes. Removing fields or endpoints, renaming contract elements, changing their meaning, or otherwise breaking existing consumers requires a reviewed migration and deprecation plan and normally a new major namespace such as `/api/v2/`.

Minor or patch version numbers will not appear in URLs. Media-type and query-parameter versioning are not used.

## Consequences

- Clients select the API contract explicitly through the URL.
- Django route namespaces can isolate each future major version.
- Multiple major versions may need to coexist during migrations.
- Version retirement and support durations remain `TBD` until deployment and consumer policies are defined.

## Alternatives considered

- Unversioned URLs: rejected because breaking-change boundaries would be implicit.
- Header or media-type versioning: rejected because it is less visible during local development and operational troubleshooting.
- Query-parameter versioning: rejected because it weakens the resource namespace boundary and is easier for clients and caches to mishandle.
