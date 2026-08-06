# Ticket 001 — Password Lockout Storage Proposal

**Date:** 2026-08-05

**Owner and approver:** Maricon Landicho (M.Landicho)

**Status:** Approved by Maricon Landicho on 2026-08-05 for Thursday Phase 2 execution; not implemented Wednesday

## Decision requested

Approve a small database-backed password-attempt and lockout state associated with the Django user account. Do not use Django's current default local-memory cache as the production security boundary.

## Evidence from the current project

- `config.settings.local` and `config.settings.test` resolve the default cache to `django.core.cache.backends.locmem.LocMemCache`.
- `config.settings.production` defines no `CACHES` override, so it inherits Django's process-local default.
- The committed dependency manifests contain no Redis or Memcached client.
- No accepted ADR selects a shared-cache provider or deployment topology.
- PostgreSQL-compatible persistence through Supabase Postgres is already accepted for production.

`LocMemCache` cannot provide one shared counter across production workers and loses state when a process restarts. It is therefore unsuitable for enforcing ADR-011's account lockout requirement.

## Recommended design

Add one lockout-state row per Django user account with only the minimum server-side fields needed to enforce the rule:

- Internal user relation with a uniqueness constraint.
- Failed-attempt count.
- Start of the current 15-minute attempt window.
- Lockout expiry timestamp.
- Created and updated timestamps for operational inspection.

The service should update this row inside a database transaction and acquire a row lock when the row already exists. The implementation plan must also define a safe create-or-retry path for concurrent first failures so simultaneous requests cannot lose increments.

The state must be addressed only by the internal Django user identifier. It must not store or key by email, LRN, password, pending-auth token, IP address, or other personal/authentication data. Client responses must remain the existing generic authentication failure and must not reveal whether an account is locked.

This table is operational security state, not the durable authentication audit trail. Safe lockout audit events remain Phase 4 work.

## Why this is preferred now

- It uses the already accepted shared production database instead of introducing an unapproved cache provider and dependency.
- Database transactions can protect counter updates across application workers.
- Lockout expiry survives worker restarts.
- The change can be additive and isolated from the existing four-step login records.

A future accepted shared-cache architecture may replace or supplement this mechanism, but that would require its own ADR/configuration, dependency-lock, deployment, failure-mode, and operations review.

## Migration and deployment proposal

No migration should be generated until Maricon approves this design and separately authorizes the model/migration files.

If approved:

1. Add the model and an additive migration that creates only the new lockout-state table, uniqueness constraint, and necessary expiry/index support.
2. Review the generated migration; it must not alter or rewrite existing user, profile, refresh-session, recovery-token, or selfie-log rows.
3. Apply the migration before deploying code that reads or writes the new table.
4. Deploy the tested service behavior while preserving current endpoint routes and generic error envelopes.
5. Monitor safe aggregate error rates and database failures without logging identifiers or secrets.

## Rollback proposal

1. Roll back the application code first so no deployed worker depends on the new table.
2. Retain the empty/inactive table temporarily if a rapid forward recovery may be needed.
3. Reverse the migration only after confirming no deployed worker uses it and the security owner approves deletion of its operational state.
4. If lockout enforcement must be disabled during rollback, record the temporary ADR-011 gap explicitly; do not silently fall back to `LocMemCache` and claim production compliance.

## Alternatives considered

- **Current `LocMemCache`: rejected for production.** State is isolated per process and cleared on restart.
- **New Redis/Memcached configuration: deferred.** No provider, dependency, deployment contract, or accepted ADR currently exists.
- **Fields added directly to the Django user model: not recommended.** The project uses Django-managed users and an additive related state model is smaller and less intrusive.

## Approval gate

- [x] Maricon approves database-backed lockout state as the Phase 2 storage design.
- [x] Maricon separately authorizes the proposed model and migration files before they are created.
- [ ] Phase 2 begins Thursday with failing tests before implementation code.
