# Task 2 Brief: Add service-backed page bootstrap and fallback tests

Plan: `docs/superpowers/ju.cabigon/plans/2026-08-05-question-bank-wiring-plan.md`

## Requirements

- Create `frontend/src/pages/admin/hub/QuestionBank.test.tsx`.
- Modify `frontend/src/pages/admin/hub/QuestionBank.tsx`.
- Create `frontend/src/pages/admin/hub/questionBankFallbackData.ts`.
- Consume `backendQuestionBankService.listQuestions()`, `usePhilSA()`, and a small synthetic fallback dataset.
- Make the page prefer backend data, show loading and empty states, and only fall back to synthetic data when the service cannot provide usable results.
- Keep the page focused on rendering, filters, selection, and modal state.

## Expected test command

Run: `npm test -- src/pages/admin/hub/QuestionBank.test.tsx`

Expected: the page-bootstrap tests cover backend-backed rendering, loading state, and fallback behavior.

## Notes

- Keep all fallback content synthetic.
- Do not add direct endpoint calls to `QuestionBank.tsx`.
- Use the service boundary pattern already working in `ExamBlueprints.tsx`.
