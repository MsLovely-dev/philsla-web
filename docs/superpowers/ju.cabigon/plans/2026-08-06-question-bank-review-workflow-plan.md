# Question Bank Review Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Question Bank submissions land in `PENDING_REVIEW` for both Exam Admin and System Admin creators, then require a different System Admin to approve the item.

**Architecture:** The frontend will stop sending `APPROVED` during create/update so the UI matches the intended workflow. The backend will remain authoritative: it will normalize save-time status to `PENDING_REVIEW`, resolve authenticated profiles reliably for bearer-style requests, and enforce a no-self-approval approval rule in the transition path. Review/approval stays a separate workflow action, not part of the save action.

**Tech Stack:** React 19 + TypeScript 5.8 + Vite 6 frontend; Django 5.2 + Django REST Framework 3.16 backend; Docker Compose local dev environment; Vitest/Testing Library frontend tests; Django test runner backend tests.

## Global Constraints

- Backend validation and authorization are authoritative; frontend validation only improves usability.
- Keep API calls in service modules and keep business rules out of presentation components.
- Make the smallest change that satisfies the workflow requirement.
- Do not introduce secrets, real exam content, or personal data into tests, fixtures, docs, or logs.
- Use the existing local Docker setup for verification.
- Never claim a check passed unless the relevant command was actually run and observed.

---

### Task 1: Backend save workflow and approval guard

**Files:**
- Modify: `backend/apps/exams/views.py`
- Modify: `backend/apps/exams/services.py`
- Test: `backend/apps/exams/tests.py`

**Interfaces:**
- `QuestionListCreateView.post()` and `QuestionDetailView.put()` must resolve the authenticated actor profile consistently for the current auth flow.
- `create_or_update_question(payload, actor_profile, question=None)` must save create/update actions in `PENDING_REVIEW`.
- `transition_question(question, target_status, actor_profile, remarks="")` must deny approval when the actor is the question creator and must only allow final approval from a different System Admin.

- [ ] **Step 1: Write the failing backend tests**

Add or extend tests in `backend/apps/exams/tests.py` for these cases:

```python
def test_question_create_from_exam_admin_stays_pending_review(self):
    # create a QUESTION_MANAGEMENT role user that is not SYSTEM_ADMIN
    # POST /api/v1/exams/questions/
    # assert 201 and response.data["status"] == "PENDING_REVIEW"
    # assert response.data["created_by"] reflects the acting profile

def test_question_create_from_system_admin_stays_pending_review(self):
    # create a SYSTEM_ADMIN user/profile
    # POST /api/v1/exams/questions/
    # assert 201 and response.data["status"] == "PENDING_REVIEW"

def test_question_creator_cannot_approve_own_question(self):
    # creator posts a question, then same actor attempts transition to APPROVED
    # assert 403 or 400 with a permission/validation code

def test_different_system_admin_can_approve_pending_question(self):
    # creator posts question
    # second SYSTEM_ADMIN approves through the transition endpoint
    # assert 200 and response.data["status"] == "APPROVED"
```

- [ ] **Step 2: Run the backend test slice and confirm it fails for the intended reasons**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests
```

Expected: the new review-workflow assertions fail before the backend code is updated.

- [ ] **Step 3: Implement the backend workflow fix**

Update `backend/apps/exams/views.py` so the question save path uses one consistent actor-profile helper that works for the current authenticated request shape.

Update `backend/apps/exams/services.py` so question create/update always lands in `PENDING_REVIEW`, regardless of the submitted save payload status. Keep the transition endpoint as the only place that moves a question into `APPROVED`, and reject approval when the approver is the same profile that created the question.

- [ ] **Step 4: Re-run the backend tests**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests
```

Expected: the question creation and approval-rule tests pass.

- [ ] **Step 5: Record the backend result**

Update the Jude implementation log with:
- the exact backend test command
- the approval/self-approval behavior that is now enforced
- any remaining manual smoke step that still needs verification

---

### Task 2: Frontend save payload alignment

**Files:**
- Modify: `frontend/src/pages/admin/hub/QuestionBank.tsx`
- Test: `frontend/src/pages/admin/hub/QuestionBank.test.tsx`

**Interfaces:**
- `handleSaveNewQuestion()` must send `status: 'PENDING_REVIEW'` for both create and edit saves.
- The existing transition UI must continue to use `questionBankService.transitionQuestion(...)` for explicit approval/review actions.

- [ ] **Step 1: Add a failing frontend assertion**

Extend `frontend/src/pages/admin/hub/QuestionBank.test.tsx` to assert that the create and update service calls receive a payload whose `status` is `PENDING_REVIEW`, not `APPROVED`.

```ts
expect(createQuestion).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_REVIEW' }));
expect(updateQuestion).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ status: 'PENDING_REVIEW' }));
```

- [ ] **Step 2: Run the targeted frontend test and confirm it fails**

Run:

```powershell
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/QuestionBank.test.tsx
```

Expected: the new payload assertions fail before the page change is applied.

- [ ] **Step 3: Update the save payload**

In `frontend/src/pages/admin/hub/QuestionBank.tsx`, change the save payload so new submissions default to `PENDING_REVIEW` instead of `APPROVED`.

- [ ] **Step 4: Re-run the targeted frontend test**

Run:

```powershell
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/QuestionBank.test.tsx
```

Expected: the new payload assertions pass.

- [ ] **Step 5: Run the frontend build**

Run:

```powershell
docker compose -f local/docker-compose.yml exec frontend npm run build
```

Expected: production build succeeds with the Question Bank workflow change.

---

### Task 3: Final verification and handoff notes

**Files:**
- Modify: `docs/superpowers/ju.cabigon/implement/ju.cabigon.implement.md`
- Optional modify: `docs/superpowers/ju.cabigon/ju.cabigon.task.md` if the verified workflow changes the status summary

**Interfaces:**
- The implementation log must reflect the exact commands run and the final workflow behavior.

- [ ] **Step 1: Run the focused backend and frontend checks together**

Run:

```powershell
docker compose -f local/docker-compose.yml exec backend python manage.py test apps.exams.tests
docker compose -f local/docker-compose.yml exec frontend npm test -- src/pages/admin/hub/QuestionBank.test.tsx
docker compose -f local/docker-compose.yml exec frontend npm run build
```

Expected: backend tests pass, the Question Bank frontend tests pass, and the frontend build passes.

- [ ] **Step 2: Update the implementation log**

Document:
- the workflow change
- the approval guard
- the exact verification commands and results

- [ ] **Step 3: Smoke test in the browser**

Open the local Vite app and verify:
- Exam Admin-created question saves as `PENDING_REVIEW`
- System Admin-created question saves as `PENDING_REVIEW`
- the creator cannot approve their own question
- a different System Admin can approve it

