from django.urls import path

from .views import (
    ScoreManagementBatchListView,
    ScoreManagementBatchExportView,
    ScoreManagementBatchReleaseView,
    ScoreManagementBatchResultsView,
    ScoreManagementProcessView,
)

urlpatterns = [
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
