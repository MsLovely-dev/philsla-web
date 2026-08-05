# Task 1 Brief: Pin the question-bank service contract

Plan: `docs/superpowers/ju.cabigon/plans/2026-08-05-question-bank-wiring-plan.md`

## Requirements

- Create `frontend/src/services/backendQuestionBankService.test.ts`.
- Cover `BackendQuestionBankService`, `QuestionBankPayload`, `QuestionTransitionInput`, and a mocked `ApiClient`.
- Prove `listQuestions`, `createQuestion`, `updateQuestion`, `transitionQuestion`, and `deleteQuestion` keep transport mapping isolated in the service layer.
- Verify status normalization, including mapping a backend `status: 'draft'` result to frontend `status: 'DRAFT'`.
- Keep the change small and service-focused.
- Do not move request logic into the page.

## Expected test command

Run: `npm test -- src/services/backendQuestionBankService.test.ts`

Expected: the test file exists and exercises the service contract. If the current implementation still has mapping gaps, the tests should fail first and then pass after the service is corrected.

## Notes

- Keep all data synthetic.
- Do not introduce direct endpoint calls from `QuestionBank.tsx`.
- Keep mock content limited to the demo use case.
