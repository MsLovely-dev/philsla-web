from django.contrib import admin

from .models import ScoreReleaseNotification


@admin.register(ScoreReleaseNotification)
class ScoreReleaseNotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "recipient_email", "status", "attempts", "queued_at", "sent_at")
    list_filter = ("status", "session")
    readonly_fields = (
        "session",
        "score",
        "recipient_email",
        "recipient_name",
        "portal_url",
        "status",
        "attempts",
        "failure_reason",
        "queued_at",
        "sent_at",
        "updated_at",
    )
    search_fields = ("recipient_email", "recipient_name", "score__candidate_id", "score__lrn")
    ordering = ("-queued_at",)
