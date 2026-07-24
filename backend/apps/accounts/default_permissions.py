from .roles import PortalRole

READ_ONLY = ("READ",)
OPERATE = ("READ", "WRITE", "EDIT")
DECIDE = ("READ", "EDIT", "APPROVE", "REJECT")
MANAGE = ("READ", "WRITE", "EDIT", "DELETE", "APPROVE")
FULL_ACCESS = ("READ", "WRITE", "EDIT", "DELETE", "APPROVE", "REJECT")

MODULE_IDS = tuple(str(module_id) for module_id in range(1, 49))

ROLE_PERMISSION_RULES: dict[str, tuple[tuple[tuple[str, ...], tuple[str, ...]], ...]] = {
    PortalRole.ADMISSIONS_REVIEWER.value: (
        (("1", "12", "48"), READ_ONLY),
        (("9", "37"), DECIDE),
        (("36", "38", "39"), OPERATE),
    ),
    PortalRole.PROCTOR.value: (
        (("26",), READ_ONLY),
        (("25", "27", "28", "29", "40", "41", "42"), OPERATE),
    ),
    PortalRole.PROCTOR_ADMIN.value: (
        (("26",), READ_ONLY),
        (("25", "27", "28", "29", "40", "41", "42"), OPERATE),
        (("30",), MANAGE),
    ),
    PortalRole.UNIVERSITY_ADMIN.value: (
        (("1", "10", "15"), READ_ONLY),
        (("11", "12", "13", "14", "36", "38", "39", "43", "44", "45"), OPERATE),
        (("20",), DECIDE),
    ),
    PortalRole.TESTING_CENTER_ADMIN.value: (
        (("35", "11", "30"), OPERATE),
    ),
    PortalRole.EXAM_ADMINISTRATOR.value: (
        (("16", "22", "15", "7", "6"), READ_ONLY),
        (("17", "18", "19", "21", "43"), MANAGE),
        (("20", "46"), DECIDE),
    ),
    PortalRole.SYSTEM_ADMIN.value: (
        (MODULE_IDS, FULL_ACCESS),
    ),
    PortalRole.CHED_ADMIN.value: (
        (("5", "6", "7", "15"), READ_ONLY),
    ),
    PortalRole.DEPED_ADMIN.value: (
        (("5", "6", "7", "15"), READ_ONLY),
    ),
    PortalRole.TESDA_ADMIN.value: (
        (("5", "6", "7", "15"), READ_ONLY),
    ),
    PortalRole.EXECUTIVE.value: (
        (("5", "6", "7", "15"), READ_ONLY),
    ),
}


def default_module_access_for_role(role: str) -> list[str]:
    access: list[str] = []
    seen: set[str] = set()

    for module_ids, actions in ROLE_PERMISSION_RULES.get(role, ()):
        for module_id in module_ids:
            for action in actions:
                permission = f"MOD_{module_id}_{action}"
                if permission in seen:
                    continue
                seen.add(permission)
                access.append(permission)

    return access


def module_access_or_role_default(role: str, module_access: list[str]) -> list[str]:
    return module_access or default_module_access_for_role(role)
