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
    path("", ExamReviewQueueView.as_view(), name="exam-review-queue"),
    path("<uuid:review_id>/", ExamReviewDetailView.as_view(), name="exam-review-detail"),
    path("<uuid:review_id>/release/", ExamReviewReleaseView.as_view(), name="exam-review-release"),
    path("<uuid:review_id>/grading-status/", ExamReviewGradingStatusView.as_view(), name="exam-review-grading-status"),
    path("<uuid:review_id>/answer-sheets/", ExamReviewAnswerSheetUploadView.as_view(), name="exam-review-answer-sheet-upload"),
    path("<uuid:review_id>/items/<uuid:item_id>/score/", ExamReviewItemScoreView.as_view(), name="exam-review-item-score"),
]
