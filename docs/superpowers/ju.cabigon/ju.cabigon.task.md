# Jude Cabigon Task Log

Date: 2026-08-05

## Source References
- [Root AGENTS.md](../../AGENTS.md)
- [Docs AGENTS.md](../AGENTS.md)
- [BUILD_PLAN.md](../../BUILD_PLAN.md)

## Wednesday Problem
The first Wednesday build-plan task for Jude Cabigon is:

> On branch `ju.cabigon/exam-blueprint`, get a plan reviewed for transition tests in `backend/apps/exams/tests.py`, covering invalid transitions such as `published -> draft`.

## Second Wednesday Problem
The second Wednesday build-plan task for Jude Cabigon is:

> On branch `ju.cabigon/question-bank`, get a plan reviewed for wiring `QuestionBank.tsx` off `blueprintMockData.ts` onto `backendQuestionBankService.ts`, copying the working pattern in `ExamBlueprints.tsx`.

## Planned Solution
- Review the current exam status transition rules before changing tests.
- Add focused backend tests that prove invalid exam blueprint transitions are rejected.
- Include at least the `published -> draft` case from the build plan, plus any other invalid transitions already implied by the existing workflow.
- Keep the test data synthetic and minimal.
- Make the plan explicit about expected success and failure states before implementation begins.

## Second Planned Solution
- Review the current question bank UI and service wiring before changing the component.
- Remove direct dependence on embedded mock data from `QuestionBank.tsx`.
- Route question data through `backendQuestionBankService.ts` using the same service-layer boundary pattern as `ExamBlueprints.tsx`.
- Keep mock data only as a temporary fallback or fixture source, not as the component’s primary source of truth.
- Make the plan explicit about loading, empty, error, and transition states before implementation begins.

## Second Task Solution
The safest solution for `ju.cabigon/question-bank` is to refactor `QuestionBank.tsx` so it gets its data and mutations through `backendQuestionBankService.ts`, while keeping the current mock data only as a temporary fallback or fixture source.

Key points:
- use the same service-layer boundary pattern already working in `ExamBlueprints.tsx`
- keep API mapping isolated in the service module
- preserve loading, empty, error, and transition states in the UI
- avoid direct backend calls from the component
- keep sensitive or real assessment content out of examples and test data

## Review Gate
I must review and approve the implementation plan before any backend or frontend code changes are made.

## Security Notes
- Do not include real student, exam, or account data in tests or examples.
- Treat backend validation as authoritative and do not rely on client-side state.
- Keep the plan limited to testing and review. No implementation code should be written until the plan is approved.
