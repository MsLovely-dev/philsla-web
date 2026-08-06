# RBAC Role Assignment Verification Plan

> **For agentic workers:** Do not execute application code changes until this plan is reviewed and approved. Steps use checkbox syntax for tracking.

Date: 2026-08-06
Owner: L.Chavez
Story: User Account Creation (RBAC)
Status: Approved for execution

## Goal

Verify and, if needed, tighten backend RBAC role-assignment logic for staff/admin account creation and updates.

## Files In Scope

- `backend/apps/accounts/services.py`
- `backend/apps/accounts/permission_codes.py`, only if assignment synchronization has a verified defect.
- `backend/apps/accounts/tests/test_role_account_provisioning.py`
- `backend/apps/accounts/tests/test_activation_endpoints.py`, only for existing Student activation coverage.
- `docs/superpowers/l.chavez/implement/l.chavez.implement.md`

## Constraints

- Do not add dependencies.
- Do not add migrations without a separate reviewed migration plan.
- Do not redesign frontend User & Role Settings.
- Do not change registration approval, activation, notification, or audit side effects.
- Do not allow Student accounts to be managed from User & Role Settings.
- Keep backend as the source of truth for roles and permissions.

## Task 1: Baseline Review

- [x] Inspect `create_admin_user_account`, `update_admin_user_account`, `deactivate_admin_user_account`, and `activate_student_registration_account`.
- [x] Inspect existing tests in `backend/apps/accounts/tests/test_role_account_provisioning.py`.
- [x] Confirm whether role assignment defects exist before changing service code.

## Task 2: Test Role Assignment Behavior

- [x] Add or update tests proving staff/admin account creation creates a matching `AccountRoleAssignment`.
- [x] Add or update tests proving staff/admin role updates synchronize `AccountProfile.role` and `AccountRoleAssignment.role`.
- [x] Add or update tests proving module access overrides do not mutate role baselines.
- [x] Add or update tests proving Student accounts are rejected from admin account-management operations.

## Task 3: Implement Only If Tests Expose A Gap

- [x] If tests fail because of a real service defect, make the smallest backend service change needed.
- [x] Keep service changes inside `backend/apps/accounts/services.py` or existing permission helper boundaries.
- [x] Do not weaken assertions to make tests pass.

## Task 4: Verification

From `backend/`, run:

- [x] `python manage.py check --settings=config.settings.local`
- [x] `python manage.py test apps.accounts.tests.test_role_account_provisioning --settings=config.settings.test`
- [x] `python manage.py test apps.accounts.tests.test_activation_endpoints --settings=config.settings.test`

Run broader accounts tests if service behavior changes beyond the focused role-assignment path:

- [x] `python manage.py test apps.accounts --settings=config.settings.test`

## Task 5: Implementation Log

- [x] Record exact commands and observed results in `docs/superpowers/l.chavez/implement/l.chavez.implement.md`.
- [x] Inspect `git diff` and confirm the diff stays within the approved scope.

## Approval Gate

- [x] L.Chavez reviews and approves this plan before application code execution.
- [ ] Any scope expansion requires a plan update before code changes.
