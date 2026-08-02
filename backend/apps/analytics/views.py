from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole

from .services import national_overview


class NationalOverviewView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(
        PortalRole.CHED_ADMIN,
        PortalRole.DEPED_ADMIN,
        PortalRole.TESDA_ADMIN,
        PortalRole.EXECUTIVE,
        PortalRole.SYSTEM_ADMIN,
    )

    def get(self, request) -> Response:
        return Response(national_overview())
