# Question Bank Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `QuestionBank.tsx` to `backendQuestionBankService.ts` so the page loads and mutates through the service boundary instead of treating `blueprintMockData.ts` as the primary source of truth.

**Architecture:** Follow the same service-first pattern already working in `ExamBlueprints.tsx`: load data in an effect, keep UI state local, and isolate transport mapping inside the service module. Preserve a synthetic fallback path for demo continuity, but keep it secondary to the backend service. Keep the page focused on rendering, filters, selection, and modal state.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, `backendQuestionBankService.ts`, `serviceResult.ts`.

## Global Constraints

- Isolate remote API calls and transport mapping in service modules. Components must not call remote endpoints directly.
- Preserve loading, empty, error, and transition states when changing UI behavior.
- Frontend validation is for usability only. Never treat it as an authorization, integrity, or security boundary; the backend remains authoritative.
- Do not expose secrets, personal data, or real assessment content in tests, fixtures, examples, or UI error messages.
- Keep any mock content synthetic and limited to the demo use case.
- Make the smallest change that satisfies the request.

---

### Task 1: Pin the question-bank service contract

**Files:**
- Create: `frontend/src/services/backendQuestionBankService.test.ts`

**Interfaces:**
- Consumes: `BackendQuestionBankService`, `QuestionBankPayload`, `QuestionTransitionInput`, and a mocked `ApiClient`.
- Produces: stable tests for list/create/update/transition/delete mapping and status normalization so the page wiring can rely on the service contract.

- [ ] **Step 1: Write the failing service-contract tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { BackendQuestionBankService } from './backendQuestionBankService';

it('maps listQuestions results into QuestionBankItem objects', async () => {
  const request = vi.fn().mockResolvedValue({
    ok: true,
    data: [
      {
        id: 'Q-1001',
        question_code: 'Q-1001',
        question_type: 'MCQ',
        question_type_code: 'MCQ',
        subject: 'Math',
        subject_code: 'MATH',
        topic: 'Algebra',
        topic_code: 'ALG',
        competency: 'Solve linear equations',
        competency_code: 'COMP-1',
        difficulty: 'EASY',
        question_text: 'What is 2x = 4?',
        explanation: 'Divide both sides by 2.',
        points: 2,
        status: 'draft',
        created_by: 'author-1',
        reviewed_by: '',
        approved_by: '',
        reviewed_at: null,
        approved_at: null,
        retired_at: null,
        archived_at: null,
        choices: [],
        answers: [],
        rubrics: [],
        tags: [],
        attachments: [],
        workflow_history: [],
        created_at: '2026-08-05T00:00:00Z',
        updated_at: '2026-08-05T00:00:00Z',
      },
    ],
  });
  const service = new BackendQuestionBankService({ request } as never);

  const result = await service.listQuestions();

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data[0].questionCode).toBe('Q-1001');
    expect(result.data[0].status).toBe('DRAFT');
  }
});
```

- [ ] **Step 2: Run the service tests and confirm the current implementation matches or fails in the expected places**

Run: `npm test -- src/services/backendQuestionBankService.test.ts`
Expected: the new contract tests fail first if mapping gaps exist, then pass after the service is corrected.

- [ ] **Step 3: Implement only the smallest service fixes needed**

Keep any transport mapping in `backendQuestionBankService.ts` and do not move request logic into the page.

- [ ] **Step 4: Re-run the focused service tests**

Run: `npm test -- src/services/backendQuestionBankService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the service-contract coverage**

```bash
git add frontend/src/services/backendQuestionBankService.test.ts frontend/src/services/backendQuestionBankService.ts
git commit -m "test: pin question bank service contract"
```

---

### Task 2: Add service-backed page bootstrap and fallback tests

**Files:**
- Create: `frontend/src/pages/admin/hub/QuestionBank.test.tsx`
- Modify: `frontend/src/pages/admin/hub/QuestionBank.tsx`
- Create: `frontend/src/pages/admin/hub/questionBankFallbackData.ts`

**Interfaces:**
- Consumes: `backendQuestionBankService.listQuestions()`, `usePhilSA()`, and a small synthetic fallback dataset.
- Produces: initial-load behavior that prefers backend data, shows loading and empty states, and only falls back to synthetic data when the service cannot provide usable results.

- [ ] **Step 1: Write the failing page-bootstrap tests**

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionBank from './QuestionBank';

it('renders backend questions instead of synthetic fallback questions when the service returns data', async () => {
  // mock backendQuestionBankService.listQuestions to return one backend item
  // render QuestionBank
  // assert the backend item is visible
  // assert a fallback-only question title is not rendered
});
```

- [ ] **Step 2: Add a loading-state test**

Use a deferred service promise so the test can assert the loading copy appears before data resolves.

- [ ] **Step 3: Add an empty-or-error fallback test**

Verify the page renders the synthetic fallback path only when the service returns no usable data or fails.

- [ ] **Step 4: Implement the page bootstrap flow**

Update `QuestionBank.tsx` so mount-time loading goes through `backendQuestionBankService.listQuestions()`, the page shows a loading state while the request is in flight, and the fallback file is used only when needed.

- [ ] **Step 5: Re-run the focused page tests**

Run: `npm test -- src/pages/admin/hub/QuestionBank.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit the bootstrap and fallback work**

```bash
git add frontend/src/pages/admin/hub/QuestionBank.tsx frontend/src/pages/admin/hub/QuestionBank.test.tsx frontend/src/pages/admin/hub/questionBankFallbackData.ts
git commit -m "feat: load question bank from service"
```

---

### Task 3: Route question mutations through the service boundary

**Files:**
- Modify: `frontend/src/pages/admin/hub/QuestionBank.tsx`
- Update: `frontend/src/pages/admin/hub/QuestionBank.test.tsx`

**Interfaces:**
- Consumes: `backendQuestionBankService.createQuestion()`, `updateQuestion()`, `transitionQuestion()`, and `deleteQuestion()`.
- Produces: service-backed create/edit/status/delete flows that keep the current modals, filters, and selection state working without direct endpoint access from the component.

- [ ] **Step 1: Write the failing mutation tests**

```tsx
it('creates a question through the service and refreshes the list', async () => {
  // mock createQuestion to return a created item
  // open the add modal
  // submit the form
  // assert the new question appears in the list
});

it('transitions a question through the service and keeps the current filter state', async () => {
  // mock transitionQuestion to return an updated item
  // trigger a status change
  // assert the updated status and history are rendered
});
```

- [ ] **Step 2: Implement create/update/delete/transition calls in the page**

Keep the UI state updates small and local, and let the service remain the only transport boundary.

- [ ] **Step 3: Re-run the page tests**

Run: `npm test -- src/pages/admin/hub/QuestionBank.test.tsx`
Expected: PASS.

- [ ] **Step 4: Run the repo checks that cover the changed frontend area**

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit the page wiring**

```bash
git add frontend/src/pages/admin/hub/QuestionBank.tsx frontend/src/pages/admin/hub/QuestionBank.test.tsx
git commit -m "feat: wire question bank to backend service"
```

## Self-Review Notes

- The plan covers the spec requirement to move `QuestionBank.tsx` off `blueprintMockData.ts` and onto `backendQuestionBankService.ts`.
- The plan keeps `ExamBlueprints.tsx` as the reference pattern for service-first loading.
- The plan includes loading, empty, error, and transition behavior.
- The plan avoids any backend redesign and keeps mock content synthetic.
