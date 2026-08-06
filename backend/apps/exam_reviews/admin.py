from django.contrib import admin

from .models import ExamReviewAnswerSheet, ExamReviewItem, ExamReviewRecord


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

