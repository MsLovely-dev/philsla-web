from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import (
    ApiSessionAuthentication,
    PendingAwareBearerAuthentication,
)
from apps.accounts.roles import PortalRole, get_user_role

from .serializers import ScanAttendanceSerializer
from .services import AttendanceError, mark_attendance

# Matches the mobile app's login restriction: only these two roles may
# authenticate on the scanner app, and only these two may call this
# endpoint even if a bearer token from elsewhere is presented.
ALLOWED_ROLES = {PortalRole.PROCTOR.value, PortalRole.SYSTEM_ADMIN.value}


class IsProctorOrSystemAdmin(IsAuthenticated):
    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        return get_user_role(request.user) in ALLOWED_ROLES


class ScanAttendanceView(APIView):
    """POST { "qrToken": "<value read from the permit QR>" }

    Used by the mobile scanner app right after a successful QR read.
    """

    authentication_classes = [PendingAwareBearerAuthentication, ApiSessionAuthentication]
    permission_classes = [IsProctorOrSystemAdmin]

    def post(self, request) -> Response:
        serializer = ScanAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = mark_attendance(
                qr_token=serializer.validated_data["qrToken"],
                proctor=request.user,
            )
        except AttendanceError as exc:
            status_code = 404 if exc.code == "NOT_FOUND" else 409
            return Response({"code": exc.code, "detail": exc.detail}, status=status_code)

        return Response(result, status=200)
