from django.urls import include, path

urlpatterns = [
    path("api/v1/", include(("apps.core.urls", "core"), namespace="api-v1")),
]
