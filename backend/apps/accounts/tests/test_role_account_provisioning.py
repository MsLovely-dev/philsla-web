from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from apps.accounts.default_permissions import default_module_access_for_role
from apps.accounts.models import AccountPermission, AccountProfile, AccountRoleAssignment, RolePermission
from apps.accounts.permission_codes import resolve_account_permission_codes
from apps.accounts.roles import PortalRole
from apps.accounts.services import create_admin_user_account, update_admin_user_account


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
            module_access=["MOD_99_READ"],
            is_active=True,
        )

        self.assertEqual(
            resolve_account_permission_codes(profile),
            ["MOD_99_READ"],
        )
        self.assertTrue(
            AccountPermission.objects.filter(
                account_profile=profile,
                module_id="99",
                action="READ",
                effect=AccountPermission.Effect.ALLOW,
            ).exists()
        )
