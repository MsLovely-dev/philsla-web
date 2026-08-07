# Exam Review End-to-End Completion Design

**Date:** 2026-08-07
**Owner:** Prince Barachiel Malonzo (P.Malonzo)
**Branch:** `p.malonzo/exam-review`
**Status:** Human-approved design; implementation requires a separately reviewed plan

## Objective

Complete the currently definable workflow from Exam Review through score processing and publication:

1. an authorized reviewer grades and finalizes an Exam Review;
2. Score Management accepts the finalized score into the correct examination session;
3. an authorized administrator processes and releases the session;
4. the owning student can read only their released result; and
5. authorized administrative users can read aggregate release analytics without receiving assessment answers or unnecessary identity data.

The implementation must preserve the existing Exam Review routes, frontend URLs, and ownership boundary between `apps.exam_reviews` and `apps.results`.

## Scope

### Included

- Re-verify and close reproducible security, state-transition, concurrency, validation, and error-handling gaps in the existing Exam Review workflow.
- Preserve the atomic Exam Review-to-Score Management intake handoff.
- Add a backend-owned, student-scoped released-results read contract.
- Add backend-owned administrative release-summary and aggregate analytics contracts.
- Replace mock or browser-local authority in Results Release, Student Results, and the relevant reporting view with typed service calls.
- Preserve loading, empty, validation, conflict, permission-denied, responsive, keyboard, and accessible states.
- Add focused service, endpoint, component, and critical browser-journey coverage.
- Update API, architecture, security, and implementation records to match shipped behavior and disclosed rollout limitations.

### Excluded because no accepted rule exists

- Qualification or admission cutoff decisions.
- Appeals, result holds, recheck adjudication, or post-release score amendment.
- A replacement for the current working competition-ranking method.
- Government-recipient distribution or external regulatory submission.
- OCR, OMR, CSV answer recognition, malware scanning, and new object-storage infrastructure.
- Rebuilding Score Management capabilities that are already implemented and verified by their owning module.

These exclusions are not silently approximated. Each remains documented as an unresolved business or architecture decision.

## Existing foundations

The design builds on implemented behavior:

- `apps.exam_reviews` owns review records, item scoring, answer-sheet metadata, grading readiness, finalization, and the synthetic development seed.
- `apps.results` owns score intake, examination sessions, ranking populations, processing, release, release audits, notification outbox records, and CSV export.
- Exam Review finalization already invokes the Score Management-owned intake service in one database transaction.
- Existing administrative Score Management endpoints are restricted to `SYSTEM_ADMIN`.
- Existing Exam Review endpoints retain the public `/api/v1/results/exam-reviews/` prefix.

The completion work extends these boundaries; it does not merge the applications or transfer model ownership.

## Architecture

### Backend boundaries

`apps.exam_reviews` remains responsible for:

- reviewer queue and detail reads;
- official subjective-item scores;
- grading readiness and status transitions;
- private answer-sheet upload metadata; and
- finalization into the Score Management intake interface.

`apps.results` remains responsible for:

- accepting finalized Exam Review scores;
- processing ranks and percentiles within configured ranking populations;
- releasing processed sessions and recording release audits;
- queuing availability notifications;
- student-scoped released-result reads; and
- aggregate release reporting derived from persisted score/session data.

React components do not call endpoints directly. Typed service modules own transport paths, request bodies, response contracts, and safe mapping into view models.

### Data changes

The first implementation step must characterize whether existing `ExaminationSession`, `CandidateScore`, `ScoreProcessingBatch`, `ScoreReleaseAudit`, and account/application relationships support every approved response. The preferred design adds no model or migration.

If a required response cannot be derived safely and efficiently, implementation pauses for a migration addendum covering the exact new field or index, rollout impact, PostgreSQL rehearsal, and rollback. No denormalized analytics table or new personal-data copy is introduced by default.

## API contracts

All new routes live under `/api/v1/results/` and use the repository's standard error envelope.

### Student released results

`GET /api/v1/results/me/`

- Authentication: required.
- Role: `STUDENT` only.
- Scope: the backend resolves the current account to its owned student application; the client cannot submit a candidate ID, LRN, account ID, or role override.
- Visibility: return only approved scores whose release status is `RELEASED` and whose examination session is `RESULTS_RELEASED`.
- Ambiguity: an absent ownership link returns a safe empty result; conflicting ownership or score anchors return a safe conflict without disclosing another candidate.
- Ordering: newest released session first, then stable session and score identifiers.
- Response: `{ count, results }`, where each result contains only the released session/exam label, raw and maximum score, final score, percentile, overall rank, release timestamp when derivable, and release status.
- Exclusions: no LRN, answer content, answer key, rubric, reviewer identity, internal processing batch identifier, notification details, or another student's data.

### Administrative release summary

`GET /api/v1/results/release-summary/`

- Authentication: required.
- Roles: `EXAM_ADMINISTRATOR` and `SYSTEM_ADMIN`.
- Response: one row per examination session with stable session identity, display name, lifecycle state, candidate/approved/excluded/processed/released counts, latest processing timestamp, release readiness, and latest release timestamp.
- Release readiness is computed by the backend from authoritative session and score state. The frontend cannot submit or override readiness.
- Query parameters are `page` (default `1`), `pageSize` (default `25`, maximum `100`), optional `status`, and optional trimmed `search` over display name or identifier. The response is `{ count, page, pageSize, results }`.

Existing process and release mutation endpoints remain authoritative. Their permission contract expands from `SYSTEM_ADMIN` alone to `EXAM_ADMINISTRATOR` or `SYSTEM_ADMIN`, matching the existing protected Results Release route and the operational ownership of exam release. Score Management candidate-profile administration remains `SYSTEM_ADMIN` only. The Results Release screen consumes the summary contract and invokes the existing mutations through a service module; it does not duplicate processing or release rules.

### Administrative aggregate analytics

`GET /api/v1/results/analytics/overview/`

- Authentication: required.
- Roles: `CHED_ADMIN`, `DEPED_ADMIN`, `TESDA_ADMIN`, `EXECUTIVE`, `UNIVERSITY_ADMIN`, `EXAM_ADMINISTRATOR`, and `SYSTEM_ADMIN`.
- Dataset: released, approved candidate scores only.
- Response: aggregate totals and distributions that can be computed from approved persisted fields, including released candidates, sessions released, mean final score, score bands, and ranking-population summaries.
- Privacy: no candidate row, name, LRN, answer content, or small-cell identity disclosure. Because no disclosure threshold is accepted, the endpoint exposes only national and examination-session aggregates and does not return demographic, geographic, institution, or agency groupings.
- Agency-, institution-, demographic-, and geographic breakdowns are not inferred from incomplete relationships.

## Workflow and state rules

1. A review begins as `SUBMITTED`.
2. Subjective items receive official scores through the existing item endpoint.
3. A review cannot become `GRADED` while a subjective item remains unscored.
4. A review cannot finalize unless it is `GRADED`, has no pending subjective items, and maps to exactly one eligible Score Management exam set.
5. Finalization and score intake succeed or roll back together.
6. A score is not student-visible after Exam Review finalization alone.
7. Score Management processing computes rank and percentile for approved scores in the configured ranking population.
8. Only a successfully processed session can be released.
9. Session release records the audit event and marks eligible scores released in one transaction; notification enqueue failure does not undo publication.
10. Only released scores from a released session are visible through the student-scoped endpoint or included in release analytics.

No frontend state, URL parameter, browser storage value, or client-submitted identifier authorizes a transition or a result read.

## Frontend design

### Exam Review

Keep the current list and detail pages. Close only gaps proven by tests or verification after the main update. Preserve:

- queue filtering and export without answer content;
- item-by-item official grading;
- answer-sheet upload validation and status;
- grading/readiness explanations;
- retryable Score Management handoff conflicts; and
- locked finalized records.

### Results Release

Replace prototype data with the administrative summary service. The screen presents session state, counts, processing readiness, release readiness, and last activity. Process and release actions require explicit confirmation, show pending state, prevent duplicate submission, surface safe backend errors, and refresh authoritative data after success.

### Student Results

Replace mock results with the student-scoped service. The page supports loading, no released results, safe error, and populated states. It never accepts a candidate identifier from the route or browser as authority. It clearly distinguishes score, percentile, and rank without deriving qualification or admission outcomes.

### Aggregate reporting

Connect only the result widgets supported by the aggregate analytics contract. Unsupported agency or institution breakdowns remain visibly identified as unavailable rather than populated with mock data. Charts include textual summaries and do not rely on color alone.

## Authorization and security

- Django-managed identity and role state are authoritative.
- Every endpoint uses deny-by-default permissions and backend object scoping.
- Student result resolution starts from the authenticated account and its owned application.
- Administrative aggregation never exposes row-level candidate data.
- Exam Review detail remains restricted to accepted reviewer/admin roles.
- Answer-sheet binaries remain private; no public storage URL is added.
- Logs and error envelopes omit tokens, LRNs, answers, answer keys, rubrics, uploaded-file contents, and notification payloads.
- Synthetic identities and assessment content are used in tests, fixtures, documentation, and screenshots.
- Release mutations retain transaction boundaries and row locking; concurrency behavior is rehearsed against PostgreSQL-compatible storage before production rollout.

## Error handling

- Validation failures return `400` using field-aware safe errors.
- Unauthenticated requests return `401`.
- Authenticated but unauthorized requests return `403`.
- Missing in-scope resources return `404` without confirming another user's records.
- Invalid lifecycle transitions, ambiguous mappings, and conflicting ownership return `409`.
- Empty student results and empty aggregate datasets return successful empty responses, not errors.
- Frontends retain the last confirmed state during a mutation, disable duplicate submission, show an actionable message, and refetch after success.

## Testing strategy

### Backend

- Characterization tests for existing Exam Review and Score Management behavior after integrating latest main.
- Student-result endpoint tests for success, empty state, unauthenticated access, wrong role, object-level isolation, ambiguous ownership, unreleased score exclusion, and safe fields.
- Release-summary tests for counts, readiness, filtering, pagination, unauthenticated access, and role denial.
- Analytics tests for correct released-only aggregation, empty data, role denial, and absence of identity/assessment fields.
- Existing transition, rollback, validation, migration-boundary, processing, release-audit, and notification tests remain green.
- PostgreSQL-compatible tests cover transaction/concurrency paths that SQLite cannot validate.

### Frontend

- Typed service tests for paths, authentication behavior, response mapping, and safe errors.
- Component tests for loading, empty, success, conflict/error, permission-denied routing, confirmation, duplicate-submit prevention, keyboard behavior, and accessible labels.
- Existing Exam Review component and export tests remain green.

### Browser journeys

- Administrator completes a ready Exam Review and hands it to Score Management.
- Administrator processes and releases the corresponding session.
- Owning student sees the released result.
- A different student cannot read it.
- Administrative analytics update from released data without exposing candidate rows.

## Delivery sequence

The work is split into reviewable increments:

1. baseline dependency and regression stabilization;
2. Exam Review gap characterization and minimal hardening;
3. student released-result backend contract;
4. administrative summary and aggregate analytics contracts;
5. frontend service and screen integration;
6. critical browser journeys;
7. documentation, PostgreSQL rehearsal, full verification, and rollout record.

Each increment follows test-first implementation and receives review before the next ownership boundary is expanded.

## Rollout and rollback

- No local or shared migration runs occur until the existing incompatible local SQLite history is resolved through an explicitly selected recovery procedure.
- When no migration is needed, rollout consists of backend/frontend deployment with endpoint smoke tests and role checks.
- Any approved migration addendum must include PostgreSQL forward and rollback rehearsal before deployment.
- Code rollback reverts the scoped completion commits. Existing Exam Review and Score Management migration history is never rewritten.
- A released production result is a business event, not merely deployable code state; application rollback must not silently reverse release rows or notifications. Any production data correction requires a separately approved operational procedure.

## Acceptance criteria

- Latest `origin/main` remains integrated.
- Existing Exam Review public contracts and frontend routes remain compatible.
- The end-to-end administrative flow uses persisted backend state from review through release.
- A student sees only their released results through backend account scoping.
- Administrative result analytics use released persisted data and expose no candidate rows.
- Unsupported policy-dependent behavior is not simulated or mislabeled as implemented.
- Focused backend, frontend, and browser suites pass.
- Relevant complete suites, lint, build, migration checks, and PostgreSQL rehearsal results are recorded exactly, including unrelated failures or skipped checks.
