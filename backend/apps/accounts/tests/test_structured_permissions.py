from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import serializers

from apps.accounts.models import AccountPermission, AccountProfile, AccountRoleAssignment, RolePermission
from apps.accounts.permission_codes import (
    format_permission_code,
    normalize_permission_codes,
    parse_permission_code,
    replace_account_permission_differences,
    replace_role_permissions,
    resolve_account_permission_codes,
)
from apps.accounts.roles import PortalRole


class StructuredPermissionModelTests(TestCase):
    def test_role_permission_is_unique_by_role_module_and_action(self) -> None:
        RolePermission.objects.create(role=PortalRole.SYSTEM_ADMIN.value, module_id="999", action="READ")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RolePermission.objects.create(role=PortalRole.SYSTEM_ADMIN.value, module_id="999", action="READ")

    def test_account_permission_is_unique_by_account_module_and_action(self) -> None:
        user = get_user_model().objects.create_user(username="admin", email="admin@example.test")
        profile = AccountProfile.objects.create(user=user, role=PortalRole.SYSTEM_ADMIN.value)

        AccountPermission.objects.create(account_profile=profile, module_id="31", action="READ", effect="ALLOW")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AccountPermission.objects.create(account_profile=profile, module_id="31", action="READ", effect="DENY")

    def test_account_role_assignment_is_one_per_profile(self) -> None:
        user = get_user_model().objects.create_user(username="admin", email="admin@example.test")
        profile = AccountProfile.objects.create(user=user, role=PortalRole.SYSTEM_ADMIN.value)

        AccountRoleAssignment.objects.create(
            account_profile=profile,
            role=PortalRole.SYSTEM_ADMIN.value,
            permission_mode=AccountRoleAssignment.PermissionMode.INHERIT,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                AccountRoleAssignment.objects.create(
                    account_profile=profile,
                    role=PortalRole.SYSTEM_ADMIN.value,
                    permission_mode=AccountRoleAssignment.PermissionMode.CUSTOM,
                )


class PermissionCodeHelperTests(TestCase):
    def test_parse_and_format_permission_code(self) -> None:
        self.assertEqual(parse_permission_code(" mod_31_read "), ("31", "READ"))
        self.assertEqual(format_permission_code("31", "READ"), "MOD_31_READ")

    def test_normalize_permission_codes_rejects_invalid_codes(self) -> None:
        with self.assertRaises(serializers.ValidationError):
            normalize_permission_codes(["MOD_31_REED"])

        with self.assertRaises(serializers.ValidationError):
            normalize_permission_codes(["USER_ACCOUNTS"])

    def test_resolve_account_permissions_from_role_and_account_differences(self) -> None:
        user = get_user_model().objects.create_user(username="admin", email="admin@example.test")
        profile = AccountProfile.objects.create(user=user, role=PortalRole.SYSTEM_ADMIN.value)
        desired = ["MOD_31_READ", "MOD_99_READ"]

        replace_account_permission_differences(profile, desired)

        self.assertEqual(resolve_account_permission_codes(profile), desired)
        self.assertTrue(
            AccountPermission.objects.filter(account_profile=profile, module_id="99", action="READ", effect="ALLOW").exists()
        )
        self.assertTrue(
            AccountPermission.objects.filter(account_profile=profile, module_id="31", action="EDIT", effect="DENY").exists()
        )


class RolePermissionUpdateTests(TestCase):
    def test_baseline_only_preserves_custom_user_effective_permissions(self) -> None:
        user = get_user_model().objects.create_user(username="admin", email="admin@example.test")
        profile = AccountProfile.objects.create(user=user, role=PortalRole.SYSTEM_ADMIN.value)
        replace_account_permission_differences(profile, ["MOD_31_READ"])

        replace_role_permissions(PortalRole.SYSTEM_ADMIN.value, ["MOD_31_READ", "MOD_31_EDIT"], scope="baseline_only")

        self.assertEqual(resolve_account_permission_codes(profile), ["MOD_31_READ"])
        self.assertTrue(
            AccountPermission.objects.filter(
                account_profile=profile,
                module_id="31",
                action="EDIT",
                effect="DENY",
            ).exists()
        )

    def test_selected_users_updates_only_selected_accounts(self) -> None:
        first = get_user_model().objects.create_user(username="first", email="first@example.test")
        second = get_user_model().objects.create_user(username="second", email="second@example.test")
        first_profile = AccountProfile.objects.create(user=first, role=PortalRole.SYSTEM_ADMIN.value)
        second_profile = AccountProfile.objects.create(user=second, role=PortalRole.SYSTEM_ADMIN.value)
        replace_role_permissions(
            PortalRole.SYSTEM_ADMIN.value,
            ["MOD_31_READ", "MOD_99_READ"],
            scope="selected_users",
            account_profile_ids=[first_profile.id],
        )

        self.assertIn("MOD_99_READ", resolve_account_permission_codes(first_profile))
        self.assertNotIn("MOD_99_READ", resolve_account_permission_codes(second_profile))
        self.assertFalse(
            RolePermission.objects.filter(
                role=PortalRole.SYSTEM_ADMIN.value,
                module_id="99",
                action="READ",
            ).exists()
        )
