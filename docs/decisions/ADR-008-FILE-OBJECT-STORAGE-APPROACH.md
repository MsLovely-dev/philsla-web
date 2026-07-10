# ADR-008: File and Object Storage Approach

- Status: Accepted for the backend foundation
- Date: 2026-07-10
- Decision owners: `TBD`

## Context

PhilSA needs to handle student documents, reviewer-visible document previews, incident evidence, recordings, exports, and other binary artifacts. These files may contain sensitive personal data, identity documents, assessment evidence, proctoring material, or operational exports.

The database decision stores metadata and references in PostgreSQL-compatible storage, but binary files should not be stored directly in relational tables. Supabase Postgres is accepted only as the database provider; Supabase Storage remains a separate provider decision.

## Decision

Use private S3-compatible object storage for documents, evidence, recordings, and generated exports.

This decision accepts the storage interface and operating model, not a concrete provider:

- Store file binaries in private object storage buckets/containers.
- Store only metadata, ownership, classification, object keys, checksums, lifecycle state, and access references in the database.
- Access files through backend-authorized flows, such as short-lived signed URLs or streamed responses, after object-level authorization checks.
- Do not expose permanent public object URLs for sensitive files.
- Keep object keys opaque and avoid embedding personal data, application numbers, government identifiers, exam content, or user-supplied filenames in keys.
- Keep Supabase Storage, AWS S3, MinIO, and other compatible providers as provider options until a separate provider decision is accepted.

## Consequences

- Backend document/evidence APIs must authorize every upload, download, preview, replace, delete, and retention action.
- Future storage configuration must use environment variables and secret management; no access keys, bucket names for private environments, or endpoint secrets may be committed.
- Local development can use a compatible local emulator or isolated development bucket after the provider/deployment decision is made.
- Malware scanning, file type validation, size limits, retention, legal hold, evidence chain of custody, encryption/key management, and redaction rules must be defined before production use.
- Database models should reference object metadata, not store file bytes.

## Alternatives considered

- Store files in PostgreSQL: rejected because documents, recordings, and evidence are large binary artifacts with separate lifecycle, access, and retention needs.
- Adopt Supabase Storage now: deferred because prior decisions explicitly kept Supabase Storage separate from Supabase Postgres.
- Use local filesystem storage: rejected for deployed environments because it does not meet independent scaling, durability, and access-control needs.
