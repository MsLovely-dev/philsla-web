from django.urls import path

from .views import ApplicationCreateView, ApplicationDetailView, ApplicationSubmitView, LrnVerificationView

urlpatterns = [
    path("registration/lrn/verify/", LrnVerificationView.as_view(), name="verify-lrn"),
    path("", ApplicationCreateView.as_view(), name="create"),
    path("<uuid:application_id>/", ApplicationDetailView.as_view(), name="detail"),
    path("<uuid:application_id>/submit/", ApplicationSubmitView.as_view(), name="submit"),
]
