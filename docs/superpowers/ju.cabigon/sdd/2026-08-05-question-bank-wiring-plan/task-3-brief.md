# Task 3 Brief: Route question mutations through the service boundary

Plan: `docs/superpowers/ju.cabigon/plans/2026-08-05-question-bank-wiring-plan.md`

## Requirements

- Modify `frontend/src/pages/admin/hub/QuestionBank.tsx`.
- Update `frontend/src/pages/admin/hub/QuestionBank.test.tsx`.
- Consume `backendQuestionBankService.createQuestion()`, `updateQuestion()`, `transitionQuestion()`, and `deleteQuestion()`.
- Keep the current modals, filters, selection, and persona switching working without direct endpoint access from the component.
- Keep the UI state updates small and local.

## Expected test command

Run: `npm test -- src/pages/admin/hub/QuestionBank.test.tsx`

Expected: the mutation tests cover create, update, transition, and delete flows through the service boundary.

## Notes

- Keep the component free of direct endpoint calls.
- Preserve loading, empty, error, and transition states.
- Keep all demo content synthetic.
