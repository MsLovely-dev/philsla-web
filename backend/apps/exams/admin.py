from django.contrib import admin

from .models import (
    AcademicYear,
    Agency,
    BlueprintCategory,
    BlueprintDifficultyDistribution,
    BlueprintQuestionTypeDistribution,
    BlueprintSection,
    BlueprintSectionTopic,
    BlueprintVersion,
    BlueprintWorkflowHistory,
    ExamBlueprint,
    QuestionType,
    Subject,
    Topic,
)


class BlueprintSectionInline(admin.TabularInline):
    model = BlueprintSection
    extra = 0


class BlueprintVersionInline(admin.TabularInline):
    model = BlueprintVersion
    extra = 0


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active", "created_at")
    search_fields = ("code", "name")
    list_filter = ("is_active",)


@admin.register(BlueprintCategory)
class BlueprintCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    search_fields = ("name",)
    list_filter = ("is_active",)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ("name", "start_date", "end_date", "is_active", "created_at")
    search_fields = ("name",)
    list_filter = ("is_active",)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active", "created_at")
    search_fields = ("code", "name")
    list_filter = ("is_active",)


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ("name", "subject", "is_active", "created_at")
    search_fields = ("code", "name", "subject__name")
    list_filter = ("is_active", "subject")


@admin.register(QuestionType)
class QuestionTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active", "created_at")
    search_fields = ("code", "name")
    list_filter = ("is_active",)


@admin.register(ExamBlueprint)
class ExamBlueprintAdmin(admin.ModelAdmin):
    list_display = ("spec_code", "exam_type", "agency", "category", "current_version_number", "is_archived", "created_at")
    search_fields = ("spec_code", "agency__name", "category__name")
    list_filter = ("exam_type", "is_archived", "agency", "category")
    inlines = [BlueprintVersionInline]


@admin.register(BlueprintVersion)
class BlueprintVersionAdmin(admin.ModelAdmin):
    list_display = ("blueprint", "version_number", "name", "status", "academic_year", "created_at")
    search_fields = ("blueprint__spec_code", "name")
    list_filter = ("status", "academic_year")
    inlines = [BlueprintSectionInline]


@admin.register(BlueprintSection)
class BlueprintSectionAdmin(admin.ModelAdmin):
    list_display = ("blueprint_version", "section_number", "section_name", "subject", "item_count", "display_order")
    search_fields = ("section_name", "subject__name")
    list_filter = ("subject",)


@admin.register(BlueprintSectionTopic)
class BlueprintSectionTopicAdmin(admin.ModelAdmin):
    list_display = ("blueprint_section", "topic", "required_item_count")
    search_fields = ("blueprint_section__section_name", "topic__name")


@admin.register(BlueprintDifficultyDistribution)
class BlueprintDifficultyDistributionAdmin(admin.ModelAdmin):
    list_display = ("blueprint_section", "difficulty", "required_item_count")
    list_filter = ("difficulty",)


@admin.register(BlueprintQuestionTypeDistribution)
class BlueprintQuestionTypeDistributionAdmin(admin.ModelAdmin):
    list_display = ("blueprint_section", "question_type", "required_item_count")
    list_filter = ("question_type",)


@admin.register(BlueprintWorkflowHistory)
class BlueprintWorkflowHistoryAdmin(admin.ModelAdmin):
    list_display = ("blueprint_version", "previous_status", "new_status", "action", "initiated_by", "created_at")
    list_filter = ("previous_status", "new_status")
