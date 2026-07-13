# Backend Module Priority Checklist

## Purpose

This checklist prioritizes backend work now that PhilSA is moving beyond the frontend prototype. It is scoped to the future Django and Django REST Framework service under `backend/`.

Django, Django REST Framework, pip-tools dependency locking, PostgreSQL-compatible storage, Supabase Postgres as the database provider, private S3-compatible object storage as the file/evidence storage approach, and Django-managed server-side session authentication for the initial browser API are adopted. Deployment, object storage provider, background jobs, API schema tooling, token auth for non-browser clients, and production infrastructure remain `TBD` unless a later ADR accepts them.

Priority meanings:

- **P0 - Backend foundation:** required before P1 frontend work can depend on real APIs.
- **P1 - Core student journey APIs:** required for registration, application submission, review, scheduling, and permit workflows.
- **P2 - Assessment operations APIs:** required for exam content, exam day, delivery, proctoring, grading, and release.
- **P3 - Governance and expansion APIs:** required for administration, audit, compliance, reporting, and long-term operations.

## Working rules

- [ ] Implement one bounded backend slice at a time with serializers, permissions, validation, service/domain logic, tests, and API documentation.
- [ ] Keep routes, viewsets, and serializers thin; place workflow rules in application/domain services.
- [ ] Validate all client input server-side. Never trust frontend roles, identifiers, status values, scores, eligibility, or workflow transitions.
- [ ] Enforce object-level authorization for every record-specific endpoint.
- [ ] Keep persistence, external integrations, messaging, storage, and job processing behind explicit boundaries.
- [ ] Do not log secrets, credentials, identity documents, sensitive student data, exam content, proctoring evidence, or integration payloads.
- [ ] Add migrations only with a reviewed rollback/data-safety approach.
- [ ] Update API contract documentation before the frontend consumes an endpoint.
- [ ] Mark unresolved technical or business choices as `TBD`.

## P0 - Backend foundation

Complete these before replacing frontend mock/local behavior with backend APIs.

### Project scaffold and runtime

- [x] Scaffold a minimal Django project under `backend/` using the accepted Django and DRF stack.
- [x] Decide and document supported Python version and dependency tooling (`TBD`).
- [x] Add backend dependency manifest and lock strategy.
- [x] Add environment configuration pattern with safe defaults and `.env.example`.
- [x] Configure separate local, test, and production settings boundaries.
- [x] Add `manage.py` and documented local run commands.
- [x] Add a root API route namespace such as `/api/` after API versioning is decided.

### Baseline API and health

- [x] Add a health/readiness endpoint that does not expose secrets or infrastructure internals.
- [x] Add a DRF baseline configuration for renderers, parsers, exception handling, and pagination defaults.
- [x] Define the standard API error shape for validation, authorization, not-found, conflict, rate-limit, and unexpected errors.
- [x] Define request correlation ID behavior and safe structured logging.
- [x] Document local API smoke-test commands.

### Data and persistence decisions

- [x] Decide database engine and local development setup.
- [x] Decide whether to use Supabase Postgres as the backend database provider and record the decision in an ADR.
- [x] If Supabase Postgres is accepted, configure database connection through environment variables such as `DATABASE_URL` without committing credentials.
- [x] If Supabase Postgres is accepted, document local development, migration, backup/restore, connection pooling, and environment separation expectations.
- [x] Keep Supabase Auth and Supabase Storage separate decisions; do not adopt them automatically with Supabase Postgres.
- [x] Define migration workflow, rollback expectations, and data seeding rules.
- [x] Define model ownership boundaries by business capability.
- [x] Define audit fields and timestamp conventions.
- [x] Decide file/object storage approach for documents and evidence.

### Authentication, authorization, and security baseline

- [x] Decide authentication provider/session/token approach.
- [ ] Define backend roles and permissions aligned to documented frontend prototype roles.
- [ ] Add authentication middleware/configuration after provider is selected.
- [ ] Add permission classes for role and object-level authorization.
- [ ] Define password, MFA, account recovery, and invitation approach (`TBD`).
- [ ] Add security settings for CORS, CSRF/session behavior, allowed hosts, secure cookies, and trusted origins after deployment model is known (`TBD`).
- [ ] Document that frontend auth remains non-authoritative until backend auth is implemented.

### Test and quality baseline

- [ ] Decide backend test tooling and coverage expectations (`TBD`).
- [ ] Add tests for health endpoint, error response shape, authentication requirements, and permission denial behavior. (Health and error baseline implemented; authentication and permission tests await the auth baseline.)
- [ ] Add lint/type/format tooling decisions (`TBD`).
- [x] Add CI-ready commands for backend tests and checks.
- [x] Ensure docs report exact backend commands once they exist.

### API contract process

- [ ] Decide API schema tooling and publication approach (`TBD`).
- [ ] Update `docs/api/API-STANDARDS.md` with the final error, pagination, authentication, and versioning conventions.
- [ ] Update `docs/api/API-ENDPOINTS.md` when endpoints become implemented, not merely planned.
- [ ] Add contract tests or schema checks before frontend integration.
- [ ] Define frontend adapter handoff rules for replacing mock services.

## P1 - Core student journey APIs

Build these after P0 backend foundation is running and tested.

### 1. Authentication and account entry

- [ ] Implement current-session endpoint.
- [ ] Implement login/logout or provider callback/session endpoints after auth approach is selected.
- [ ] Implement account creation or invitation flow (`TBD`).
- [ ] Implement email confirmation, password recovery, and MFA contracts (`TBD`).
- [ ] Return safe, actionable auth errors without exposing account existence or sensitive details.
- [ ] Add auth, throttling, audit, and permission tests.

### 2. Student registration and application

- [ ] Implement application draft create/read/update endpoints.
- [ ] Implement application submission endpoint with server-side validation.
- [ ] Persist personal, address, school, course preference, and review-step data.
- [ ] Implement document upload metadata and storage workflow after storage is selected (`TBD`).
- [ ] Implement document replace/remove behavior with authorization and retention rules (`TBD`).
- [ ] Implement application status transitions for draft, submitted, for-correction, resubmitted, approved, and rejected.
- [ ] Add duplicate, validation, authorization, concurrency, and state-transition tests.

### 3. Identity and school verification

- [ ] Define PhilSys verification contract and integration boundary (`TBD`).
- [ ] Define DepEd LRN verification contract and integration boundary (`TBD`).
- [ ] Store verification attempts and outcomes without logging sensitive payloads.
- [ ] Support idle, verifying, verified, mismatch, unavailable, retry, and manual-review outcomes.
- [ ] Add timeout, retry, unavailable, mismatch, and audit tests.

### 4. Admissions review

- [ ] Implement reviewer application list with search, filters, sorting, pagination, and authorization.
- [ ] Implement application detail endpoint with safe document access rules.
- [ ] Implement approve, reject, request-correction, and reassign-center actions.
- [ ] Require reasons where business rules require them.
- [ ] Record audit events for every reviewer decision.
- [ ] Add object-level permission, invalid-transition, reason-required, and audit tests.

### 5. Test-center selection, scheduling, and permit

- [ ] Implement testing center and schedule availability endpoints.
- [ ] Implement schedule reservation/assignment with concurrency protection.
- [ ] Implement permit eligibility rules for approved and scheduled applications.
- [ ] Implement printable permit data endpoint with non-sensitive QR payload design (`TBD`).
- [ ] Implement permit scan validation outcomes: valid, invalid, already checked-in, wrong-schedule, and expired.
- [ ] Add capacity, concurrency, authorization, and scan-outcome tests.

## P2 - Assessment operations APIs

### 6. Question bank, blueprint, and exam sets

- [ ] Implement question CRUD with role permissions and lifecycle states.
- [ ] Implement supported question types without storing real assessment content in development fixtures.
- [ ] Implement blueprint weights and validation.
- [ ] Implement exam-set assembly, versioning, review, publish, and locked states.
- [ ] Implement bulk upload validation and downloadable error summary.
- [ ] Add lifecycle, authorization, validation, and audit tests.

### 7. Exam-day readiness and attendance

- [ ] Implement proctor schedule and room/device readiness APIs.
- [ ] Implement QR attendance and manual fallback check-in.
- [ ] Implement absent, present, duplicate scan, invalid permit, and late-arrival states.
- [ ] Implement eligibility calculation from approved, scheduled, checked-in, and not-yet-started states.
- [ ] Add attendance, eligibility, permission, and audit tests.

### 8. Exam delivery

- [ ] Implement exam session start, consent/readiness, question navigation, flagging, timer, and progress APIs.
- [ ] Implement answer persistence, autosave, recovery, and final submission.
- [ ] Handle offline/interrupted retry behavior with idempotency.
- [ ] Handle time expiry and duplicate submission server-side.
- [ ] Define browser/fullscreen/tab monitoring policy boundaries (`TBD`).
- [ ] Add idempotency, recovery, time-expiry, duplicate-submit, and authorization tests.

### 9. Proctor monitoring and incidents

- [ ] Implement monitoring session states for connecting, live, disconnected, flagged, and ended.
- [ ] Implement incident creation with severity, notes, timestamps, and evidence placeholders.
- [ ] Implement incident list/detail and escalation state transitions.
- [ ] Define camera/recording consent, retention, and privacy rules (`TBD`).
- [ ] Add incident, escalation, evidence-access, and audit tests.

### 10. Grading, scores, and result release

- [ ] Implement grader queue and assignment.
- [ ] Implement rubric display and manual scoring validation.
- [ ] Implement save-draft and submit grading workflows.
- [ ] Implement score review, correction request, locking, and audit feedback.
- [ ] Implement result release preview, confirmation, progress, partial-failure, and completion.
- [ ] Implement student result views for unreleased, released, qualified, and not-qualified outcomes.
- [ ] Add scoring, locking, release, permission, and audit tests.

## P3 - Governance and expansion APIs

### 11. University administration

- [ ] Implement applicant list/detail APIs for university admins.
- [ ] Implement course management and quota validation.
- [ ] Implement schedule planning APIs after ownership rules are approved (`TBD`).
- [ ] Implement admission-decision APIs after scoring rules and ownership are approved (`TBD`).
- [ ] Reconcile university analytics route and module documentation.

### 12. System administration and maintenance

- [ ] Implement user, role, status, invitation, and reset-state APIs.
- [ ] Implement proctor, testing-center, device, maintenance, and integration configuration APIs.
- [ ] Require confirmation/idempotency for destructive or high-impact actions.
- [ ] Enforce RBAC, configuration integrity, and secret handling server-side.
- [ ] Add account-provisioning, RBAC, destructive-action, and audit tests.

### 13. Audit, evidence, compliance, and support

- [ ] Implement audit search/filter/detail APIs with retention controls.
- [ ] Implement recording archive and incident evidence access rules (`TBD`).
- [ ] Implement compliance status APIs.
- [ ] Implement support ticket workflows.
- [ ] Reconcile documented `/admin/logs` route with implemented audit routes.
- [ ] Define evidence access, retention, redaction, and audit export requirements (`TBD`).

### 14. Executive reporting

- [ ] Implement national, regional, school, and cohort reporting filters.
- [ ] Return tabular alternatives for chart data.
- [ ] Define official metrics and aggregation rules (`TBD`).
- [ ] Define report export authorization and file generation (`TBD`).
- [ ] Add insufficient-data, permission, aggregation, and export tests.

## Backend completion gate

Apply this before marking any backend module complete:

- [ ] Endpoint behavior is linked to approved business requirements or user stories.
- [ ] Request and response schemas are documented.
- [ ] Authentication and object-level authorization are enforced server-side.
- [ ] Validation and workflow state transitions are enforced server-side.
- [ ] Business logic lives outside views/viewsets/serializers where it represents reusable workflow rules.
- [ ] Persistence and external integrations are isolated behind clear boundaries.
- [ ] Success, validation, authorization, not-found, conflict, and unexpected-error behavior is tested.
- [ ] Audit events are recorded for sensitive or workflow-changing actions.
- [ ] Migrations include a reviewed rollback/data-safety approach when applicable.
- [ ] Backend tests and checks pass, or failures are recorded.
- [ ] API docs and frontend adapter notes are updated.

## Recommended first backend milestone

The first backend milestone should prove the service can run and be tested before P1 feature APIs are added:

- [x] Django project starts locally.
- [x] DRF is configured.
- [x] Database provider decision is recorded; Supabase Postgres is configured only if accepted by ADR.
- [x] Health endpoint returns a safe response.
- [x] Standard API error shape is documented.
- [x] Backend test command exists and passes for health/error baseline tests.
- [x] Local setup and run commands are documented.

After that milestone, start P1 with authentication/session and student application endpoints.
