from enum import StrEnum


class PortalRole(StrEnum):
    STUDENT = "STUDENT"
    ADMISSIONS_REVIEWER = "ADMISSIONS_REVIEWER"
    PROCTOR = "PROCTOR"
    PROCTOR_ADMIN = "PROCTOR_ADMIN"
    UNIVERSITY_ADMIN = "UNIVERSITY_ADMIN"
    TESTING_CENTER_ADMIN = "TESTING_CENTER_ADMIN"
    EXAM_ADMINISTRATOR = "EXAM_ADMINISTRATOR"
    SYSTEM_ADMIN = "SYSTEM_ADMIN"
    CHED_ADMIN = "CHED_ADMIN"
    DEPED_ADMIN = "DEPED_ADMIN"
    TESDA_ADMIN = "TESDA_ADMIN"
    EXECUTIVE = "EXECUTIVE"


PORTAL_ROLES = frozenset(role.value for role in PortalRole)

ROLE_SECURITY_TIERS = {
    PortalRole.STUDENT.value: 1,
    PortalRole.ADMISSIONS_REVIEWER.value: 2,
    PortalRole.PROCTOR.value: 2,
    PortalRole.UNIVERSITY_ADMIN.value: 2,
    PortalRole.TESTING_CENTER_ADMIN.value: 2,
    PortalRole.PROCTOR_ADMIN.value: 3,
    PortalRole.EXAM_ADMINISTRATOR.value: 3,
    PortalRole.SYSTEM_ADMIN.value: 3,
    PortalRole.CHED_ADMIN.value: 4,
    PortalRole.DEPED_ADMIN.value: 4,
    PortalRole.TESDA_ADMIN.value: 4,
    PortalRole.EXECUTIVE.value: 4,
}


def normalize_role(role: object) -> str | None:
    if isinstance(role, PortalRole):
        return role.value
    if isinstance(role, str):
        normalized = role.strip().upper()
        if normalized in PORTAL_ROLES:
            return normalized
    return None


def get_user_role(user: object) -> str | None:
    return normalize_role(getattr(user, "role", None))


def get_security_tier(role: object) -> int | None:
    normalized_role = normalize_role(role)
    if normalized_role is None:
        return None
    return ROLE_SECURITY_TIERS[normalized_role]
