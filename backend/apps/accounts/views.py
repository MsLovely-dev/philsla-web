from datetime import datetime
from typing import Any

from rest_framework.response import Response
from rest_framework.views import APIView

from .roles import get_security_tier, get_user_role


def _json_datetime(value: object) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, str):
        return value
    return None


def _string_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, (list, tuple, set, frozenset)):
        return sorted(str(item) for item in value)
    return []


def _scope_claims(value: object) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


class CurrentSessionView(APIView):
    """Return server-derived identity, role, permission, and scope claims."""

    def get(self, request) -> Response:
        user = request.user
        role = get_user_role(user)

        return Response(
            {
                "user": {
                    "id": str(getattr(user, "id", "")),
                    "role": role,
                    "securityTier": get_security_tier(role),
                    "permissions": _string_list(getattr(user, "api_permissions", None)),
                    "scopes": _scope_claims(getattr(user, "scopes", None)),
                },
                "session": {
                    "authenticated": True,
                    "expiresAt": _json_datetime(getattr(request.auth, "expires_at", None)),
                },
            }
        )
