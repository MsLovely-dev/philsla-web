from django.urls import path

from .views import (
    CollegeCourseAdminDetailView,
    CollegeCourseAdminListView,
    ConfigurableFieldAdminDetailView,
    ConfigurableFieldAdminView,
    PublicConfigurableFieldView,
    UniversityAdminDetailView,
    UniversityAdminListView,
)

urlpatterns = [
    path("fields/", PublicConfigurableFieldView.as_view(), name="fields-public"),
    path("admin/fields/", ConfigurableFieldAdminView.as_view(), name="fields-admin"),
    path("admin/fields/<int:field_id>/", ConfigurableFieldAdminDetailView.as_view(), name="fields-admin-detail"),
    path("admin/universities/", UniversityAdminListView.as_view(), name="universities-admin"),
    path("admin/universities/<uuid:university_id>/", UniversityAdminDetailView.as_view(), name="universities-admin-detail"),
    path(
        "admin/universities/<uuid:university_id>/courses/",
        CollegeCourseAdminListView.as_view(),
        name="university-courses-admin",
    ),
    path(
        "admin/universities/<uuid:university_id>/courses/<uuid:course_id>/",
        CollegeCourseAdminDetailView.as_view(),
        name="university-courses-admin-detail",
    ),
]
