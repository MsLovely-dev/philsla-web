from django.contrib import admin

from .models import ConfigurableField


@admin.register(ConfigurableField)
class ConfigurableFieldAdmin(admin.ModelAdmin):
    list_display = ("field_name", "module", "section", "field_section", "field_type", "priority", "is_enabled", "display_order", "updated_at")
    list_filter = ("module", "section", "field_section", "field_type", "priority", "is_enabled")
    search_fields = ("field_name", "remarks")
    ordering = ("module", "display_order", "field_name")
