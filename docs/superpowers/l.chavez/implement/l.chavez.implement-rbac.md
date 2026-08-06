# L.Chavez Implementation Log

Owner: L.Chavez
Current story: User Account Creation (RBAC)
Branch: `l.chavez/rbac`

## 2026-08-06 - RBAC Documentation Setup

Spec and plan references:

- `docs/superpowers/l.chavez/specs/2026-08-06-rbac-role-assignment-verification.md`
- `docs/superpowers/l.chavez/plans/2026-08-06-rbac-role-assignment-verification.md`

Work completed:

- Created the RBAC design/spec file.
- Created the RBAC implementation plan file.
- Created this implementation log.

Application files changed:

- None.

Verification:

- Documentation setup only.
- Spec and plan approved by L.Chavez on 2026-08-06.
- Application checks are pending implementation.

## 2026-08-06 - RBAC Role Assignment Verification

Approved plan:

- `docs/superpowers/l.chavez/plans/2026-08-06-rbac-role-assignment-verification.md`

Work completed:

- Added focused service tests proving staff/admin account creation creates a matching `AccountRoleAssignment`.
- Added focused service tests proving staff/admin role updates synchronize `AccountProfile.role` and `AccountRoleAssignment.role`.
- Added focused service tests proving direct admin account-management service calls reject `STUDENT` role creation and role changes.
- Added a service-level role guard so User & Role Settings service functions cannot create or assign Student accounts.

Commands run:

- `python manage.py test apps.accounts.tests.test_role_account_provisioning --settings=config.settings.test`
- `python manage.py check --settings=config.settings.local`
- `python manage.py test apps.accounts.tests.test_activation_endpoints --settings=config.settings.test`
- `python manage.py test apps.accounts --settings=config.settings.test`

Observed results:

- First focused role provisioning test run failed as expected: 8 tests ran, 2 failures. The failing tests showed `AccountManagementConflict` was not raised for direct `STUDENT` role creation or direct update to `STUDENT`.
- Focused role provisioning tests passed after the service guard: 8 tests ran, OK.
- Backend system check passed: `System check identified no issues (0 silenced).`
- Focused activation endpoint tests passed: 8 tests ran, OK.
- Full accounts test suite passed: 113 tests ran, OK.

Files changed:

- `backend/apps/accounts/services.py`
- `backend/apps/accounts/tests/test_role_account_provisioning.py`
- `docs/superpowers/l.chavez/plans/2026-08-06-rbac-role-assignment-verification.md`
- `docs/superpowers/l.chavez/implement/l.chavez.implement-rbac.md`

Follow-up manual-test fix:

- Manual website testing of `PUT /api/v1/auth/admin/users/{userId}/` against PostgreSQL exposed `django.db.utils.NotSupportedError: FOR UPDATE cannot be applied to the nullable side of an outer join`.
- Root cause: `update_admin_user_account` and `deactivate_admin_user_account` used `select_for_update().select_related("account_profile")`. Django represents the reverse one-to-one `User.account_profile` join as nullable, and PostgreSQL rejects `FOR UPDATE` on that outer join.
- Fix: lock the `User` row and `AccountProfile` row with separate `select_for_update()` queries inside the same transaction.
- Added an endpoint regression test for the manual User & Role Settings update path.

Follow-up commands run:

- `python manage.py test apps.accounts.tests.test_role_account_provisioning.AdminUserAccountEndpointTests --settings=config.settings.test`
- `python manage.py test apps.accounts.tests.test_role_account_provisioning --settings=config.settings.test`
- `python manage.py test apps.accounts.tests.test_activation_endpoints --settings=config.settings.test`
- `python manage.py check --settings=config.settings.local`
- `python manage.py test apps.accounts --settings=config.settings.test`

Follow-up observed results:

- Endpoint regression test passed under SQLite test settings; the PostgreSQL-only failure was confirmed from the manual website stack trace.
- Focused role provisioning tests passed: 9 tests ran, OK.
- Focused activation endpoint tests passed: 8 tests ran, OK.
- Backend system check passed: `System check identified no issues (0 silenced).`
- Full accounts test suite passed: 114 tests ran, OK.
