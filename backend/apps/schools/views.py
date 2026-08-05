from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles

from .audit import record_school_event
from .models import School
from .serializers import SchoolSerializer


SCHOOL_MANAGEMENT_ROLES = require_roles(
    "SYSTEM_ADMIN",
    "UNIVERSITY_ADMIN",
    "ADMISSIONS_REVIEWER",
)


class SchoolListCreateView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = SCHOOL_MANAGEMENT_ROLES

    def get(self, request) -> Response:
        serializer = SchoolSerializer(School.objects.all(), many=True)
        return Response(serializer.data)

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
