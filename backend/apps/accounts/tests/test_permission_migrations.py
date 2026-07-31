from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class StructuredPermissionMigrationTests(TransactionTestCase):
    migrate_from = [("accounts", "0005_structured_permissions")]
    migrate_to = [("accounts", "0006_remove_accountprofile_api_permissions")]

    def setUp(self) -> None:
        super().setUp()
        self.executor = MigrationExecutor(connection)
        self.executor.migrate(self.migrate_from)
        self.apps = self.executor.loader.project_state(self.migrate_from).apps

    def tearDown(self) -> None:
        self.executor.loader.build_graph()
        self.executor.migrate(self.executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_remove_json_permission_field_preserves_legacy_custom_permissions(self) -> None:
        User = self.apps.get_model("auth", "User")
        AccountProfile = self.apps.get_model("accounts", "AccountProfile")
        RolePermission = self.apps.get_model("accounts", "RolePermission")

        user = User.objects.create_user(username="legacy-admin", email="legacy-admin@example.test")
        profile = AccountProfile.objects.create(
            user=user,
            role="ADMISSIONS_REVIEWER",
            api_permissions=["MOD_1_READ", "MOD_56_READ"],
        )
        RolePermission.objects.get_or_create(role="ADMISSIONS_REVIEWER", module_id="1", action="READ")
        RolePermission.objects.get_or_create(role="ADMISSIONS_REVIEWER", module_id="12", action="READ")

        self.executor.loader.build_graph()
        self.executor.migrate(self.migrate_to)
        migrated_apps = self.executor.loader.project_state(self.migrate_to).apps
        AccountPermission = migrated_apps.get_model("accounts", "AccountPermission")

        self.assertTrue(
            AccountPermission.objects.filter(
                account_profile_id=profile.id,
                module_id="56",
                action="READ",
                effect="ALLOW",
            ).exists()
        )
        self.assertTrue(
            AccountPermission.objects.filter(
                account_profile_id=profile.id,
                module_id="12",
                action="READ",
                effect="DENY",
            ).exists()
        )

    def test_remove_json_permission_field_preserves_legacy_permissions_for_partially_structured_accounts(self) -> None:
        User = self.apps.get_model("auth", "User")
        AccountProfile = self.apps.get_model("accounts", "AccountProfile")
        RolePermission = self.apps.get_model("accounts", "RolePermission")
        AccountPermission = self.apps.get_model("accounts", "AccountPermission")

        user = User.objects.create_user(username="partial-admin", email="partial-admin@example.test")
        profile = AccountProfile.objects.create(
            user=user,
            role="ADMISSIONS_REVIEWER",
            api_permissions=["MOD_1_READ", "MOD_56_READ"],
        )
        RolePermission.objects.get_or_create(role="ADMISSIONS_REVIEWER", module_id="1", action="READ")
        RolePermission.objects.get_or_create(role="ADMISSIONS_REVIEWER", module_id="12", action="READ")
        AccountPermission.objects.create(account_profile=profile, module_id="1", action="READ", effect="ALLOW")

        self.executor.loader.build_graph()
        self.executor.migrate(self.migrate_to)
        migrated_apps = self.executor.loader.project_state(self.migrate_to).apps
        MigratedAccountPermission = migrated_apps.get_model("accounts", "AccountPermission")

        self.assertTrue(
            MigratedAccountPermission.objects.filter(
                account_profile_id=profile.id,
                module_id="56",
                action="READ",
                effect="ALLOW",
            ).exists()
        )
        self.assertTrue(
            MigratedAccountPermission.objects.filter(
                account_profile_id=profile.id,
                module_id="12",
                action="READ",
                effect="DENY",
            ).exists()
        )

    def test_remove_json_permission_field_deletes_invalid_structured_permissions(self) -> None:
        User = self.apps.get_model("auth", "User")
        AccountProfile = self.apps.get_model("accounts", "AccountProfile")
        RolePermission = self.apps.get_model("accounts", "RolePermission")
        AccountPermission = self.apps.get_model("accounts", "AccountPermission")

        user = User.objects.create_user(username="structured-admin", email="structured-admin@example.test")
        profile = AccountProfile.objects.create(user=user, role="SYSTEM_ADMIN")
        RolePermission.objects.create(role="SYSTEM_ADMIN", module_id="99", action="READ")
        RolePermission.objects.create(role="SYSTEM_ADMIN", module_id="56", action="DELETE")
        AccountPermission.objects.create(account_profile=profile, module_id="99", action="READ", effect="ALLOW")
        AccountPermission.objects.create(account_profile=profile, module_id="56", action="DELETE", effect="ALLOW")

        self.executor.loader.build_graph()
        self.executor.migrate(self.migrate_to)
        migrated_apps = self.executor.loader.project_state(self.migrate_to).apps
        MigratedRolePermission = migrated_apps.get_model("accounts", "RolePermission")
        MigratedAccountPermission = migrated_apps.get_model("accounts", "AccountPermission")

        self.assertFalse(MigratedRolePermission.objects.filter(module_id="99", action="READ").exists())
        self.assertFalse(MigratedRolePermission.objects.filter(module_id="56", action="DELETE").exists())
        self.assertFalse(MigratedAccountPermission.objects.filter(module_id="99", action="READ").exists())
        self.assertFalse(MigratedAccountPermission.objects.filter(module_id="56", action="DELETE").exists())
