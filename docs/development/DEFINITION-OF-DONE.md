# Definition of Done

A change is done only when all applicable items are satisfied or an exception is explicitly recorded.

- The acceptance criteria and approved business behavior are met without unrelated changes.
- Architecture and security boundaries are respected.
- Frontend API calls are in services, and business logic is not embedded in presentation components.
- Backend business logic is not embedded in routes/controllers, and the backend remains authoritative.
- Tests are added or updated when behavior changes.
- Relevant checks were actually run and their exact results reported; unrun checks are disclosed.
- Error, loading, empty, accessibility, authorization, privacy, and logging behavior were considered where applicable.
- No secrets or sensitive information appear in source, logs, fixtures, docs, or commits.
- API, architecture, setup, and business documents are updated when their behavior or decisions change.
- New decisions are captured in an ADR; unresolved decisions are marked `TBD`.
- The diff contains no unintended source, configuration, generated, dependency, or formatting changes.
- Relative documentation links are valid.
- Review and rollout/rollback needs are addressed.
