from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.default_permissions import default_module_access_for_role
from apps.accounts.models import AccountPermission, AccountProfile, AccountRoleAssignment, RolePermission
from apps.accounts.permission_codes import resolve_account_permission_codes
from apps.accounts.roles import PortalRole
from apps.accounts.services import AccountManagementConflict, create_admin_user_account, update_admin_user_account


class RoleAccountProvisioningCommandTests(TestCase):
    def test_command_provisions_all_non_student_roles_with_unusable_passwords(self) -> None:
        output = StringIO()

        call_command("provision_role_accounts", stdout=output)

        provisioned_roles = set(AccountProfile.objects.values_list("role", flat=True))
        expected_roles = {role.value for role in PortalRole if role != PortalRole.STUDENT}
        self.assertEqual(provisioned_roles, expected_roles)
        self.assertNotIn(PortalRole.STUDENT.value, provisioned_roles)
        self.assertEqual(get_user_model().objects.count(), len(expected_roles))
        self.assertFalse(get_user_model().objects.get(username="proctor").has_usable_password())
        self.assertEqual(get_user_model().objects.get(username="proctor").email, "proctor@yopmail.com")
        self.assertCountEqual(
            resolve_account_permission_codes(AccountProfile.objects.get(role=PortalRole.ADMISSIONS_REVIEWER.value)),
            default_module_access_for_role(PortalRole.ADMISSIONS_REVIEWER.value),
        )
        self.assertIn(
            "MOD_30_DELETE",
            resolve_account_permission_codes(AccountProfile.objects.get(role=PortalRole.PROCTOR_ADMIN.value)),
        )
        self.assertEqual(RolePermission.objects.filter(role=PortalRole.SYSTEM_ADMIN.value).count(), 48 * 6)
        self.assertEqual(AccountRoleAssignment.objects.count(), len(expected_roles))
        self.assertIn("Provisioned non-student role accounts", output.getvalue())

    def test_command_can_assign_local_password_when_explicitly_requested(self) -> None:
        call_command("provision_role_accounts", password="Password1!", stdout=StringIO())

        user = get_user_model().objects.get(username="system_admin")

        self.assertTrue(user.check_password("Password1!"))


class AdminUserRoleDefaultPermissionTests(TestCase):
    def test_default_role_permissions_do_not_grant_retired_modules(self) -> None:
        retired_module_ids = {"40", "41", "42", "43", "44", "45"}

        for role in PortalRole:
            if role in {PortalRole.STUDENT, PortalRole.SYSTEM_ADMIN}:
                continue
            with self.subTest(role=role.value):
                module_ids = {
                    permission.split("_")[1]
                    for permission in default_module_access_for_role(role.value)
                }
                self.assertTrue(retired_module_ids.isdisjoint(module_ids))

    def test_create_admin_user_creates_matching_role_assignment(self) -> None:
        _, profile = create_admin_user_account(
            full_name="Admissions Reviewer",
            email="role.assignment@example.test",
            role=PortalRole.ADMISSIONS_REVIEWER.value,
            module_access=[],
        )

        assignment = AccountRoleAssignment.objects.get(account_profile=profile)
        self.assertEqual(assignment.role, PortalRole.ADMISSIONS_REVIEWER.value)
        self.assertEqual(assignment.permission_mode, AccountRoleAssignment.PermissionMode.INHERIT)

    def test_create_admin_user_uses_role_defaults_when_permissions_are_empty(self) -> None:
        _, profile = create_admin_user_account(
            full_name="Admissions Reviewer",
            email="admissions@example.test",
            role=PortalRole.ADMISSIONS_REVIEWER.value,
            module_access=[],
        )

        self.assertCountEqual(
            resolve_account_permission_codes(profile),
            default_module_access_for_role(PortalRole.ADMISSIONS_REVIEWER.value),
        )
        self.assertFalse(AccountPermission.objects.filter(account_profile=profile).exists())

    def test_create_admin_user_rejects_student_role(self) -> None:
        with self.assertRaises(AccountManagementConflict):
            create_admin_user_account(
                full_name="Student User",
                email="student.user@example.test",
                role=PortalRole.STUDENT.value,
                module_access=[],
            )

        self.assertFalse(get_user_model().objects.filter(email="student.user@example.test").exists())

    def test_update_admin_user_preserves_supplied_permissions_as_account_differences(self) -> None:
        user, _ = create_admin_user_account(
            full_name="Proctor",
            email="proctor@example.test",
            role=PortalRole.PROCTOR.value,
            module_access=[],
        )

        _, profile = update_admin_user_account(
            user_id=str(user.id),
            full_name="Proctor Admin",
            email="proctor.admin@example.test",
            role=PortalRole.PROCTOR_ADMIN.value,
            module_access=["MOD_56_READ"],
            is_active=True,
        )

        self.assertEqual(
            resolve_account_permission_codes(profile),
            ["MOD_56_READ"],
        )
        self.assertTrue(
            AccountPermission.objects.filter(
                account_profile=profile,
                module_id="56",
                action="READ",
                effect=AccountPermission.Effect.ALLOW,
            ).exists()
        )

    def test_update_admin_user_synchronizes_role_assignment(self) -> None:
        user, _ = create_admin_user_account(
            full_name="Proctor",
            email="sync.proctor@example.test",
            role=PortalRole.PROCTOR.value,
            module_access=[],
        )

        _, profile = update_admin_user_account(
            user_id=str(user.id),
            full_name="Proctor Admin",
            email="sync.proctor.admin@example.test",
            role=PortalRole.PROCTOR_ADMIN.value,
            module_access=[],
            is_active=True,
        )

        assignment = AccountRoleAssignment.objects.get(account_profile=profile)
        self.assertEqual(profile.role, PortalRole.PROCTOR_ADMIN.value)
        self.assertEqual(assignment.role, PortalRole.PROCTOR_ADMIN.value)

    def test_update_admin_user_rejects_student_target_role(self) -> None:
        user, profile = create_admin_user_account(
            full_name="Proctor",
            email="target.student@example.test",
            role=PortalRole.PROCTOR.value,
            module_access=[],
        )

        with self.assertRaises(AccountManagementConflict):
            update_admin_user_account(
                user_id=str(user.id),
                full_name="Student Target",
                email="target.student.updated@example.test",
                role=PortalRole.STUDENT.value,
                module_access=[],
                is_active=True,
            )

        profile.refresh_from_db()
        self.assertEqual(profile.role, PortalRole.PROCTOR.value)


@override_settings(ROOT_URLCONF="config.urls")
class AdminUserAccountEndpointTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.client.force_authenticate(
            user=type(
                "AuthenticatedUser",
                (),
                {
                    "id": "system-admin-user",
                    "is_authenticated": True,
                    "is_active": True,
                    "role": PortalRole.SYSTEM_ADMIN.value,
                },
            )()
        )

    def test_update_admin_user_account_endpoint_updates_role_without_outer_join_lock_error(self) -> None:
        user, _ = create_admin_user_account(
            full_name="Proctor",
            email="endpoint.proctor@example.test",
            role=PortalRole.PROCTOR.value,
            module_access=[],
        )

        response = self.client.put(
            f"/api/v1/auth/admin/users/{user.id}/",
            data={
                "fullName": "Proctor Admin",
                "email": "endpoint.proctor.admin@example.test",
                "role": PortalRole.PROCTOR_ADMIN.value,
                "moduleAccess": [],
                "isActive": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        profile = AccountProfile.objects.get(user=user)
        self.assertEqual(user.email, "endpoint.proctor.admin@example.test")
        self.assertEqual(profile.role, PortalRole.PROCTOR_ADMIN.value)
