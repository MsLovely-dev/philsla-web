from django.contrib import admin

from .models import ExamReviewAnswerSheet, ExamReviewItem, ExamReviewRecord, ScoreReleaseNotification


@admin.register(ExamReviewRecord)
class ExamReviewRecordAdmin(admin.ModelAdmin):
    list_display = (
        "attempt_code",
        "application",
        "status",
        "total_score",
        "max_score",
        "submitted_at",
    )
    list_filter = ("status", "exam_set_code")
    search_fields = ("attempt_code", "application__candidate_id")
    ordering = ("-submitted_at",)


@admin.register(ExamReviewAnswerSheet)
class ExamReviewAnswerSheetAdmin(admin.ModelAdmin):
    list_display = ("id", "review", "template_source", "content_type", "size", "uploaded_by", "created_at")
    list_filter = ("template_source", "content_type", "created_at")
    readonly_fields = ("id", "review", "file", "template_source", "content_type", "size", "sha256", "uploaded_by", "created_at")
    search_fields = ("=id", "review__attempt_code", "review__application__candidate_id", "sha256")


@admin.register(ExamReviewItem)
class ExamReviewItemAdmin(admin.ModelAdmin):
    list_display = ("review", "subject", "item_number", "item_type", "points_awarded", "max_points")
    list_filter = ("subject", "item_type")
    search_fields = ("review__attempt_code", "review__application__candidate_id", "question_text")
    ordering = ("review", "position")


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
