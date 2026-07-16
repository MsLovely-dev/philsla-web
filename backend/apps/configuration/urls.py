from django.urls import path

from .views import ConfigurableFieldAdminDetailView, ConfigurableFieldAdminView, PublicConfigurableFieldView

urlpatterns = [
    path("fields/", PublicConfigurableFieldView.as_view(), name="fields-public"),
    path("admin/fields/", ConfigurableFieldAdminView.as_view(), name="fields-admin"),
    path("admin/fields/<int:field_id>/", ConfigurableFieldAdminDetailView.as_view(), name="fields-admin-detail"),
]
