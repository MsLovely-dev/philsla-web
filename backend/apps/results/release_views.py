from django.db.models import Count, OuterRef, Q, Subquery
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole

from .models import ExaminationSession, ScoreBatchStatus, ScoreProcessingBatch, ScoreReleaseAuditLog, ScoreReleaseStatus, ScoreReviewStatus


class ReleaseSummaryQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(default=1, min_value=1, required=False)
    pageSize = serializers.IntegerField(default=25, min_value=1, max_value=100, required=False)
    status = serializers.ChoiceField(choices=ScoreBatchStatus.choices, required=False)
    search = serializers.CharField(default="", allow_blank=True, trim_whitespace=True, required=False)


class ResultsReleaseSummaryView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.EXAM_ADMINISTRATOR, PortalRole.SYSTEM_ADMIN)

    def get(self, request) -> Response:
        serializer = ReleaseSummaryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data

        latest_processing_batch = ScoreProcessingBatch.objects.filter(session_id=OuterRef("pk")).order_by("-started_at")
        latest_release_audit = ScoreReleaseAuditLog.objects.filter(session_id=OuterRef("pk")).order_by("-created_at")
        sessions = ExaminationSession.objects.annotate(
            total_candidates=Count("candidate_scores"),
            approved_scores=Count("candidate_scores", filter=Q(candidate_scores__review_status=ScoreReviewStatus.APPROVED)),
            processed_scores=Count("candidate_scores", filter=Q(candidate_scores__review_status=ScoreReviewStatus.APPROVED, candidate_scores__processed_at__isnull=False)),
            released_scores=Count("candidate_scores", filter=Q(candidate_scores__review_status=ScoreReviewStatus.APPROVED, candidate_scores__release_status=ScoreReleaseStatus.RELEASED)),
            latest_processed_at=Subquery(latest_processing_batch.values("completed_at")[:1]),
            latest_released_at=Subquery(latest_release_audit.values("created_at")[:1]),
        )
        if query.get("status"):
            sessions = sessions.filter(scoring_status=query["status"])
        if query["search"]:
            sessions = sessions.filter(Q(id__icontains=query["search"]) | Q(name__icontains=query["search"]))
        sessions = sessions.order_by("-created_at", "id")

        count = sessions.count()
        page = query["page"]
        page_size = query["pageSize"]
        page_sessions = sessions[(page - 1) * page_size:page * page_size]
        return Response({"count": count, "page": page, "pageSize": page_size, "results": [self._serialize_session(session) for session in page_sessions]})

    @staticmethod
    def _serialize_session(session: ExaminationSession) -> dict[str, object]:
        approved_scores = session.approved_scores
        processed_scores = session.processed_scores
        released_scores = session.released_scores
        return {
            "id": session.id,
            "name": session.name,
            "status": session.scoring_status,
            "isClosed": session.is_closed,
            "totalCandidates": session.total_candidates,
            "approvedScores": approved_scores,
            "excludedScores": session.total_candidates - approved_scores,
            "processedScores": processed_scores,
            "releasedScores": released_scores,
            "processedAt": session.latest_processed_at.isoformat() if session.latest_processed_at else None,
            "releasedAt": session.latest_released_at.isoformat() if session.latest_released_at else None,
            "processingReady": session.is_closed and approved_scores > 0 and session.scoring_status == ScoreBatchStatus.READY_FOR_PROCESSING,
            "releaseReady": processed_scores > 0 and released_scores == 0 and session.scoring_status == ScoreBatchStatus.SCORING_PROCESSED,
        }
