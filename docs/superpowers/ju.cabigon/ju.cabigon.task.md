# Jude Cabigon Task Brief

Date: 2026-08-06

## Source References
- [Root AGENTS.md](../../AGENTS.md)
- [Docs AGENTS.md](../AGENTS.md)
- [BUILD_PLAN.md](../../BUILD_PLAN.md)

## Assigned Problems
The sprint brief assigned Jude Cabigon two BRD-02 Item Bank tasks:

> On branch `ju.cabigon/exam-blueprint`, get a plan reviewed for transition tests in `backend/apps/exams/tests.py`, covering invalid transitions such as `published -> draft`.

> On branch `ju.cabigon/question-bank`, get a plan reviewed for wiring `QuestionBank.tsx` off `blueprintMockData.ts` onto `backendQuestionBankService.ts`, copying the working pattern in `ExamBlueprints.tsx`.

## Completed Outcome
The originally assigned review-plan tasks are complete in the current repo state.

### Exam Blueprint
- Transition-test coverage was added in `backend/apps/exams/tests.py`.
- The test coverage includes:
  - valid forward transitions
  - malformed status rejection
  - role-based permission denial
  - creator self-approval denial
  - `published -> draft` conflict handling

### Question Bank
- `QuestionBank.tsx` now uses `backendQuestionBankService.ts` as the service boundary.
- The page keeps synthetic fallback data secondary to the service.
- Service contract, bootstrap, fallback, and mutation flows are covered by tests.

### Question Bank Review Workflow
- Question Bank saves now land in `PENDING_REVIEW`.
- Question approval is restricted to System Admin reviewers.
- A question creator cannot approve their own question.
- The Review dropdown is visible only to System Admin users, and only for questions created by a different user.
- The page now uses the backend's read-only `created_by_user_id` field for review visibility decisions.
- The workflow change is covered by backend and frontend tests.

## Thursday Progress
- Backend exam tests ran successfully in the backend container.
- Focused Question Bank frontend tests ran successfully in the frontend container.
- The remaining Thursday check is the manual browser smoke test for the Question Bank and Exam Sets routes.

## Verification Record
The implementation log is the source of truth for the work that was actually verified:
- [ju.cabigon.implement.md](implement/ju.cabigon.implement.md)

## Security Notes
- Do not include real student, exam, or account data in tests or examples.
- Treat backend validation as authoritative and do not rely on client-side state.
- Keep synthetic data only in documentation, tests, and examples.
