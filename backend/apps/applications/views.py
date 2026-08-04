from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import ObjectScopePermission, RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole, get_user_role

from .audit import record_application_event
from .models import StudentApplication
from .models import ApplicationAuditLog
from .serializers import (
    ApplicationAuditLogSerializer,
    ApplicationCreateSerializer,
    ApplicationSerializer,
    ApplicationSubmitSerializer,
    ApplicationUpdateSerializer,
    LrnVerificationSerializer,
    RegistrationAttachmentSerializer,
    RegistrationAttachmentUploadSerializer,
    RegistrationEmailOtpRequestSerializer,
    RegistrationEmailOtpVerifySerializer,
    RegistrationIdentitySelfieFaceValidationSerializer,
    RegistrationIdentitySelfieUploadSerializer,
    ReviewerDecisionSerializer,
    Step2ConfigurationSerializer,
    Step2MediaUploadSerializer,
    Step2ManualDecisionSerializer,
)
from .services import (active_step2_configuration, create_draft, decide_application,
                       decide_step2_manual_review, get_step2_verification, serialize_step2, submit_application,
                       update_draft, upload_step2_media, validate_manual_registration_selfie_face,
                       validate_registration_selfie_face, request_registration_email_otp,
                       upload_registration_attachment, verify_registration_email_otp, verify_lrn)
from .models import IdentityMediaType, Step2VerificationConfiguration
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
            verification_category=serializer.validated_data.get("verificationCategory", ""),
            verification_value=serializer.validated_data.get("verificationValue", ""),
            client_identifier=DeviceScopedRateThrottle().get_ident(request),
        )
        record_application_event(event="registration_lrn_verified", outcome="success", request=request)
        return Response(result)


class RegistrationEmailOtpRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [DeviceScopedRateThrottle]
    throttle_scope = "registration_email_otp"

    def post(self, request) -> Response:
        serializer = RegistrationEmailOtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = request_registration_email_otp(email=serializer.validated_data["email"])
        record_application_event(event="registration_email_otp_requested", outcome="success", request=request)
        return Response(result)


class RegistrationEmailOtpVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [DeviceScopedRateThrottle]
    throttle_scope = "registration_email_otp"

    def post(self, request) -> Response:
        serializer = RegistrationEmailOtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = verify_registration_email_otp(
            email=serializer.validated_data["email"],
            code=serializer.validated_data["code"],
        )
        return Response(result)


class RegistrationAttachmentUploadView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request) -> Response:
        serializer = RegistrationAttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = upload_registration_attachment(
            registration_session_id=request.headers.get("X-Registration-Session-Id", ""),
            field_name=serializer.validated_data["fieldName"],
            uploaded_file=serializer.validated_data["file"],
        )
        record_application_event(event="registration_attachment_uploaded", outcome="success", request=request)
        return Response(RegistrationAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)


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


class RegistrationIdentitySelfieView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    @staticmethod
    def token(request) -> str:
        return request.headers.get("X-Registration-Token", "")

    def post(self, request) -> Response:
        serializer = RegistrationIdentitySelfieUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = upload_step2_media(
            token=self.token(request),
            media_type=IdentityMediaType.SELFIE,
            uploaded_file=serializer.validated_data["file"],
            step1_identity_selfie=True,
        )
        record_application_event(event="registration_identity_selfie_uploaded", outcome="success", request=request)
        return Response(serialize_step2(verification))


class RegistrationIdentitySelfieFaceValidationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [DeviceScopedRateThrottle]
    throttle_scope = "registration_selfie_face"

    @staticmethod
    def token(request) -> str:
        return request.headers.get("X-Registration-Token", "")

    def post(self, request) -> Response:
        serializer = RegistrationIdentitySelfieFaceValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(validate_registration_selfie_face(token=self.token(request), uploaded_file=serializer.validated_data["file"]))


class RegistrationManualIdentitySelfieFaceValidationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [DeviceScopedRateThrottle]
    throttle_scope = "registration_selfie_face"

    def post(self, request) -> Response:
        serializer = RegistrationIdentitySelfieFaceValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(validate_manual_registration_selfie_face(uploaded_file=serializer.validated_data["file"]))


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
        verification_token = serializer.validated_data.pop("verificationToken", "")
        email_verification_token = serializer.validated_data.pop("emailVerificationToken", "")
        submit_on_create = serializer.validated_data.pop("submitOnCreate", False)
        owner = request.user if getattr(request.user, "is_authenticated", False) else None
        application = create_draft(
            owner=owner,
            verification_token=verification_token,
            email_verification_token=email_verification_token,
            data=serializer.validated_data,
            submit_on_create=submit_on_create,
            registration_session_id=request.headers.get("X-Registration-Session-Id", ""),
        )
        event = "application_submitted" if submit_on_create else "application_draft_created"
        record_application_event(event=event, outcome="success", request=request, user=owner, application=application)
        return Response(ApplicationSerializer(application, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ApplicationSubmittedAuditLogView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.ADMISSIONS_REVIEWER, PortalRole.SYSTEM_ADMIN)

    def get(self, request) -> Response:
        logs = ApplicationAuditLog.objects.filter(
            action__in=(
                "REGISTRATION_STUDENT_ACCOUNT_ACTIVATED",
                "REGISTRATION_SUBMITTED",
            ),
            outcome="success",
        ).order_by("-created_at")[:500]
        return Response(ApplicationAuditLogSerializer(logs, many=True).data)


class ApplicationReviewQueueView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.ADMISSIONS_REVIEWER, PortalRole.SYSTEM_ADMIN)

    def get(self, request) -> Response:
        applications = (
            StudentApplication.objects.exclude(status__in=["DRAFT"])
            .order_by("-submitted_at", "-created_at")
        )
        return Response(ApplicationSerializer(applications, many=True, context={"request": request}).data)


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
        if serializer.validated_data["decision"] == "APPROVE":
            record_application_event(
                event="student_account_activated",
                outcome="success",
                request=request,
                application=decided,
            )
        return Response(ApplicationSerializer(decided, context={"request": request}).data)


class ApplicationDetailView(APIView):
    permission_classes = [RoleRequiredPermission, ObjectScopePermission]
    required_roles = require_roles(PortalRole.STUDENT, PortalRole.ADMISSIONS_REVIEWER, PortalRole.SYSTEM_ADMIN)

    def can_access_object(self, user, obj, request) -> bool:
        role = get_user_role(user)
        if request.method.lower() == "get" and role in {PortalRole.ADMISSIONS_REVIEWER.value, PortalRole.SYSTEM_ADMIN.value}:
            return obj.status != "DRAFT"
        return obj.can_be_accessed_by(user, request.method.lower())

    def get_object(self, request, application_id) -> StudentApplication:
        application = get_object_or_404(StudentApplication, id=application_id)
        self.check_object_permissions(request, application)
        return application

    def get(self, request, application_id) -> Response:
        return Response(ApplicationSerializer(self.get_object(request, application_id), context={"request": request}).data)

    def patch(self, request, application_id) -> Response:
        application = self.get_object(request, application_id)
        serializer = ApplicationUpdateSerializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        expected_version = serializer.validated_data.pop("version")
        updated = update_draft(application_id=application.id, owner=request.user, expected_version=expected_version, data=serializer.validated_data)
        record_application_event(event="application_draft_updated", outcome="success", request=request, user=request.user)
        return Response(ApplicationSerializer(updated, context={"request": request}).data)


class ApplicationIdentityMediaView(ApplicationDetailView):
    def get(self, request, application_id, media_type) -> FileResponse:
        application = self.get_object(request, application_id)
        verification = getattr(application, "step2_verification", None)
        if media_type == IdentityMediaType.SELFIE:
            media = getattr(application, "registration_selfie", None)
            if media is None and verification is not None:
                media = getattr(verification, "registration_selfie", None)
        elif verification is None:
            media = None
        else:
            media = verification.media.filter(media_type=media_type).first()
        if media is None or not media.file.storage.exists(media.file.name):
            raise Http404("Application identity media not found.")
        return FileResponse(media.file.open("rb"), content_type=media.content_type)


class ApplicationAdditionalAttachmentView(ApplicationDetailView):
    def get(self, request, application_id, attachment_id) -> FileResponse:
        application = self.get_object(request, application_id)
        attachment = application.additional_attachments.filter(id=attachment_id).first()
        if attachment is None or not attachment.file.storage.exists(attachment.file.name):
            raise Http404("Application attachment not found.")
        response = FileResponse(attachment.file.open("rb"), content_type=attachment.content_type)
        safe_filename = attachment.original_filename.replace('"', "")
        response["Content-Disposition"] = f'inline; filename="{safe_filename}"'
        return response


class ApplicationSubmitView(APIView):
    permission_classes = [RoleRequiredPermission, ObjectScopePermission]
    required_roles = require_roles(PortalRole.STUDENT)

    def post(self, request, application_id) -> Response:
        application = get_object_or_404(StudentApplication, id=application_id)
        self.check_object_permissions(request, application)
        serializer = ApplicationSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted = submit_application(application_id=application.id, owner=request.user, expected_version=serializer.validated_data["version"])
        record_application_event(event="application_submitted", outcome="success", request=request, user=request.user, application=submitted)
        return Response(ApplicationSerializer(submitted, context={"request": request}).data)
