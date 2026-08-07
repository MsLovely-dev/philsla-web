from django.urls import path

from .views import MyExamPermitView, ScanAttendanceView

urlpatterns = [
    path("scan/", ScanAttendanceView.as_view(), name="attendance-scan"),
    path("me/", MyExamPermitView.as_view(), name="attendance-mine"),
]
