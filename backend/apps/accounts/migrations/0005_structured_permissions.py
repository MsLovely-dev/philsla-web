from django.db import migrations, models
import django.db.models.deletion


ROLE_PERMISSION_RULES = {
    "ADMISSIONS_REVIEWER": (
        (("1", "12", "48"), ("READ",)),
        (("9", "37"), ("READ", "EDIT", "APPROVE", "REJECT")),
        (("36", "38", "39"), ("READ", "WRITE", "EDIT")),
    ),
    "PROCTOR": (
        (("26",), ("READ",)),
        (("25", "27", "28", "29", "40", "41", "42"), ("READ", "WRITE", "EDIT")),
    ),
    "PROCTOR_ADMIN": (
        (("26",), ("READ",)),
        (("25", "27", "28", "29", "40", "41", "42"), ("READ", "WRITE", "EDIT")),
        (("30",), ("READ", "WRITE", "EDIT", "DELETE", "APPROVE")),
    ),
    "UNIVERSITY_ADMIN": (
        (("1", "10", "15"), ("READ",)),
        (("11", "12", "13", "14", "36", "38", "39", "43", "44", "45"), ("READ", "WRITE", "EDIT")),
        (("20",), ("READ", "EDIT", "APPROVE", "REJECT")),
    ),
    "TESTING_CENTER_ADMIN": (
        (("35", "11", "30"), ("READ", "WRITE", "EDIT")),
    ),
    "EXAM_ADMINISTRATOR": (
        (("16", "22", "15", "7", "6"), ("READ",)),
        (("17", "18", "19", "21", "43"), ("READ", "WRITE", "EDIT", "DELETE", "APPROVE")),
        (("20", "46"), ("READ", "EDIT", "APPROVE", "REJECT")),
    ),
    "SYSTEM_ADMIN": (
        (tuple(str(module_id) for module_id in range(1, 49)), ("READ", "WRITE", "EDIT", "DELETE", "APPROVE", "REJECT")),
    ),
    "CHED_ADMIN": ((("5", "6", "7", "15"), ("READ",)),),
    "DEPED_ADMIN": ((("5", "6", "7", "15"), ("READ",)),),
    "TESDA_ADMIN": ((("5", "6", "7", "15"), ("READ",)),),
    "EXECUTIVE": ((("5", "6", "7", "15"), ("READ",)),),
}

VALID_ACTIONS = {"READ", "WRITE", "EDIT", "DELETE", "APPROVE", "REJECT"}


def permission_set_for_role(role):
    permissions = set()
    for module_ids, actions in ROLE_PERMISSION_RULES.get(role, ()):
        for module_id in module_ids:
            for action in actions:
                permissions.add((module_id, action))
    return permissions


def parse_permission_code(code):
    parts = str(code).strip().upper().split("_")
    if len(parts) != 3 or parts[0] != "MOD" or not parts[1] or parts[2] not in VALID_ACTIONS:
        return None
    return parts[1], parts[2]


def backfill_structured_permissions(apps, schema_editor):
    AccountProfile = apps.get_model("accounts", "AccountProfile")
    AccountPermission = apps.get_model("accounts", "AccountPermission")
    AccountRoleAssignment = apps.get_model("accounts", "AccountRoleAssignment")
    RolePermission = apps.get_model("accounts", "RolePermission")

    role_defaults = {}
    for role in ROLE_PERMISSION_RULES:
        role_defaults[role] = permission_set_for_role(role)
        for module_id, action in sorted(role_defaults[role]):
            RolePermission.objects.get_or_create(role=role, module_id=module_id, action=action)

    for profile in AccountProfile.objects.exclude(role="STUDENT"):
        AccountRoleAssignment.objects.get_or_create(
            account_profile=profile,
            defaults={
                "role": profile.role,
                "permission_mode": "INHERIT",
                "role_version_at_assignment": 1,
            },
        )
        existing_codes = list(profile.api_permissions or [])
        if not existing_codes:
            continue

        existing = {parsed for code in existing_codes if (parsed := parse_permission_code(code)) is not None}
        defaults = role_defaults.get(profile.role, set())
        for module_id, action in sorted(existing - defaults):
            AccountPermission.objects.get_or_create(
                account_profile=profile,
                module_id=module_id,
                action=action,
                defaults={"effect": "ALLOW"},
            )
        for module_id, action in sorted(defaults - existing):
            AccountPermission.objects.get_or_create(
                account_profile=profile,
                module_id=module_id,
                action=action,
                defaults={"effect": "DENY"},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_passwordrecoverytoken"),
    ]

    operations = [
        migrations.CreateModel(
            name="RolePermission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("STUDENT", "STUDENT"),
                            ("ADMISSIONS_REVIEWER", "ADMISSIONS_REVIEWER"),
                            ("PROCTOR", "PROCTOR"),
                            ("PROCTOR_ADMIN", "PROCTOR_ADMIN"),
                            ("UNIVERSITY_ADMIN", "UNIVERSITY_ADMIN"),
                            ("TESTING_CENTER_ADMIN", "TESTING_CENTER_ADMIN"),
                            ("EXAM_ADMINISTRATOR", "EXAM_ADMINISTRATOR"),
                            ("SYSTEM_ADMIN", "SYSTEM_ADMIN"),
                            ("CHED_ADMIN", "CHED_ADMIN"),
                            ("DEPED_ADMIN", "DEPED_ADMIN"),
                            ("TESDA_ADMIN", "TESDA_ADMIN"),
                            ("EXECUTIVE", "EXECUTIVE"),
                        ],
                        max_length=32,
                    ),
                ),
                ("module_id", models.CharField(max_length=16)),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("READ", "READ"),
                            ("WRITE", "WRITE"),
                            ("EDIT", "EDIT"),
                            ("DELETE", "DELETE"),
                            ("APPROVE", "APPROVE"),
                            ("REJECT", "REJECT"),
                        ],
                        max_length=16,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["role", "module_id", "action"],
            },
        ),
        migrations.CreateModel(
            name="AccountRoleAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("STUDENT", "STUDENT"),
                            ("ADMISSIONS_REVIEWER", "ADMISSIONS_REVIEWER"),
                            ("PROCTOR", "PROCTOR"),
                            ("PROCTOR_ADMIN", "PROCTOR_ADMIN"),
                            ("UNIVERSITY_ADMIN", "UNIVERSITY_ADMIN"),
                            ("TESTING_CENTER_ADMIN", "TESTING_CENTER_ADMIN"),
                            ("EXAM_ADMINISTRATOR", "EXAM_ADMINISTRATOR"),
                            ("SYSTEM_ADMIN", "SYSTEM_ADMIN"),
                            ("CHED_ADMIN", "CHED_ADMIN"),
                            ("DEPED_ADMIN", "DEPED_ADMIN"),
                            ("TESDA_ADMIN", "TESDA_ADMIN"),
                            ("EXECUTIVE", "EXECUTIVE"),
                        ],
                        max_length=32,
                    ),
                ),
                (
                    "permission_mode",
                    models.CharField(choices=[("INHERIT", "INHERIT"), ("CUSTOM", "CUSTOM")], default="INHERIT", max_length=16),
                ),
                ("role_version_at_assignment", models.PositiveIntegerField(default=1)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "account_profile",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="role_assignment",
                        to="accounts.accountprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["account_profile__user__email"],
            },
        ),
        migrations.CreateModel(
            name="AccountPermission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("module_id", models.CharField(max_length=16)),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("READ", "READ"),
                            ("WRITE", "WRITE"),
                            ("EDIT", "EDIT"),
                            ("DELETE", "DELETE"),
                            ("APPROVE", "APPROVE"),
                            ("REJECT", "REJECT"),
                        ],
                        max_length=16,
                    ),
                ),
                ("effect", models.CharField(choices=[("ALLOW", "ALLOW"), ("DENY", "DENY")], max_length=8)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "account_profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="account_permissions",
                        to="accounts.accountprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["account_profile_id", "module_id", "action"],
            },
        ),
        migrations.AddIndex(
            model_name="rolepermission",
            index=models.Index(fields=["role", "module_id", "action"], name="accounts_ro_role_b46985_idx"),
        ),
        migrations.AddConstraint(
            model_name="rolepermission",
            constraint=models.UniqueConstraint(fields=("role", "module_id", "action"), name="uniq_role_permission"),
        ),
        migrations.AddIndex(
            model_name="accountroleassignment",
            index=models.Index(fields=["role", "permission_mode"], name="accounts_ac_role_15f540_idx"),
        ),
        migrations.AddIndex(
            model_name="accountpermission",
            index=models.Index(fields=["account_profile", "module_id", "action"], name="accounts_ac_account_c4e46a_idx"),
        ),
        migrations.AddIndex(
            model_name="accountpermission",
            index=models.Index(fields=["module_id", "action", "effect"], name="accounts_ac_module__dbb7e0_idx"),
        ),
        migrations.AddConstraint(
            model_name="accountpermission",
            constraint=models.UniqueConstraint(
                fields=("account_profile", "module_id", "action"),
                name="uniq_account_permission_decision",
            ),
        ),
        migrations.RunPython(backfill_structured_permissions, migrations.RunPython.noop),
    ]
