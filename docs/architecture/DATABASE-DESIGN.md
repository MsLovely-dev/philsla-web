# Database Design

## Status

Django migrations now implement initial account, student-application, configurable-field, and university-registry slices. This is not a complete platform schema. PostgreSQL-compatible storage is the accepted application database engine in [ADR-006](../decisions/ADR-006-DATABASE-ENGINE-AND-LOCAL-DEVELOPMENT.md), Supabase Postgres is the accepted database provider in [ADR-007](../decisions/ADR-007-SUPABASE-POSTGRES-DATABASE-PROVIDER.md), and private S3-compatible object storage is the accepted file/evidence storage approach in [ADR-008](../decisions/ADR-008-FILE-OBJECT-STORAGE-APPROACH.md). Django production settings read the database connection from `DATABASE_URL` without committed credentials. The complete ownership model, remaining schemas, and persistence boundaries remain `TBD`.

## Implemented university registry slice

The `configuration` capability owns `University` and `CollegeCourse`. Both use opaque UUID primary keys, mutable-record timestamps, creator references, status choices, and integer versions for optimistic API concurrency. A university owns zero or more college courses through `CollegeCourse.university`; deleting the university cascades to those child rows. University code is globally unique, and program code is unique within a university. The migration, index definitions, constraints, and reversible table creation are in `backend/apps/configuration/migrations/0007_university_collegecourse_and_more.py`. No production seed data is included.

The current `UNIVERSITY_ADMIN` object boundary uses server-owned `AccountProfile.scopes.universityIds` UUID values for writes. The broader tenant/institution assignment workflow and provisioning UI remain `TBD`.

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

## Model ownership boundaries

Each persistent model must have one owning business capability. Other capabilities may reference the owner through stable identifiers or approved service/query interfaces, but they must not mutate another capability's storage directly.

| Capability | Owns | Does not own |
| --- | --- | --- |
| Authentication | Accounts, credentials/provider links, sessions/tokens, invitations, MFA and recovery metadata after the auth approach is approved. | Student application content, assessment content, scores, or document binaries. |
| Student registration | Student profile data, application drafts/submissions, application status, correction requests, selected course preferences, document metadata references. | Identity registry payloads, stored document binaries, exam content, grading outcomes, or audit-event storage. |
| Student verification | Verification attempts, external registry references, verification outcomes, retry/manual-review state. | Student-owned application fields or raw external integration payload storage beyond approved minimal references. |
| Scheduling and permits | Test centers, schedules, capacity reservations, applicant schedule assignments, permit metadata, permit validation state. | Application review decisions, attendance records after check-in, or scoring outcomes. |
| Assessment content | Question metadata, blueprints, exam-set assembly, content lifecycle states, version references. | Student answers, grading decisions, proctoring incidents, or real assessment content in development fixtures. |
| Exam delivery | Exam sessions, candidate progress, answers, autosave/final submission state, timing state, delivery idempotency records. | Question authoring workflow, manual grading results, or proctor evidence binaries. |
| Proctoring and attendance | Attendance/check-in events, readiness state, monitoring session state, incidents, evidence metadata references. | Stored recording binaries before storage is selected, final scores, or application approval decisions. |
| Scoring and results | Grading assignments, rubric scores, scoring state, review/correction workflow, result release state, student result view state. | Original exam content, proctoring evidence, or university quota configuration. |
| Administration | Staff/user administration metadata after auth is approved, role assignment workflow, testing-center/device/configuration records, university/course/quota administration. | Authentication secrets, student-owned application data, immutable audit history. |
| Audit and compliance | Immutable audit events, compliance status, audit exports, retention markers after requirements are approved. | Source-of-truth business records owned by other capabilities. |
| External integrations | Integration transaction metadata, outbound/inbound request references, retry state, provider status summaries. | Raw sensitive payload storage unless explicitly approved by the owning capability and security review. |
| Reporting and analytics | Aggregated/reporting projections and de-identified analytical extracts after metrics are approved. | Operational source-of-truth records or authorization decisions. |

Ownership rules:

- Put workflow state in the capability that owns the workflow, not in a shared utility app.
- Use foreign keys only when the dependency is part of the approved domain model and does not give the dependent capability write ownership.
- Prefer explicit service/query interfaces for cross-capability reads that involve authorization, privacy filtering, or workflow interpretation.
- Shared lookup/reference data needs a named owning capability before implementation.
- Audit events record changes from every capability, but audit storage does not become the owner of the changed business record.
- File/object binaries are not owned by a database model until the storage approach is selected; database models may own metadata references only.

## Audit fields and timestamp conventions

Standard mutable records:

- Use `created_at` and `updated_at` timestamp fields on persisted business records unless a record is intentionally immutable.
- Use `created_by_id` and `updated_by_id` when the actor is meaningful and the authentication model can supply a stable backend identity.
- Use `deleted_at` and `deleted_by_id` for soft-delete behavior where retention, appeal, audit, or recovery requirements apply. Hard deletes require an explicit retention/security decision.
- Use `status_changed_at` and `status_changed_by_id` for records with business workflow states when the change actor and time must be visible without querying the audit log.
- Store actor references as stable backend identities, not client-supplied roles, names, or emails.
- System actions must use a distinguishable system actor value after the auth/audit implementation defines one.

Immutable audit events:

- Audit events should record `event_id`, `occurred_at`, `actor_id`, `actor_type`, `action`, `target_type`, `target_id`, `outcome`, `correlation_id`, and safe metadata.
- Audit metadata must exclude credentials, tokens, raw identity documents, assessment answers/content, unreleased scores, proctoring evidence, and raw integration payloads.
- Audit events are append-only. Corrections must be represented as additional events, not by mutating historical events.
- Audit event retention, export format, tamper-resistance guarantees, and cryptographic integrity remain `TBD`.

Timestamp conventions:

- Store timestamps as timezone-aware UTC values.
- Expose API timestamps as ISO 8601 strings with an explicit UTC offset.
- Use server-generated timestamps for persistence and audit fields; clients may submit business dates only where the endpoint contract explicitly allows it.
- Do not use local time for ordering, retention, eligibility, scheduling, scoring release, or audit decisions.
- If a user-facing workflow needs Philippine local time display, convert from stored UTC at the presentation boundary.
- Prefer database-backed ordering by timestamp plus a stable identifier for deterministic pagination and audit review.

## File and evidence storage

- Store document, evidence, recording, and export binaries in private S3-compatible object storage.
- Store metadata in the owning capability's database models, including owner, object key, original filename when safe, content type, byte size, checksum, classification, lifecycle state, and retention markers.
- Do not store file bytes in PostgreSQL except for explicitly approved small derived values such as hashes or thumbnails after review.
- Object keys must be opaque and must not include personal data, government identifiers, exam content, application numbers, or user-supplied filenames.
- All file access must go through backend authorization. Short-lived signed URLs or streamed responses may be used only after object-level permission checks.
- File validation, malware scanning, encryption/key management, retention, legal hold, redaction, and evidence chain-of-custody details remain `TBD` before production use.

## Supabase Postgres operating expectations

Local development:

- The current no-persistence foundation may continue using SQLite for health checks and baseline framework tests.
- Before any persistence-backed module is implemented, local development must use PostgreSQL-compatible storage through `DATABASE_URL`.
- Developers must keep real Supabase connection strings outside git, using local environment variables or ignored local environment files.
- Development and test data must be synthetic. Do not copy production personal data, assessment content, unreleased results, recordings, evidence, credentials, or integration payloads into local databases.

Environment separation:

- Use separate Supabase projects or isolated databases for local/shared development, staging, and production.
- Never share production credentials with local or CI environments.
- Rotate credentials immediately if a connection string is exposed.
- Treat Supabase Auth and Supabase Storage as separate decisions; database adoption does not authorize either service.

Migrations:

- Django migrations are the application schema change mechanism.
- Review every migration for data-safety and rollback or forward-recovery before applying it outside local development.
- Apply migrations to lower environments before production.
- Do not make manual production schema changes that are not represented in committed migrations, except for emergency operations that are documented afterward.

Backup and restore:

- Backup cadence, retention duration, point-in-time recovery, restore testing schedule, and recovery objectives are `TBD`.
- Before production launch, document who owns backups, how restores are tested, and how failed restore tests are escalated.
- Backup exports must be protected as sensitive data and must not be stored in the repository.

Connection pooling:

- Use a pooled Supabase Postgres connection for deployed web processes unless the deployment model requires otherwise.
- Keep direct database URLs restricted to administrative tasks such as migrations when required.
- Pooling mode, pool size, connection limits, timeout values, and migration connection behavior are `TBD` until the deployment target is selected.

## Migration workflow and seed data

Migration workflow:

- Generate schema migrations with Django from model changes; do not hand-edit generated operations unless the reason is documented in the migration or review notes.
- Keep migrations small and tied to one business capability when possible.
- Review every migration before merge for locks, destructive operations, defaults on large tables, nullable-to-non-nullable transitions, index strategy, and data exposure risk.
- Run migration checks and backend tests locally before merge. PostgreSQL-backed migration verification is required before any persistence-backed business API is released.
- Apply migrations to development and staging before production.
- Production migration execution, approval, and scheduling remain tied to the deployment process, which is `TBD`.

Rollback and recovery:

- Every migration that changes deployed data must include either a safe reverse migration or a documented forward-recovery plan.
- Destructive changes must be phased: add the replacement structure first, backfill safely, switch application reads/writes, then remove old data only after a reviewed retention window.
- Data migrations must be idempotent where practical and must avoid loading large tables into memory.
- Failed production migrations must stop the rollout, preserve logs, and be handled through the documented rollback or forward-recovery plan.
- Do not rely on database backup restore as the ordinary rollback path for application migrations; restore is a disaster-recovery option.

Seed data:

- Seed data must be synthetic, minimal, and repeatable.
- Do not commit or load production personal data, identity documents, assessment content, answers, unreleased scores, proctoring evidence, credentials, or integration payloads.
- Required reference data should be represented through migrations, fixtures, or management commands only after the owning capability is defined.
- Demo or local-only data must be clearly labeled and must not be required for production startup.
- Seed commands must be safe to rerun or must fail clearly before creating duplicates.

## Pending decisions

- Database availability, backup retention, restore testing cadence, connection pooling values, and recovery targets: `TBD`.
- Object storage provider, bucket layout, malware scanning, retention, encryption, redaction, and evidence chain-of-custody rules: `TBD`.
- Tenant/institution isolation model and row-level authorization: `TBD`.
- Data classification, residency, retention, archival, deletion, and legal basis: `TBD`.
- Audit immutability, evidence chain of custody, and cryptographic integrity needs: `TBD`.
- Analytics store and de-identification approach: `TBD`.
