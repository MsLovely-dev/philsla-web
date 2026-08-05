# Ticket 001 — Maintenance Table – Exam Blueprint Phased Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` only after Ticket 001 is explicitly reopened and this plan's approval gates are satisfied. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current sprint's full focus on the Exam Sets narrative while defining a secure, review-gated path for eventually delivering the Exam Blueprint maintenance table.

**Architecture:** Work is split into two horizons. The current authorized horizon is documentation and scope control only. The future horizon is conditional and backend-first: approve the Blueprint-versus-Exam-Set boundary and security model, implement an authoritative Django REST Framework contract, then connect the React UI through an isolated service module.

**Tech Stack:** Markdown planning artifacts now; proposed future implementation uses the repository's Django/DRF backend and React/TypeScript/Vite frontend after approval.

## Global Constraints

- Ticket 001 remains **Deferred — confirmed**.
- The target iteration remains **TBD — requires explicit sprint reprioritization**.
- Current sprint bandwidth goes to the Exam Sets narrative; Ticket 001 has no coding deliverable.
- No application code, configuration, schema, endpoint, migration, or test change is authorized by this plan.
- The user must approve this plan before any later implementation-planning or execution step.
- Never place real exam questions, answer keys, assessment packages, candidate/student data, credentials, tokens, or other sensitive information in planning, demo, test, log, screenshot, or narrative artifacts.
- Frontend validation and route guards are not security boundaries; the backend must enforce authentication, authorization, validation, lifecycle rules, and audit behavior.
- Sensitive assessment content must not be persisted in browser `localStorage`.
- Frontend and backend must remain independently buildable and communicate through an approved, documented API contract.

---

## Recommendation

Use a **gated, backend-first delivery strategy** and keep three concerns separate:

1. **Exam Sets narrative and architecture decision** — current priority; explain what exists, what is simulated, and what decisions block production delivery.
2. **Exam Sets backend foundation** — a separate future story because the repository currently has no Exam Set model or endpoint.
3. **Exam Blueprint maintenance table** — reopen Ticket 001 only after the relevant domain ownership and API contract are approved.

Do not combine all three into one implementation ticket. That would make review, testing, rollback, and authorization boundaries too broad. Do not connect the maintenance UI directly to ad hoc storage or treat browser state as authoritative.

## Execution Status

- **Execution date:** 2026-08-05
- **Approved scope:** Phases 0–2, documentation and narrative only
- **Ticket status:** Deferred
- **Application-code authorization:** None
- **Completed artifact:** Exam Sets narrative below
- **Remaining manual action:** Ian Chris Sandoval must rehearse the talk track and obtain reviewer acceptance before the Phase 1 exit gate is complete.

## Exam Sets Narrative Deliverable

> **Status:** Content ready for presentation; owner rehearsal and reviewer acceptance remain pending.

### One-slide copy

**Title: Exam Sets — Prototype Today, Secure Platform Next**

**What exists now**

- A React-based Exam Sets prototype demonstrates the intended administration experience.
- The current screen uses mock data and browser `localStorage`.
- The backend exposes blueprint and question routes, but it has no Exam Set model or `/exam-sets/` API route.

**What is missing for production**

- An approved Exam Set domain model, relationship to Exam Blueprints, lifecycle, versioning, and mutability rules.
- Authoritative backend persistence, validation, authentication, role/permission enforcement, object-level authorization, and audit events.
- A reviewed API contract, failure behavior, migration/rollback approach, and sensitive-assessment data controls.
- Production-grade package integrity and signing controls; the current hash/signature behavior is illustrative mock behavior, not cryptography.

**What must be decided next**

- Approve the Blueprint-versus-Exam-Set boundary and ownership.
- Approve lifecycle, permissions, audit, storage, and threat controls.
- Deliver the Exam Sets backend foundation as a separate story.
- Reopen Ticket 001 only after those dependencies and a test-first implementation plan are approved.

### Presenter talk track

“The current Exam Sets screen is a prototype of the intended workflow, not a production-backed capability. It demonstrates how administrators may work with exam sets, but its state is mock/browser-local and the backend currently supports blueprints and questions only. Before implementation, PhilSLA must approve the boundary between a blueprint and an exam set, then define lifecycle, permissions, persistence, auditing, and package-integrity controls. Our recommendation is to build that backend foundation as a separate reviewed story and keep the Exam Blueprint maintenance table deferred until its dependencies are stable.”

### Demo guardrails

- Display an explicit **Prototype** label in presentation material.
- Use synthetic labels and aggregate counts only.
- Do not include real questions, answers, candidates, schedules, packages, identifiers, credentials, or operational secrets.
- Do not describe browser storage, mock hashes, or mock signatures as security controls.
- Separate “built UI,” “simulated behavior,” and “approved future work” in every explanation.

### Recommended follow-up work items

1. **Architecture decision:** define and approve the Blueprint-versus-Exam-Set domain boundary and security model.
2. **Exam Sets backend foundation:** implement the approved entity, lifecycle, API, permissions, audit behavior, and persistence under a separate test-first plan.
3. **Ticket 001 reopening:** plan the Exam Blueprint maintenance table only after the backend contract and maintenance-catalog ownership are approved.

## Phase Summary

| Phase | Timing | Authorization | Exit gate |
|---|---|---|---|
| 0. Plan review and scope lock | Now | Documentation only | User approves the deferral and phasing plan |
| 1. Exam Sets narrative | Current sprint | Narrative/demo preparation only | Reviewer accepts the prototype-versus-production story |
| 2. Ticket parking and backlog package | Current sprint | Documentation only | Ticket is visibly deferred with reopening conditions |
| 3. Domain and security design | Future, after reprioritization | Design only | Architecture, API, permissions, audit, and threat model approved |
| 4. Detailed implementation planning | Future, after Phase 3 | Planning only | Test-first plan with exact files and contracts approved |
| 5. Backend implementation | Future, after Phase 4 | Separate execution approval required | Authoritative API passes functional and security verification |
| 6. Frontend integration | Future, after Phase 5 | Separate execution approval required | UI uses the approved API and passes frontend verification |
| 7. Release and closure | Future, after Phase 6 | Release approval required | End-to-end acceptance and operational review complete |

## Phase 0 — Plan Review and Scope Lock

**Purpose:** Obtain an explicit decision without starting application work.

- [x] Review `task.md` and confirm the status is **Deferred — confirmed**.
- [x] Review this `implement.md` phasing plan and request corrections where needed.
- [x] Confirm that approval covers scope and sequencing only, not application code changes.
- [x] Confirm Ian Chris Sandoval remains focused on the Exam Sets narrative for the current sprint.
- [x] Record the user's approval before marking Phase 0 complete.

**Exit criteria:** The user approves the deferral, current-sprint narrative scope, security constraints, and future phase gates.

## Phase 1 — Exam Sets Narrative

**Purpose:** Produce an honest demo narrative without implying that mock behavior is production-ready.

- [x] State that `backend/apps/exams/urls.py` has blueprint and question routes but no `/exam-sets/` route.
- [x] State that `backend/apps/exams/models.py` has no Exam Set model/entity.
- [x] State that `frontend/src/pages/admin/hub/ExamSets.tsx` currently uses mock data and browser `localStorage`.
- [x] Organize the narrative into three parts: **what exists**, **what is missing**, and **what must be decided next**.
- [x] Label the current Exam Sets experience as a **prototype**, not a production workflow.
- [x] Explain that mock hash/signature behavior is illustrative and is not production cryptography.
- [x] Use only synthetic labels and counts; include no real questions, answers, candidates, schedules, packages, identifiers, or credentials.
- [x] Present the open Blueprint-versus-Exam-Set boundary as a decision requiring product, architecture, and security approval.
- [ ] Rehearse the narrative and confirm it clearly separates built UI, simulated behavior, and future work.

**Exit criteria:** A reviewer can identify the current prototype boundary, missing backend foundation, open architecture decision, and next gated step without seeing sensitive content or being told that mock controls are secure.

## Phase 2 — Ticket Parking and Backlog Package

**Purpose:** Keep Ticket 001 visible and actionable without allowing accidental implementation.

- [x] Keep Ticket 001 marked **Deferred**, not `In progress` or `Done`.
- [x] Link the ticket record to `task.md` and this phasing plan.
- [x] Record the blocking decisions: domain boundary, maintenance lookup ownership, lifecycle, API contract, persistence, permission matrix, audit events, and sensitive-data handling.
- [x] Leave the target iteration as `TBD` until product/sprint ownership explicitly assigns one.
- [x] Split future work into separate architecture, Exam Sets backend, and Exam Blueprint maintenance deliverables.
- [x] Confirm that any prototype-label code change belongs to a separate reviewed ticket.
- [x] Confirm that no frontend or backend application file changed under Ticket 001 during this phase.

**Exit criteria:** The backlog entry is unambiguous, contains its prerequisites, and cannot reasonably be interpreted as authorization to code.

## Phase 3 — Domain and Security Design

**Entry condition:** Product/sprint ownership explicitly reopens and reprioritizes Ticket 001.

**Purpose:** Resolve the decisions that currently make implementation unsafe or speculative.

- [ ] Define the approved responsibility of an Exam Blueprint versus an Exam Set.
- [ ] Define their relationship, versioning behavior, mutability rules, and deletion/retirement behavior.
- [ ] Confirm which maintenance catalogs are required: subject areas, difficulty levels, question types, topics, and any approved additions or removals.
- [ ] Define catalog ownership, uniqueness rules, active/inactive behavior, referential-integrity behavior, and allowed lifecycle transitions.
- [ ] Define the authorized roles and object-level access rules for view, create, update, activate/deactivate, and delete operations.
- [ ] Define API request/response shapes, pagination/filtering behavior, validation errors, conflict behavior, and standard error envelopes.
- [ ] Define audit events for successful and denied changes without logging sensitive assessment or identity data.
- [ ] Classify stored data and complete a threat review covering browser storage, API transport, database access, logs, exports, bulk upload, and administrative misuse.
- [ ] Define migration rollout, rollback, seed/reference-data ownership, and recovery expectations.
- [ ] Update the appropriate architecture, API, business, and decision documents after approvals are obtained.
- [ ] Obtain product, architecture, security, frontend, and backend review of the design.

**Exit criteria:** The domain boundary, data ownership, lifecycle, API contract, authorization model, audit behavior, migration approach, and threat controls are approved with no unresolved decision required for implementation.

## Phase 4 — Detailed Implementation Planning

**Entry condition:** Phase 3 design artifacts are approved.

**Purpose:** Convert the approved design into a test-first engineering plan before touching application code.

- [ ] Create a separate backend-first implementation plan with exact file paths, interfaces, migrations, rollback steps, and test cases.
- [ ] Define failing backend tests for success, malformed input, authentication failure, permission denial, object-level denial, not-found, uniqueness conflict, invalid lifecycle changes, and safe error responses.
- [ ] Define migration tests and a rollback verification procedure.
- [ ] Define the documented API contract that the frontend service will consume.
- [ ] Create a separate frontend plan for service contract tests, table behavior, validation usability, loading, empty, error, responsive, and accessibility states.
- [ ] Define end-to-end acceptance cases that use synthetic data and verify denied operations as well as successful ones.
- [ ] Review exact commands, expected failures in the red phase, expected passes in the green phase, and required commit boundaries.
- [ ] Obtain user approval of the detailed implementation plan.

**Exit criteria:** Reviewers approve a complete test-first plan containing exact files, contracts, commands, expected results, and rollback steps. This phasing document alone does not satisfy that requirement.

## Phase 5 — Backend Implementation

**Entry condition:** A separate detailed implementation plan and execution request are explicitly approved.

**Purpose:** Establish the backend as the authoritative security and integrity boundary.

- [ ] Write and run the approved failing domain, service, endpoint, authorization, audit, and migration tests.
- [ ] Implement the minimal approved models and migration with reviewed uniqueness and referential-integrity constraints.
- [ ] Implement business rules in the exams domain service layer, not in routes/controllers.
- [ ] Implement DRF serializers and thin views using deny-by-default permissions and object-level authorization.
- [ ] Add the approved versioned API routes and standard error responses.
- [ ] Ensure audit records are useful but contain no secrets, real assessment content, or unnecessary personal data.
- [ ] Update API and architecture documentation to match the implemented contract.
- [ ] Run `python manage.py check --settings=config.settings.local` from `backend/` and record the observed result.
- [ ] Run the approved focused exam tests and `python manage.py test --settings=config.settings.test` from `backend/`; record failures, skips, and the observed result.
- [ ] Rehearse migration rollout and rollback in a non-production environment using synthetic data.
- [ ] Obtain backend and security review before enabling frontend integration.

**Exit criteria:** The approved backend contract exists, validation and authorization are enforced server-side, migrations are reversible, documentation matches behavior, and all required checks have recorded results.

## Phase 6 — Frontend Integration

**Entry condition:** Phase 5 API and security review are complete.

**Purpose:** Replace transient maintenance-table behavior with a typed client of the authoritative API.

- [ ] Write and run failing frontend service contract and component behavior tests before implementation.
- [ ] Put API calls and transport mapping in a dedicated service module; do not call endpoints directly from the page component.
- [ ] Keep business orchestration outside presentation components.
- [ ] Replace component-only records with approved service-backed list/create/update/status/delete behavior.
- [ ] Preserve loading, empty, validation, permission-denied, conflict, server-error, responsive, keyboard, and screen-reader states.
- [ ] Do not store sensitive assessment content or authoritative maintenance state in `localStorage`.
- [ ] Verify the UI cannot bypass backend permission, lifecycle, or referential-integrity rules.
- [ ] Run `npm test` from `frontend/` and record the observed result.
- [ ] Run `npm run lint` from `frontend/` and record the observed result.
- [ ] Run `npm run build` from `frontend/` and record the observed result.
- [ ] Run the approved Playwright journey with synthetic data and record the observed result.
- [ ] Obtain frontend, accessibility, and security review.

**Exit criteria:** The frontend uses only the approved backend contract, exposes complete user states, stores no sensitive authoritative data in the browser, and has recorded passing results for all approved checks.

## Phase 7 — Release and Ticket Closure

**Entry condition:** Backend and frontend phases have passed their review gates.

**Purpose:** Verify the complete behavior and close the ticket with evidence.

- [ ] Run end-to-end create, view, update, activate/deactivate, permission-denied, validation-failure, conflict, and referenced-record scenarios using synthetic data.
- [ ] Confirm API documentation, architecture documentation, and the permission matrix match the released behavior.
- [ ] Confirm production configuration contains no committed secrets and that logs redact sensitive data.
- [ ] Confirm migration rollout, rollback, backup, and recovery responsibilities are approved for the target environment.
- [ ] Confirm audit events identify who changed which maintenance record and when without capturing prohibited content.
- [ ] Record every verification command, result, failure, skip, and reviewer approval.
- [ ] Mark Ticket 001 `Done` only after product acceptance and security sign-off.

**Exit criteria:** Product acceptance, security sign-off, operational readiness, documentation consistency, and verification evidence are complete.

## Approval Gate

- [x] User approves this phasing plan.
- [x] Ticket 001 remains deferred after approval.
- [x] Only Phases 0–2 are current-scope activities.
- [x] Phases 3–7 require explicit reprioritization and separate approvals.
- [x] No application code is implemented from this document alone.
