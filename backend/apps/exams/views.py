from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles

from .models import BlueprintStatus, ExamBlueprint
from .serializers import BlueprintCloneSerializer, BlueprintTransitionSerializer, ExamBlueprintSerializer
from .services import blueprint_queryset, latest_blueprint_version


BLUEPRINT_MANAGEMENT_ROLES = require_roles(
    "ITEM_WRITER",
    "ACADEMIC_REVIEWER",
    "EXAM_ADMINISTRATOR",
    "SYSTEM_ADMIN",
)


def _actor_profile(request):
    profile = getattr(request.user, "account_profile", None)
    if profile is not None:
        return profile
    raise PermissionDenied("Authenticated account profile is required.")


class ExamBlueprintListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = BLUEPRINT_MANAGEMENT_ROLES

    def get(self, request) -> Response:
        serializer = ExamBlueprintSerializer(blueprint_queryset(), many=True)
        return Response(serializer.data)

    def post(self, request) -> Response:
        serializer = ExamBlueprintSerializer(data=request.data, context={"actor_profile": _actor_profile(request)})
        serializer.is_valid(raise_exception=True)
        blueprint = serializer.save()
        return Response(ExamBlueprintSerializer(blueprint).data, status=201)


class ExamBlueprintDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = BLUEPRINT_MANAGEMENT_ROLES

    def get_object(self, blueprint_id: int) -> ExamBlueprint:
        return get_object_or_404(blueprint_queryset(), pk=blueprint_id)

    def get(self, request, blueprint_id: int) -> Response:
        blueprint = self.get_object(blueprint_id)
        return Response(ExamBlueprintSerializer(blueprint).data)

    def put(self, request, blueprint_id: int) -> Response:
        blueprint = self.get_object(blueprint_id)
        serializer = ExamBlueprintSerializer(
            blueprint,
            data=request.data,
            context={"actor_profile": _actor_profile(request)},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        updated_blueprint = serializer.save()
        return Response(ExamBlueprintSerializer(updated_blueprint).data)

    def patch(self, request, blueprint_id: int) -> Response:
        return self.put(request, blueprint_id)

    def delete(self, request, blueprint_id: int) -> Response:
        blueprint = self.get_object(blueprint_id)
        version = latest_blueprint_version(blueprint)
        if version is None or version.status not in {BlueprintStatus.DRAFT, BlueprintStatus.REVISION_REQUIRED}:
            return Response({"detail": "Only draft or revision-required blueprints can be deleted."}, status=409)
        blueprint.delete()
        return Response(status=204)


class ExamBlueprintCloneView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = BLUEPRINT_MANAGEMENT_ROLES

    def post(self, request, blueprint_id: int) -> Response:
        blueprint = get_object_or_404(blueprint_queryset(), pk=blueprint_id)
        serializer = BlueprintCloneSerializer(context={"actor_profile": _actor_profile(request), "blueprint": blueprint})
        cloned = serializer.save()
        cloned_blueprint = get_object_or_404(blueprint_queryset(), pk=cloned["clonedBlueprintId"])
        return Response(ExamBlueprintSerializer(cloned_blueprint).data, status=201)


class ExamBlueprintTransitionView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = BLUEPRINT_MANAGEMENT_ROLES

    def post(self, request, blueprint_id: int) -> Response:
        blueprint = get_object_or_404(blueprint_queryset(), pk=blueprint_id)
        version = latest_blueprint_version(blueprint)
        if version is None:
            return Response({"detail": "Blueprint version not found."}, status=404)
        serializer = BlueprintTransitionSerializer(data=request.data, context={"actor_profile": _actor_profile(request), "version": version})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ExamBlueprintSerializer(blueprint_queryset().get(pk=blueprint.pk)).data)
