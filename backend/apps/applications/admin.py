from django.contrib import admin

from .models import ApplicationIdentityMedia, Step2Verification, Step2VerificationConfiguration, StudentApplication

admin.site.register(Step2VerificationConfiguration)
admin.site.register(Step2Verification)
admin.site.register(ApplicationIdentityMedia)


@admin.register(StudentApplication)
class StudentApplicationAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "lrn", "exam_cycle_id", "status", "version", "submitted_at", "created_at")
    list_filter = ("status", "exam_cycle_id", "created_at")
    list_select_related = ("owner",)
    ordering = ("-created_at",)
    readonly_fields = (
        "id",
        "owner",
        "lrn",
        "exam_cycle_id",
        "status",
        "personal",
        "address",
        "school",
        "course_preferences",
        "review_step",
        "version",
        "submitted_at",
        "created_at",
        "updated_at",
    )
    search_fields = ("=id", "owner__username", "owner__email", "lrn")

    fieldsets = (
        (None, {"fields": ("id", "owner", "lrn", "exam_cycle_id", "status", "version")}),
        (
            "Application data",
            {"fields": ("personal", "address", "school", "course_preferences", "review_step")},
        ),
        ("Timestamps", {"fields": ("submitted_at", "created_at", "updated_at")}),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
