from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole

from .models import ExamReviewRecord
from .serializers import (
    ExamReviewAnswerSheetUploadSerializer,
    ExamReviewDetailSerializer,
    ExamReviewGradingStatusSerializer,
    ExamReviewItemScoreSerializer,
    ExamReviewRecordSerializer,
)
from .services import (
    release_exam_review,
    score_exam_review_item,
    set_exam_review_grading_status,
    upload_exam_review_answer_sheet,
)


EXAM_REVIEW_ROLES = require_roles(
    PortalRole.ADMISSIONS_REVIEWER,
    PortalRole.EXAM_ADMINISTRATOR,
    PortalRole.UNIVERSITY_ADMIN,
    PortalRole.SYSTEM_ADMIN,
)


class ExamReviewAccessMixin:
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_REVIEW_ROLES

    def get_permissions(self):
        if settings.EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS and not self.request.user.is_authenticated:
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self, request):
        records = ExamReviewRecord.objects.select_related(
            "application",
            "application__personal_info",
        ).prefetch_related("answer_sheets", "review_items")
        if settings.EXAM_REVIEW_ALLOW_SYNTHETIC_DEV_ACCESS and not request.user.is_authenticated:
            return records.filter(application__exam_cycle_id="DEMO-2026")
        return records


class ExamReviewQueueView(ExamReviewAccessMixin, APIView):
    def get(self, request) -> Response:
        return Response(ExamReviewRecordSerializer(self.get_queryset(request), many=True).data)


class ExamReviewDetailView(ExamReviewAccessMixin, APIView):
    def get(self, request, review_id) -> Response:
        record = get_object_or_404(self.get_queryset(request), id=review_id)
        return Response(ExamReviewDetailSerializer(record).data)


class ExamReviewReleaseView(ExamReviewAccessMixin, APIView):
    def post(self, request, review_id) -> Response:
        record = get_object_or_404(self.get_queryset(request), id=review_id)
        released = release_exam_review(review_id=record.id, actor=request.user)
        return Response(ExamReviewDetailSerializer(released).data)


class ExamReviewGradingStatusView(ExamReviewAccessMixin, APIView):
    def post(self, request, review_id) -> Response:
        serializer = ExamReviewGradingStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = get_object_or_404(self.get_queryset(request), id=review_id)
        updated = set_exam_review_grading_status(
            review_id=record.id,
            status=serializer.validated_data["status"],
            actor=request.user,
        )
        return Response(ExamReviewRecordSerializer(updated).data)


class ExamReviewAnswerSheetUploadView(ExamReviewAccessMixin, APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, review_id) -> Response:
        serializer = ExamReviewAnswerSheetUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = get_object_or_404(self.get_queryset(request), id=review_id)
        updated = upload_exam_review_answer_sheet(
            review_id=record.id,
            uploaded_file=serializer.validated_data["file"],
            template_source=serializer.validated_data["templateSource"],
            actor=request.user,
        )
        return Response(ExamReviewDetailSerializer(updated).data)


class ExamReviewItemScoreView(ExamReviewAccessMixin, APIView):
    def post(self, request, review_id, item_id) -> Response:
        serializer = ExamReviewItemScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = get_object_or_404(self.get_queryset(request), id=review_id)
        item = get_object_or_404(record.review_items, id=item_id)
        updated = score_exam_review_item(
            review_id=record.id,
            item_id=item.id,
            points=serializer.validated_data["points"],
            actor=request.user,
        )
        return Response(ExamReviewDetailSerializer(updated).data)
