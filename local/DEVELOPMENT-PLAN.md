# Exam Management Development Plan

This plan is for the implementation of the assigned PhilSA exam-management work:

- Exam Blueprint
- Question Bank
- Exam Sets

It follows the current repository structure and keeps frontend, backend, and documentation responsibilities separated.

## Working Principles

- Keep frontend and backend independently buildable.
- Put business logic in backend services, not in React components.
- Keep remote API calls inside frontend service modules.
- Treat frontend validation as usability only.
- Use the backend as the source of truth for persistence, authorization, and workflow state.
- Keep all personal or temporary work inside `local/` so it stays out of version control.

## Target Areas In This Repo

- Frontend UI and routing live under `frontend/src/`
- Shared frontend API/service code lives under `frontend/src/services/`
- Backend application code lives under `backend/apps/`
- Architecture and contract decisions live under `docs/`

For this assignment, the most relevant areas are:

- `frontend/src/pages/ExamBlueprints.tsx`
- `frontend/src/pages/QuestionBank.tsx`
- `frontend/src/pages/admin/hub/ExamSets.tsx`
- `frontend/src/services/`
- `backend/apps/exams/`
- `docs/api/`
- `docs/architecture/`

## Step-By-Step Plan

### 1. Confirm scope and source documents

Read and align the feature with:

- `docs/MODULES.md`
- `docs/api/API-STANDARDS.md`
- `docs/api/API-ENDPOINTS.md`
- `docs/architecture/FRONTEND-ARCHITECTURE.md`
- `docs/architecture/BACKEND-ARCHITECTURE.md`
- `docs/architecture/SYSTEM-ARCHITECTURE.md`

Goal:

- Make sure the exam blueprint, question bank, and exam set work matches the project's intended module boundaries.

### 2. Start from an updated branch

Before implementation:

- fetch the latest remote changes
- update the local base branch
- create a feature branch for this work

Suggested branch name:

- `feat/exam-blueprint`

Goal:

- Keep your work isolated from other changes and easy to review.

### 3. Inventory the current frontend behavior

Inspect the existing exam-management pages and note:

- what is static/mock data
- what is stored in `localStorage`
- what should become backend-driven
- what UI interactions need to remain client-side

Focus files:

- `frontend/src/pages/ExamBlueprints.tsx`
- `frontend/src/pages/QuestionBank.tsx`
- `frontend/src/pages/admin/hub/ExamSets.tsx`
- `frontend/src/pages/admin/hub/blueprintMockData.ts`

Goal:

- Separate presentation concerns from business logic before wiring APIs.

### 4. Define the backend module boundary

Use `backend/apps/exams/` as the owning backend area for:

- blueprint persistence
- question bank persistence
- exam set assembly
- versioning and workflow transitions
- audit/log-friendly events

Suggested backend shape:

- `models.py`
- `serializers.py`
- `views.py`
- `services.py`
- `urls.py`
- `tests/`

Goal:

- Keep all exam-management business rules inside the backend module.

### 5. Define the data model and workflow rules

Before coding the UI-to-API wiring, decide the core objects and states:

- Blueprint
- BlueprintSection
- QuestionBankItem
- ExamSet
- ExamSetQuestion mapping
- Version history
- Publication or approval state

Also define:

- who can create, edit, approve, publish, archive, or retire
- what is draft-only
- what can be cloned or version-bumped
- how question selection rules are validated

Goal:

- Lock down the source of truth before the frontend starts calling real APIs.

### 6. Implement backend services first

Build the exam logic in backend services before exposing it to the UI:

- validate blueprint rules
- validate question eligibility
- assemble exam sets from a blueprint
- record history/audit entries
- reject invalid state transitions

Goal:

- Keep the rules testable and separate from HTTP request handling.

### 7. Add backend routes and serializers

Expose the exam module through HTTP only after the service layer is ready.

Recommended endpoints:

- blueprint list/create/update
- question bank list/create/update
- exam set list/create/assemble/update
- version/history retrieval

Goal:

- Make the contract explicit and documented before frontend integration.

### 8. Update API documentation

Document any implemented endpoint in:

- `docs/api/API-ENDPOINTS.md`
- `docs/api/API-STANDARDS.md` if contract rules need clarification

Also update:

- `docs/architecture/BACKEND-ARCHITECTURE.md` if module boundaries change
- `docs/MODULES.md` if user-facing routes or module names change

Goal:

- Keep the docs aligned with the implementation.

### 9. Replace frontend mock dependencies with service calls

Move the pages toward service-driven data access:

- create or extend frontend service modules in `frontend/src/services/`
- keep request/response mapping out of the page components
- preserve a mock/local fallback only if the project still needs it

Goal:

- Make the pages consume the backend through a clean service boundary.

### 10. Update the frontend pages

Refactor the pages so they stay focused on UI:

- `ExamBlueprints.tsx`
- `QuestionBank.tsx`
- `ExamSets.tsx`

Keep these concerns in the component:

- rendering
- filters
- forms
- modal state
- loading/empty/error states

Move these concerns out of the component:

- API calls
- state transitions tied to backend rules
- assembly validation logic that belongs to the backend

Goal:

- Keep the UI maintainable and aligned with the project architecture.

### 11. Add tests as behavior changes

Add or update tests at the right layer:

- backend service and API tests for business behavior
- frontend service tests for mapping and error handling
- component tests for user interactions

Goal:

- Prevent regressions while the module is still being shaped.

### 12. Verify locally in Docker

Use the local Docker stack when validating integration:

- frontend: `http://localhost:3000`
- backend: `http://localhost:8000`
- database: Postgres container in the local compose stack

Check:

- backend health endpoint
- page rendering
- API requests
- exam workflow actions
- no shared files outside `local/` are modified unnecessarily

Goal:

- Confirm the module works in the isolated local environment.

## Suggested Implementation Order

1. Question Bank
2. Exam Blueprint
3. Exam Sets

Reason:

- the question bank is the source data
- blueprints define how questions are selected
- exam sets consume both

## Definition Of Done

Treat this work as complete only when:

- the backend owns the exam-management rules
- the frontend uses service modules instead of direct ad hoc data handling
- the docs match the implemented behavior
- the feature works in the Docker local environment
- tests cover the key workflow paths

## Notes For Personal Development

- Keep temporary notes, local overrides, and machine-specific scripts in `local/`
- Do not put secrets or real production credentials in this folder
- Use this folder only for your own workspace setup and planning

