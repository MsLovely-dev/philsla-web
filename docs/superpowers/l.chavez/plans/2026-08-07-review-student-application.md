# Review Student Application Plan

> **For agentic workers:** Do not execute application code changes until this plan is reviewed and approved. Steps use checkbox syntax for tracking.

Date: 2026-08-07
Owner: L.Chavez
Story: Review Student Application
Branch: `l.chavez/review-application`
Status: Approved for execution

## Goal

Verify and, if needed, tighten the backend Review Student Application decision flow for `APPROVE` and `REJECT`.

## Files In Scope

- `backend/apps/applications/services.py`
- `backend/apps/applications/views.py`, only if endpoint behavior has a verified defect.
- `backend/apps/applications/serializers.py`, only if request validation has a verified defect.
- `backend/apps/applications/tests/test_application_endpoints.py`
- `docs/api/API-ENDPOINTS.md`, only if implemented behavior or documented contract is wrong.
- `docs/superpowers/l.chavez/implement/l.chavez.implement-review-application.md`

## Constraints

- Do not add dependencies.
- Do not add migrations without a separate reviewed migration plan.
- Do not redesign reviewer frontend pages.
- Do not change Student Registration submission behavior.
- Do not change RBAC role definitions.
- Do not implement or verify `REQUEST_CORRECTION` / `FOR_CORRECTION` in this Friday task.
- Do not implement notifications, email delivery, or expanded audit persistence.
- Keep backend authoritative for decisions, status transitions, account activation, and credential cleanup.

## Task 1: Baseline Review

- [x] Inspect `decide_application`, `ApplicationReviewerDecisionView`, and `ReviewerDecisionSerializer`.
- [x] Inspect existing reviewer-decision tests in `backend/apps/applications/tests/test_application_endpoints.py`.
- [x] Confirm which acceptance criteria are already covered before changing code.

## Task 2: Test Decision Behavior

- [x] Add or update tests proving `APPROVE` persists `APPROVED`, activates/links the Student account, and clears pending credentials.
- [x] Add or update tests proving `REJECT` persists `REJECTED`, clears pending credentials, and does not create a Student account.
- [x] Add or update tests proving invalid current states return conflict.
- [x] Add or update tests proving unauthorized roles cannot decide applications.

## Task 3: Implement Only If Tests Expose A Gap

- [x] If tests fail because of a real backend defect, make the smallest service/serializer/view change needed.
- [x] Keep decision rules in service code, not presentation code.
- [x] Do not weaken assertions or loosen authorization to make tests pass.

## Task 4: Verification

From `backend/`, run:

- [x] `python manage.py check --settings=config.settings.local`
- [x] `python manage.py test apps.applications.tests.test_application_endpoints --settings=config.settings.test`

Run broader application tests if service behavior changes beyond the focused decision path:

- [ ] `python manage.py test apps.applications --settings=config.settings.test`

## Task 5: Implementation Log

- [x] Record exact commands and observed results in `docs/superpowers/l.chavez/implement/l.chavez.implement-review-application.md`.
- [x] Inspect `git diff` and confirm the diff stays within approved scope.

## Approval Gate

- [x] L.Chavez reviews and approves this plan before application code execution.
- [ ] Any scope expansion requires a plan update before code changes.
