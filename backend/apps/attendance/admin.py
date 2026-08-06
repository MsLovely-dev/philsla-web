from django.contrib import admin

from .models import AttendanceRecord, ExamPermit


@admin.register(ExamPermit)
class ExamPermitAdmin(admin.ModelAdmin):
    list_display = ("candidate_id", "full_name", "test_center", "status", "issued_at", "expires_at")
    search_fields = ("candidate_id", "full_name", "qr_token")
    list_filter = ("status",)


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("permit", "scanned_by", "scanned_at")
    list_filter = ("scanned_at",)
