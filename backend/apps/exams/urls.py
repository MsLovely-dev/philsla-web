from django.urls import path

from .views import (
    ExamBlueprintCloneView,
    ExamBlueprintDetailView,
    ExamBlueprintListCreateView,
    ExamBlueprintTransitionView,
    ExamSetCloneView,
    ExamSetDetailView,
    ExamSetListCreateView,
    ExamSetTransitionView,
    QuestionDetailView,
    QuestionListCreateView,
    QuestionTransitionView,
)

urlpatterns = [
    path("blueprints/", ExamBlueprintListCreateView.as_view(), name="blueprint_list"),
    path("blueprints/<int:blueprint_id>/", ExamBlueprintDetailView.as_view(), name="blueprint_detail"),
    path("blueprints/<int:blueprint_id>/clone/", ExamBlueprintCloneView.as_view(), name="blueprint_clone"),
    path("blueprints/<int:blueprint_id>/transition/", ExamBlueprintTransitionView.as_view(), name="blueprint_transition"),
    path("exam-sets/", ExamSetListCreateView.as_view(), name="exam_set_list"),
    path("exam-sets/<int:exam_set_id>/", ExamSetDetailView.as_view(), name="exam_set_detail"),
    path("exam-sets/<int:exam_set_id>/clone/", ExamSetCloneView.as_view(), name="exam_set_clone"),
    path("exam-sets/<int:exam_set_id>/transition/", ExamSetTransitionView.as_view(), name="exam_set_transition"),
    path("questions/", QuestionListCreateView.as_view(), name="question_list"),
    path("questions/<int:question_id>/", QuestionDetailView.as_view(), name="question_detail"),
    path("questions/<int:question_id>/transition/", QuestionTransitionView.as_view(), name="question_transition"),
]
