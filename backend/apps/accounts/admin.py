from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import AccountProfile, AuthRefreshSession


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


@admin.register(AuthRefreshSession)
class AuthRefreshSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "expires_at", "revoked_at", "created_at", "rotated_at")
    list_filter = ("revoked_at", "expires_at")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("user", "token_hash", "account", "expires_at", "revoked_at", "created_at", "rotated_at")


User = get_user_model()

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    inlines = (AccountProfileInline,)
