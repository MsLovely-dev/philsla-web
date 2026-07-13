from django.urls import path

from .views import (
    CurrentSessionView,
    IdentifierLoginView,
    LogoutView,
    OtpLoginView,
    PasswordLoginView,
    RefreshTokenView,
    TokenRevocationView,
)

urlpatterns = [
    path("login/identifier/", IdentifierLoginView.as_view(), name="login-identifier"),
    path("login/password/", PasswordLoginView.as_view(), name="login-password"),
    path("login/otp/", OtpLoginView.as_view(), name="login-otp"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", RefreshTokenView.as_view(), name="token-refresh"),
    path("token/revoke/", TokenRevocationView.as_view(), name="token-revoke"),
    path("session/", CurrentSessionView.as_view(), name="current-session"),
]
