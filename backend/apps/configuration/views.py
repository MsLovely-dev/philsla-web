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
from .models import CollegeCourse, ConfigurableField, University
from .permissions import UniversityRegistryPermission, assigned_university_ids
from .serializers import (
    CollegeCourseInputSerializer,
    CollegeCourseListQuerySerializer,
    CollegeCourseSerializer,
    ConfigurableFieldSerializer,
    RegistryVersionSerializer,
    UniversityInputSerializer,
    UniversityListQuerySerializer,
    UniversitySerializer,
)
from .services import (
    create_college_course,
    create_university,
    delete_college_course,
    delete_university,
    update_college_course,
    update_university,
)


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
    duplicate_exists = ConfigurableField.objects.filter(
        module=STUDENT_REGISTRATION_MODULE,
        section=STEP_1_REGISTRATION_SECTION,
        field_type=VERIFICATION_METHOD_TYPE,
        field_name=field.field_name,
    ).exclude(id=field.id).exists()
    if duplicate_exists:
        raise ValidationError({"value": ["This registration method already exists."]})


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
    if is_student_registration_verification_method(field):
        raise ValidationError({"type": ["Predefined registration methods cannot be deleted."]})


def build_configurable_field_candidate(
    attrs: dict,
    instance: ConfigurableField | None = None,
) -> ConfigurableField:
    candidate = ConfigurableField()
    if instance is not None:
        candidate.id = instance.id
        candidate.module = instance.module
        candidate.section = instance.section
        candidate.field_type = instance.field_type
        candidate.field_name = instance.field_name
        candidate.field_section = instance.field_section
        candidate.input_type = instance.input_type
        candidate.option_values = instance.option_values
        candidate.priority = instance.priority
        candidate.remarks = instance.remarks
        candidate.is_enabled = instance.is_enabled
        candidate.display_order = instance.display_order

    for key, value in attrs.items():
        setattr(candidate, key, value)

    return candidate


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
            candidate = build_configurable_field_candidate(serializer.validated_data)
            validate_verification_method_value(candidate)
            enforce_verification_method_policy(candidate)
            field = serializer.save(created_by_id=getattr(request.user, "user_id", request.user.id))
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
            candidate = build_configurable_field_candidate(serializer.validated_data, field)
            validate_verification_method_value(candidate)
            enforce_verification_method_policy(candidate)
            updated = serializer.save()
        record_configuration_event(event="configurable_field_updated", outcome="success", request=request, user=request.user)
        return Response(ConfigurableFieldSerializer(updated).data)

    def put(self, request, field_id) -> Response:
        field = self.get_object(field_id)
        serializer = ConfigurableFieldSerializer(field, data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            candidate = build_configurable_field_candidate(serializer.validated_data, field)
            validate_verification_method_value(candidate)
            enforce_verification_method_policy(candidate)
            updated = serializer.save()
        record_configuration_event(event="configurable_field_updated", outcome="success", request=request, user=request.user)
        return Response(ConfigurableFieldSerializer(updated).data)

    def delete(self, request, field_id) -> Response:
        field = self.get_object(field_id)
        with transaction.atomic():
            assert_can_delete(field)
            field.delete()
        record_configuration_event(event="configurable_field_deleted", outcome="success", request=request, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


UNIVERSITY_ORDERING = {
    "code": "code",
    "name": "name",
    "region": "region",
    "city": "city",
    "createdAt": "created_at",
    "-createdAt": "-created_at",
}
COURSE_ORDERING = {
    "programCode": "program_code",
    "programName": "program_name",
    "collegeName": "college_name",
    "createdAt": "created_at",
    "-createdAt": "-created_at",
}


def actor_id(request):
    return getattr(request.user, "user_id", request.user.id)


def restrict_universities_to_assigned_scope(request, universities):
    assigned_ids = assigned_university_ids(request)
    if assigned_ids is None:
        return universities
    return universities.filter(id__in=assigned_ids)


class UniversityAdminListView(APIView):
    permission_classes = [UniversityRegistryPermission]
    creates_university = True

    def get(self, request) -> Response:
        query_serializer = UniversityListQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        query = query_serializer.validated_data
        scoped_universities = restrict_universities_to_assigned_scope(request, University.objects.all())
        summary = scoped_universities.aggregate(
            totalUniversities=Count("id", distinct=True),
            publicUniversities=Count("id", filter=Q(classification="Public"), distinct=True),
            privateUniversities=Count("id", filter=Q(classification="Private"), distinct=True),
            totalDegreeCourses=Count("college_courses"),
        )
        universities = scoped_universities.annotate(course_count=Count("college_courses"))
        if query.get("search"):
            search = query["search"]
            universities = universities.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(city__icontains=search)
            )
        if query.get("classification"):
            universities = universities.filter(classification=query["classification"])
        if query.get("region"):
            universities = universities.filter(region=query["region"])
        if query.get("status"):
            universities = universities.filter(status=query["status"])
        universities = universities.order_by(UNIVERSITY_ORDERING[query["ordering"]], "id")

        paginator = StandardPageNumberPagination()
        page = paginator.paginate_queryset(universities, request, view=self)
        response = paginator.get_paginated_response(UniversitySerializer(page, many=True).data)
        response.data["summary"] = summary
        return response

    def post(self, request) -> Response:
        serializer = UniversityInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.pop("expected_version", None)
        university = create_university(actor_id=actor_id(request), data=data)
        record_configuration_event(event="university_created", outcome="success", request=request, user=request.user)
        return Response(UniversitySerializer(university).data, status=status.HTTP_201_CREATED)


class UniversityAdminDetailView(APIView):
    permission_classes = [UniversityRegistryPermission]

    def get_object(self, request, university_id) -> University:
        university = get_object_or_404(University.objects.annotate(course_count=Count("college_courses")), id=university_id)
        self.check_object_permissions(request, university)
        return university

    def get(self, request, university_id) -> Response:
        return Response(UniversitySerializer(self.get_object(request, university_id)).data)

    def patch(self, request, university_id) -> Response:
        current = self.get_object(request, university_id)
        serializer = UniversityInputSerializer(current, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        expected_version = data.pop("expected_version")
        university = update_university(university_id=university_id, expected_version=expected_version, data=data)
        record_configuration_event(event="university_updated", outcome="success", request=request, user=request.user)
        return Response(UniversitySerializer(university).data)

    def put(self, request, university_id) -> Response:
        current = self.get_object(request, university_id)
        serializer = UniversityInputSerializer(current, data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        expected_version = data.pop("expected_version")
        university = update_university(university_id=university_id, expected_version=expected_version, data=data)
        record_configuration_event(event="university_updated", outcome="success", request=request, user=request.user)
        return Response(UniversitySerializer(university).data)

    def delete(self, request, university_id) -> Response:
        self.get_object(request, university_id)
        version_serializer = RegistryVersionSerializer(data=request.query_params)
        version_serializer.is_valid(raise_exception=True)
        delete_university(university_id=university_id, expected_version=version_serializer.validated_data["version"])
        record_configuration_event(event="university_deleted", outcome="success", request=request, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CollegeCourseAdminListView(APIView):
    permission_classes = [UniversityRegistryPermission]

    def get_university(self, request, university_id) -> University:
        university = get_object_or_404(University, id=university_id)
        self.check_object_permissions(request, university)
        return university

    def get(self, request, university_id) -> Response:
        university = self.get_university(request, university_id)
        query_serializer = CollegeCourseListQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        query = query_serializer.validated_data
        courses = university.college_courses.select_related("university")
        if query.get("search"):
            search = query["search"]
            courses = courses.filter(
                Q(program_code__icontains=search)
                | Q(program_name__icontains=search)
                | Q(college_name__icontains=search)
            )
        if query.get("collegeName"):
            courses = courses.filter(college_name=query["collegeName"])
        if query.get("status"):
            courses = courses.filter(status=query["status"])
        courses = courses.order_by(COURSE_ORDERING[query["ordering"]], "id")

        paginator = StandardPageNumberPagination()
        page = paginator.paginate_queryset(courses, request, view=self)
        return paginator.get_paginated_response(CollegeCourseSerializer(page, many=True).data)

    def post(self, request, university_id) -> Response:
        university = self.get_university(request, university_id)
        serializer = CollegeCourseInputSerializer(data=request.data, context={"university_id": university.id})
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.pop("expected_version", None)
        course = create_college_course(
            university=university,
            actor_id=actor_id(request),
            data=data,
        )
        record_configuration_event(event="college_course_created", outcome="success", request=request, user=request.user)
        return Response(CollegeCourseSerializer(course).data, status=status.HTTP_201_CREATED)


class CollegeCourseAdminDetailView(APIView):
    permission_classes = [UniversityRegistryPermission]

    def get_object(self, request, university_id, course_id) -> CollegeCourse:
        course = get_object_or_404(
            CollegeCourse.objects.select_related("university"),
            id=course_id,
            university_id=university_id,
        )
        self.check_object_permissions(request, course)
        return course

    def get(self, request, university_id, course_id) -> Response:
        return Response(CollegeCourseSerializer(self.get_object(request, university_id, course_id)).data)

    def patch(self, request, university_id, course_id) -> Response:
        current = self.get_object(request, university_id, course_id)
        serializer = CollegeCourseInputSerializer(
            current,
            data=request.data,
            partial=True,
            context={"university_id": university_id},
        )
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        expected_version = data.pop("expected_version")
        course = update_college_course(
            university_id=university_id,
            course_id=course_id,
            expected_version=expected_version,
            data=data,
        )
        record_configuration_event(event="college_course_updated", outcome="success", request=request, user=request.user)
        return Response(CollegeCourseSerializer(course).data)

    def put(self, request, university_id, course_id) -> Response:
        current = self.get_object(request, university_id, course_id)
        serializer = CollegeCourseInputSerializer(
            current,
            data=request.data,
            context={"university_id": university_id},
        )
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        expected_version = data.pop("expected_version")
        course = update_college_course(
            university_id=university_id,
            course_id=course_id,
            expected_version=expected_version,
            data=data,
        )
        record_configuration_event(event="college_course_updated", outcome="success", request=request, user=request.user)
        return Response(CollegeCourseSerializer(course).data)

    def delete(self, request, university_id, course_id) -> Response:
        self.get_object(request, university_id, course_id)
        version_serializer = RegistryVersionSerializer(data=request.query_params)
        version_serializer.is_valid(raise_exception=True)
        delete_college_course(
            university_id=university_id,
            course_id=course_id,
            expected_version=version_serializer.validated_data["version"],
        )
        record_configuration_event(event="college_course_deleted", outcome="success", request=request, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
