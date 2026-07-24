# ADR-007: Supabase Postgres Database Provider

- Status: Accepted for the backend foundation
- Date: 2026-07-10
- Decision owners: `TBD`

## Context

[ADR-006](ADR-006-DATABASE-ENGINE-AND-LOCAL-DEVELOPMENT.md) accepts PostgreSQL-compatible storage as the backend application database engine but leaves the hosting/provider choice open.

PhilSA needs a managed PostgreSQL provider before persistence-backed modules are implemented. The provider decision must not commit credentials to the repository and must not implicitly adopt unrelated platform services.

## Decision

Use Supabase Postgres as the backend database provider.

This decision applies only to the PostgreSQL database service:

- Configure Django database access through environment variables such as `DATABASE_URL`.
- Do not commit project URLs, credentials, passwords, service-role keys, connection strings, or pooled connection secrets.
- Keep local, test, staging, and production database environments separate.
- Keep Supabase Auth as a separate authentication decision.
- Keep Supabase Storage as a separate file/object storage decision.
- Keep backup, restore, retention, connection pooling, network access, and operational ownership documented before persistence-backed business APIs depend on the provider.

## Consequences

- Supabase Postgres-compatible Django connection configuration is implemented through `DATABASE_URL` without hard-coded credentials.
- Production settings require `DATABASE_URL` and fail fast when it is missing.
- Local persistence-backed development should use a PostgreSQL-compatible database, not SQLite.
- CI should eventually run migration and persistence tests against PostgreSQL-compatible storage.
- Provider-specific operational details remain explicit documentation work and should not be inferred from this ADR.

## Alternatives considered

- Self-managed PostgreSQL: deferred because the project currently benefits from reducing database operations burden.
- Another managed PostgreSQL provider: deferred because no stronger project-specific requirement is documented.
- Leaving the provider undecided: rejected because the next persistence work needs a concrete connection and operations target.
