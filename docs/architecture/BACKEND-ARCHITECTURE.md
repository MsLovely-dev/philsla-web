# Backend Architecture

## Current state

A minimal Django and Django REST Framework application is implemented under `backend/`. It includes local, test, and guarded production settings, a versioned `/api/v1/` namespace with a health endpoint, a standard DRF exception envelope, generated correlation IDs, safe structured request logging, and baseline tests.

Python 3.13 is the supported development runtime. Direct constraints and generated transitive locks use pip requirements files and the pinned `pip-tools` workflow accepted in [ADR-004](../decisions/ADR-004-BACKEND-DEPENDENCY-MANAGEMENT.md). URL-based major API versioning is accepted in [ADR-005](../decisions/ADR-005-API-VERSIONING.md). PostgreSQL-compatible storage is the accepted application database engine in [ADR-006](../decisions/ADR-006-DATABASE-ENGINE-AND-LOCAL-DEVELOPMENT.md), with Supabase Postgres accepted as the database provider in [ADR-007](../decisions/ADR-007-SUPABASE-POSTGRES-DATABASE-PROVIDER.md). Private S3-compatible object storage is the accepted approach for documents and evidence in [ADR-008](../decisions/ADR-008-FILE-OBJECT-STORAGE-APPROACH.md), but the concrete provider is `TBD`. Django-managed backend accounts and server-side sessions are accepted for the initial browser API in [ADR-009](../decisions/ADR-009-AUTHENTICATION-SESSION-AND-ACCOUNT-PROVISIONING.md). Production database settings are configured through `DATABASE_URL` without committed credentials. Asynchronous processing and deployment are `TBD`. Supabase Auth and Supabase Storage are not adopted by the database provider decision and require separate ADRs. SQLite is used only for current local and test execution of the no-persistence foundation.

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
- Persistent models must have one owning business capability. Model ownership boundaries are defined in [database design](DATABASE-DESIGN.md#model-ownership-boundaries).
- File binaries must live behind the accepted object-storage boundary; database models store metadata and object references only.

## Operational rules

Use structured logs with correlation identifiers, but never log secrets, payload bodies, query strings, authorization headers, identity data, student records, exam content, proctoring evidence, or integration payloads. Retry only idempotent operations or operations protected by idempotency keys. Define timeouts and failure handling for every external integration. Health checks, migrations, backups, restore testing, retention, and disaster-recovery objectives are `TBD`.
