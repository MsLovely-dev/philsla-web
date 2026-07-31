import json
import re
from pathlib import Path

from django.db import transaction
from rest_framework import serializers

from .default_permissions import default_module_access_for_role
from .models import AccountPermission, AccountProfile, AccountRoleAssignment, PermissionAction, RolePermission
from .roles import normalize_role

PERMISSION_CODE_PATTERN = re.compile(r"^MOD_([A-Z0-9-]+)_([A-Z]+)$")


def _load_permission_catalog() -> dict[str, frozenset[str]]:
    with _permission_catalog_path().open(encoding="utf-8") as catalog_file:
        catalog = json.load(catalog_file)

    default_range = catalog["defaultRange"]
    permissions = {
        str(module_id): frozenset(default_range["actions"])
        for module_id in range(int(default_range["start"]), int(default_range["end"]) + 1)
    }
    permissions.update({str(module_id): frozenset(actions) for module_id, actions in catalog["modules"].items()})
    return permissions


def _permission_catalog_path() -> Path:
    return Path(__file__).resolve().parent / "permission_catalog.json"


SUPPORTED_PERMISSION_ACTIONS_BY_MODULE = _load_permission_catalog()
SUPPORTED_MODULE_IDS = set(SUPPORTED_PERMISSION_ACTIONS_BY_MODULE)


def parse_permission_code(code: str) -> tuple[str, str]:
    normalized = str(code).strip().upper()
    match = PERMISSION_CODE_PATTERN.fullmatch(normalized)
    if match is None:
        raise serializers.ValidationError(f"Invalid permission code: {code}")

    module_id, action = match.groups()
    if module_id not in SUPPORTED_MODULE_IDS:
        raise serializers.ValidationError(f"Unsupported permission module: {module_id}")
    if action not in PermissionAction.values:
        raise serializers.ValidationError(f"Unsupported permission action: {action}")
    if action not in SUPPORTED_PERMISSION_ACTIONS_BY_MODULE[module_id]:
        raise serializers.ValidationError(f"Unsupported permission for module: {format_permission_code(module_id, action)}")
    return module_id, action


def format_permission_code(module_id: str, action: str) -> str:
    return f"MOD_{str(module_id).strip().upper()}_{str(action).strip().upper()}"


def normalize_permission_codes(codes: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for code in codes:
        module_id, action = parse_permission_code(code)
        formatted = format_permission_code(module_id, action)
        if formatted in seen:
            continue
        seen.add(formatted)
        normalized.append(formatted)
    return normalized


def ensure_role_baseline(role: str) -> None:
    normalized_role = normalize_role(role)
    if normalized_role is None:
        raise serializers.ValidationError(f"Unsupported role: {role}")
    if RolePermission.objects.filter(role=normalized_role).exists():
        return None

    for code in default_module_access_for_role(normalized_role):
        module_id, action = parse_permission_code(code)
        RolePermission.objects.get_or_create(role=normalized_role, module_id=module_id, action=action)


def default_role_permission_codes(role: str) -> list[str]:
    normalized_role = normalize_role(role)
    if normalized_role is None:
        raise serializers.ValidationError(f"Unsupported role: {role}")

    ensure_role_baseline(normalized_role)
    return [
        format_permission_code(module_id, action)
        for module_id, action in RolePermission.objects.filter(role=normalized_role).values_list("module_id", "action")
    ]


def ensure_account_assignment(profile: AccountProfile) -> AccountRoleAssignment:
    assignment, created = AccountRoleAssignment.objects.get_or_create(
        account_profile=profile,
        defaults={
            "role": profile.role,
            "permission_mode": AccountRoleAssignment.PermissionMode.INHERIT,
            "role_version_at_assignment": 1,
        },
    )
    if not created and assignment.role != profile.role:
        assignment.role = profile.role
        assignment.save(update_fields=["role", "updated_at"])
    return assignment


def resolve_account_permission_codes(profile: AccountProfile) -> list[str]:
    assignment = ensure_account_assignment(profile)
    decisions = list(AccountPermission.objects.filter(account_profile=profile))
    resolved = set(default_role_permission_codes(assignment.role))
    for permission in decisions:
        code = format_permission_code(permission.module_id, permission.action)
        if permission.effect == AccountPermission.Effect.ALLOW:
            resolved.add(code)
        elif permission.effect == AccountPermission.Effect.DENY:
            resolved.discard(code)
    return sorted(resolved)


def replace_account_permission_differences(profile: AccountProfile, desired_codes: list[str]) -> None:
    desired = set(normalize_permission_codes(desired_codes))
    assignment = ensure_account_assignment(profile)
    baseline = set(default_role_permission_codes(assignment.role))

    AccountPermission.objects.filter(account_profile=profile).delete()
    rows: list[AccountPermission] = []
    for code in sorted(desired - baseline):
        module_id, action = parse_permission_code(code)
        rows.append(
            AccountPermission(
                account_profile=profile,
                module_id=module_id,
                action=action,
                effect=AccountPermission.Effect.ALLOW,
            )
        )
    for code in sorted(baseline - desired):
        module_id, action = parse_permission_code(code)
        rows.append(
            AccountPermission(
                account_profile=profile,
                module_id=module_id,
                action=action,
                effect=AccountPermission.Effect.DENY,
            )
        )
    AccountPermission.objects.bulk_create(rows)


@transaction.atomic
def replace_role_permissions(
    role: str,
    desired_codes: list[str],
    *,
    scope: str = "baseline_only",
    account_profile_ids: list[int] | None = None,
) -> None:
    normalized_role = normalize_role(role)
    if normalized_role is None:
        raise serializers.ValidationError(f"Unsupported role: {role}")
    if scope not in {"baseline_only", "all_assigned", "selected_users"}:
        raise serializers.ValidationError(f"Unsupported role update scope: {scope}")

    desired = normalize_permission_codes(desired_codes)
    if scope == "selected_users":
        selected_profiles = AccountProfile.objects.filter(role=normalized_role, id__in=account_profile_ids or [])
        for profile in selected_profiles:
            replace_account_permission_differences(profile, desired)
        return None

    before_by_profile = {
        profile.id: set(resolve_account_permission_codes(profile))
        for profile in AccountProfile.objects.filter(role=normalized_role)
    }

    RolePermission.objects.filter(role=normalized_role).delete()
    RolePermission.objects.bulk_create(
        RolePermission(role=normalized_role, module_id=parse_permission_code(code)[0], action=parse_permission_code(code)[1])
        for code in desired
    )

    selected_ids: set[int] = set()
    if scope == "all_assigned":
        selected_ids = set(AccountProfile.objects.filter(role=normalized_role).values_list("id", flat=True))
    for profile in AccountProfile.objects.filter(role=normalized_role):
        if profile.id in selected_ids:
            replace_account_permission_differences(profile, desired)
        else:
            previous = before_by_profile.get(profile.id, set())
            replace_account_permission_differences(profile, sorted(previous))
    return None
