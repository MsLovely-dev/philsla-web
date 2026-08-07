from __future__ import annotations

import csv

from django.db.models import Count, OuterRef, Q, Subquery
from django.http import StreamingHttpResponse
from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole
from apps.applications.models import ApplicationAuditLog, ApplicationStatus, IdentityMediaType, StudentApplication

from .models import CandidateScore, ExaminationSession, ScoreBatchStatus, ScoreProcessingBatch, ScoreReviewStatus
from .serializers import ScoreProcessRequestSerializer, ScoreResultsQuerySerializer
from .services import ScoreProcessingError, process_score_session, release_score_session


PROFILE_PERSONAL_FIELDS = (
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "extensionName",
    "dateOfBirth",
    "sex",
    "email",
    "mobile",
    "identityVerificationStatus",
    "isPwd",
    "pwdType",
    "pwdCondition",
    "pwdIdNumber",
    "pwdIdFilename",
    "pwdAccommodation",
)
PROFILE_ADDRESS_FIELDS = ("region", "province", "city", "barangay", "street", "postalCode")
PROFILE_SCHOOL_FIELDS = ("lrn", "schoolId", "name", "academicTrack", "gradeLevel", "enrollmentStatus", "schoolYear", "gwa")
PROFILE_REVIEW_FIELDS = ("reviewerReason", "reason", "reviewNotes", "requiredCorrections")


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "The request conflicts with the current data state."
    default_code = "conflict"


def _get_session(session_id: str) -> ExaminationSession:
    try:
        return ExaminationSession.objects.get(id=session_id)
    except ExaminationSession.DoesNotExist as exc:
        raise NotFound("Examination session not found.") from exc


def _serialize_batch(session: ExaminationSession) -> dict[str, object]:
    latest_batch_id = getattr(session, "latest_processing_batch_id", "") or ""
    latest_completed_at = getattr(session, "latest_processing_completed_at", None)
    processed_count = getattr(session, "latest_processing_processed_count", None) or 0
    excluded_count = getattr(session, "latest_processing_excluded_count", None) or 0
    total_work = (processed_count + excluded_count) if latest_batch_id else session.total_candidates
    progress = 100 if latest_completed_at else 0
    return {
        "id": session.id,
        "name": session.name,
        "status": session.scoring_status,
        "isClosed": session.is_closed,
        "totalCandidates": session.total_candidates,
        "approvedScores": session.approved_scores,
        "excludedScores": session.total_candidates - session.approved_scores,
        "processingBatchId": latest_batch_id,
        "processedAt": latest_completed_at.isoformat() if latest_completed_at else None,
        "processedBy": getattr(session, "latest_processing_processed_by", None),
        "processedCount": processed_count,
        "processingProgress": progress if total_work else 0,
    }


def _serialize_score(score: CandidateScore) -> dict[str, object]:
    return {
        "id": score.id,
        "candidateId": score.candidate_id,
        "lrn": score.lrn,
        "candidateName": score.candidate_name,
        "sessionId": score.session_id,
        "rankingPopulationId": score.ranking_population_id,
        "examSetId": score.exam_set_id,
        "rawScore": score.raw_score,
        "maxScore": score.max_score,
        "finalScore": float(score.final_score),
        "overallRank": score.overall_rank,
        "percentile": float(score.percentile) if score.percentile is not None else None,
        "releaseStatus": score.release_status,
        "processingBatchId": score.processing_batch_id,
    }


def _serialize_profile(application: StudentApplication | None, request) -> dict[str, object] | None:
    if application is None:
        return None
    return {
        "id": str(application.id),
        "candidateId": application.candidate_id,
        "status": application.status,
        "photoUrl": _profile_photo_url(application, request),
        "personal": _only_fields(application.personal, PROFILE_PERSONAL_FIELDS),
        "address": _only_fields(application.address, PROFILE_ADDRESS_FIELDS),
        "school": _only_fields(application.school, PROFILE_SCHOOL_FIELDS),
        "coursePreferences": [_only_fields(preference, ("university", "course")) for preference in application.course_preferences],
        "reviewStep": _only_fields(application.review_step, PROFILE_REVIEW_FIELDS),
        "activityLogs": [_serialize_profile_activity(log) for log in _profile_activity_logs(application)],
        "examCycleId": application.exam_cycle_id,
        "submittedAt": application.submitted_at.isoformat() if application.submitted_at else None,
    }


def _only_fields(source: dict, fields: tuple[str, ...]) -> dict[str, object]:
    return {field: source[field] for field in fields if field in source}


def _profile_photo_url(application: StudentApplication, request) -> str:
    media_type = ""
    if hasattr(application, "registration_selfie"):
        media_type = IdentityMediaType.SELFIE
    else:
        verification = getattr(application, "step2_verification", None)
        if verification is not None and hasattr(verification, "registration_selfie"):
            media_type = IdentityMediaType.SELFIE
        elif verification is not None and verification.media.filter(media_type=IdentityMediaType.STUDENT_ID_FRONT).exists():
            media_type = IdentityMediaType.STUDENT_ID_FRONT
    if not media_type:
        return ""
    url = reverse("applications:identity-media", args=[application.id, media_type])
    return request.build_absolute_uri(url) if request is not None else url


def _profile_activity_logs(application: StudentApplication):
    return ApplicationAuditLog.objects.filter(application=application).order_by("-created_at")[:25]


def _score_profile_application(score: CandidateScore) -> StudentApplication | None:
    applications = list(
        StudentApplication.objects.filter(lrn=score.lrn)
        .exclude(status__in=[ApplicationStatus.DRAFT, ApplicationStatus.REJECTED])
        .order_by("-submitted_at", "-created_at")[:2],
    )
    if len(applications) > 1:
        raise Conflict("Multiple application profiles match this score record; profile display requires an unambiguous score anchor.")
    return applications[0] if applications else None


def _serialize_profile_activity(log: ApplicationAuditLog) -> dict[str, object]:
    return {
        "id": log.id,
        "action": log.action,
        "event": log.event,
        "outcome": log.outcome,
        "timestamp": log.created_at.isoformat(),
        "sessionId": log.session_id,
        "ipAddress": log.ip_address,
        "deviceBrowser": log.user_agent,
        "registrationId": log.registration_id,
        "applicantId": log.applicant_id,
        "actorRole": log.actor_role,
        "correlationId": log.correlation_id,
    }


def _page_bounds(validated_query: dict[str, int], total_count: int) -> tuple[int, int, int, int]:
    page = validated_query["page"]
    page_size = validated_query["pageSize"]
    start = (page - 1) * page_size
    end = min(start + page_size, total_count)
    return page, page_size, start, end


class ScoreManagementBaseView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.SYSTEM_ADMIN)


class ScoreReleaseOperatorBaseView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(PortalRole.EXAM_ADMINISTRATOR, PortalRole.SYSTEM_ADMIN)


class ScoreManagementBatchListView(ScoreManagementBaseView):
    def get(self, request) -> Response:
        latest_batch = ScoreProcessingBatch.objects.filter(session=OuterRef("pk")).order_by("-started_at")
        sessions = ExaminationSession.objects.annotate(
            total_candidates=Count("candidate_scores"),
            approved_scores=Count("candidate_scores", filter=Q(candidate_scores__review_status=ScoreReviewStatus.APPROVED)),
            latest_processing_batch_id=Subquery(latest_batch.values("id")[:1]),
            latest_processing_completed_at=Subquery(latest_batch.values("completed_at")[:1]),
            latest_processing_processed_by=Subquery(latest_batch.values("processed_by_identifier")[:1]),
            latest_processing_processed_count=Subquery(latest_batch.values("processed_record_count")[:1]),
            latest_processing_excluded_count=Subquery(latest_batch.values("excluded_record_count")[:1]),
        ).order_by("-created_at", "id")
        return Response({"count": sessions.count(), "results": [_serialize_batch(session) for session in sessions]})


class ScoreManagementProcessView(ScoreReleaseOperatorBaseView):
    def post(self, request, session_id: str) -> Response:
        serializer = ScoreProcessRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        allow_reprocessing = serializer.validated_data["allowReprocessing"]
        try:
            batch = process_score_session(
                session_id=session_id,
                processed_by=request.user,
                allow_reprocessing=allow_reprocessing,
            )
        except ScoreProcessingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "id": session_id,
                "status": batch.status,
                "processingBatchId": batch.id,
                "processedBy": batch.processed_by_identifier,
                "processedCount": batch.processed_record_count,
                "excludedCount": batch.excluded_record_count,
                "processingProgress": 100 if batch.completed_at else 0,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class ScoreManagementBatchResultsView(ScoreManagementBaseView):
    def get(self, request, session_id: str) -> Response:
        serializer = ScoreResultsQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        _get_session(session_id)
        scores = CandidateScore.objects.filter(
            session_id=session_id,
            review_status=ScoreReviewStatus.APPROVED,
        )
        query = serializer.validated_data["search"]
        if query:
            scores = scores.filter(
                Q(candidate_id__istartswith=query) | Q(lrn__istartswith=query) | Q(candidate_name__icontains=query),
            )
        release_status = serializer.validated_data.get("releaseStatus")
        if release_status:
            scores = scores.filter(release_status=release_status)
        scores = scores.order_by(*_score_ordering(serializer.validated_data["sortKey"], serializer.validated_data["sortDirection"]))
        total_count = scores.count()
        page, page_size, start, end = _page_bounds(serializer.validated_data, total_count)
        return Response(
            {
                "count": total_count,
                "page": page,
                "pageSize": page_size,
                "results": [_serialize_score(score) for score in scores[start:end]],
            },
        )


class ScoreManagementCandidateProfileView(ScoreManagementBaseView):
    def get(self, request, session_id: str, candidate_id: str) -> Response:
        try:
            score = CandidateScore.objects.get(
                session_id=session_id,
                candidate_id=candidate_id,
                review_status=ScoreReviewStatus.APPROVED,
            )
        except CandidateScore.DoesNotExist as exc:
            raise NotFound("Candidate score record not found for this examination session.") from exc

        application = _score_profile_application(score)
        return Response({"score": _serialize_score(score), "profile": _serialize_profile(application, request)})


class ScoreManagementBatchReleaseView(ScoreReleaseOperatorBaseView):
    def post(self, request, session_id: str) -> Response:
        try:
            release_result = release_score_session(session_id=session_id, released_by=request.user)
        except ScoreProcessingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "id": session_id,
                "status": ScoreBatchStatus.RESULTS_RELEASED,
                "releasedCount": release_result.released_count,
                "notificationQueuedCount": release_result.notification_queued_count,
                "notificationSkippedCount": release_result.notification_skipped_count,
                "notificationFailedCount": release_result.notification_failed_count,
            },
        )


class Echo:
    def write(self, value):
        return value


class ScoreManagementBatchExportView(ScoreManagementBaseView):
    def get(self, request, session_id: str) -> StreamingHttpResponse:
        _get_session(session_id)
        scores = CandidateScore.objects.filter(
            session_id=session_id,
            review_status=ScoreReviewStatus.APPROVED,
            overall_rank__isnull=False,
        ).order_by("ranking_population_id", "overall_rank", "-final_score", "candidate_name", "candidate_id")

        writer = csv.writer(Echo())

        def rows():
            yield writer.writerow([
                "candidate_id",
                "candidate_name",
                "exam_set_id",
                "raw_score",
                "max_score",
                "final_score",
                "percentile",
                "overall_rank",
                "release_status",
            ])
            for score in scores.iterator(chunk_size=5000):
                yield writer.writerow([
                    _csv_safe(score.candidate_id),
                    _csv_safe(score.candidate_name),
                    _csv_safe(score.exam_set_id),
                    score.raw_score,
                    score.max_score,
                    score.final_score,
                    score.percentile,
                    score.overall_rank,
                    score.release_status,
                ])

        response = StreamingHttpResponse(rows(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{session_id}-score-results.csv"'
        return response


def _csv_safe(value: object) -> str:
    text = str(value)
    if text.startswith(("=", "+", "-", "@")):
        return f"'{text}"
    return text


def _score_ordering(sort_key: str, direction: str) -> tuple[str, ...]:
    field_map = {
        "candidateId": "candidate_id",
        "candidateName": "candidate_name",
        "examName": "session_id",
        "finalScore": "final_score",
        "percentile": "percentile",
        "rank": "overall_rank",
        "releaseStatus": "release_status",
    }
    field = field_map[sort_key]
    primary = field if direction == "asc" else f"-{field}"
    return (primary, "candidate_name", "candidate_id")
