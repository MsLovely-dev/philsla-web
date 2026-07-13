from dataclasses import dataclass
from types import SimpleNamespace

from django.test import TestCase, override_settings
from django.urls import path
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from apps.accounts.permissions import ObjectScopePermission, RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole, get_security_tier


@dataclass
class ProbeObject:
    owner_id: str

    def can_be_accessed_by(self, user, action: str) -> bool:
        return action == "get" and self.owner_id == user.user_id


class StudentOnlyView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.STUDENT)

    def get(self, request) -> Response:
        return Response({"status": "allowed"})


class MissingRoleConfigView(APIView):
    permission_classes = [RoleRequiredPermission]

    def get(self, request) -> Response:
        return Response({"status": "allowed"})


class ObjectProbeView(APIView):
    permission_classes = [ObjectScopePermission]

    def get_object(self) -> ProbeObject:
        return ProbeObject(owner_id="student-1")

    def get(self, request) -> Response:
        obj = self.get_object()
        self.check_object_permissions(request, obj)
        return Response({"status": "allowed"})


urlpatterns = [
    path("student-only/", StudentOnlyView.as_view(), name="student-only"),
    path("missing-role-config/", MissingRoleConfigView.as_view(), name="missing-role-config"),
    path("object-probe/", ObjectProbeView.as_view(), name="object-probe"),
]


def authenticated_user(**attrs):
    values = {
        "is_authenticated": True,
        "is_active": True,
        "role": PortalRole.STUDENT.value,
        "user_id": "student-1",
    }
    values.update(attrs)
    return SimpleNamespace(**values)


@override_settings(ROOT_URLCONF=__name__)
class RolePermissionTests(TestCase):
    def setUp(self) -> None:
        self.factory = APIRequestFactory()

    def test_student_role_can_access_student_view(self) -> None:
        request = self.factory.get("/student-only/")
        force_authenticate(request, user=authenticated_user(role=PortalRole.STUDENT.value))

        response = StudentOnlyView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "allowed"})

    def test_wrong_role_is_denied(self) -> None:
        request = self.factory.get("/student-only/")
        force_authenticate(request, user=authenticated_user(role=PortalRole.EXECUTIVE.value))

        response = StudentOnlyView.as_view()(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"]["code"], "PERMISSION_DENIED")
        self.assertEqual(response.data["error"]["fields"], {})

    def test_missing_view_role_configuration_denies_by_default(self) -> None:
        request = self.factory.get("/missing-role-config/")
        force_authenticate(request, user=authenticated_user(role=PortalRole.SYSTEM_ADMIN.value))

        response = MissingRoleConfigView.as_view()(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"]["code"], "PERMISSION_DENIED")
        self.assertEqual(response.data["error"]["fields"], {})

    def test_invalid_prototype_role_is_rejected_at_import_time(self) -> None:
        with self.assertRaisesMessage(ValueError, "Unsupported portal role"):
            require_roles("TECH_SUPPORT")

    def test_security_tier_mapping_matches_auth_decision(self) -> None:
        self.assertEqual(get_security_tier(PortalRole.STUDENT), 1)
        self.assertEqual(get_security_tier(PortalRole.UNIVERSITY_ADMIN), 2)
        self.assertEqual(get_security_tier(PortalRole.SYSTEM_ADMIN), 3)
        self.assertEqual(get_security_tier(PortalRole.CHED_ADMIN), 4)


@override_settings(ROOT_URLCONF=__name__)
class ObjectScopePermissionTests(TestCase):
    def setUp(self) -> None:
        self.factory = APIRequestFactory()

    def test_object_owner_is_allowed(self) -> None:
        request = self.factory.get("/object-probe/")
        force_authenticate(request, user=authenticated_user(user_id="student-1"))

        response = ObjectProbeView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "allowed"})

    def test_non_owner_is_denied(self) -> None:
        request = self.factory.get("/object-probe/")
        force_authenticate(request, user=authenticated_user(user_id="student-2"))

        response = ObjectProbeView.as_view()(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"]["code"], "PERMISSION_DENIED")
        self.assertEqual(response.data["error"]["fields"], {})
