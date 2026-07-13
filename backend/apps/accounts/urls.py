from django.urls import path

from .views import CurrentSessionView, IdentifierLoginView, OtpLoginView, PasswordLoginView

urlpatterns = [
    path("login/identifier/", IdentifierLoginView.as_view(), name="login-identifier"),
    path("login/password/", PasswordLoginView.as_view(), name="login-password"),
    path("login/otp/", OtpLoginView.as_view(), name="login-otp"),
    path("session/", CurrentSessionView.as_view(), name="current-session"),
]
