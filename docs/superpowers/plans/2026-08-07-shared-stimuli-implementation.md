# Shared Stimuli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mock Shared Stimuli experience with a backend-backed, permissioned, auditable module that can create reusable stimulus content, version it, attach files, and link it to questions without breaking Question Bank or Exam Blueprint behavior.

**Architecture:** Keep `backend/apps/exams` as the authoritative domain because it already owns questions, blueprints, workflow history, and shared-stimulus blueprint requirements. Model Shared Stimuli as a versioned aggregate with server-side status transitions, explicit audit history, and a single active stimulus link per question. Keep the React `StimulusManagement` page thin and data-driven by a dedicated API service so the current Question Bank tab can keep mounting it without localStorage-backed business logic.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, Playwright, Python 3.13, Django 5.2, Django REST Framework 3.16, and the current Docker-based local development workflow.

## Global Constraints

- Backend authorization is authoritative; frontend button visibility is only a usability layer.
- Preserve existing Question Bank and Exam Blueprint workflows unless the new Shared Stimuli contract requires a targeted change.
- Reuse existing backend patterns for serializer/service/view separation, workflow history, and file validation.
- Do not introduce secrets, real exam content, or unrelated refactors.
- Do not rely on `localStorage` as the source of truth for Shared Stimuli once backend integration exists.

---

## 1. Executive Summary

The repository already contains a complete-looking Shared Stimuli UI under `frontend/src/pages/admin/hub/StimulusManagement.tsx`, but it is a client-side mock: it seeds synthetic stimuli and audit logs into `localStorage`, mutates them locally, and links questions by editing frontend-only `stimulusId` fields.

The backend does not yet have a dedicated Shared Stimuli CRUD surface. The only stimulus-related backend state is the Exam Blueprint configuration fields `shared_stimulus_required`, `shared_stimulus_min_count`, and `shared_stimulus_questions_per_stimulus` in `backend/apps/exams/models.py`. There is no Shared Stimulus model, no stimulus route, and no question-to-stimulus persistence in the Django question model.

The safest path is to introduce a backend-backed Shared Stimuli aggregate in `backend/apps/exams`, expose it through DRF endpoints, then refactor the existing StimulusManagement page to consume that API. Question linking should be persisted server-side, permissioned server-side, and audited server-side. The current localStorage seed data can remain only as a development fallback while the backend is being brought up, but it should not remain the production source of truth.

## 2. Current Implementation Status

| Area | Status | Evidence |
|---|---|---|
| Shared Stimuli frontend page | Partially implemented, UI-only | `frontend/src/pages/admin/hub/StimulusManagement.tsx` seeds `SEED_STIMULI`, `SEED_AUDIT_LOGS`, and `philsa_hub_questions` into `localStorage` |
| Shared Stimuli route | Present | `frontend/src/routing/routes.tsx` maps `/admin/hub/stimuli` to `StimulusManagement` |
| Question Bank integration | Present at the tab level | `frontend/src/pages/admin/hub/QuestionBank.tsx` mounts `StimulusManagement` inside the Shared Stimuli tab |
| Shared Stimulus frontend types | Present | `frontend/src/types.ts` defines `SharedStimulus`, `StimulusVersion`, `StimulusAttachment`, `StimulusAuditLog`, and `Question.stimulusId` |
| Shared Stimulus frontend service layer | Missing | No `backendSharedStimulusService` or equivalent exists under `frontend/src/services` |
| Shared Stimulus backend CRUD | Missing | No stimulus model, serializer, view, or URL surface exists in `backend/apps/exams` |
| Question-stimulus persistence | Missing in backend | Backend `Question` model has no stimulus field in `backend/apps/exams/models.py` |
| Audit logging | Partially present on the frontend only | `StimulusManagement.tsx` writes audit rows locally and dispatches a generic app audit event |
| File/attachment handling | Mocked on the frontend | Attachments are synthetic objects in `StimulusManagement.tsx`; backend upload patterns exist elsewhere (`backend/apps/applications`, `backend/apps/exam_reviews`) |
| Comparable patterns | Present and reusable | Question Bank, Exam Blueprint, Exam Set, application upload, and exam review modules already show the repository’s service/serializer/history patterns |

## 3. Repository Evidence

- `frontend/src/pages/admin/hub/StimulusManagement.tsx`
  - Uses `localStorage.getItem('philsa_stimuli')`, `localStorage.getItem('philsa_stimuli_audit')`, and `localStorage.getItem('philsa_hub_questions')`
  - Seeds mock stimuli, mock audit logs, and mock linked questions
  - Supports create, edit, delete, publish/retire/archive, question linking, attachment simulation, preview, version history, and audit log dialogs entirely in component state
- `frontend/src/types.ts`
  - Defines the full Shared Stimuli shape used by the page
  - `Question` includes optional `stimulusId`, but this is only a frontend type today
- `frontend/src/pages/admin/hub/QuestionBank.tsx`
  - Embeds the Shared Stimuli page in the tabbed Question Bank shell
  - Already uses the backend question service for questions, so it is the natural integration point for real stimulus links if the question editor needs to display them
- `frontend/src/routing/routes.tsx`
  - Exposes a protected `/admin/hub/stimuli` route
- `backend/apps/exams/models.py`
  - Contains blueprint stimulus requirement fields but no Shared Stimulus domain model
  - `Question` has no stimulus foreign key or linking field
  - Existing `QuestionAttachment` and `QuestionWorkflowHistory` patterns can be reused for stimulus attachments and audit history
- `backend/apps/exams/serializers.py`, `services.py`, `views.py`, `urls.py`
  - Expose blueprints, questions, and exam sets only
  - No stimulus CRUD or link endpoints exist
- `backend/apps/exams/tests.py`
  - Covers questions, exam sets, and blueprints
  - No Shared Stimuli regression coverage exists yet
- `backend/apps/applications` and `backend/apps/exam_reviews`
  - Provide working examples of file validation, upload, and stored-file metadata that can be reused for stimulus attachments

## 4. Frontend Findings

- The Shared Stimuli UI already looks feature-complete to a user:
  - create/edit form
  - list/search/filter tabs
  - preview/details pane
  - version history modal
  - audit log modal
  - link/unlink questions
  - create a child question from a stimulus
  - attachment add/remove simulation
  - archive/retire/delete actions
- None of those actions call a backend service today.
- The page derives all data from seeded local objects and localStorage, so refreshes only look persistent in the browser that wrote them.
- There is no frontend permission matrix on the stimulus page right now. The page uses `usePhilSA()` mostly for metadata such as owner and audit rows, not for gating actions.
- Question Bank already hosts the Shared Stimuli tab, so the module does not need a separate top-level route change unless product scope expands beyond the hub shell.

## 5. Backend Findings

- There is no Shared Stimulus domain model in the Django backend today.
- The only stimulus-related persistence in `backend/apps/exams/models.py` is the blueprint-level requirement trio:
  - `shared_stimulus_required`
  - `shared_stimulus_min_count`
  - `shared_stimulus_questions_per_stimulus`
- `Question` currently has no foreign key or relation for a shared stimulus.
- The backend already has the conventions this feature should follow:
  - service-layer business logic
  - serializer-driven validation
  - API views that stay thin
  - structured workflow history tables
  - file upload validation patterns in other apps
- Existing code reuse opportunities:
  - `QuestionWorkflowHistory` is a good pattern for stimulus audit/history
  - `QuestionAttachment` is a good pattern for attachment metadata and ownership
  - `QuestionBank` and `ExamBlueprints` show how creator-versus-reviewer checks are enforced in the service layer

## 6. Frontend–Backend Contract Gaps

- The frontend expects a `SharedStimulus` object with:
  - id, title, content, type, subject, topic, difficulty, curriculum, academicYear
  - owner and ownerId
  - status and version
  - createdAt and updatedAt
  - tags, attachments, and versions
- The backend currently returns none of that from any API.
- The frontend expects question links to survive reloads; the backend currently has no persisted `stimulusId`.
- The frontend expects attachment metadata and version history; the backend currently has no stimulus attachment or version tables.
- The frontend expects audit logs; the backend currently has no Shared Stimuli audit table or endpoint.
- The frontend currently assumes a single active stimulus link per question. The backend should preserve that assumption unless product clarification says otherwise.

## 7. Confirmed Requirements

### Confirmed by repository evidence

- Create a stimulus
- View stimulus details
- List, search, filter, sort, and paginate stimuli
- Edit a stimulus
- Archive or retire a stimulus
- Attach one stimulus to multiple questions
- Remove a stimulus from a question
- Show question counts per stimulus
- Record creator, last editor, and timestamps
- Record version history and audit history
- Support text-based stimulus content
- Support image/document attachments, because the UI already presents them

### Strongly implied by the current architecture

- Server-side persistence for all stimulus actions
- Server-side authorization for all stimulus actions
- Safe deletion or archival when references exist
- Backend serialization of linked-question counts
- Backend exposure of stimulus ownership metadata for frontend button hiding
- Reuse of service-layer workflow history instead of ad hoc component state

### Recommended enhancements

- Sanitized rich-text rendering for stimulus content
- File validation and private storage-backed downloads
- Stable backend pagination for large stimulus libraries
- Optional stimulus preview summary in Question Bank rows

### Requires product-owner clarification

- Which roles may approve a stimulus
- Whether creators may ever approve their own stimulus
- Whether hard delete is allowed at all, or whether archive should be the only destructive user action
- Whether a question may ever link to more than one stimulus at the same time
- Whether stimulus attachments are limited to specific file types
- Whether current localStorage demo stimuli should be seeded into backend fixtures or discarded during migration

## 8. Assumptions and Questions Requiring Clarification

1. **Assumption:** The current Shared Stimuli tab is intended to become a real backend-backed module, not remain a demo-only shell.
   - Evidence: the page already contains the full workflow surface and the Question Bank tab already embeds it.
2. **Assumption:** A question should keep at most one active stimulus association at a time.
   - Evidence: `frontend/src/types.ts` exposes a single optional `stimulusId` per question.
3. **Assumption:** Versioning matters for stimulus integrity.
   - Evidence: the page already exposes version history and published version behavior.
4. **Question:** Should a stimulus be reviewable like a blueprint/question, or is publish/archive enough?
5. **Question:** Should the backend store the question link on `Question`, or use a dedicated assignment table if product wants richer history later?
6. **Question:** Should published/referenced stimuli be hard-deletable at all, or should archive be the only safe terminal action?
7. **Question:** What exact attachment types are allowed, and are files private-by-default?

## 9. Recommended Architecture

- Keep the implementation in `backend/apps/exams` so Shared Stimuli lives alongside questions, blueprints, and exam sets.
- Model Shared Stimuli as a versioned aggregate:
  - root stimulus record for identity, ownership, and current status
  - version table for immutable content snapshots and change logs
  - attachment table for files tied to a version
  - audit/history table for status transitions, linking actions, and attachment actions
- Persist the active question association in the backend, not only in the frontend:
  - one stimulus can link to many questions
  - each question should have at most one active linked stimulus version unless product clarifies otherwise
- Build a dedicated frontend service module instead of calling `fetch` inline from the page.
- Keep the current Question Bank tab shell intact:
  - `QuestionBank.tsx` can continue mounting `StimulusManagement`
  - only the data source and action handlers need to change
- Use the same service-layer authorization style already used by Question Bank and Exam Blueprint:
  - role gate at the view layer
  - creator-versus-approver checks in the service layer
  - backend validation as the source of truth

## 10. Data Model and Migration Plan

### Proposed backend tables

1. **`SharedStimulus`**
   - Fields: `id`, `code`, `title`, `type`, `subject`, `topic`, `difficulty`, `curriculum`, `academic_year`, `status`, `current_version_number`, `created_by`, `updated_by`, `created_at`, `updated_at`, `published_at`, `retired_at`, `archived_at`
   - Constraints:
     - unique stimulus code
     - indexed status
     - indexed subject/type for filtering
2. **`SharedStimulusVersion`**
   - Fields: `stimulus`, `version_number`, `title`, `content`, `change_log`, `status`, `created_by`, `created_at`
   - Constraints:
     - unique `(stimulus, version_number)`
     - indexed `(stimulus, created_at)`
3. **`SharedStimulusAttachment`**
   - Fields: `stimulus_version`, `file`, `original_filename`, `stored_filename`, `mime_type`, `file_size_bytes`, `uploaded_by`, `created_at`
   - Constraints:
     - indexed `stimulus_version`
     - file validation on MIME type and max size
4. **`SharedStimulusWorkflowHistory`**
   - Fields: `stimulus`, `previous_status`, `new_status`, `action`, `remarks`, `initiated_by`, `created_at`
   - Constraints:
     - indexed `stimulus` and `created_at`
5. **Question link**
   - Recommended: nullable `Question.shared_stimulus_version` foreign key with `SET_NULL`
   - Reason: the current frontend only expects a single active stimulus link per question, and version pinning protects historical questions

### Migration approach

- Add the new stimulus tables and the nullable question foreign key in a single schema migration or in two ordered migrations if the change set is too large.
- Backfill none of the current runtime data automatically because the current Shared Stimuli records are frontend demo data only.
- If the team wants the mock stimuli preserved, seed them through a reversible data migration or a management command, not by copying browser localStorage.
- Rollback should be safe because the new question link is nullable and the new stimulus tables can be dropped once links are cleared.

## 11. API Contract

### Stimulus endpoints

- `GET /api/v1/exams/stimuli/`
  - Purpose: list stimuli with search/filter/sort/pagination
  - Role: authenticated hub users allowed by policy
  - Query params: `search`, `status`, `type`, `subject`, `topic`, `difficulty`, `sort`, `page`, `page_size`
  - Response: paginated stimulus summaries with linked-question counts, ownership fields, current version, and attachment counts
- `POST /api/v1/exams/stimuli/`
  - Purpose: create a stimulus draft
  - Request: stimulus metadata, content, tags, optional attachments
  - Response: created stimulus payload, `201`
- `GET /api/v1/exams/stimuli/{stimulus_id}/`
  - Purpose: detail view including current version, version history, attachments, and linked questions
  - Response: full stimulus payload, `200`
- `PATCH /api/v1/exams/stimuli/{stimulus_id}/`
  - Purpose: edit draft or create a new version for published stimuli
  - Response: updated stimulus payload, `200`
- `DELETE /api/v1/exams/stimuli/{stimulus_id}/`
  - Purpose: safe delete only when unreferenced and policy allows it
  - Response: `204` or `409` if referenced/locked
- `POST /api/v1/exams/stimuli/{stimulus_id}/transition/`
  - Purpose: submit, approve, publish, retire, archive, or otherwise transition status
  - Request: `{status, remarks?}`
  - Response: updated stimulus payload, `200`
- `POST /api/v1/exams/stimuli/{stimulus_id}/questions/`
  - Purpose: replace or sync linked question set
  - Request: `{question_ids: [...]}` and optional mode if the implementation needs it
  - Response: updated stimulus detail, `200`
- `DELETE /api/v1/exams/stimuli/{stimulus_id}/questions/{question_id}/`
  - Purpose: unlink a single question
  - Response: updated stimulus detail, `200` or `204`
- `POST /api/v1/exams/stimuli/{stimulus_id}/attachments/`
  - Purpose: upload an attachment
  - Response: created attachment metadata, `201`
- `DELETE /api/v1/exams/stimuli/{stimulus_id}/attachments/{attachment_id}/`
  - Purpose: remove an attachment
  - Response: `204`

### Question contract updates

- Extend question serializers to expose `stimulus_id` and a small stimulus summary so Question Bank can render the link state without extra calls.
- If question editing needs to link stimuli directly, keep the existing question CRUD endpoint and accept the new foreign key field there.

### Expected status/error behavior

- `200` for successful reads, updates, transitions, and link sync
- `201` for creates and uploads
- `204` for safe deletes/unlinks
- `400` for validation failures
- `401` for unauthenticated requests
- `403` for unauthorized roles or creator-versus-approver violations
- `404` for unknown ids
- `409` for invalid workflow transitions or unsafe deletion while referenced

## 12. Permissions and Workflow Matrix

| Action | Creator | Item Writer | Academic Reviewer | Exam Administrator | System Administrator |
|---|---:|---:|---:|---:|---:|
| List / view | Yes, if permitted by hub access | Yes | Yes | Yes | Yes |
| Create draft | Yes | Yes | Yes | Yes | Yes |
| Edit own draft | Yes | Yes | Yes | Yes | Yes |
| Edit published stimulus | No | No | No | Optional, if policy allows | Yes |
| Submit for review | Yes | Yes | Yes | Yes | Yes |
| Approve / publish | No | No | Yes, if not creator | Optional, if policy allows | Yes, if not creator |
| Retire / archive | No | No | Optional | Optional | Yes |
| Hard delete | No | No | No | No | Yes, only when unreferenced |
| Link / unlink questions | Yes, if editing the stimulus | Yes | Yes | Yes | Yes |
| Upload / remove attachments | Yes, if editing the stimulus | Yes | Yes | Yes | Yes |

Notes:

- The repository already demonstrates the correct pattern for creator-versus-approver separation in Question Bank and Exam Blueprint.
- The exact review roles for Shared Stimuli still need product confirmation if they should differ from the existing reviewer/admin roles.
- The frontend should hide buttons using `usePhilSA()` and ownership metadata, but the backend must reject forbidden actions even when called directly.

## 13. Validation and Security Plan

- Validate all stimulus metadata in serializers and services:
  - title and content are required where appropriate
  - type, subject, difficulty, curriculum, and academic year must use allowed values
  - status transitions must be legal and role-authorized
- Sanitize or whitelist rich HTML content on the backend before storage or before serialization.
  - The current editor allows rich HTML-like content, so stored XSS protection is required.
- Validate attachments server-side:
  - max file size
  - allowed MIME types
  - safe filenames
  - storage path generated server-side
  - no raw client path trust
- Prevent duplicate or invalid associations:
  - unique active link per question unless the product explicitly wants many-to-many
  - block links to archived/deleted/locked stimuli
  - block unsafe stimulus deletion while questions still reference it
- Avoid mass-assignment:
  - whitelist serializer fields
  - set ownership, created_by, and timestamps server-side only
- Keep output rendering safe:
  - encode plain strings
  - only render sanitized HTML where the UI deliberately expects rich content
- Require backend permission checks for every mutating action.

## 14. Audit Logging Plan

- Add a Shared Stimuli history/audit model that records:
  - `previous_status`
  - `new_status`
  - `action`
  - `remarks`
  - `initiated_by`
  - `created_at`
- Record audit rows for:
  - create
  - edit
  - submit for review
  - approve / publish
  - retire / archive
  - delete
  - link question
  - unlink question
  - attach file
  - remove file
- Include a linked-question count and current version number in the stimulus detail response so the UI can show counts without re-deriving them locally.
- If the repository already has a global audit sink, dispatch to it in addition to the per-stimulus history table, following the pattern already used in other modules.

## 15. Testing Strategy

### Backend tests

- Model tests:
  - unique stimulus code
  - unique version number per stimulus
  - question link uniqueness / one-active-link rule
  - attachment metadata constraints
- API tests:
  - list/search/filter/sort/pagination
  - create/detail/update/delete
  - status transitions and invalid transitions
  - creator-versus-approver restrictions
  - role-based permission denial
  - link/unlink questions
  - duplicate association prevention
  - unsafe deletion while referenced
  - attachment validation
  - audit log generation
- Regression tests:
  - blueprint shared-stimulus requirement fields continue to serialize unchanged
  - question CRUD continues to work

### Frontend tests

- `StimulusManagement` unit tests:
  - loading state
  - empty state
  - error state
  - create/edit/delete/archive flows
  - link/unlink question flows
  - attachment add/remove flows
  - status badges and counts
  - permission-hidden buttons
- service tests:
  - request mapping
  - response mapping
  - validation/error handling
- Question Bank regression tests:
  - the Shared Stimuli tab still mounts correctly
  - question list rendering still works with any new stimulus fields

### End-to-end tests

- Create a stimulus.
- Add at least one attachment.
- Link multiple questions.
- Reload the page and confirm the relationships persist.
- Confirm unsafe delete is blocked while linked.
- Confirm creator-versus-approver restrictions work from the UI and fail server-side if bypassed.

### Suggested commands

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests.SharedStimulusApiTests
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/StimulusManagement.test.tsx
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/QuestionBank.test.tsx
docker compose -f local/docker-compose.yml exec frontend npm run test:e2e -- shared-stimuli.spec.ts
docker compose -f local/docker-compose.yml exec frontend npm run build
```

## 16. Implementation Tasks in Dependency Order

### Task 1: Add the backend Shared Stimuli aggregate and API surface

**Files:**

- Modify: `backend/apps/exams/models.py`
- Modify: `backend/apps/exams/serializers.py`
- Modify: `backend/apps/exams/services.py`
- Modify: `backend/apps/exams/views.py`
- Modify: `backend/apps/exams/urls.py`
- Modify: `backend/apps/exams/tests.py`
- Create: `backend/apps/exams/migrations/0005_shared_stimuli.py`

**Interfaces:**

- Consumes: existing `Question`, `QuestionAttachment`, `QuestionWorkflowHistory`, `ExamBlueprint`, and blueprint stimulus requirement patterns.
- Produces: `SharedStimulus`, `SharedStimulusVersion`, `SharedStimulusAttachment`, `SharedStimulusWorkflowHistory`, serializer payloads, list/detail/CRUD endpoints, transition validation, and backend-linked question persistence.

- [ ] **Step 1: Write the failing backend tests first**

Add one focused test class that proves the backend does not yet support the module, then narrow it down into the exact behaviors that will be added:

```python
def test_shared_stimulus_list_returns_empty_collection(self) -> None:
    response = self.client.get(reverse("exams:shared_stimulus_list"))
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["count"], 0)


def test_shared_stimulus_create_persists_version_and_history(self) -> None:
    response = self.client.post(reverse("exams:shared_stimulus_list"), self.payload, format="json")
    self.assertEqual(response.status_code, 201)
    self.assertEqual(response.data["status"], "DRAFT")
    self.assertEqual(response.data["versions"][0]["version_number"], 1)
    self.assertEqual(response.data["history"][-1]["action"], "Created stimulus")
```

- [ ] **Step 2: Verify the tests fail before code changes**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests.SharedStimulusApiTests
```

Expected: failures because the stimulus model, endpoints, and serializers do not exist yet.

- [ ] **Step 3: Implement the minimal backend domain and API**

Add the new model set and backend workflow functions in the existing `exams` app:

```python
class SharedStimulus(models.Model):
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    status = models.CharField(max_length=32, choices=SharedStimulusStatus.choices, default=SharedStimulusStatus.DRAFT)
    created_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="created_shared_stimuli")
    updated_by = models.ForeignKey("accounts.AccountProfile", on_delete=models.PROTECT, related_name="updated_shared_stimuli", null=True, blank=True)
```

Add version, attachment, and history models, plus a nullable `Question.shared_stimulus_version` foreign key if the team confirms the one-active-link design.

Implement the service-layer helpers:

```python
def create_shared_stimulus(*, payload: dict[str, Any], actor_profile: AccountProfile) -> SharedStimulus: ...
def update_shared_stimulus(*, stimulus: SharedStimulus, payload: dict[str, Any], actor_profile: AccountProfile) -> SharedStimulus: ...
def transition_shared_stimulus(*, stimulus: SharedStimulus, target_status: str, actor_profile: AccountProfile, remarks: str = "") -> SharedStimulus: ...
def link_questions_to_stimulus(*, stimulus: SharedStimulus, question_ids: list[int], actor_profile: AccountProfile) -> SharedStimulus: ...
```

Expose the API through `views.py` and `urls.py` using the existing DRF conventions.

- [ ] **Step 4: Run the backend tests and confirm they pass**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests.SharedStimulusApiTests
```

Expected: the new backend stimulus tests pass, and the blueprint/question regression tests still pass.

- [ ] **Step 5: Commit the backend slice**

Suggested commit boundary:

```bash
git add backend/apps/exams/models.py backend/apps/exams/serializers.py backend/apps/exams/services.py backend/apps/exams/views.py backend/apps/exams/urls.py backend/apps/exams/tests.py backend/apps/exams/migrations/0005_shared_stimuli.py
git commit -m "feat(exams): add backend shared stimulus domain"
```

### Task 2: Replace the Shared Stimuli localStorage implementation with a backend service

**Files:**

- Modify: `frontend/src/types.ts`
- Create: `frontend/src/services/backendSharedStimulusService.ts`
- Create: `frontend/src/services/backendSharedStimulusService.test.ts`
- Modify: `frontend/src/pages/admin/hub/StimulusManagement.tsx`
- Create: `frontend/src/pages/admin/hub/StimulusManagement.test.tsx`

**Interfaces:**

- Consumes: the backend stimulus list/detail/CRUD/link endpoints and the current `usePhilSA()` user.
- Produces: a data-driven Shared Stimuli page that no longer relies on synthetic localStorage for business data.

- [ ] **Step 1: Write the failing frontend tests first**

Add tests that prove the page is still mocked today, then narrow them to the backend-driven contract:

```ts
it('loads stimuli from the backend service and shows linked-question counts', async () => {
  listStimuli.mockResolvedValue({ ok: true, data: [sharedStimulusFixture] });
  render(<StimulusManagement />);
  expect(await screen.findByText('Shared Stimulus Management')).toBeInTheDocument();
});


it('hides review-only actions for non-authorized users', async () => {
  // Use the same role/ownership pattern already used in QuestionBank and ExamBlueprints.
});
```

- [ ] **Step 2: Verify the tests fail before code changes**

Run:

```powershell
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/StimulusManagement.test.tsx
```

Expected: failures because the backend service module and data mapping do not exist yet.

- [ ] **Step 3: Implement the minimal frontend service and page refactor**

Create a dedicated service module mirroring the repository’s existing backend service pattern:

```ts
export class BackendSharedStimulusService {
  listStimuli(params: SharedStimulusQuery): Promise<ServiceResult<SharedStimulus[]>> { ... }
  createStimulus(input: SharedStimulusInput): Promise<ServiceResult<SharedStimulus>> { ... }
  updateStimulus(id: string, input: SharedStimulusInput): Promise<ServiceResult<SharedStimulus>> { ... }
  transitionStimulus(id: string, input: SharedStimulusTransitionInput): Promise<ServiceResult<SharedStimulus>> { ... }
  linkQuestions(id: string, questionIds: string[]): Promise<ServiceResult<SharedStimulus>> { ... }
  unlinkQuestion(id: string, questionId: string): Promise<ServiceResult<SharedStimulus>> { ... }
}
```

Refactor `StimulusManagement.tsx` to:

- fetch from the new service on mount
- stop seeding production logic from `localStorage`
- keep only optional dev/test fallback wiring if needed
- keep the existing UI layout, but bind it to service calls
- derive counts, versions, and audit entries from API payloads

- [ ] **Step 4: Rerun frontend tests and the production build**

Run:

```powershell
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/StimulusManagement.test.tsx
docker compose -f local/docker-compose.yml exec frontend npm run build
```

Expected: the new frontend tests pass, and the build succeeds.

- [ ] **Step 5: Commit the frontend slice**

Suggested commit boundary:

```bash
git add frontend/src/types.ts frontend/src/services/backendSharedStimulusService.ts frontend/src/services/backendSharedStimulusService.test.ts frontend/src/pages/admin/hub/StimulusManagement.tsx frontend/src/pages/admin/hub/StimulusManagement.test.tsx
git commit -m "feat(frontend): connect shared stimuli to backend service"
```

### Task 3: Add Question Bank and Exam Blueprint regression coverage plus end-to-end stimulus flows

**Files:**

- Modify: `backend/apps/exams/tests.py`
- Modify: `frontend/src/services/backendExamBlueprintService.test.ts`
- Modify: `frontend/src/pages/admin/hub/QuestionBank.test.tsx`
- Create: `frontend/e2e/shared-stimuli.spec.ts`

**Interfaces:**

- Consumes: the backend Shared Stimuli API and the updated frontend stimulus service.
- Produces: regression coverage that proves Question Bank and Exam Blueprint behavior still works after the stimulus backend lands.

- [ ] **Step 1: Write the failing regression tests**

Add one backend regression test for the blueprint stimulus requirement fields, one frontend regression test for the Question Bank tab mount, and one Playwright flow for create/link/delete behavior:

```python
def test_blueprint_shared_stimulus_requirement_round_trips(self) -> None:
    response = self.client.post(reverse("exams:blueprint_list"), self.blueprint_payload, format="json")
    self.assertEqual(response.status_code, 201)
    self.assertIn("shared_stimulus_requirement", response.data["rules"])
```

```ts
it('still renders the Shared Stimuli tab inside Question Bank', async () => {
  render(<QuestionBank />);
  expect(await screen.findByText(/Shared Stimuli/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify the regression tests fail before final wiring**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests.ExamBlueprintApiTests
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/QuestionBank.test.tsx
docker compose -f local/docker-compose.yml exec frontend npm run test:e2e -- shared-stimuli.spec.ts
```

Expected: the new stimulus integration coverage should fail until the new backend payloads and frontend mappings are in place.

- [ ] **Step 3: Implement the smallest regression-friendly fixes**

Update only the contracts that need to surface the new stimulus data to Question Bank and Exam Blueprint:

- keep blueprint shared-stimulus requirement fields serializing exactly as they do today
- expose any needed stimulus summary on question payloads
- keep the Question Bank tab mounting the Shared Stimuli page cleanly
- keep the Exam Blueprint stimulus requirement mapping unchanged

- [ ] **Step 4: Rerun the backend, frontend, and E2E checks**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests.ExamBlueprintApiTests apps.exams.tests.SharedStimulusApiTests
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/QuestionBank.test.tsx src/pages/admin/hub/StimulusManagement.test.tsx
docker compose -f local/docker-compose.yml exec frontend npm run test:e2e -- shared-stimuli.spec.ts
docker compose -f local/docker-compose.yml exec frontend npm run build
```

Expected: all focused regression checks pass and the production build remains green.

- [ ] **Step 5: Commit the integration/regression slice**

Suggested commit boundary:

```bash
git add backend/apps/exams/tests.py frontend/src/services/backendExamBlueprintService.test.ts frontend/src/pages/admin/hub/QuestionBank.test.tsx frontend/e2e/shared-stimuli.spec.ts
git commit -m "test(shared-stimuli): cover question bank and blueprint regressions"
```

## 17. Exact Files to Create or Modify

### Backend

- `backend/apps/exams/models.py`
- `backend/apps/exams/serializers.py`
- `backend/apps/exams/services.py`
- `backend/apps/exams/views.py`
- `backend/apps/exams/urls.py`
- `backend/apps/exams/tests.py`
- `backend/apps/exams/migrations/0005_shared_stimuli.py`

### Frontend

- `frontend/src/types.ts`
- `frontend/src/services/backendSharedStimulusService.ts`
- `frontend/src/services/backendSharedStimulusService.test.ts`
- `frontend/src/pages/admin/hub/StimulusManagement.tsx`
- `frontend/src/pages/admin/hub/StimulusManagement.test.tsx`
- `frontend/src/pages/admin/hub/QuestionBank.test.tsx`
- `frontend/src/services/backendExamBlueprintService.test.ts`
- `frontend/e2e/shared-stimuli.spec.ts`

### Conditional review-only file

- `frontend/src/pages/admin/hub/QuestionBank.tsx`
  - Modify only if the stimulus tab needs additional role-gating, stimulus summaries, or question-editor integration beyond the current mount point

## 18. Risks and Compatibility Concerns

- The current stimulus UI is large and stateful, so the refactor should keep the layout intact while swapping data sources incrementally.
- Rich-text content can introduce stored XSS if the backend stores raw HTML without sanitization.
- The current frontend allows file/attachment-like interactions without a real upload stack, so file handling must be introduced carefully and tested with size/type limits.
- Because the repo currently stores question links only in frontend state, introducing a backend foreign key may reveal hidden assumptions in Question Bank filters and exam-building logic.
- The current shared-stimulus data set is demo content in localStorage; moving it to backend fixtures or a management command should be done deliberately to avoid misleading production behavior.
- If product wants many-to-many question links later, a single foreign key will be insufficient and the plan will need to expand to a junction table.

## 19. Definition of Done

- Shared Stimuli are persisted in the backend.
- Stimulus create/edit/view/delete/archive/transition flows use DRF endpoints.
- Linked questions persist across refreshes and reloads.
- Attachments persist with server-side validation.
- Audit history is available from the backend.
- Permission checks are enforced in the backend and mirrored in the frontend.
- Question Bank continues to render the Shared Stimuli tab.
- Exam Blueprint shared-stimulus requirement fields still serialize and test cleanly.
- Backend tests, frontend tests, and the focused E2E flow pass.
- No production behavior depends on localStorage mock data.

## 20. Manual Verification Checklist

- [ ] Open the Question Bank tab and confirm the Shared Stimuli tab loads from the backend instead of synthetic localStorage data.
- [ ] Create a stimulus, save it, refresh the page, and verify it still exists.
- [ ] Attach a file and confirm it appears in the stimulus detail view after reload.
- [ ] Link multiple questions to the same stimulus and verify the linked-question count updates.
- [ ] Unlink a question and confirm the count decreases.
- [ ] Attempt to delete a referenced stimulus and confirm the backend blocks it.
- [ ] Confirm the creator cannot perform any reviewer-only action if the policy requires creator/approver separation.
- [ ] Verify the Exam Blueprint stimulus requirement fields still display and save correctly.
- [ ] Verify the backend logs the create/edit/link/unlink/transition actions.
- [ ] Verify `npm run build` still succeeds.

---

Please review this plan and let me know if you want any changes before implementation begins.
