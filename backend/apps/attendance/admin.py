from django.contrib import admin

from .models import (
    AttendanceEvent,
    AttendanceRecord,
    AttendanceState,
    CandidateSessionAssignment,
    ExamPermit,
    ExamRoom,
    PermitCredential,
    RoomSession,
    RoomSessionProctorAssignment,
)


@admin.register(ExamPermit)
class ExamPermitAdmin(admin.ModelAdmin):
    list_display = ("candidate_id", "full_name", "test_center", "status", "issued_at", "expires_at")
    search_fields = ("candidate_id", "full_name", "qr_token")
    list_filter = ("status",)


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("permit", "scanned_by", "scanned_at")
    list_filter = ("scanned_at",)


admin.site.register(
    (
        ExamRoom,
        RoomSession,
        RoomSessionProctorAssignment,
        CandidateSessionAssignment,
        PermitCredential,
        AttendanceState,
    )
)


@admin.register(AttendanceEvent)
class AttendanceEventAdmin(admin.ModelAdmin):
    list_display = (
        "assignment",
        "requested_status",
        "outcome",
        "actor",
        "server_received_at",
        "resulting_version",
    )
    list_filter = ("event_type", "source", "outcome", "requested_status")
    search_fields = (
        "assignment__candidate__candidate_id",
        "client_instance_id",
        "client_event_id",
    )
    ordering = ("-server_received_at",)

    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.concrete_fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
