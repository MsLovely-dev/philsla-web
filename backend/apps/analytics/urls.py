from django.urls import path

from .views import NationalOverviewView

urlpatterns = [
    path("national/overview/", NationalOverviewView.as_view(), name="national-overview"),
]
