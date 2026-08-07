from django.urls import path

from .views import SchoolDetailView, SchoolExportView, SchoolImportView, SchoolListCreateView

urlpatterns = [
    path("", SchoolListCreateView.as_view(), name="school_list"),
    path("export/", SchoolExportView.as_view(), name="school_export"),
    path("import/", SchoolImportView.as_view(), name="school_import"),
    path("<int:school_id>/", SchoolDetailView.as_view(), name="school_detail"),
]
