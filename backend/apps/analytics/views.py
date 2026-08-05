from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole

from .audit import record_analytics_event
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
        overview = national_overview()
        record_analytics_event(event="national_overview_read", outcome="success", request=request, user=request.user)
        return Response(overview)
