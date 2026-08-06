from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.core.pagination import RegistryPageNumberPagination
from apps.core.throttling import MaintenanceWriteRateThrottle

from .audit import record_school_event
from .models import School
from .serializers import SchoolSerializer


SCHOOL_MANAGEMENT_ROLES = require_roles(
    "SYSTEM_ADMIN",
    "UNIVERSITY_ADMIN",
    "ADMISSIONS_REVIEWER",
)

SCHOOL_ORDERING = {
    "name": "name",
    "-name": "-name",
    "code": "code",
    "-code": "-code",
    "createdAt": "created_at",
    "-createdAt": "-created_at",
}


class SchoolListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = SCHOOL_MANAGEMENT_ROLES
    throttle_classes = [MaintenanceWriteRateThrottle]
    throttle_scope = "maintenance_write"

    def get(self, request) -> Response:
        schools = School.objects.all()

        search = request.query_params.get("search")
        if search:
            schools = schools.filter(Q(code__icontains=search) | Q(name__icontains=search))
        classification = request.query_params.get("classification")
        if classification:
            schools = schools.filter(classification=classification)
        region = request.query_params.get("region")
        if region:
            schools = schools.filter(region=region)
        status_filter = request.query_params.get("status")
        if status_filter:
            schools = schools.filter(status=status_filter)

        ordering = SCHOOL_ORDERING.get(request.query_params.get("ordering", "name"), "name")
        schools = schools.order_by(ordering, "id")

        # Paginate only when asked, so existing plain-array callers keep working.
        if "page" in request.query_params or "pageSize" in request.query_params:
            paginator = RegistryPageNumberPagination()
            page = paginator.paginate_queryset(schools, request, view=self)
            return paginator.get_paginated_response(SchoolSerializer(page, many=True).data)
        return Response(SchoolSerializer(schools, many=True).data)

    def post(self, request) -> Response:
        serializer = SchoolSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            school = serializer.save(
                created_by_id=getattr(request.user, "user_id", request.user.id)
            )
        record_school_event(event="school_created", outcome="success", request=request, user=request.user)
        return Response(SchoolSerializer(school).data, status=status.HTTP_201_CREATED)


class SchoolDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = SCHOOL_MANAGEMENT_ROLES
    throttle_classes = [MaintenanceWriteRateThrottle]
    throttle_scope = "maintenance_write"

    def get_object(self, school_id) -> School:
        return get_object_or_404(School, id=school_id)

    def get(self, request, school_id) -> Response:
        return Response(SchoolSerializer(self.get_object(school_id)).data)

    def put(self, request, school_id) -> Response:
        school = self.get_object(school_id)
        serializer = SchoolSerializer(school, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            updated = serializer.save()
        record_school_event(event="school_updated", outcome="success", request=request, user=request.user)
        return Response(SchoolSerializer(updated).data)

    def patch(self, request, school_id) -> Response:
        return self.put(request, school_id)

    def delete(self, request, school_id) -> Response:
        school = self.get_object(school_id)
        with transaction.atomic():
            school.delete()
        record_school_event(event="school_deleted", outcome="success", request=request, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
