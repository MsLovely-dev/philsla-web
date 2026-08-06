# Task 2 Report

## Status

Implemented the Question Bank service-backed page bootstrap and synthetic fallback coverage. Backend results are preferred; loading, empty-filter, and fallback paths are covered.

## Files Changed

- `frontend/src/pages/admin/hub/QuestionBank.tsx`
  - Loads through `questionBankService.listQuestions()`.
  - Maps backend question items into the existing page model.
  - Shows loading and no-results states and uses the limited fallback only for empty or failed service results.
- `frontend/src/pages/admin/hub/questionBankFallbackData.ts`
  - Adds one synthetic fallback question: `Q-DEMO-001`.
- `frontend/src/pages/admin/hub/QuestionBank.test.tsx`
  - Covers backend precedence, loading, empty fallback, and error fallback.
- `frontend/src/services/backendQuestionBankService.ts`
  - Exports the shared `questionBankService` instance used by the page boundary.

## Tests Run

Command:

```text
npm test -- src/pages/admin/hub/QuestionBank.test.tsx
```

Observed result:

```text
PASS: 4 tests
```

Additional checks:

```text
npm run lint
git diff --check
npm run build
```

Observed results:

```text
FAIL: npm run lint
PASS: git diff --check
PASS: npm run build
```

## Concerns

- `npm run lint` fails on a mix of pre-existing repository type errors and a few unrelated frontend typing issues outside the Question Bank page.
- Existing unrelated worktree changes were left untouched.
