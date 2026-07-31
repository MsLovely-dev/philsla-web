from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile, RolePermission
from apps.accounts.permission_codes import replace_account_permission_differences, resolve_account_permission_codes
from apps.accounts.roles import PortalRole


def authenticated_role(role: str) -> SimpleNamespace:
    return SimpleNamespace(id=f"{role.lower()}-user", is_authenticated=True, is_active=True, role=role)


def create_profile(username: str, role: str) -> tuple[object, AccountProfile]:
    user = get_user_model().objects.create_user(username=username, email=f"{username}@example.test")
    return user, AccountProfile.objects.create(user=user, role=role)


@override_settings(ROOT_URLCONF="config.urls")
class AdminRoleEndpointTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.client.force_authenticate(user=authenticated_role(PortalRole.SYSTEM_ADMIN.value))

    def test_list_roles_returns_backend_role_baselines_and_assigned_user_counts(self) -> None:
        create_profile("first-admin", PortalRole.SYSTEM_ADMIN.value)
        create_profile("second-admin", PortalRole.SYSTEM_ADMIN.value)

        response = self.client.get("/api/v1/auth/admin/roles/")

        self.assertEqual(response.status_code, 200)
        system_admin = next(role for role in response.json()["roles"] if role["id"] == PortalRole.SYSTEM_ADMIN.value)
        self.assertEqual(system_admin["name"], PortalRole.SYSTEM_ADMIN.value)
        self.assertEqual(system_admin["assignedUserCount"], 2)
        self.assertIn("MOD_31_READ", system_admin["moduleAccess"])

    def test_list_roles_requires_system_admin(self) -> None:
        client = APIClient()
        client.force_authenticate(user=authenticated_role(PortalRole.ADMISSIONS_REVIEWER.value))

        response = client.get("/api/v1/auth/admin/roles/")

        self.assertEqual(response.status_code, 403)

    def test_baseline_update_preserves_existing_user_custom_permissions(self) -> None:
        _, profile = create_profile("custom-admin", PortalRole.SYSTEM_ADMIN.value)
        replace_account_permission_differences(profile, ["MOD_31_READ"])

        response = self.client.put(
            "/api/v1/auth/admin/roles/SYSTEM_ADMIN/permissions/",
            data={"moduleAccess": ["MOD_31_READ", "MOD_31_EDIT"], "scope": "baseline_only"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()["moduleAccess"]), {"MOD_31_READ", "MOD_31_EDIT"})
        self.assertEqual(resolve_account_permission_codes(profile), ["MOD_31_READ"])

    def test_selected_user_update_does_not_mutate_role_baseline(self) -> None:
        selected_user, selected_profile = create_profile("selected-admin", PortalRole.SYSTEM_ADMIN.value)
        _, unselected_profile = create_profile("unselected-admin", PortalRole.SYSTEM_ADMIN.value)

        response = self.client.put(
            "/api/v1/auth/admin/roles/SYSTEM_ADMIN/permissions/",
            data={
                "moduleAccess": ["MOD_31_READ", "MOD_99_READ"],
                "scope": "selected_users",
                "selectedUserIds": [str(selected_user.id)],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("MOD_99_READ", response.json()["moduleAccess"])
        self.assertIn("MOD_99_READ", resolve_account_permission_codes(selected_profile))
        self.assertNotIn("MOD_99_READ", resolve_account_permission_codes(unselected_profile))
        self.assertFalse(
            RolePermission.objects.filter(role=PortalRole.SYSTEM_ADMIN.value, module_id="99", action="READ").exists()
        )

    def test_selected_user_update_rejects_users_outside_target_role(self) -> None:
        other_user, _ = create_profile("reviewer", PortalRole.ADMISSIONS_REVIEWER.value)

        response = self.client.put(
            "/api/v1/auth/admin/roles/SYSTEM_ADMIN/permissions/",
            data={
                "moduleAccess": ["MOD_31_READ"],
                "scope": "selected_users",
                "selectedUserIds": [str(other_user.id)],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("selectedUserIds", response.json()["error"]["fields"])

    def test_selected_user_update_requires_selected_user_ids(self) -> None:
        response = self.client.put(
            "/api/v1/auth/admin/roles/SYSTEM_ADMIN/permissions/",
            data={"moduleAccess": ["MOD_31_READ"], "scope": "selected_users", "selectedUserIds": []},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("selectedUserIds", response.json()["error"]["fields"])
