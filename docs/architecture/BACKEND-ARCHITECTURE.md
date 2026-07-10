# Backend Architecture

## Current state

No backend application is implemented. Django and Django REST Framework are now the adopted application and API frameworks. `backend/` currently contains only placeholder directories, `.gitkeep` files, an environment example, and documentation.

Database, authentication model, asynchronous processing, object storage, deployment, API versioning, supported Python version, and dependency management are `TBD`.

## Recommended modular shape

When the Django project is scaffolded, use a modular structure conceptually equivalent to:

```text
backend/apps/api/src/modules/
|-- authentication/
|-- student-registration/
|-- student-verification/
|-- external-integrations/
|-- assessment/
|-- exam-delivery/
|-- proctoring/
|-- scoring-results/
|-- administration/
`-- audit/
```

This exact path remains a recommendation; adapt it to valid Django project/app conventions during an approved scaffolding change. Module boundaries should reflect business capabilities, not merely database tables.

## Layering rules

- Routes/controllers adapt HTTP requests and responses; backend business logic must not be placed directly inside them.
- Application services coordinate use cases and transaction boundaries.
- Domain code enforces state transitions and invariants without depending on HTTP.
- Repositories and integration adapters isolate persistence and external systems.
- The backend must remain authoritative for validation, authorization, eligibility, scoring, release decisions, and audit records.
- Cross-module access should use explicit interfaces or application services rather than another module's storage internals.

## Operational rules

Use structured logs with correlation identifiers, but never log secrets or sensitive information. Retry only idempotent operations or operations protected by idempotency keys. Define timeouts and failure handling for every external integration. Health checks, migrations, backups, restore testing, retention, and disaster-recovery objectives are `TBD`.
