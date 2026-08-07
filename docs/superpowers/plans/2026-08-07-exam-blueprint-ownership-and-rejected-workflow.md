# Exam Blueprint Ownership and Rejected Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a terminal `REJECTED` workflow state to Exam Blueprints and enforce the same creator-blocked review ownership rules used in Question Bank.

**Architecture:** Keep workflow authority in the Django service layer and expose only the minimum creator identity needed for the React UI to hide review actions. The Exam Blueprint detail page will keep explicit action buttons in the top-right header area, while backend transition validation will remain the source of truth for status changes, remarks requirements, and creator self-review denial.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, Python 3.13, Django 5.2, Django REST Framework 3.16, PostgreSQL-compatible persistence via the existing backend project, and the current local Docker workflow.

## Global Constraints

- Both Exam Administrators and System Administrators are allowed to create Exam Blueprints.
- Exam Blueprint review actions must be hidden when the authenticated user is the blueprint creator.
- Exam Blueprint review actions must be hidden for users without review permission.
- The backend must prevent the creator from approving, rejecting, or requesting correction on their own blueprint.
- `REJECTED` must be a terminal workflow state.
- `Reject` must require remarks before submission.
- Preserve the existing approval workflow, REST contract style, and audit history pattern.
- Reuse the Question Bank ownership-check pattern where possible instead of inventing a second, unrelated workflow system.
- Do not introduce secrets, real exam content, or unrelated refactors.

---

### Task 1: Extend the Backend Blueprint Workflow and API Contract

**Files:**

- Modify: `backend/apps/exams/models.py`
- Modify: `backend/apps/exams/services.py`
- Modify: `backend/apps/exams/serializers.py`
- Modify: `backend/apps/exams/tests.py`
- Create: `backend/apps/exams/migrations/0004_blueprint_rejected_status.py`

**Interfaces:**

- Consumes: `BlueprintStatus`, `BlueprintVersion`, `BlueprintWorkflowHistory`, `BlueprintTransitionSerializer`, `transition_blueprint_version()`, `serialize_blueprint()`.
- Produces: a backend blueprint workflow that accepts `REJECTED`, records it in workflow history, blocks creator self-review, and exposes creator identity for frontend ownership checks.

- [ ] **Step 1: Write the failing backend regression tests**

Add tests that describe the intended behavior before changing production code:

```python
def test_blueprint_reject_creates_rejected_history_and_is_terminal(self) -> None:
    creator, _ = self.create_profile("blueprint_creator", PortalRole.ITEM_WRITER.value)
    reviewer, _ = self.create_profile("blueprint_reviewer", PortalRole.ACADEMIC_REVIEWER.value)

    self.authenticate_as(creator)
    blueprint_id = self.create_blueprint()
    self.transition_blueprint(blueprint_id, "submitted", "Ready for review")

    self.authenticate_as(reviewer)
    response = self.transition_blueprint(blueprint_id, "rejected", "Not aligned with the exam blueprint standard")

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["status"], "REJECTED")
    self.assertEqual(response.data["history"][-1]["remarks"], "Not aligned with the exam blueprint standard")
```

Add a creator-block test:

```python
def test_blueprint_creator_cannot_self_review(self) -> None:
    creator, _ = self.create_profile("blueprint_creator_self", PortalRole.ITEM_WRITER.value)
    self.authenticate_as(creator)
    blueprint_id = self.create_blueprint()
    self.transition_blueprint(blueprint_id, "submitted", "Submitted by creator")

    response = self.transition_blueprint(blueprint_id, "approved", "Creator tried to approve")
    self.assertEqual(response.status_code, 403)
```

Add an API-shape test for creator identity:

```python
def test_blueprint_response_includes_creator_user_id(self) -> None:
    response = self.client.post(reverse("exams:blueprint_list"), self.payload, format="json")
    self.assertEqual(response.status_code, 201)
    self.assertEqual(response.data["created_by_user_id"], str(self.user.id))
```

- [ ] **Step 2: Run the backend tests and confirm they fail for the missing rejected workflow**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests.ExamBlueprintApiTests
```

Expected: failures showing that `REJECTED` is not yet accepted, the terminal state is not enforced, creator self-review is not blocked for all review actions, or the creator identity is not yet exposed.

- [ ] **Step 3: Implement the minimal backend change**

Update the backend workflow in the service layer:

```python
class BlueprintStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    ACADEMIC_REVIEW = "academic_review", "Academic review"
    REVISION_REQUIRED = "revision_required", "Revision required"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    PUBLISHED = "published", "Published"
    RETIRED = "retired", "Retired"
    ARCHIVED = "archived", "Archived"
```

Update `BLUEPRINT_TRANSITION_MAP` so `REJECTED` has no outgoing transitions, and so the existing review states can still move through the current approval path without bypassing the workflow.

Extend `_validate_blueprint_transition()` so the creator is blocked from all review actions, not only approval:

```python
if requested_status in {BlueprintStatus.APPROVED, BlueprintStatus.REVISION_REQUIRED, BlueprintStatus.REJECTED} and version.created_by_id == actor_profile.id:
    raise PermissionDenied("Blueprint creators cannot review their own blueprints.")
```

Add remarks validation in `BlueprintTransitionSerializer` so rejection cannot be submitted without remarks, and make `serialize_blueprint()` include the creator user identifier needed by the frontend:

```python
"created_by_user_id": str(blueprint.created_by.user_id),
```

Record `REJECTED` in `BlueprintWorkflowHistory` the same way other transitions are recorded.

- [ ] **Step 4: Add the migration and rerun the backend tests**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py makemigrations exams --name blueprint_rejected_status
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests.ExamBlueprintApiTests
```

Expected: the tests pass, and the migration captures the model-state change for the new status choice.

---

### Task 2: Add Reviewer Buttons and Creator Visibility Rules in the Exam Blueprint UI

**Files:**

- Modify: `frontend/src/pages/admin/hub/blueprintMockData.ts`
- Modify: `frontend/src/services/backendExamBlueprintService.ts`
- Modify: `frontend/src/pages/ExamBlueprints.tsx`
- Modify: `frontend/src/pages/ExamBlueprints.test.tsx`

**Interfaces:**

- Consumes: blueprint status, creator user ID, current authenticated user from `usePhilSA()`, and `examBlueprintService.transitionBlueprint()`.
- Produces: explicit header buttons for `Approve`, `Request Correction`, and `Reject`, with creator-blocked visibility and remarks-driven review submission.

- [ ] **Step 1: Write the failing frontend regression tests**

Add tests that prove the UI hides review buttons for the creator and shows the right actions for non-creators:

```ts
it('hides blueprint review buttons for the creator', async () => {
  listBlueprints.mockResolvedValue({
    ok: true,
    data: [{ ...blueprintFixture, createdByUserId: currentUser.id, status: 'SUBMITTED' }],
  });

  renderPage();
  await screen.findByText('Exam Blueprint with Points');
  await user.click(screen.getByText('Exam Blueprint with Points'));

  expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /request correction/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
});
```

Add a test that the non-creator sees the review buttons and `Reject` sends the new status:

```ts
it('sends rejected as the blueprint review action', async () => {
  listBlueprints.mockResolvedValue({
    ok: true,
    data: [{ ...blueprintFixture, createdByUserId: 'another-user', status: 'SUBMITTED' }],
  });
  transitionBlueprint.mockResolvedValue({
    ok: true,
    data: { ...blueprintFixture, status: 'REJECTED' },
  });

  renderPage();
  const user = userEvent.setup();

  await screen.findByText('Exam Blueprint with Points');
  await user.click(screen.getByText('Exam Blueprint with Points'));
  await user.click(screen.getByRole('button', { name: /reject/i }));
  await user.type(screen.getByLabelText(/remarks/i), 'Not aligned with the blueprint standard.');
  await user.click(screen.getByRole('button', { name: /confirm reject/i }));

  expect(transitionBlueprint).toHaveBeenCalledWith('BP-001', {
    status: 'REJECTED',
    remarks: 'Not aligned with the blueprint standard.',
  });
});
```

Add a status-badge/filter coverage check for the new `REJECTED` state:

```ts
expect(screen.getByText(/rejected/i)).toBeInTheDocument();
expect(screen.getByRole('option', { name: /rejected/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run the frontend tests and confirm they fail for the missing review controls**

Run:

```powershell
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/ExamBlueprints.test.tsx
```

Expected: failures showing the buttons are missing, the creator check cannot be evaluated yet, or the `REJECTED` status is not rendered consistently.

- [ ] **Step 3: Implement the minimal frontend change**

Extend `Blueprint` in `blueprintMockData.ts` and the API mapping in `backendExamBlueprintService.ts` so the UI can distinguish the creator by user ID and represent `REJECTED` as a real status.

In `ExamBlueprints.tsx`, add a small ownership helper that mirrors the shape of the Question Bank pattern:

```ts
const canUseBlueprintReviewActions = (blueprint: Blueprint) => {
  if (!user || !blueprint.createdByUserId) return false;
  if (blueprint.createdByUserId === user.id) return false;
  return blueprint.status === 'SUBMITTED' || blueprint.status === 'ACADEMIC_REVIEW';
};
```

Render explicit header buttons in the detail header area instead of the single placeholder review control:

```tsx
{canUseBlueprintReviewActions(selectedBlueprint) ? (
  <div className="flex items-center gap-2">
    <button type="button">Approve</button>
    <button type="button">Request Correction</button>
    <button type="button">Reject</button>
  </div>
) : selectedBlueprint.status === 'DRAFT' ? (
  <button type="button" onClick={() => void submitBlueprintForReview(selectedBlueprint)}>
    Submit for Review
  </button>
) : (
  <span>Ready for review workflow</span>
)}
```

Wire the review buttons to `examBlueprintService.transitionBlueprint()` with the same request shape already used by the service, and gate `Reject` behind a remarks-required confirmation flow.

Update `statusLabel()`, `statusTone()`, status filters, and any status-dependent UI copy so `REJECTED` appears consistently as a terminal state.

- [ ] **Step 4: Rerun the frontend tests and confirm the build still passes**

Run:

```powershell
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/ExamBlueprints.test.tsx
docker compose -f local/docker-compose.yml exec frontend npm run build
```

Expected: the test file passes and the production build succeeds.

---

### Task 3: End-to-End Verification and Diff Review

**Files:**

- Review: `backend/apps/exams/services.py`
- Review: `backend/apps/exams/tests.py`
- Review: `frontend/src/pages/ExamBlueprints.tsx`
- Review: `frontend/src/pages/ExamBlueprints.test.tsx`
- Review: `frontend/src/pages/admin/hub/blueprintMockData.ts`
- Review: `frontend/src/services/backendExamBlueprintService.ts`

**Interfaces:**

- Consumes: the backend API response with creator identity and `REJECTED` status, plus the frontend button visibility helpers.
- Produces: a verified Exam Blueprint workflow change with no regressions in the existing approval flow.

- [ ] **Step 1: Run the focused backend and frontend checks together**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests.ExamBlueprintApiTests
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/ExamBlueprints.test.tsx
docker compose -f local/docker-compose.yml exec frontend npm run build
```

- [ ] **Step 2: Inspect the final diff for workflow drift**

Confirm the diff only adds the `REJECTED` state, creator identity exposure, creator-blocked review actions, and the minimum UI needed for the new buttons.

- [ ] **Step 3: Commit the finished workflow change**

Use a commit message that names the workflow change clearly, for example:

```bash
git add backend/apps/exams/models.py backend/apps/exams/services.py backend/apps/exams/serializers.py backend/apps/exams/tests.py backend/apps/exams/migrations/0004_blueprint_rejected_status.py frontend/src/pages/admin/hub/blueprintMockData.ts frontend/src/services/backendExamBlueprintService.ts frontend/src/pages/ExamBlueprints.tsx frontend/src/pages/ExamBlueprints.test.tsx
git commit -m "feat(exams): add rejected blueprint workflow and creator review guard"
```
