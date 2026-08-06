# Results Release and Analytics Design

- Date: 2026-08-06
- Owner: Prince Barachiel Malonzo (`P.Malonzo`)
- Branch: `p.malonzo/results-release`
- Design status: Approved in conversation; written specification awaiting owner review
- Implementation status: Not started

## Purpose

Implement the Results Release and Analytics story identified in `BUILD_PLAN.md` as a separate roadmap cycle. The implementation will retain the existing frontend routes and visual structure where practical, remove mock and browser-local authority, add backend-owned persistence and workflows, and connect the admin, student, notification, document, and analytics experiences through versioned APIs.

The result-release boundary starts after Score Management has produced approved, processed candidate scores with rank and percentile. It does not recalculate scores or take ownership of Exam Review or Score Management.

## Current State

- `apps.results` already owns Score Management intake, processing, ranking, batch release flags, a basic release audit row, and CSV export.
- `frontend/src/pages/admin/hub/ResultsRelease.tsx` reads mock data and `localStorage` and fabricates notification purposes and delivery state.
- `frontend/src/pages/ResultsPage.tsx` displays hard-coded scores, rank, percentile, release date, and qualification status.
- `frontend/src/pages/results/ReportingMatrix.tsx` uses national and university mock datasets.
- There is no student-owned released-result API, release-policy model, hold workflow, immutable publication record, official result document, notification-delivery workflow, or released-result analytics API.
- Both `apps.configuration` and `apps.universities` currently define university and course registries. The documented maintenance contract and scoped UUID authorization are under `apps.configuration`; this feature will reference `apps.configuration.University` and `apps.configuration.CollegeCourse`. Consolidating the duplicate registry applications is a separate architecture decision and is not part of this implementation.

## Goals

1. Make Django authoritative for release policies, qualification decisions, readiness, holds, publication, permissions, notifications, documents, and audit history.
2. Publish immutable, versioned result snapshots that remain historically accurate if source records later change.
3. Let authorized administrators preview readiness, manage holds, publish eligible results, inspect publication history, and retry failed notifications.
4. Let an authenticated student see only their own published results and download an authorized official result PDF.
5. Replace Results Release, Student Results, and Reporting Matrix mock data with typed service calls.
6. Provide role-scoped released-result analytics without exposing candidate-level records to government dashboards.
7. Preserve current Score Management behavior and use focused application services at the module boundary.

## Non-Goals

- Recalculate raw score, final score, rank, or percentile.
- Edit Exam Review or Score Management records from Results Release.
- Consolidate the two existing university-registry applications.
- Select or invent a production SMS vendor. SMS delivery is explicitly disabled unless a reviewed adapter is configured.
- Select a production task-queue platform or deployment scheduler. Notification work is stored durably and can be processed through a management command; deployment scheduling is outside this application change.
- Add a concrete private object-storage provider. Official PDFs are generated on demand from immutable database snapshots.
- Store or use real student, exam, notification, or government-integration data in tests and documentation.

## Architecture

### Module ownership

Results Release remains inside `apps.results` because it consumes and publishes the score records already owned by that application. New workflows live in focused application/domain services; DRF views and serializers remain transport adapters.

Frontend calls are isolated in `frontend/src/services/resultsReleaseService.ts`, `studentResultsService.ts`, and `resultsAnalyticsService.ts`. Presentation components do not call remote endpoints directly and do not persist authoritative release state in browser storage.

### Data flow

1. Authorized staff create and activate a versioned release policy for one examination session and university.
2. The readiness service resolves approved candidate scores to an eligible Student Application, student account, course preferences, active university/course registry records, and active release policies.
3. System blockers create calculated readiness reasons. Authorized staff may add explicit manual holds with reason codes and safe notes.
4. A publication request supplies an idempotency key. The backend locks the session and affected score rows, recalculates readiness, publishes only eligible candidates, and leaves held candidates private.
5. The same transaction creates the publication batch, immutable result snapshots, per-preference decisions, safe audit events, and queued notification records.
6. After commit, notification delivery can run without changing the official publication outcome. Delivery failures remain visible and retryable.
7. Student and analytics APIs read publication snapshots, never mutable preview data or frontend calculations.

### Source resolution rules

- A score resolves to exactly one non-draft, non-rejected `StudentApplication` whose `candidate_id` and LRN both match the `CandidateScore`. No fallback to name matching is allowed.
- The owning student account resolves through exactly one active `AccountProfile` with role `STUDENT` and the same LRN. Missing or duplicate linkage blocks publication.
- Each application preference is normalized for surrounding whitespace and case, then resolved unambiguously against `apps.configuration.University.code` or name and its `CollegeCourse.program_code` or program name. Zero or multiple matches block that preference.
- Readiness responses expose safe reason codes and record identifiers, not LRN, contact values, or raw preference payloads.

## Data Model

All new identifiers use UUID primary keys. Timestamps use timezone-aware Django fields.

### `ReleasePolicy`

- `session`: protected foreign key to `ExaminationSession`.
- `university`: protected foreign key to `apps.configuration.University`.
- `metric`: `FINAL_SCORE` or `PERCENTILE`.
- `qualified_threshold`: decimal from 0 through 100.
- `waitlist_enabled`: boolean.
- `waitlist_lower_threshold`: nullable decimal from 0 through 100; required when waitlisting is enabled and strictly lower than `qualified_threshold`.
- `status`: `DRAFT`, `ACTIVE`, or `RETIRED`.
- `version`: positive integer unique within the session/university scope.
- `created_by`, `activated_by`: protected account references.
- `created_at`, `activated_at`, `retired_at`.

Exactly one policy may be active per session/university. Activation locks the policy fields. Revisions create a new version and retire the previous active version in one transaction.

### `ReleaseHold`

- `score`: protected foreign key to `CandidateScore`.
- `university`: nullable protected foreign key identifying a university-specific hold; null means the hold blocks every preference for that score.
- `source`: `SYSTEM` or `MANUAL`.
- `reason_code`: `MISSING_APPLICATION`, `AMBIGUOUS_APPLICATION`, `MISSING_STUDENT_ACCOUNT`, `MISSING_COURSE_PREFERENCE`, `UNRESOLVED_PREFERENCE`, `MISSING_ACTIVE_POLICY`, `SCORE_NOT_PROCESSED`, `PENDING_REVIEW`, `PENDING_INCIDENT`, `RECHECK_REQUESTED`, or `MANUAL_REVIEW`.
- `status`: `ACTIVE` or `RESOLVED`.
- `safe_note`: optional staff note that must not contain LRN, score values, exam content, credentials, or notification bodies.
- `created_by`, `resolved_by`, `created_at`, `resolved_at`.

Calculated system blockers are returned by readiness queries and materialized as system holds only when a publication attempt encounters them. Manual holds are persisted immediately. A hold is never deleted; resolution changes its state and creates an audit event.

### `PublicationBatch`

- `session`: protected foreign key.
- `idempotency_key`: unique opaque key supplied by the caller.
- `requested_universities`: many-to-many relation to the configuration university registry.
- `status`: `PARTIALLY_RELEASED` or `RESULTS_RELEASED`.
- `eligible_count`, `published_count`, `held_count`, `excluded_count`.
- `published_by`, `published_at`.

Repeated requests with the same key and identical scope return the original batch. Reuse with different scope returns `409 CONFLICT`.

### `ResultPublication`

- `batch`: protected foreign key to `PublicationBatch`.
- `score`: protected foreign key to `CandidateScore`.
- `student_account`: protected foreign key to the authoritative Django account.
- `application`: protected foreign key to `StudentApplication`.
- `version`: positive integer per score.
- `status`: `PUBLISHED` or `SUPERSEDED`.
- `supersedes`: nullable protected self-reference.
- Immutable snapshot fields: candidate identifier, display name, session identifier/name, raw score, maximum score, final score, overall rank, percentile, publication timestamp, and region.
- `snapshot_digest`: SHA-256 digest of canonical snapshot and decision data.
- `created_at`.

There is one current `PUBLISHED` version per score. Corrections never update an official snapshot in place; a corrected publication supersedes the previous version and retains the full history.

### `ResultDecision`

- `publication`: protected foreign key.
- `university`: protected configuration-registry foreign key.
- `course`: protected configuration-registry foreign key.
- `policy`: protected foreign key to the exact active policy version used.
- `preference_order`: positive integer copied from the application.
- `outcome`: `QUALIFIED`, `WAITLISTED`, or `FAILED`.
- `metric`, `metric_value`, `qualified_threshold`, and nullable `waitlist_lower_threshold` snapshots.

Decision rules are deterministic:

- Metric value at or above `qualified_threshold` is `QUALIFIED`.
- When waitlisting is enabled, a metric value at or above `waitlist_lower_threshold` but below `qualified_threshold` is `WAITLISTED`.
- Every lower metric value is `FAILED`.
- An unresolved university/course preference or missing active policy blocks that preference and prevents its publication.

### `NotificationDelivery`

- `publication`: protected foreign key.
- `channel`: `EMAIL` or `SMS`.
- `template_version`: immutable template identifier.
- `destination`: private email address or mobile number snapshot; excluded from logs and ordinary list responses.
- `status`: `QUEUED`, `SENDING`, `SENT`, `FAILED`, or `DISABLED`.
- `attempt_count`, `last_error_code`, `queued_at`, `last_attempted_at`, `sent_at`.

Email uses Django's configured email backend. SMS uses a provider interface. Environments without an explicitly configured SMS adapter create `DISABLED` rows and never claim that a message was sent.

### `ResultAuditEvent`

- Optional protected references to publication batch, publication, hold, and actor.
- `event`: policy created/activated/retired, readiness previewed, hold created/resolved, batch published, result viewed, document downloaded, notification attempted/sent/failed/retried, or publication superseded.
- `outcome`, `actor_role`, `correlation_id`, and timestamp.
- Safe metadata limited to identifiers, counts, reason codes, and lifecycle states.

Audit rows never contain LRN, names, scores, addresses, notification destinations/bodies, exam content, tokens, or raw request/response payloads.

## Lifecycle Rules

Candidate readiness is derived as `NOT_READY`, `READY`, `HELD`, `PUBLISHED`, or `SUPERSEDED`.

- `NOT_READY`: score processing, application/account linkage, preference resolution, or policy coverage is incomplete.
- `READY`: every backend readiness check passes for at least one requested university and no applicable active hold exists.
- `HELD`: an active system or manual hold blocks publication for the requested scope.
- `PUBLISHED`: the official snapshot and decisions exist and are visible to the owning student.
- `SUPERSEDED`: a later correction version replaced the publication.

Publication can be partial. Eligible candidates are published while held candidates remain private. The session receives `PARTIALLY_RELEASED` while unresolved approved candidates remain, and `RESULTS_RELEASED` only after every approved candidate is published or formally excluded. The existing Score Management release call will be refactored to delegate publication state changes to the new service while preserving its documented route during migration.

A publication action always recalculates readiness under database locks. A previously viewed preview cannot bypass changed scores, holds, accounts, applications, registry records, or policies.

## API Contracts

All endpoints remain under `/api/v1/` and use the repository's standard error envelope and correlation identifiers.

### Policy and control APIs

- `GET`, `POST /api/v1/results/release-policies/`
- `GET`, `PATCH /api/v1/results/release-policies/{policyId}/`
- `POST /api/v1/results/release-policies/{policyId}/activate/`
- `GET /api/v1/results/release-readiness/?sessionId={id}&universityId={uuid}`
- `GET`, `POST /api/v1/results/release-holds/`
- `POST /api/v1/results/release-holds/{holdId}/resolve/`

### Publication and delivery APIs

- `POST /api/v1/results/publication-batches/` with required `Idempotency-Key` header.
- `GET /api/v1/results/publication-batches/`
- `GET /api/v1/results/publication-batches/{batchId}/`
- `GET /api/v1/results/publications/?sessionId={id}&universityId={uuid}&status={status}`
- `GET /api/v1/results/publications/{publicationId}/`
- `GET /api/v1/results/publications/{publicationId}/notifications/`
- `POST /api/v1/results/notifications/{deliveryId}/retry/`

### Student APIs

- `GET /api/v1/results/me/` returns the authenticated student's current published results only.
- `GET /api/v1/results/me/{publicationId}/certificate/` returns an authorized PDF generated from the immutable snapshot.

Unpublished or non-owned publications return the same privacy-safe `404` response.

### Analytics APIs

- `GET /api/v1/analytics/results/overview/`
- Filters: session, university, region, and publication date.
- Response: published-candidate count; qualified, waitlisted, and failed counts; average final score; average percentile; and aggregate breakdowns by university and region.
- Government and executive callers receive aggregate rows only. University administrators receive only universities in their server-owned scope.

No analytics response includes candidate identifiers, names, LRN, contact information, exact addresses, or individual score rows.

## Authorization

- `SYSTEM_ADMIN`: global policy, readiness, hold, publication, notification, and audit access.
- `EXAM_ADMINISTRATOR`: global policy, readiness, hold, publication, and notification access; cannot alter unrelated account or university-registry data.
- `UNIVERSITY_ADMIN`: policy, readiness, hold, publication, and history access limited to UUIDs in the server-owned `scopes.universityIds` claim.
- `STUDENT`: current publications and certificate downloads for the authenticated account only.
- `CHED_ADMIN`, `DEPED_ADMIN`, `TESDA_ADMIN`, and `EXECUTIVE`: aggregate result analytics only.
- Every other role is denied by default.

Frontend routes remain usability controls only. Backend role and object-level authorization is authoritative.

## Frontend Design

### Admin Results Release

`ResultsRelease.tsx` retains the existing route and general table/modal presentation but removes `useMockData`, `localStorage`, `any` release models, fabricated notification purposes, and simulated delivery claims. It will use typed models and service calls to display:

- session and university filters;
- readiness totals and blocker summaries;
- candidate publication/hold status;
- policy version and decision outcome;
- release confirmation with eligible, held, and excluded counts;
- publication history;
- email/SMS delivery status and retry actions;
- loading, empty, stale, validation, conflict, permission-denied, and network-error states.

### Student Results

`ResultsPage.tsx` removes hard-coded result constants and frontend qualification calculations. It displays:

- a safe not-released state when no publication exists;
- current published score, rank, percentile, decisions, and publication date;
- subject breakdown only when the backend publication contract contains authoritative subject data; otherwise that prototype panel is removed;
- secure official PDF download;
- responsive, keyboard-accessible loading, empty, error, and download states.

### Reporting Matrix

`ReportingMatrix.tsx` removes national and university mock arrays and loads role-scoped aggregates through `resultsAnalyticsService.ts`. Filters are server-backed and no government view receives candidate-level data.

## Documents

The certificate endpoint generates a PDF on demand from `ResultPublication` and `ResultDecision` snapshots using ReportLab. The implementation will add ReportLab to the backend `.in` manifest, regenerate the Python 3.13 pinned lock, and review the lock diff before accepting the dependency change.

The PDF contains a synthetic-safe layout with publication reference, candidate display information, session, official score/rank/percentile, university/course decisions, publication timestamp, version, and a verification digest. It excludes LRN, account identifiers, contact information, answer data, and internal audit metadata. Response headers prevent shared caching. Every successful download creates a safe audit event.

## Notifications

Publication creates email and SMS delivery rows after validating the student's current verified contact data. A management command processes queued rows in bounded batches using provider interfaces.

- Email dispatch uses Django's configured email backend.
- SMS dispatch runs only when a concrete adapter is configured; otherwise the row becomes `DISABLED` with a non-sensitive reason code.
- A delivery attempt claims one row atomically, increments the attempt counter, and records only safe provider error codes.
- Retry is allowed for `FAILED` deliveries and is idempotent while a row is `QUEUED` or `SENDING`.
- Notification failure never reverses publication.

## Error Handling

- `400 BAD_REQUEST`: malformed filters, thresholds, notes, or request bodies.
- `401 UNAUTHORIZED`: missing or invalid authentication.
- `403 FORBIDDEN`: role, permission, or university-scope denial.
- `404 NOT_FOUND`: missing administrative records and privacy-safe student ownership/unpublished cases.
- `409 CONFLICT`: stale policy version, active-policy collision, unresolved readiness blocker, active hold, lifecycle conflict, ambiguous source linkage, or idempotency-key reuse with a different scope.
- `503 SERVICE_UNAVAILABLE`: direct provider retry cannot proceed because a configured provider is unavailable; publication remains intact.

Errors expose stable codes and actionable safe messages without sensitive identity, assessment, contact, or provider payload data.

## Analytics Computation

Analytics queries use current `PUBLISHED` snapshots and their decisions. Superseded versions are excluded from current totals but remain auditable. A candidate is counted once per publication for candidate totals and once per decision for university/course outcomes. Region comes from the immutable publication snapshot, not a mutable application profile.

All filtering, aggregation, ordering, and pagination occur on the backend. Frontend charts are presentation only.

## Migration, Rollout, and Rollback

1. Add new tables, constraints, and indexes without modifying existing score rows.
2. Add `PARTIALLY_RELEASED` to the score-session status choices and route existing batch release through the new publication service.
3. Deploy backend models and read endpoints before enabling frontend mutations.
4. Seed synthetic local release policies and candidates through an idempotent management command.
5. Connect admin, student, notification, certificate, and analytics slices sequentially.
6. Verify migrations and release transactions against PostgreSQL-compatible storage before production readiness is claimed.

The migration is additive, but reversing it after publication deletes official publication, decision, notification, hold, and audit data. Rollback in an environment containing publications therefore requires a verified database backup and export of official result records before reversing migrations. Application rollback should first disable new publication mutations while preserving read access to already published snapshots.

## Testing

### Backend

- Model constraints for policy versions, thresholds, active policies, publication versions, and delivery states.
- Domain-service tests for qualification, waitlisting, failure, readiness, holds, partial publication, complete publication, correction/supersession, and idempotency.
- Transaction tests proving stale previews and concurrent releases cannot bypass readiness or duplicate publications.
- Endpoint tests for success, invalid input, unauthenticated access, role denial, university object-scope denial, not found, conflicts, safe errors, and audit expectations.
- Student tests proving unpublished and non-owned publications are indistinguishable and inaccessible.
- PDF tests for authorization, headers, expected safe fields, and prohibited sensitive fields.
- Notification tests for email success, disabled SMS, provider failure, retry, and safe error recording.
- Analytics tests for filters, role scope, current-version counting, and absence of candidate-level data.
- Migration checks and PostgreSQL-compatible transaction rehearsal.

### Frontend

- Service contract and transport-mapping tests for every new endpoint.
- Results Release component tests for loading, empty, readiness blockers, holds, partial/full release, conflicts, permission denial, delivery failure, and retry.
- Student Results tests for not released, published, decisions, ownership-safe errors, and PDF download.
- Reporting Matrix tests for loading, filters, aggregates, empty, permission-denied, and error states.
- Keyboard and accessibility assertions for dialogs, tables, filters, status messages, and download controls.

### Browser journeys

- Administrator configures/activates policy, previews readiness, resolves or preserves holds, and publishes eligible results.
- Held candidate remains private while another candidate is published.
- Published student signs in, views only their result, and downloads the certificate.
- Notification failure remains visible and retryable without retracting the result.
- Government role views scoped aggregate analytics without candidate data.

## Documentation

Implementation updates must include:

- `docs/api/API-ENDPOINTS.md` for every request, response, permission, error, and pagination contract.
- `docs/architecture/BACKEND-ARCHITECTURE.md` for the new result-publication boundary.
- `docs/architecture/DATABASE-DESIGN.md` for model ownership, constraints, indexes, migration impact, and rollback.
- `docs/security/SECURITY-BASELINE.md` when notification, document, audit, and student-object authorization behavior changes.
- `docs/superpowers/p.malonzo/implement/p.malonzo.implement.md` with the approved plan, implementation summary, exact verification commands, results, skipped checks, and pre-existing failures.

## Delivery Slices

1. Core policy, readiness, holds, publication persistence, permissions, and admin connection.
2. Student-owned results contract and frontend.
3. PDF certificate and notification delivery workflow.
4. Released-result analytics and Reporting Matrix connection.
5. Cross-slice hardening, PostgreSQL rehearsal, browser journeys, and documentation consistency.

Each slice follows test-first implementation and receives focused review before the next slice begins.

## Acceptance Criteria

- No Results Release, Student Results, or Reporting Matrix screen uses mock or browser-local authority.
- A result cannot publish without an approved processed score, unambiguous application/account linkage, resolved preferences, an active scoped policy, and no applicable hold.
- Publication is atomic, idempotent, auditable, immutable, and safe under concurrent requests.
- Held candidates remain private while eligible candidates may be published.
- Decisions are reproducible from the exact snapshotted policy version and metric values.
- Students can access only their own current publication and certificate.
- Notifications are truthful about queued, sent, failed, and disabled states.
- Analytics uses published snapshots and returns only role-scoped aggregates.
- API, migration, security, and business behavior are documented and tested.
- Exact verification commands and observed results are recorded before completion is claimed.
