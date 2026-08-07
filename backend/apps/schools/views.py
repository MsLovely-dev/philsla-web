from django.db import transaction
from django.db.models import Count, Q, Sum
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.core.csv_export import dated_filename, stream_csv
from apps.core.imports import normalize_region_factory, run_bulk_import
from apps.core.pagination import RegistryPageNumberPagination
from apps.core.throttling import MaintenanceWriteRateThrottle

from .audit import record_school_event
from .models import PhilippineRegion, School
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

# Ordered export columns: key -> (header, row getter).
SCHOOL_EXPORT_COLUMNS = {
    "code": ("Code", lambda s: s.code),
    "classification": ("Classification", lambda s: s.classification),
    "name": ("Name", lambda s: s.name),
    "examineeCapacity": ("Examinee Capacity", lambda s: s.examinee_capacity),
    "region": ("Region/Municipality/City", lambda s: s.get_region_display()),
    "status": ("Status", lambda s: s.status),
}


def filter_schools(queryset, params):
    """Apply the shared search/classification/region/status/ordering filters."""
    search = params.get("search")
    if search:
        queryset = queryset.filter(Q(code__icontains=search) | Q(name__icontains=search))
    classification = params.get("classification")
    if classification:
        queryset = queryset.filter(classification=classification)
    region = params.get("region")
    if region:
        queryset = queryset.filter(region=region)
    status_filter = params.get("status")
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    ordering = SCHOOL_ORDERING.get(params.get("ordering", "name"), "name")
    return queryset.order_by(ordering, "id")


def school_summary() -> dict:
    """Registry-wide totals for the stat cards, independent of list filters."""
    summary = School.objects.aggregate(
        total=Count("id"),
        public=Count("id", filter=Q(classification="Public")),
        private=Count("id", filter=Q(classification="Private")),
        active=Count("id", filter=Q(status="Active")),
        totalCapacity=Sum("examinee_capacity"),
    )
    summary["totalCapacity"] = summary["totalCapacity"] or 0
    return summary


class SchoolListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = SCHOOL_MANAGEMENT_ROLES
    throttle_classes = [MaintenanceWriteRateThrottle]
    throttle_scope = "maintenance_write"

    def get(self, request) -> Response:
        schools = filter_schools(School.objects.all(), request.query_params)

        # Paginate only when asked, so existing plain-array callers keep working.
        if "page" in request.query_params or "pageSize" in request.query_params:
            paginator = RegistryPageNumberPagination()
            page = paginator.paginate_queryset(schools, request, view=self)
            response = paginator.get_paginated_response(SchoolSerializer(page, many=True).data)
            response.data["summary"] = school_summary()
            return response
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


class SchoolExportView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = SCHOOL_MANAGEMENT_ROLES

    def get(self, request) -> StreamingHttpResponse:
        schools = filter_schools(School.objects.all(), request.query_params)
        requested = [c for c in request.query_params.get("columns", "").split(",") if c in SCHOOL_EXPORT_COLUMNS]
        keys = requested or list(SCHOOL_EXPORT_COLUMNS)
        header = [SCHOOL_EXPORT_COLUMNS[key][0] for key in keys]
        getters = [SCHOOL_EXPORT_COLUMNS[key][1] for key in keys]

        def rows():
            for school in schools.iterator(chunk_size=2000):
                yield [getter(school) for getter in getters]

        return stream_csv(header, rows(), dated_filename("philSA_List_of_Schools"))


class SchoolImportView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = SCHOOL_MANAGEMENT_ROLES
    throttle_classes = [MaintenanceWriteRateThrottle]
    throttle_scope = "maintenance_write"

    def post(self, request) -> Response:
        created = run_bulk_import(
            SchoolSerializer,
            request.data.get("rows"),
            save_kwargs={"created_by_id": getattr(request.user, "user_id", request.user.id)},
            normalize=normalize_region_factory(PhilippineRegion),
            duplicate_key=lambda vd: (vd["name"].strip().lower(), vd["region"]),
            duplicate_message={
                "name": ["This school name is duplicated within the file for its region."]
            },
        )
        record_school_event(
            event="school_bulk_imported", outcome="success", request=request, user=request.user
        )
        return Response({"created": created}, status=status.HTTP_201_CREATED)


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
