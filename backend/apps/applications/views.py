from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ObjectScopePermission, RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole

from .audit import record_application_event
from .models import StudentApplication
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationSerializer,
    ApplicationSubmitSerializer,
    ApplicationUpdateSerializer,
    LrnVerificationSerializer,
    ReviewerDecisionSerializer,
    Step2ConfigurationSerializer,
    Step2MediaUploadSerializer,
    Step2ManualDecisionSerializer,
)
from .services import (active_step2_configuration, create_draft, decide_application,
                       decide_step2_manual_review, get_step2_verification, serialize_step2, submit_application,
                       update_draft, upload_step2_media, verify_lrn)
from .models import Step2VerificationConfiguration
from .throttling import DeviceScopedRateThrottle


class LrnVerificationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [DeviceScopedRateThrottle]
    throttle_scope = "registration_lrn_verify"

    def post(self, request) -> Response:
        serializer = LrnVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = verify_lrn(
            lrn=serializer.validated_data["lrn"],
            date_of_birth=serializer.validated_data["dateOfBirth"],
        )
        record_application_event(event="registration_lrn_verified", outcome="success", request=request)
        return Response(result)


class PublicStep2ConfigurationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request) -> Response:
        return Response(active_step2_configuration())


class Step2VerificationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    @staticmethod
    def token(request) -> str:
        return request.headers.get("X-Registration-Token", "")

    def get(self, request) -> Response:
        return Response(serialize_step2(get_step2_verification(self.token(request))))

    def post(self, request) -> Response:
        serializer = Step2MediaUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = upload_step2_media(token=self.token(request), media_type=serializer.validated_data["mediaType"],
                                          uploaded_file=serializer.validated_data["file"])
        record_application_event(event="registration_step2_media_uploaded", outcome="success", request=request)
        return Response(serialize_step2(verification))


class Step2ConfigurationAdminView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.SYSTEM_ADMIN, PortalRole.DEPED_ADMIN)

    def get(self, request) -> Response:
        return Response(Step2ConfigurationSerializer(Step2VerificationConfiguration.objects.all(), many=True).data)

    def post(self, request) -> Response:
        serializer = Step2ConfigurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        configuration = serializer.save(created_by_id=getattr(request.user, "user_id", request.user.id))
        record_application_event(event="step2_configuration_created", outcome="success", request=request, user=request.user)
        return Response(Step2ConfigurationSerializer(configuration).data, status=status.HTTP_201_CREATED)


class Step2ManualDecisionView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.SYSTEM_ADMIN, PortalRole.DEPED_ADMIN, PortalRole.ADMISSIONS_REVIEWER)

    def post(self, request, verification_id) -> Response:
        serializer = Step2ManualDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = decide_step2_manual_review(verification_id=verification_id, actor=request.user, **serializer.validated_data)
        record_application_event(event="registration_step2_manual_decision", outcome="success", request=request, user=request.user)
        return Response(serialize_step2(verification))


class ApplicationCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        serializer = ApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification_token = serializer.validated_data.pop("verificationToken")
        submit_on_create = serializer.validated_data.pop("submitOnCreate", False)
        owner = request.user if getattr(request.user, "is_authenticated", False) else None
        application = create_draft(
            owner=owner,
            verification_token=verification_token,
            data=serializer.validated_data,
            submit_on_create=submit_on_create,
        )
        event = "application_submitted" if submit_on_create else "application_draft_created"
        record_application_event(event=event, outcome="success", request=request, user=owner)
        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class ApplicationReviewQueueView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.ADMISSIONS_REVIEWER, PortalRole.SYSTEM_ADMIN)

    def get(self, request) -> Response:
        applications = (
            StudentApplication.objects.exclude(status__in=["DRAFT"])
            .order_by("-submitted_at", "-created_at")
        )
        return Response(ApplicationSerializer(applications, many=True).data)


class ApplicationReviewerDecisionView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.ADMISSIONS_REVIEWER, PortalRole.SYSTEM_ADMIN)

    def post(self, request, application_id) -> Response:
        serializer = ReviewerDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = get_object_or_404(StudentApplication, id=application_id)
        decided = decide_application(
            application_id=application.id,
            actor=request.user,
            decision=serializer.validated_data["decision"],
            reason=serializer.validated_data.get("reason", ""),
            required_corrections=serializer.validated_data.get("requiredCorrections", []),
        )
        record_application_event(
            event="application_reviewer_decision",
            outcome="success",
            request=request,
            user=request.user,
        )
        return Response(ApplicationSerializer(decided).data)


class ApplicationDetailView(APIView):
    permission_classes = [RoleRequiredPermission, ObjectScopePermission]
    required_roles = require_roles(PortalRole.STUDENT)

    def get_object(self, request, application_id) -> StudentApplication:
        application = get_object_or_404(StudentApplication, id=application_id)
        self.check_object_permissions(request, application)
        return application

    def get(self, request, application_id) -> Response:
        return Response(ApplicationSerializer(self.get_object(request, application_id)).data)

    def patch(self, request, application_id) -> Response:
        application = self.get_object(request, application_id)
        serializer = ApplicationUpdateSerializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        expected_version = serializer.validated_data.pop("version")
        updated = update_draft(application_id=application.id, owner=request.user, expected_version=expected_version, data=serializer.validated_data)
        record_application_event(event="application_draft_updated", outcome="success", request=request, user=request.user)
        return Response(ApplicationSerializer(updated).data)


class ApplicationSubmitView(APIView):
    permission_classes = [RoleRequiredPermission, ObjectScopePermission]
    required_roles = require_roles(PortalRole.STUDENT)

    def post(self, request, application_id) -> Response:
        application = get_object_or_404(StudentApplication, id=application_id)
        self.check_object_permissions(request, application)
        serializer = ApplicationSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted = submit_application(application_id=application.id, owner=request.user, expected_version=serializer.validated_data["version"])
        record_application_event(event="application_submitted", outcome="success", request=request, user=request.user)
        return Response(ApplicationSerializer(submitted).data)
