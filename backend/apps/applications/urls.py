from django.urls import path

from .views import (
    ApplicationCreateView,
    ApplicationDetailView,
    ApplicationReviewerDecisionView,
    ApplicationReviewQueueView,
    ApplicationSubmitView,
    LrnVerificationView,
    PublicStep2ConfigurationView,
    RegistrationIdentitySelfieFaceValidationView,
    RegistrationIdentitySelfieView,
    Step2ConfigurationAdminView,
    Step2VerificationView,
    Step2ManualDecisionView,
)

urlpatterns = [
    path("registration/lrn/verify/", LrnVerificationView.as_view(), name="verify-lrn"),
    path("registration/identity/selfie/", RegistrationIdentitySelfieView.as_view(), name="registration-identity-selfie"),
    path("registration/identity/selfie-face/", RegistrationIdentitySelfieFaceValidationView.as_view(), name="registration-identity-selfie-face"),
    path("registration/step-2/configuration/", PublicStep2ConfigurationView.as_view(), name="step2-public-configuration"),
    path("registration/step-2/", Step2VerificationView.as_view(), name="step2-verification"),
    path("configuration/step-2/", Step2ConfigurationAdminView.as_view(), name="step2-configuration-admin"),
    path("registration/step-2/<uuid:verification_id>/manual-decision/", Step2ManualDecisionView.as_view(), name="step2-manual-decision"),
    path("review-queue/", ApplicationReviewQueueView.as_view(), name="review-queue"),
    path("", ApplicationCreateView.as_view(), name="create"),
    path("<uuid:application_id>/review-decision/", ApplicationReviewerDecisionView.as_view(), name="review-decision"),
    path("<uuid:application_id>/", ApplicationDetailView.as_view(), name="detail"),
    path("<uuid:application_id>/submit/", ApplicationSubmitView.as_view(), name="submit"),
]
