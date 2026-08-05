from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include(("apps.accounts.urls", "accounts"), namespace="accounts")),
    path("api/v1/applications/", include(("apps.applications.urls", "applications"), namespace="applications")),
    path("api/v1/analytics/", include(("apps.analytics.urls", "analytics"), namespace="analytics")),
    path("api/v1/configuration/", include(("apps.configuration.urls", "configuration"), namespace="configuration")),
    path("api/v1/exams/", include(("apps.exams.urls", "exams"), namespace="exams")),
    path("api/v1/schools/", include(("apps.schools.urls", "schools"), namespace="schools")),
    path("api/v1/universities/", include(("apps.universities.urls", "universities"), namespace="universities")),
    path("api/v1/", include(("apps.core.urls", "core"), namespace="api-v1")),
]
