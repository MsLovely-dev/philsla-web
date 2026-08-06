# RBAC Role Assignment Verification

Date: 2026-08-06
Owner: L.Chavez
Story: User Account Creation (RBAC)
Status: Approved for implementation planning

## Intent

Verify that User Account Creation and role assignment behavior is backend-owned, consistent with the current RBAC data model, and safe for the Thursday build-plan scope.

This follows the Student Registration task. The goal is not to redesign RBAC or add custom-role persistence. The goal is to confirm and tighten the existing account creation, role assignment, and student-account exclusion behavior already implemented in `backend/apps/accounts/`.

## Scope

In scope:

- Staff/admin account creation through the backend account-management service.
- Staff/admin account update when the assigned role changes.
- `AccountProfile` and `AccountRoleAssignment` consistency.
- Custom account permission differences when module access is supplied.
- Student account exclusion from User & Role Settings.
- Focused backend tests for role assignment behavior.
- Implementation evidence in `docs/superpowers/l.chavez/implement/l.chavez.implement.md`.

Out of scope:

- Frontend redesign of User & Role Settings.
- Dynamic custom-role persistence beyond the existing role baseline APIs.
- Student registration account activation changes unless tests reveal a direct role-assignment regression.
- Session invalidation after role changes.
- Notification, email, or audit persistence side effects.
- Database model changes or migrations unless a separate reviewed plan approves them.

## Current Behavior To Verify

The current backend has these relevant boundaries:

- `create_admin_user_account` creates a Django user, an `AccountProfile`, and calls `ensure_account_assignment`.
- `update_admin_user_account` updates the profile role, syncs the role assignment, and replaces account permission differences.
- User & Role Settings rejects Student accounts through service-level checks.
- `activate_student_registration_account` creates Student accounts from approved registrations and assigns the `STUDENT` role automatically.

## Desired Behavior

- New staff/admin accounts receive exactly one `AccountProfile` and one matching `AccountRoleAssignment`.
- Updating a staff/admin role keeps `AccountProfile.role` and `AccountRoleAssignment.role` synchronized.
- Module access overrides are represented through account permission differences without silently mutating role baselines.
- Student accounts cannot be created, updated, or deactivated from User & Role Settings.
- Student registration activation remains the only path that creates Student accounts from registration approval.

## Acceptance Criteria

- Focused tests prove staff/admin account creation creates the expected role assignment.
- Focused tests prove role updates keep account profile and assignment roles aligned.
- Focused tests prove Student accounts are rejected by admin account-management operations.
- Existing activation tests continue to prove approved registration creates a Student profile.
- Relevant backend accounts tests pass, or any unrelated failure is clearly documented.

## Risks And Tradeoffs

This is authorization-sensitive code. The safest approach is to add focused tests first, then make the smallest service change only if a real gap appears.

Session invalidation after role changes is documented as pending in the API contract. It should remain out of this task unless the team explicitly expands scope, because it affects token/session lifecycle beyond basic role assignment.
