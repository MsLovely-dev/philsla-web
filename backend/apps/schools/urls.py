from django.urls import path

from .views import SchoolDetailView, SchoolExportView, SchoolListCreateView

urlpatterns = [
    path("", SchoolListCreateView.as_view(), name="school_list"),
    path("export/", SchoolExportView.as_view(), name="school_export"),
    path("<int:school_id>/", SchoolDetailView.as_view(), name="school_detail"),
]
