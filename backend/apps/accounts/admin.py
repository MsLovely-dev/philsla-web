from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import AccountProfile


class AccountProfileInline(admin.StackedInline):
    model = AccountProfile
    can_delete = False
    extra = 0
    fields = ("role", "lrn", "api_permissions", "scopes", "security_tier")
    readonly_fields = ("security_tier",)


@admin.register(AccountProfile)
class AccountProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "lrn", "security_tier", "created_at", "updated_at")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email", "lrn")
    readonly_fields = ("security_tier", "created_at", "updated_at")


User = get_user_model()

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    inlines = (AccountProfileInline,)
