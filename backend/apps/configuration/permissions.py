from rest_framework.permissions import BasePermission

from apps.accounts.permission_codes import format_permission_code
from apps.accounts.roles import PortalRole
from apps.accounts.services import resolve_authenticated_account

from .models import CollegeCourse, University


UNIVERSITY_REGISTRY_MODULE_ID = "38"
METHOD_ACTIONS = {
    "GET": "READ",
    "HEAD": "READ",
    "OPTIONS": "READ",
    "POST": "WRITE",
    "PUT": "EDIT",
    "PATCH": "EDIT",
    "DELETE": "DELETE",
}
UNIVERSITY_REGISTRY_ROLES = {
    PortalRole.SYSTEM_ADMIN.value,
    PortalRole.UNIVERSITY_ADMIN.value,
    PortalRole.ADMISSIONS_REVIEWER.value,
}


class UniversityRegistryPermission(BasePermission):
    message = "You do not have permission to manage the university registry."

    def has_permission(self, request, view) -> bool:
        account = resolve_authenticated_account(request.user)
        if account is None or account["role"] not in UNIVERSITY_REGISTRY_ROLES:
            return False

        action = METHOD_ACTIONS.get(request.method)
        if action is None:
            return False

        if (
            account["role"] == PortalRole.UNIVERSITY_ADMIN.value
            and request.method == "POST"
            and getattr(view, "creates_university", False)
        ):
            return False

        permission_code = format_permission_code(UNIVERSITY_REGISTRY_MODULE_ID, action)
        permissions = set(account.get("permissions", []))
        if permission_code in permissions:
            return True

        return account["role"] == PortalRole.SYSTEM_ADMIN.value and not permissions

    def has_object_permission(self, request, view, obj) -> bool:
        if not self.has_permission(request, view):
            return False
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return True

        account = resolve_authenticated_account(request.user)
        if account is None or account["role"] != PortalRole.UNIVERSITY_ADMIN.value:
            return True

        scopes = account.get("scopes", {})
        assigned_ids = scopes.get("universityIds", []) if isinstance(scopes, dict) else []
        if not isinstance(assigned_ids, list):
            return False

        university_id = obj.university_id if isinstance(obj, CollegeCourse) else obj.id
        return str(university_id) in {str(item) for item in assigned_ids}
