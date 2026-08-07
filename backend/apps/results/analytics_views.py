from django.db.models import Avg, Count, OuterRef, Q, Subquery
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import RoleRequiredPermission, require_roles
from apps.accounts.roles import PortalRole

from .models import CandidateScore, ScoreBatchStatus, ScoreReleaseAuditLog, ScoreReleaseStatus, ScoreReviewStatus


SCORE_BANDS = (
    ("0-59.99", 0, 59.99, Q(final_score__gte=0, final_score__lt=60)),
    ("60-69.99", 60, 69.99, Q(final_score__gte=60, final_score__lt=70)),
    ("70-79.99", 70, 79.99, Q(final_score__gte=70, final_score__lt=80)),
    ("80-89.99", 80, 89.99, Q(final_score__gte=80, final_score__lt=90)),
    ("90-100", 90, 100, Q(final_score__gte=90, final_score__lte=100)),
)


def build_score_bands(released_scores):
    counts = released_scores.aggregate(
        **{f"band_{index}": Count("id", filter=score_filter) for index, (_, _, _, score_filter) in enumerate(SCORE_BANDS)},
    )
    return [
        {"label": label, "minimum": minimum, "maximum": maximum, "count": counts[f"band_{index}"]}
        for index, (label, minimum, maximum, _) in enumerate(SCORE_BANDS)
    ]


def serialize_session_aggregates(released_scores):
    latest_release_audit = ScoreReleaseAuditLog.objects.filter(session_id=OuterRef("session_id")).order_by("-created_at")
    sessions = (
        released_scores.values("session_id", "session__name")
        .annotate(
            released_candidates=Count("id"),
            mean_final_score=Avg("final_score"),
            released_at=Subquery(latest_release_audit.values("created_at")[:1]),
        )
        .order_by("session_id")
    )
    return [
        {
            "sessionId": session["session_id"],
            "sessionName": session["session__name"],
            "releasedCandidates": session["released_candidates"],
            "meanFinalScore": float(session["mean_final_score"]) if session["mean_final_score"] is not None else None,
            "releasedAt": session["released_at"].isoformat() if session["released_at"] else None,
        }
        for session in sessions
    ]


class ResultsAnalyticsOverviewView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = require_roles(
        PortalRole.CHED_ADMIN,
        PortalRole.DEPED_ADMIN,
        PortalRole.TESDA_ADMIN,
        PortalRole.EXECUTIVE,
        PortalRole.UNIVERSITY_ADMIN,
        PortalRole.EXAM_ADMINISTRATOR,
        PortalRole.SYSTEM_ADMIN,
    )

    def get(self, request):
        released_scores = CandidateScore.objects.filter(
            review_status=ScoreReviewStatus.APPROVED,
            release_status=ScoreReleaseStatus.RELEASED,
            session__scoring_status=ScoreBatchStatus.RESULTS_RELEASED,
        )
        totals = released_scores.aggregate(released_candidates=Count("id"), mean_final_score=Avg("final_score"))
        return Response(
            {
                "releasedCandidates": totals["released_candidates"],
                "releasedSessions": released_scores.values("session_id").distinct().count(),
                "meanFinalScore": float(totals["mean_final_score"]) if totals["mean_final_score"] is not None else None,
                "scoreBands": build_score_bands(released_scores),
                "sessions": serialize_session_aggregates(released_scores),
            },
        )
