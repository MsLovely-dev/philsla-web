from django.contrib import admin

from .models import (
    ApplicationAuditLog,
    ApplicationIdentityMedia,
    RegistrationSelfieMedia,
    Step2Verification,
    Step2VerificationConfiguration,
    StudentApplication,
    StudentApplicationAdditionalField,
    StudentApplicationAddress,
    StudentApplicationCoursePreference,
    StudentApplicationPersonalInfo,
    StudentApplicationReviewInfo,
    StudentApplicationSchoolInfo,
)


class StudentApplicationPersonalInfoInline(admin.StackedInline):
    model = StudentApplicationPersonalInfo
    extra = 0
    can_delete = False
    readonly_fields = (
        "first_name",
        "middle_name",
        "last_name",
        "suffix",
        "date_of_birth",
        "sex",
        "email",
        "mobile",
        "identity_verification_status",
    )


class StudentApplicationAddressInline(admin.StackedInline):
    model = StudentApplicationAddress
    extra = 0
    can_delete = False
    readonly_fields = ("region", "province", "city", "barangay", "street", "postal_code")


class StudentApplicationSchoolInfoInline(admin.StackedInline):
    model = StudentApplicationSchoolInfo
    extra = 0
    can_delete = False
    readonly_fields = (
        "lrn",
        "school_id",
        "name",
        "academic_track",
        "grade_level",
        "enrollment_status",
        "school_year",
        "gwa",
    )


class StudentApplicationCoursePreferenceInline(admin.TabularInline):
    model = StudentApplicationCoursePreference
    extra = 0
    can_delete = False
    readonly_fields = ("university", "course", "display_order")


class StudentApplicationReviewInfoInline(admin.StackedInline):
    model = StudentApplicationReviewInfo
    extra = 0
    can_delete = False
    readonly_fields = (
        "privacy_consent",
        "declaration_accepted",
        "requires_admissions_reviewer_attention",
        "attention_reason",
        "reviewer_decision",
        "reviewer_reason",
        "required_corrections",
        "reviewed_by",
        "reviewed_at",
    )


class StudentApplicationAdditionalFieldInline(admin.TabularInline):
    model = StudentApplicationAdditionalField
    extra = 0
    can_delete = False
    readonly_fields = ("section", "field_key", "field_value")


@admin.register(StudentApplication)
class StudentApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "candidate_id",
        "owner",
        "lrn",
        "exam_cycle_id",
        "status",
        "version",
        "submitted_at",
        "created_at",
    )
    list_filter = ("status", "exam_cycle_id", "created_at")
    list_select_related = ("owner",)
    ordering = ("-created_at",)
    readonly_fields = (
        "id",
        "candidate_id",
        "owner",
        "lrn",
        "exam_cycle_id",
        "status",
        "version",
        "submitted_at",
        "created_at",
        "updated_at",
    )
    search_fields = ("=id", "candidate_id", "owner__username", "owner__email", "lrn")
    inlines = (
        StudentApplicationPersonalInfoInline,
        StudentApplicationAddressInline,
        StudentApplicationSchoolInfoInline,
        StudentApplicationCoursePreferenceInline,
        StudentApplicationReviewInfoInline,
        StudentApplicationAdditionalFieldInline,
    )

    fieldsets = (
        (None, {"fields": ("id", "candidate_id", "owner", "lrn", "exam_cycle_id", "status", "version")}),
        ("Timestamps", {"fields": ("submitted_at", "created_at", "updated_at")}),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return True


@admin.register(ApplicationAuditLog)
class ApplicationAuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "action",
        "event",
        "outcome",
        "registration_id",
        "account_id",
        "actor_user_id",
        "ip_address",
        "created_at",
    )
    list_filter = ("action", "event", "outcome", "actor_role", "created_at")
    list_select_related = ("application",)
    ordering = ("-created_at",)
    readonly_fields = (
        "id",
        "application",
        "action",
        "event",
        "outcome",
        "registration_id",
        "applicant_id",
        "account_id",
        "actor_user_id",
        "actor_role",
        "session_id",
        "ip_address",
        "user_agent",
        "correlation_id",
        "created_at",
    )
    search_fields = (
        "registration_id",
        "applicant_id",
        "account_id",
        "actor_user_id",
        "session_id",
        "correlation_id",
    )

    def has_add_permission(self, request):
        return False


@admin.register(Step2VerificationConfiguration)
class Step2VerificationConfigurationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "is_active",
        "require_student_id_verification",
        "enable_student_id_information_extraction",
        "enable_facial_comparison",
        "allow_manual_review",
        "maximum_verification_attempts",
        "effective_date",
        "created_by",
        "created_at",
    )
    list_filter = (
        "is_active",
        "require_student_id_verification",
        "enable_student_id_information_extraction",
        "enable_facial_comparison",
        "allow_manual_review",
        "effective_date",
        "created_at",
    )
    list_select_related = ("created_by",)
    ordering = ("-effective_date", "-created_at")
    search_fields = ("created_by__username", "created_by__email")


@admin.register(Step2Verification)
class Step2VerificationAdmin(admin.ModelAdmin):
    list_display = ("id", "application", "lrn", "status", "attempts", "expires_at", "completed_at", "created_at")
    list_filter = ("status", "created_at", "completed_at", "expires_at")
    list_select_related = ("application",)
    ordering = ("-created_at",)
    readonly_fields = (
        "id",
        "token_digest",
        "application",
        "lrn",
        "lrn_profile",
        "configuration_snapshot",
        "status",
        "attempts",
        "results",
        "expires_at",
        "completed_at",
        "created_at",
        "updated_at",
    )
    search_fields = ("=id", "application__candidate_id", "lrn", "token_digest")

    def has_add_permission(self, request):
        return False


@admin.register(ApplicationIdentityMedia)
class ApplicationIdentityMediaAdmin(admin.ModelAdmin):
    list_display = ("id", "verification", "media_type", "content_type", "size", "sha256", "created_at")
    list_filter = ("media_type", "content_type", "created_at")
    list_select_related = ("verification", "verification__application")
    ordering = ("-created_at",)
    readonly_fields = ("id", "verification", "media_type", "file", "content_type", "size", "sha256", "created_at")
    search_fields = ("=id", "verification__id", "verification__application__candidate_id", "sha256")

    def has_add_permission(self, request):
        return False


@admin.register(RegistrationSelfieMedia)
class RegistrationSelfieMediaAdmin(admin.ModelAdmin):
    list_display = ("id", "application", "verification", "content_type", "size", "sha256", "created_at")
    list_filter = ("content_type", "created_at")
    list_select_related = ("application", "verification", "verification__application")
    ordering = ("-created_at",)
    readonly_fields = ("id", "application", "verification", "file", "content_type", "size", "sha256", "created_at")
    search_fields = (
        "=id",
        "application__candidate_id",
        "verification__id",
        "verification__application__candidate_id",
        "sha256",
    )

    def has_add_permission(self, request):
        return False
