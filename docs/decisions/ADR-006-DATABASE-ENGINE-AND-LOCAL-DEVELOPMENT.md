# ADR-006: Database Engine and Local Development

- Status: Accepted for the backend foundation
- Date: 2026-07-10
- Decision owners: `TBD`

## Context

The Django backend needs a database direction before persistent business APIs are implemented. The current foundation has no domain schema. Local and test settings use SQLite only so the service can run health checks and baseline tests without external infrastructure.

PhilSA will eventually store relational operational data, audit history, workflow states, schedules, results, and integration references. The backend must enforce constraints and transactions consistently across local, test, and deployed environments before persistence-backed features are added.

## Decision

Use PostgreSQL-compatible relational storage as the backend application database engine.

For the current no-persistence foundation:

- Local and test settings may continue using SQLite for health checks and baseline framework tests only.
- No persistence-backed business module may be implemented against SQLite as the accepted development database.
- Before the first persistence-backed module is built, local development must run against PostgreSQL-compatible storage through environment-based configuration.
- The hosting/provider choice remains separate. Supabase Postgres is not accepted by this ADR; it requires its own ADR and configuration step.
- Supabase Auth and Supabase Storage remain separate decisions and are not adopted by selecting PostgreSQL-compatible storage.

## Consequences

- Future models, migrations, constraints, indexes, transactions, and query behavior must be designed for PostgreSQL compatibility.
- SQLite remains a temporary convenience for the current foundation and should not influence domain modeling decisions.
- The next persistence step must decide the database provider and wire `DATABASE_URL` or equivalent environment configuration without committing credentials.
- CI should eventually include PostgreSQL-backed migration and test execution before business APIs depend on persistence.

## Alternatives considered

- SQLite as the application database: rejected because it does not match expected production concurrency, constraint, and operational needs.
- Deferring the engine decision: rejected because persistence-backed API work needs a stable target for migrations and transaction behavior.
- Choosing Supabase Postgres in this ADR: deferred because provider, pooling, backups, restore, environment separation, and operational ownership need a separate decision.
