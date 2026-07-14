from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include(("apps.accounts.urls", "accounts"), namespace="accounts")),
    path("api/v1/applications/", include(("apps.applications.urls", "applications"), namespace="applications")),
    path("api/v1/", include(("apps.core.urls", "core"), namespace="api-v1")),
]
