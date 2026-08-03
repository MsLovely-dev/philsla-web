from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole
from apps.core.pagination import StandardPageNumberPagination

from .audit import record_configuration_event
from .models import ConfigurableField
from .serializers import ConfigurableFieldSerializer


STUDENT_REGISTRATION_MODULE = "student_registration"
STEP_1_REGISTRATION_SECTION = "Step 1 Registration"
VERIFICATION_METHOD_TYPE = "Verification Method"
ALLOWED_STUDENT_REGISTRATION_VERIFICATION_METHODS = {
    "Learner Reference Number (LRN)",
    "PhilSys National ID",
    "Manual Entry",
}
LOCKED_STUDENT_REGISTRATION_VERIFICATION_METHODS = {
    "PhilSys National ID",
}


def is_student_registration_verification_method(field: ConfigurableField) -> bool:
    return (
        field.module == STUDENT_REGISTRATION_MODULE
        and field.section == STEP_1_REGISTRATION_SECTION
        and field.field_type == VERIFICATION_METHOD_TYPE
    )


def validate_verification_method_value(field: ConfigurableField) -> None:
    if not is_student_registration_verification_method(field):
        return
    if field.field_name not in ALLOWED_STUDENT_REGISTRATION_VERIFICATION_METHODS:
        raise ValidationError({"value": ["Only the predefined LRN, PhilSys, and Manual Entry verification methods are allowed."]})


def enforce_verification_method_policy(field: ConfigurableField) -> None:
    if not is_student_registration_verification_method(field):
        return
    validate_verification_method_value(field)
    if field.is_enabled and field.field_name in LOCKED_STUDENT_REGISTRATION_VERIFICATION_METHODS:
        raise ValidationError({"status": ["PhilSys verification is locked for future feature development."]})

    siblings = ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=VERIFICATION_METHOD_TYPE,
    )
    if field.is_enabled:
        siblings.exclude(id=field.id).update(is_enabled=False)
        return

    if not siblings.exclude(id=field.id).filter(is_enabled=True).exists():
        raise ValidationError({"status": ["At least one Step 1 verification method must remain enabled."]})


def assert_can_delete(field: ConfigurableField) -> None:
    if not is_student_registration_verification_method(field) or not field.is_enabled:
        return
    has_other_enabled = ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=VERIFICATION_METHOD_TYPE,
        is_enabled=True,
    ).exclude(id=field.id).exists()
    if not has_other_enabled:
        raise ValidationError({"status": ["Enable another Step 1 verification method before deleting this one."]})


class PublicConfigurableFieldView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request) -> Response:
        fields = ConfigurableField.objects.filter(is_enabled=True)
        module = request.query_params.get("module")
        if module:
            fields = fields.filter(module=module)
        return Response(ConfigurableFieldSerializer(fields, many=True).data)


class ConfigurableFieldAdminView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.SYSTEM_ADMIN, PortalRole.DEPED_ADMIN)

    def get(self, request) -> Response:
        fields = ConfigurableField.objects.all()
        module = request.query_params.get("module")
        field_type = request.query_params.get("type")
        search = request.query_params.get("search")
        status_filter = request.query_params.get("status")
        priority = request.query_params.get("priority")
        input_type = request.query_params.get("inputType")
        if module:
            fields = fields.filter(module=module)
        if field_type:
            fields = fields.filter(field_type=field_type)
        if search:
            fields = fields.filter(
                Q(field_name__icontains=search)
                | Q(field_type__icontains=search)
                | Q(field_section__icontains=search)
                | Q(input_type__icontains=search)
                | Q(priority__icontains=search)
                | Q(remarks__icontains=search)
            )
        if status_filter in {"true", "false"}:
            fields = fields.filter(is_enabled=status_filter == "true")
        if priority:
            fields = fields.filter(priority=priority)
        if input_type:
            fields = fields.filter(input_type=input_type)

        if "page" in request.query_params or "pageSize" in request.query_params:
            paginator = StandardPageNumberPagination()
            page = paginator.paginate_queryset(fields, request, view=self)
            return paginator.get_paginated_response(ConfigurableFieldSerializer(page, many=True).data)

        return Response(ConfigurableFieldSerializer(fields, many=True).data)

    def post(self, request) -> Response:
        serializer = ConfigurableFieldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            field = serializer.save(created_by_id=getattr(request.user, "user_id", request.user.id))
            validate_verification_method_value(field)
            enforce_verification_method_policy(field)
        record_configuration_event(event="configurable_field_created", outcome="success", request=request, user=request.user)
        return Response(ConfigurableFieldSerializer(field).data, status=status.HTTP_201_CREATED)


class ConfigurableFieldAdminDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.SYSTEM_ADMIN, PortalRole.DEPED_ADMIN)

    def get_object(self, field_id) -> ConfigurableField:
        return get_object_or_404(ConfigurableField, id=field_id)

    def patch(self, request, field_id) -> Response:
        field = self.get_object(field_id)
        serializer = ConfigurableFieldSerializer(field, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            updated = serializer.save()
            validate_verification_method_value(updated)
            enforce_verification_method_policy(updated)
        record_configuration_event(event="configurable_field_updated", outcome="success", request=request, user=request.user)
        return Response(ConfigurableFieldSerializer(updated).data)

    def put(self, request, field_id) -> Response:
        field = self.get_object(field_id)
        serializer = ConfigurableFieldSerializer(field, data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            updated = serializer.save()
            validate_verification_method_value(updated)
            enforce_verification_method_policy(updated)
        record_configuration_event(event="configurable_field_updated", outcome="success", request=request, user=request.user)
        return Response(ConfigurableFieldSerializer(updated).data)

    def delete(self, request, field_id) -> Response:
        field = self.get_object(field_id)
        with transaction.atomic():
            assert_can_delete(field)
            field.delete()
        record_configuration_event(event="configurable_field_deleted", outcome="success", request=request, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
