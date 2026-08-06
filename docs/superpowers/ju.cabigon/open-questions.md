# Jude Cabigon Open Questions

Date: 2026-08-05

## Workflow Questions
- Should blueprint transitions only allow a strict forward path, or are some backwards transitions intentionally allowed?
- Is `published -> draft` supposed to be blocked, or is it just a sample invalid case for tests?
- Should transition tests cover only the blueprint workflow first, or should exam set and question workflows be aligned in the same pass?

## Testing Questions
- Do we want tests that assert the current permissive service behavior, or tests that drive stricter transition validation?
- Should invalid transitions return `400`, `409`, or another agreed error shape?
- Should the tests also verify workflow history entries for rejected transitions, or only the response and persisted status?

## Frontend Questions
- Should `QuestionBank.tsx` stay mock-driven for now, or should it be wired to the backend service in a later pass?
- Is `ExamBlueprints.tsx` the reference pattern for frontend service wiring in this area?

## Recommendation
- Lock the blueprint transition rules first.
- Then write tests around those rules.
- Only after that, decide whether the backend service needs stricter enforcement or the frontend needs a follow-up adjustment.
