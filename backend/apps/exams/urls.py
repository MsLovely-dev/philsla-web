from django.urls import path

from .views import ExamBlueprintCloneView, ExamBlueprintDetailView, ExamBlueprintListCreateView, ExamBlueprintTransitionView

urlpatterns = [
    path("blueprints/", ExamBlueprintListCreateView.as_view(), name="blueprint_list"),
    path("blueprints/<int:blueprint_id>/", ExamBlueprintDetailView.as_view(), name="blueprint_detail"),
    path("blueprints/<int:blueprint_id>/clone/", ExamBlueprintCloneView.as_view(), name="blueprint_clone"),
    path("blueprints/<int:blueprint_id>/transition/", ExamBlueprintTransitionView.as_view(), name="blueprint_transition"),
]
