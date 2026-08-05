# Jude Cabigon Task Log

Date: 2026-08-05

## Source References
- [Root AGENTS.md](../../AGENTS.md)
- [Docs AGENTS.md](../AGENTS.md)
- [BUILD_PLAN.md](../../BUILD_PLAN.md)

## Wednesday Problem
The first Wednesday build-plan task for Jude Cabigon is:

> On branch `ju.cabigon/exam-blueprint`, get a plan reviewed for transition tests in `backend/apps/exams/tests.py`, covering invalid transitions such as `published -> draft`.

## Planned Solution
- Review the current exam status transition rules before changing tests.
- Add focused backend tests that prove invalid exam blueprint transitions are rejected.
- Include at least the `published -> draft` case from the build plan, plus any other invalid transitions already implied by the existing workflow.
- Keep the test data synthetic and minimal.
- Make the plan explicit about expected success and failure states before implementation begins.

## Security Notes
- Do not include real student, exam, or account data in tests or examples.
- Treat backend validation as authoritative and do not rely on client-side state.
- Keep the plan limited to testing and review. No implementation code should be written until the plan is approved.

## Review Gate
I must review and approve the implementation plan before any backend code changes are made.
