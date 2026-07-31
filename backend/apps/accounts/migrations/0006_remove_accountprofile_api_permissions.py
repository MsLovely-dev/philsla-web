from django.db import migrations


VALID_ACTIONS = {"READ", "WRITE", "EDIT", "DELETE", "APPROVE", "REJECT"}
# Snapshot the Phase 3 permission catalog so legacy JSON backfill remains deterministic.
FULL_ACCESS_ACTIONS = frozenset(VALID_ACTIONS)
READ_ONLY_ACTIONS = frozenset({"READ"})
OPERATE_ACTIONS = frozenset({"READ", "WRITE", "EDIT"})
MANAGE_RECORDS_ACTIONS = frozenset({"READ", "WRITE", "EDIT", "DELETE"})
SUPPORTED_PERMISSION_ACTIONS_BY_MODULE = {
    **{str(module_id): FULL_ACCESS_ACTIONS for module_id in range(1, 49)},
    "49": MANAGE_RECORDS_ACTIONS,
    "50": READ_ONLY_ACTIONS,
    "51": READ_ONLY_ACTIONS,
    "52": OPERATE_ACTIONS,
    "53": READ_ONLY_ACTIONS,
    "54": OPERATE_ACTIONS,
    "55": MANAGE_RECORDS_ACTIONS,
    "56": READ_ONLY_ACTIONS,
}
SUPPORTED_MODULE_IDS = set(SUPPORTED_PERMISSION_ACTIONS_BY_MODULE)


def parse_permission_code(code):
    parts = str(code).strip().upper().split("_")
    if len(parts) != 3 or parts[0] != "MOD" or parts[1] not in SUPPORTED_MODULE_IDS or parts[2] not in VALID_ACTIONS:
        return None
    if parts[2] not in SUPPORTED_PERMISSION_ACTIONS_BY_MODULE[parts[1]]:
        return None
    return parts[1], parts[2]


def ensure_structured_assignments(apps, schema_editor):
    AccountProfile = apps.get_model("accounts", "AccountProfile")
    AccountPermission = apps.get_model("accounts", "AccountPermission")
    AccountRoleAssignment = apps.get_model("accounts", "AccountRoleAssignment")
    RolePermission = apps.get_model("accounts", "RolePermission")

    for permission in RolePermission.objects.all():
        if permission.module_id not in SUPPORTED_MODULE_IDS or permission.action not in SUPPORTED_PERMISSION_ACTIONS_BY_MODULE[permission.module_id]:
            permission.delete()
    for permission in AccountPermission.objects.all():
        if permission.module_id not in SUPPORTED_MODULE_IDS or permission.action not in SUPPORTED_PERMISSION_ACTIONS_BY_MODULE[permission.module_id]:
            permission.delete()

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

        desired = {parsed for code in existing_codes if (parsed := parse_permission_code(code)) is not None}
        baseline = set(RolePermission.objects.filter(role=profile.role).values_list("module_id", "action"))
        AccountPermission.objects.filter(account_profile=profile).delete()
        for module_id, action in sorted(desired - baseline):
            AccountPermission.objects.get_or_create(
                account_profile=profile,
                module_id=module_id,
                action=action,
                defaults={"effect": "ALLOW"},
            )
        for module_id, action in sorted(baseline - desired):
            AccountPermission.objects.get_or_create(
                account_profile=profile,
                module_id=module_id,
                action=action,
                defaults={"effect": "DENY"},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_structured_permissions"),
    ]

    operations = [
        migrations.RunPython(ensure_structured_assignments, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="accountprofile",
            name="api_permissions",
        ),
    ]
