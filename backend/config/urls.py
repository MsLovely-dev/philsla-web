from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include(("apps.accounts.urls", "accounts"), namespace="accounts")),
    path("api/v1/applications/", include(("apps.applications.urls", "applications"), namespace="applications")),
    path("api/v1/configuration/", include(("apps.configuration.urls", "configuration"), namespace="configuration")),
    path("api/v1/results/", include(("apps.results.urls", "results"), namespace="results")),
    path("api/v1/", include(("apps.core.urls", "core"), namespace="api-v1")),
]
