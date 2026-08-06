# Review Student Application

Date: 2026-08-07
Owner: L.Chavez
Story: Review Student Application
Branch: `l.chavez/review-application`
Status: Approved for implementation planning

## Intent

Finish the Friday AM Review Student Application task from `build_plan.md` by verifying the approve/reject reviewer decision flow for submitted student registrations.

This story is downstream of Student Registration and RBAC. It should confirm that admissions decisions persist correctly and that approval activates the pending Student account through the backend-controlled account lifecycle.

## Scope

In scope:

- Backend reviewer decision endpoint: `POST /api/v1/applications/{applicationId}/review-decision/`.
- Supported Friday-scope decisions: `APPROVE` and `REJECT`.
- Status transitions for eligible applications.
- Student account activation side effect on approval.
- Pending credential cleanup on approval or rejection.
- Role boundary for `ADMISSIONS_REVIEWER` and `SYSTEM_ADMIN`.
- Focused backend tests and implementation log evidence.

Out of scope:

- Frontend visual redesign of reviewer pages.
- New admissions workflow states.
- `REQUEST_CORRECTION` / `FOR_CORRECTION` implementation or verification.
- Reassignment to testing centers.
- Notification/email delivery.
- Durable audit expansion beyond existing event boundaries.
- Data migrations or model changes unless a separate reviewed plan approves them.

## Current Behavior To Verify

The current API contract says:

- `APPROVE` updates status to `APPROVED`.
- `REJECT` updates status to `REJECTED`.
- Reviewer approval creates and activates the Student account, links it to the application, and clears the pending password hash.
- Rejection clears any remaining pending password hash without creating an account.
- The broader contract allows decisions only from eligible review states, but this Friday scope verifies `SUBMITTED` / `RESUBMITTED` approval and rejection only; `FOR_CORRECTION` remains out of scope.

## Desired Behavior

- Authorized reviewers can approve or reject eligible applications.
- Unauthorized roles and unauthenticated callers cannot decide applications.
- Approval is atomic: the application is approved and the Student account side effect is completed together, or the request fails without partial account activation.
- Rejection does not create a Student account.
- Decision remarks are persisted only in the existing review-step fields and do not expose passwords, tokens, or sensitive media data.

## Acceptance Criteria

- Focused backend tests cover successful `APPROVE` and `REJECT`.
- Tests cover approval account activation and pending password cleanup.
- Tests cover rejection password cleanup without account creation.
- Tests cover invalid state conflicts.
- Tests cover permission denial for disallowed roles.
- Relevant backend checks pass, or unrelated failures are documented exactly.

## Risks And Tradeoffs

Approval has account-lifecycle side effects, so this task should stay backend-first and test-first. Broad frontend changes are intentionally excluded because the Friday goal is confidence in the demo-critical decision path, not a reviewer UI rebuild.

Session invalidation, notifications, and richer audit persistence remain separate account/auth concerns and should not be pulled into this Friday task without explicit scope expansion.
