from django.urls import path

from .views import (
    CollegeCourseDetailView,
    CollegeCourseListCreateView,
    UniversityDetailView,
    UniversityListCreateView,
)

urlpatterns = [
    path("", UniversityListCreateView.as_view(), name="university_list"),
    path("<int:university_id>/", UniversityDetailView.as_view(), name="university_detail"),
    path(
        "<int:university_id>/courses/",
        CollegeCourseListCreateView.as_view(),
        name="course_list",
    ),
    path(
        "<int:university_id>/courses/<int:course_id>/",
        CollegeCourseDetailView.as_view(),
        name="course_detail",
    ),
]
