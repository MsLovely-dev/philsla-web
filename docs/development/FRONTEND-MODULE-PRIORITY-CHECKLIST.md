# Frontend Module Priority Checklist

## Purpose

This checklist prioritizes frontend work while PhilSA remains a React prototype backed by mock/local services. It is an implementation sequence, not a statement that backend-dependent security, persistence, integrations, or business rules can be completed in the browser.

Priority meanings:

- **P0 - Foundation:** required before feature modules can be considered reliable.
- **P1 - Core journey:** required for the first complete student application and assessment flow.
- **P2 - Operations:** required to administer, deliver, and score an assessment.
- **P3 - Governance and expansion:** valuable after the core journey is stable.

## Working rules

- [ ] Implement one bounded vertical slice at a time, including loading, empty, error, responsive, and accessible states.
- [ ] Keep mock data and transport behavior behind service modules so a future API can replace them.
- [ ] Keep business rules in feature hooks, domain utilities, or services rather than presentation components.
- [ ] Define frontend request/response types only from an approved API contract; mark unresolved contracts `TBD`.
- [ ] Treat frontend authentication, authorization, validation, and exam controls as prototype behavior only. The future backend remains authoritative.
- [ ] Add or update tests when behavior changes. Selection of frontend test tooling is `TBD`.
- [ ] Do not use real personal data, credentials, assessment content, or sensitive operational records in mocks.

## P0 - Frontend foundation

Complete these before expanding individual modules.

### Application shell and navigation

- [x] Create a centralized, typed route configuration instead of maintaining route metadata separately across the app.
- [x] Add route-level role checks for `STUDENT`, `ADMISSIONS_REVIEWER`, `UNIVERSITY_ADMIN`, `EXAM_ADMINISTRATOR`, `ITEM_WRITER`, `PROCTOR`, `GRADER`, `SYSTEM_ADMIN`, and `EXECUTIVE`.
- [x] Guard `/exam/live` with an authenticated student and eligible exam-session state in the prototype.
- [x] Add dedicated unauthorized and not-found pages.
- [ ] Verify direct navigation, refresh, browser back/forward, and mobile navigation for every route.
- [ ] Document the production SPA rewrite requirement for `BrowserRouter` when hosting is selected (`TBD`).

### Shared frontend infrastructure

- [ ] Define shared UI patterns for page loading, empty results, errors, confirmation dialogs, and notifications.
- [ ] Define typed service interfaces and consistent mock success, validation-error, authorization-error, and network-error responses.
- [ ] Add a replaceable session/authentication service boundary around the current local behavior.
- [ ] Decide and document form, server-state, component-test, and end-to-end-test tooling (`TBD`).
- [ ] Add automated checks for critical route access and navigation behavior after test tooling is selected.
- [ ] Verify keyboard navigation, focus handling, labels, contrast, and responsive layouts for shared components.

## P1 - Core student application journey

### 1. Authentication and account entry

- [ ] Complete landing, registration entry, login, logout, session-loading, and session-expired states.
- [ ] Prototype account creation, email confirmation, password recovery, and MFA screens through mock services.
- [ ] Display safe, actionable authentication errors without exposing sensitive details.
- [ ] Define the future authentication contract and provider as `TBD`; do not treat local storage as production authentication.

### 2. Student registration and application

- [ ] Complete personal, address, school, course preference, and application-review steps.
- [ ] Add client-side usability validation and preserve entered data between steps.
- [ ] Complete document upload selection, type/size feedback, preview, replace, and remove interactions using safe mock files.
- [ ] Prototype PhilSys and DepEd LRN verification states: idle, verifying, verified, mismatch, unavailable, and retry.
- [ ] Complete draft, submitted, for-correction, approved, and rejected application views.
- [ ] Add a student correction-and-resubmission journey with reviewer notes.

### 3. Admissions review

- [ ] Complete application list search, filters, sorting, pagination, and empty/error states.
- [ ] Complete application detail and safe document preview states.
- [ ] Prototype approve, reject, request-correction, and reassign-center actions through a reviewer service.
- [ ] Show confirmation, reason entry, updated status, and mock audit-event feedback for every decision.
- [ ] Restrict reviewer routes and actions to the documented reviewer role in the frontend prototype.

### 4. Test-center selection, scheduling, and permit

- [ ] Complete center/date selection with available, full, unavailable, and changed-capacity states.
- [ ] Show reservation confirmation and the selected schedule on the student dashboard.
- [ ] Enable the permit only for an approved and scheduled mock application.
- [ ] Complete printable permit layout and QR-code rendering with non-sensitive mock identifiers.
- [ ] Prototype permit scan outcomes for valid, invalid, already checked-in, and wrong-schedule cases.

## P2 - Assessment operations

### 5. Question bank, blueprint, and exam sets

- [ ] Complete question list, filters, create/edit, validation, preview, and lifecycle states.
- [ ] Support the documented question types without embedding real assessment content in fixtures.
- [ ] Complete blueprint weights and totals with clear validation feedback.
- [ ] Complete exam-set assembly, review, version, publish-confirmation, and locked states.
- [ ] Complete bulk-upload mapping, row-level validation results, partial-failure feedback, and downloadable error summary.
- [ ] Keep publishing and content authorization explicitly backend-dependent.

### 6. Exam-day readiness and attendance

- [ ] Complete proctor schedule, room/device readiness, and blocking issue states.
- [ ] Complete QR attendance flow and manual fallback UI.
- [ ] Show absent, present, duplicate scan, invalid permit, and late-arrival states.
- [ ] Prototype student exam eligibility from approved, scheduled, checked-in, and not-yet-started states.

### 7. Exam delivery

- [ ] Complete instructions, consent/readiness, start confirmation, question navigation, flagging, timer, and progress states.
- [ ] Preserve mock answers across navigation and simulated refresh/recovery.
- [ ] Complete autosave indicators, offline/interrupted warnings, retry, submission review, and final confirmation.
- [ ] Handle time expiry and duplicate-submission responses in the mock service.
- [ ] Add keyboard and screen-reader checks appropriate for the assessment interface.
- [ ] Clearly label fullscreen, tab monitoring, identity assurance, and submission integrity as backend/browser-policy dependent.

### 8. Proctor monitoring and incidents

- [ ] Complete monitoring grid states for connecting, live, disconnected, flagged, and ended sessions.
- [ ] Complete incident creation, severity, notes, timestamps, evidence placeholders, and confirmation.
- [ ] Complete incident list/detail and escalation status views.
- [ ] Use synthetic media only and document camera/recording consent, privacy, and retention rules as `TBD`.

### 9. Grading, scores, and result release

- [ ] Complete grader queue, assignment, rubric display, scoring validation, save-draft, and submit states.
- [ ] Complete score review, correction-request, locked, and audit-feedback states.
- [ ] Complete result-release preview, confirmation, progress, partial-failure, and completed states.
- [ ] Complete student result views for unreleased, released, qualified, and not-qualified outcomes.
- [ ] Keep score calculation, authorization, locking, and official release backend-dependent.

## P3 - Administration, governance, and expansion

### 10. University administration

- [ ] Complete applicant list/detail, course management, quota validation, and schedule planning.
- [ ] Complete admission-decision views after scoring rules and ownership are approved (`TBD`).
- [ ] Add the documented university analytics route or reconcile it with the module documentation.

### 11. System administration and maintenance

- [ ] Complete user, role, status, invitation, and reset-state interfaces using mock services.
- [ ] Complete proctor, testing-center, device, maintenance, and integration configuration interfaces.
- [ ] Ensure destructive or high-impact actions require confirmation and show mock audit feedback.
- [ ] Keep account provisioning, RBAC enforcement, configuration integrity, and secrets backend-dependent.

### 12. Audit, evidence, compliance, and support

- [ ] Complete audit search/filter/detail views with synthetic records.
- [ ] Complete recording archive, incident evidence, and playback empty/error/access-denied states.
- [ ] Complete compliance status, support ticket, and operational dashboard workflows.
- [ ] Reconcile the documented `/admin/logs` route with the implemented audit routes.
- [ ] Define evidence access, retention, redaction, and audit requirements as `TBD`.

### 13. Executive reporting

- [ ] Complete national, regional, school, and cohort filters with empty and insufficient-data states.
- [ ] Verify chart accessibility and provide tabular alternatives.
- [ ] Use synthetic aggregate data and avoid implying that prototype analytics are official.
- [ ] Defer official metrics, aggregation rules, and export authorization until approved (`TBD`).

## Cross-module completion gate

Apply this gate before marking any module complete:

- [ ] Acceptance criteria are linked to the relevant business requirement or user story.
- [ ] Route access and visible actions match the intended prototype role.
- [ ] Service calls are isolated from components and can be replaced by a future API adapter.
- [ ] Success, loading, empty, validation, authorization, and failure states are implemented.
- [ ] Keyboard, focus, screen-reader, contrast, and responsive behavior were reviewed.
- [ ] Relevant unit, component, service-contract, and end-to-end tests exist when tooling is available.
- [ ] `npm run lint` and `npm run build` pass, or failures are recorded.
- [ ] The diff and related documentation were reviewed for unintended changes and sensitive data.

## Backend handoff gate

Before replacing a mock service with a backend endpoint:

- [ ] Approve actor and role permissions.
- [ ] Approve request/response schemas and validation rules.
- [ ] Approve state transitions, error behavior, idempotency, and concurrency handling.
- [ ] Approve privacy classification, retention, audit events, and rate limits.
- [ ] Add backend authorization/validation tests and frontend contract tests.
- [ ] Keep the mock adapter available only where it remains useful for deterministic development and tests.

## Recommended first delivery milestone

The first milestone should demonstrate one coherent mock-backed journey:

- [ ] Student creates a prototype session.
- [ ] Student completes and submits an application.
- [ ] Reviewer requests a correction.
- [ ] Student corrects and resubmits the application.
- [ ] Reviewer approves and assigns a test schedule.
- [ ] Student views the schedule and printable permit.

This milestone validates the main workflow and service boundaries before the more complex exam-delivery, proctoring, scoring, and governance modules are expanded.
