from django.contrib import admin

from .models import CollegeCourse, ConfigurableField, University


@admin.register(ConfigurableField)
class ConfigurableFieldAdmin(admin.ModelAdmin):
    list_display = ("field_name", "module", "section", "field_section", "field_type", "priority", "is_enabled", "display_order", "updated_at")
    list_filter = ("module", "section", "field_section", "field_type", "priority", "is_enabled")
    search_fields = ("field_name", "remarks")
    ordering = ("module", "display_order", "field_name")


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "classification", "region", "city", "status", "updated_at")
    list_filter = ("classification", "status", "region")
    search_fields = ("code", "name", "city")
    ordering = ("name", "code")


@admin.register(CollegeCourse)
class CollegeCourseAdmin(admin.ModelAdmin):
    list_display = ("program_code", "program_name", "university", "college_name", "status", "updated_at")
    list_filter = ("status", "degree_type", "university")
    search_fields = ("program_code", "program_name", "college_name", "university__name")
    ordering = ("university__name", "college_name", "program_code")
