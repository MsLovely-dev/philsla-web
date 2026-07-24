from rest_framework.permissions import BasePermission

from .roles import PORTAL_ROLES, get_user_role, normalize_role


def _is_authenticated_and_active(user: object) -> bool:
    return bool(getattr(user, "is_authenticated", False)) and bool(getattr(user, "is_active", True))


def _view_roles(view: object) -> frozenset[str]:
    roles = getattr(view, "required_roles", ())
    if isinstance(roles, str):
        roles = (roles,)
    return frozenset(role for role in (normalize_role(role) for role in roles) if role is not None)


class RoleRequiredPermission(BasePermission):
    """Require one explicitly allowed ADR-010 portal role.

    Views must set `required_roles`. Missing or invalid role configuration
    denies access by default.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not _is_authenticated_and_active(user):
            return False

        required_roles = _view_roles(view)
        if not required_roles:
            return False

        user_role = get_user_role(user)
        return user_role in required_roles


class ObjectScopePermission(BasePermission):
    """Delegate object-level authorization to the object or view.

    Supported extension points, checked in order:
    - `view.can_access_object(user, obj, request)`
    - `obj.can_be_accessed_by(user, action)`

    If neither exists, access is denied by default.
    """

    message = "You do not have permission to access this object."

    def has_permission(self, request, view) -> bool:
        return _is_authenticated_and_active(request.user)

    def has_object_permission(self, request, view, obj) -> bool:
        if not _is_authenticated_and_active(request.user):
            return False

        view_checker = getattr(view, "can_access_object", None)
        if callable(view_checker):
            return bool(view_checker(request.user, obj, request))

        object_checker = getattr(obj, "can_be_accessed_by", None)
        if callable(object_checker):
            action = getattr(view, "action", request.method.lower())
            return bool(object_checker(request.user, action))

        return False


def require_roles(*roles: str) -> tuple[str, ...]:
    """Validate view role declarations at import time."""

    normalized_roles = tuple(normalize_role(role) for role in roles)
    if any(role is None for role in normalized_roles):
        invalid_roles = sorted(set(roles) - PORTAL_ROLES)
        raise ValueError(f"Unsupported portal role(s): {', '.join(invalid_roles)}")
    return normalized_roles  # type: ignore[return-value]
