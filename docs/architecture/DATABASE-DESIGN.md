# Database Design

## Status

There is no implemented database schema. The database technology and ownership model are `TBD`; PostgreSQL references in existing planning material are not an adopted decision.

## Candidate domain data

Subject to approved requirements, the future model may need identities and roles, student profiles and verification references, applications and documents, assessment items and versions, exam schedules and attempts, responses, proctoring incidents/evidence, scores and releases, university choices, integration transactions, and audit events.

This list is a domain inventory, not a schema. Exact entities, fields, relationships, enumerations, and retention rules are `TBD`.

## Design rules

- Use stable internal identifiers; do not expose sequential database keys where that creates risk.
- Enforce integrity with database constraints as well as application validation.
- Model status transitions explicitly and preserve the actor and timestamp for sensitive changes.
- Separate operational data, immutable audit history, and large binary evidence. Store files in suitable object storage and keep metadata/references in the database when selected.
- Minimize collection and duplication of personal or government-issued identifiers. Define masking, encryption, access, retention, and deletion before production use.
- Version assessment content and scoring rules so historical attempts remain reproducible.
- Apply migrations through reviewed, repeatable tooling with rollback or forward-recovery plans.
- Never use production personal data in development or tests.

## Pending decisions

- Database engine, hosting, availability, backup, restore, and recovery targets: `TBD`.
- Tenant/institution isolation model and row-level authorization: `TBD`.
- Data classification, residency, retention, archival, deletion, and legal basis: `TBD`.
- Audit immutability, evidence chain of custody, and cryptographic integrity needs: `TBD`.
- Analytics store and de-identification approach: `TBD`.
