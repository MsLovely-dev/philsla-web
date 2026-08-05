# Blueprint Transition Tests Plan

Date: 2026-08-05

## Status
Draft for review

## Goal
Add focused tests in `backend/apps/exams/tests.py` that define and protect the intended Exam Blueprint workflow.

The plan follows the locked rules you confirmed:
- blueprint transitions use a controlled forward workflow
- `published -> draft` is blocked
- malformed status values return `400 Bad Request`
- valid-but-conflicting transitions return `409 Conflict`
- missing permission returns `403 Forbidden`
- creator self-approval is not allowed

## Scope
- In scope:
  - Exam Blueprint transition tests only
  - status validation
  - permission checks
  - ownership/self-approval checks
  - workflow history checks for successful transitions
  - conflict response shape for blocked transitions
- Out of scope:
  - Question Bank workflow tests
  - Exam Set workflow tests
  - frontend changes
  - new endpoints or schema work beyond what the tests require

## Current-State Basis
- `backend/apps/exams/views.py` already exposes `ExamBlueprintTransitionView`.
- `backend/apps/exams/serializers.py` already normalizes incoming transition statuses.
- `backend/apps/exams/services.py` currently persists requested transition statuses, so tests need to define the intended business boundary clearly.
- `backend/apps/exams/tests.py` already contains broad API tests, which can be tightened or extended with explicit transition coverage.

## Proposed Test Phases

- [ ] Phase 1: Inspect the existing blueprint fixtures in `backend/apps/exams/tests.py` and identify the smallest reusable setup for transition cases.
- [ ] Phase 2: Add tests for malformed or unsupported status values that should return `400 Bad Request`.
- [ ] Phase 3: Add tests for permission denial, including a user without the required role and a creator attempting self-approval, both of which should be rejected with `403 Forbidden`.
- [ ] Phase 4: Add tests for valid forward transitions in the approved workflow.
- [ ] Phase 5: Add a blocked-transition test for `published -> draft` that returns `409 Conflict` and includes the agreed conflict payload shape.
- [ ] Phase 6: Assert that successful transitions persist the new status and write the expected workflow history entry.
- [ ] Phase 7: Confirm blocked transitions do not mutate the persisted blueprint state.
- [ ] Phase 8: Review the final test names and fixtures for readability, then stop for approval before implementation work starts.

## Test Cases

### Valid transitions
Cover the forward path that is already agreed in the workflow:
- `draft -> submitted`
- `submitted -> academic_review`
- `academic_review -> approved`
- `approved -> published`

If the reviewed workflow also allows a revision loop, add the accepted revision path as a separate case, but only after confirming the exact target status for that return step.

### Invalid transitions
Add at least these negative cases:
- `published -> draft` should return `409 Conflict`
- unsupported or malformed status strings should return `400 Bad Request`
- user lacks required role should return `403 Forbidden`
- creator attempts self-approval should return `403 Forbidden`

### Response assertions
For `409 Conflict`, assert a stable body shape similar to:
```json
{
  "code": "invalid_status_transition",
  "detail": "A published blueprint cannot be returned to draft.",
  "current_status": "published",
  "requested_status": "draft"
}
```

If the implementation uses a slightly different detail message, keep the semantic contract the same:
- conflict code identifies the workflow violation
- current status is included
- requested status is included
- the blueprint stays unchanged

## Fixture Strategy
- Use synthetic data only.
- Reuse one blueprint fixture and one authenticated actor fixture where possible.
- Add a second actor fixture only when needed to prove permission or ownership restrictions.
- Keep the setup minimal so the transition rules are easy to read in the test file.

## Review Gate
- Do not implement code until this plan is reviewed.
- If the review reveals a different allowed revision path, update the plan first and only then change tests.
- If the service layer needs stricter enforcement than the current tests can express, treat that as a follow-up implementation step after the reviewed plan is approved.

## Recommendation
Implement these tests in the order above, starting with failure cases. That gives immediate proof of the workflow contract and keeps the business rule boundaries visible before any permissive behavior can slip through.
