from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles

from .audit import record_college_course_event, record_university_event
from .models import CollegeCourse, University
from .serializers import CollegeCourseSerializer, UniversitySerializer


UNIVERSITY_MANAGEMENT_ROLES = require_roles(
    "SYSTEM_ADMIN",
    "UNIVERSITY_ADMIN",
    "ADMISSIONS_REVIEWER",
)


class UniversityListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = UNIVERSITY_MANAGEMENT_ROLES

    def get(self, request) -> Response:
        universities = University.objects.annotate(course_count=Count("courses"))
        serializer = UniversitySerializer(universities, many=True)
        return Response(serializer.data)

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


class UniversityDetailView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = UNIVERSITY_MANAGEMENT_ROLES

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
