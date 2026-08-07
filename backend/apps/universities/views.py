from django.db import transaction
from django.db.models import Count, Q
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.core.csv_export import dated_filename, stream_csv
from apps.core.pagination import RegistryPageNumberPagination
from apps.core.throttling import MaintenanceWriteRateThrottle

from .audit import record_college_course_event, record_university_event
from .models import CollegeCourse, University
from .serializers import CollegeCourseSerializer, UniversitySerializer


UNIVERSITY_MANAGEMENT_ROLES = require_roles(
    "SYSTEM_ADMIN",
    "UNIVERSITY_ADMIN",
    "ADMISSIONS_REVIEWER",
)

UNIVERSITY_ORDERING = {
    "name": "name",
    "-name": "-name",
    "code": "code",
    "-code": "-code",
    "createdAt": "created_at",
    "-createdAt": "-created_at",
}

# Ordered export columns: key -> (header, row getter). Shared by the export view.
UNIVERSITY_EXPORT_COLUMNS = {
    "code": ("Code", lambda u: u.code),
    "name": ("University Name", lambda u: u.name),
    "classification": ("Classification", lambda u: u.classification),
    "region": ("Region", lambda u: u.get_region_display()),
    "city": ("City", lambda u: u.city),
    "presidentRector": ("President/Rector", lambda u: u.president_rector),
    "email": ("Email", lambda u: u.email),
    "phone": ("Phone", lambda u: u.phone),
    "establishedYear": ("Established", lambda u: u.established_year or ""),
    "courseCount": ("Course Count", lambda u: u.course_count),
    "status": ("Status", lambda u: u.status),
}


def filter_universities(queryset, params):
    """Apply the shared search/classification/region/status/ordering filters."""
    search = params.get("search")
    if search:
        queryset = queryset.filter(
            Q(code__icontains=search) | Q(name__icontains=search) | Q(city__icontains=search)
        )
    classification = params.get("classification")
    if classification:
        queryset = queryset.filter(classification=classification)
    region = params.get("region")
    if region:
        queryset = queryset.filter(region=region)
    status_filter = params.get("status")
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    ordering = UNIVERSITY_ORDERING.get(params.get("ordering", "name"), "name")
    return queryset.order_by(ordering, "id")


def university_summary() -> dict:
    """Registry-wide totals for the stat cards, independent of list filters."""
    summary = University.objects.aggregate(
        total=Count("id"),
        public=Count("id", filter=Q(classification="Public")),
        private=Count("id", filter=Q(classification="Private")),
        active=Count("id", filter=Q(status="Active")),
    )
    summary["totalCourses"] = CollegeCourse.objects.count()
    return summary


class UniversityListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = UNIVERSITY_MANAGEMENT_ROLES
    throttle_classes = [MaintenanceWriteRateThrottle]
    throttle_scope = "maintenance_write"

    def get(self, request) -> Response:
        universities = filter_universities(
            University.objects.annotate(course_count=Count("courses")), request.query_params
        )

        # Paginate only when asked, so existing plain-array callers keep working.
        if "page" in request.query_params or "pageSize" in request.query_params:
            paginator = RegistryPageNumberPagination()
            page = paginator.paginate_queryset(universities, request, view=self)
            response = paginator.get_paginated_response(UniversitySerializer(page, many=True).data)
            response.data["summary"] = university_summary()
            return response
        return Response(UniversitySerializer(universities, many=True).data)

    def post(self, request) -> Response:
        serializer = UniversitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            university = serializer.save(
                created_by_id=getattr(request.user, "user_id", request.user.id)
            )
        record_university_event(
            event="university_created", outcome="success", request=request, user=request.user
        )
        return Response(UniversitySerializer(university).data, status=status.HTTP_201_CREATED)


class UniversityExportView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = UNIVERSITY_MANAGEMENT_ROLES

    def get(self, request) -> StreamingHttpResponse:
        universities = filter_universities(
            University.objects.annotate(course_count=Count("courses")), request.query_params
        )
        requested = [c for c in request.query_params.get("columns", "").split(",") if c in UNIVERSITY_EXPORT_COLUMNS]
        keys = requested or list(UNIVERSITY_EXPORT_COLUMNS)
        header = [UNIVERSITY_EXPORT_COLUMNS[key][0] for key in keys]
        getters = [UNIVERSITY_EXPORT_COLUMNS[key][1] for key in keys]

        def rows():
            for university in universities.iterator(chunk_size=2000):
                yield [getter(university) for getter in getters]

        return stream_csv(header, rows(), dated_filename("philSA_List_of_Universities"))


class UniversityDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = UNIVERSITY_MANAGEMENT_ROLES
    throttle_classes = [MaintenanceWriteRateThrottle]
    throttle_scope = "maintenance_write"

    def get_object(self, university_id) -> University:
        return get_object_or_404(University, id=university_id)

    def get(self, request, university_id) -> Response:
        return Response(UniversitySerializer(self.get_object(university_id)).data)

    def put(self, request, university_id) -> Response:
        university = self.get_object(university_id)
        serializer = UniversitySerializer(university, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            updated = serializer.save()
        record_university_event(
            event="university_updated", outcome="success", request=request, user=request.user
        )
        return Response(UniversitySerializer(updated).data)

    def patch(self, request, university_id) -> Response:
        return self.put(request, university_id)

    def delete(self, request, university_id) -> Response:
        university = self.get_object(university_id)
        with transaction.atomic():
            university.delete()
        record_university_event(
            event="university_deleted", outcome="success", request=request, user=request.user
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CollegeCourseListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = UNIVERSITY_MANAGEMENT_ROLES
    throttle_classes = [MaintenanceWriteRateThrottle]
    throttle_scope = "maintenance_write"

    def get_university(self, university_id) -> University:
        return get_object_or_404(University, id=university_id)

    def get(self, request, university_id) -> Response:
        university = self.get_university(university_id)
        serializer = CollegeCourseSerializer(university.courses.all(), many=True)
        return Response(serializer.data)

    def post(self, request, university_id) -> Response:
        university = self.get_university(university_id)
        serializer = CollegeCourseSerializer(data=request.data, context={"university": university})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            course = serializer.save(university=university)
        record_college_course_event(
            event="college_course_created", outcome="success", request=request, user=request.user
        )
        return Response(CollegeCourseSerializer(course).data, status=status.HTTP_201_CREATED)


class CollegeCourseDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = UNIVERSITY_MANAGEMENT_ROLES
    throttle_classes = [MaintenanceWriteRateThrottle]
    throttle_scope = "maintenance_write"

    def get_object(self, university_id, course_id) -> CollegeCourse:
        return get_object_or_404(CollegeCourse, id=course_id, university_id=university_id)

    def get(self, request, university_id, course_id) -> Response:
        return Response(CollegeCourseSerializer(self.get_object(university_id, course_id)).data)

    def put(self, request, university_id, course_id) -> Response:
        course = self.get_object(university_id, course_id)
        serializer = CollegeCourseSerializer(course, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            updated = serializer.save()
        record_college_course_event(
            event="college_course_updated", outcome="success", request=request, user=request.user
        )
        return Response(CollegeCourseSerializer(updated).data)

    def patch(self, request, university_id, course_id) -> Response:
        return self.put(request, university_id, course_id)

    def delete(self, request, university_id, course_id) -> Response:
        course = self.get_object(university_id, course_id)
        with transaction.atomic():
            course.delete()
        record_college_course_event(
            event="college_course_deleted", outcome="success", request=request, user=request.user
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
