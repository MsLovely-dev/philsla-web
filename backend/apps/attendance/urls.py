from django.urls import path

from .views import ScanAttendanceView

urlpatterns = [
    path("scan/", ScanAttendanceView.as_view(), name="attendance-scan"),
]
