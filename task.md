# PhilSLA Task Log

## Ticket 001 — Maintenance Table – Exam Blueprint

| Field | Value |
|---|---|
| Status | **Deferred — confirmed** |
| Track | Maintenance & Config (scope/documentation only) |
| Owner | Ian Chris Sandoval |
| Decision date | 2026-08-05 |
| Target iteration | **TBD — requires explicit sprint reprioritization** |
| Plan status | **Approved — Phases 0–2 only** |
| Implementation status | **Documentation phases executed; application code not authorized** |

### Problem

The sprint cannot responsibly implement the Exam Blueprint maintenance table while the related Exam Sets capability has no backend entity or API contract. Splitting the owner's bandwidth would also conflict with the sprint goal in `build_plan.md`: deliver a clear, honest Exam Sets prototype narrative rather than imply production readiness.

### Evidence reviewed

- `build_plan.md` marks **Maintenance Table – Exam Blueprint** as deferred and assigns the owner's full bandwidth to the Exam Sets narrative.
- `backend/apps/exams/urls.py` exposes blueprint and question endpoints, but no `/exam-sets/` endpoint.
- `backend/apps/exams/models.py` contains blueprint and question-bank models, but no Exam Set model/entity.
- `frontend/src/pages/admin/hub/ExamSets.tsx` uses mock data and browser `localStorage`; it does not use a backend Exam Sets service.
- `frontend/src/pages/admin/maintenance/ExamBlueprintMaintenance.tsx` is a UI-only table whose records remain in component state and are not persisted through an authoritative backend API.

### Decision / solution

Defer Ticket 001 for this sprint. Do not add or change the maintenance UI, frontend service, backend model, API endpoint, migration, permission, or test under this ticket. Reallocate the available effort to an Exam Sets narrative that clearly separates:

1. **What exists now:** a frontend prototype backed by mock/browser-local data.
2. **What is missing:** an approved Exam Set domain model, lifecycle, backend API, authorization rules, persistence, and audit behavior.
3. **What must be decided next:** the boundary and relationship between an Exam Blueprint and an Exam Set before either the Exam Sets backend or its dependent maintenance behavior is designed.

This ticket records a scope decision only. Any prototype-label change or other Exam Sets code change belongs to a separate reviewed ticket and is not authorized by this plan.

### Review-only action plan

- [x] Read the root, frontend, and backend `AGENTS.md` instructions.
- [x] Read `build_plan.md` and verify the stated repository condition.
- [x] Confirm that Ticket 001 is deferred and has no coding deliverable this sprint.
- [x] Obtain user approval of this task-log entry.
- [x] After approval, mark the scope decision accepted and keep Ticket 001 parked in the backlog.
- [x] Prepare the [Exam Sets narrative](implement.md#exam-sets-narrative-deliverable) using only synthetic, non-sensitive examples.
- [x] Record that Ticket 001 may reopen only after all resumption gates below are satisfied and a new implementation plan is reviewed.

### Security requirements

- Do not put real exam questions, answer keys, assessment packages, candidate/student data, credentials, tokens, or other sensitive information in the narrative, repository, fixtures, logs, screenshots, or demo artifacts.
- Label browser-local/mock Exam Sets behavior as a prototype; do not describe the current mock hash/signature behavior as production cryptography or a security control.
- Treat frontend routes and validation as usability controls only. A future backend must enforce authentication, approved role/permission rules, object-level authorization, input validation, lifecycle transitions, and audit logging.
- Do not persist sensitive assessment content in browser `localStorage`. A future storage design requires a reviewed threat model and approved data-handling controls.
- Do not create an API, model, migration, or integration until its contract, authorization rules, validation rules, audit events, and failure behavior have been reviewed.
- Keep errors and logs free of sensitive assessment and identity data.

### Resumption gates

Ticket 001 may move out of `Deferred` only when all of the following are true:

- Product/sprint ownership explicitly reprioritizes the ticket and assigns a target iteration.
- The Blueprint-versus-Exam-Set domain boundary and ownership are approved and documented.
- The maintenance lookup ownership, lifecycle, and authorized operations are approved and documented.
- The backend API contract and persistence approach are approved.
- The permission matrix, object-level authorization rules, validation rules, audit events, and sensitive-data handling are approved.
- A test-first implementation plan is written and approved before any application code changes.

### Acceptance criteria for Ticket 001

- The ticket is visibly recorded as **Deferred**, not `In progress` or `Done`.
- The deferral rationale and repository evidence are documented.
- No application code, configuration, schema, endpoint, migration, or test is changed for this ticket.
- The owner's current deliverable is the Exam Sets narrative, not the Exam Blueprint maintenance table.
- The narrative distinguishes prototype behavior from production capability and uses no sensitive or real exam content.
- Resuming the ticket requires a separately reviewed, security-aware implementation plan.

### Review gate

No implementation may begin from this entry. The user must review and approve this plan first. Approval confirms only the deferral and narrative scope; it does not authorize application code changes.
