from django.contrib import admin

from .models import School


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "classification", "region", "examinee_capacity", "updated_at")
    list_filter = ("classification", "region")
    search_fields = ("code", "name")
    ordering = ("name",)
    readonly_fields = ("code", "created_at", "updated_at")
