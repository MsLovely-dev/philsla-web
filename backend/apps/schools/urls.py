from django.urls import path

from .views import SchoolDetailView, SchoolListCreateView

urlpatterns = [
    path("", SchoolListCreateView.as_view(), name="school_list"),
    path("<int:school_id>/", SchoolDetailView.as_view(), name="school_detail"),
]
