from django.urls import path

from .views import CurrentSessionView

urlpatterns = [
    path("session/", CurrentSessionView.as_view(), name="current-session"),
]
