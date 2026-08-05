from django.urls import path

from .views import (
    ExamReviewAnswerSheetUploadView,
    ExamReviewDetailView,
    ExamReviewGradingStatusView,
    ExamReviewItemScoreView,
    ExamReviewQueueView,
    ExamReviewReleaseView,
)


urlpatterns = [
    path("exam-reviews/", ExamReviewQueueView.as_view(), name="exam-review-queue"),
    path("exam-reviews/<uuid:review_id>/", ExamReviewDetailView.as_view(), name="exam-review-detail"),
    path("exam-reviews/<uuid:review_id>/release/", ExamReviewReleaseView.as_view(), name="exam-review-release"),
    path("exam-reviews/<uuid:review_id>/grading-status/", ExamReviewGradingStatusView.as_view(), name="exam-review-grading-status"),
    path("exam-reviews/<uuid:review_id>/answer-sheets/", ExamReviewAnswerSheetUploadView.as_view(), name="exam-review-answer-sheet-upload"),
    path("exam-reviews/<uuid:review_id>/items/<uuid:item_id>/score/", ExamReviewItemScoreView.as_view(), name="exam-review-item-score"),
    ScoreManagementBatchListView,
    ScoreManagementBatchExportView,
    ScoreManagementBatchReleaseView,
    ScoreManagementBatchResultsView,
    ScoreManagementCandidateProfileView,
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
