from django.urls import path

from .analytics_views import ResultsAnalyticsOverviewView
from .release_views import ResultsReleaseSummaryView
from .views import (
    ScoreManagementBatchListView,
    ScoreManagementBatchExportView,
    ScoreManagementBatchReleaseView,
    ScoreManagementBatchResultsView,
    ScoreManagementCandidateProfileView,
    ScoreManagementProcessView,
)

urlpatterns = [
    path("analytics/overview/", ResultsAnalyticsOverviewView.as_view(), name="results-analytics-overview"),
    path("release-summary/", ResultsReleaseSummaryView.as_view(), name="release-summary"),
    path("score-management/batches/", ScoreManagementBatchListView.as_view(), name="score-management-batches"),
    path(
        "score-management/batches/<str:session_id>/process/",
        ScoreManagementProcessView.as_view(),
        name="score-management-process",
    ),
    path(
        "score-management/batches/<str:session_id>/results/",
        ScoreManagementBatchResultsView.as_view(),
        name="score-management-results",
    ),
    path(
        "score-management/batches/<str:session_id>/results/<str:candidate_id>/profile/",
        ScoreManagementCandidateProfileView.as_view(),
        name="score-management-profile",
    ),
    path(
        "score-management/batches/<str:session_id>/release/",
        ScoreManagementBatchReleaseView.as_view(),
        name="score-management-release",
    ),
    path(
        "score-management/batches/<str:session_id>/export/",
        ScoreManagementBatchExportView.as_view(),
        name="score-management-export",
    ),
]
