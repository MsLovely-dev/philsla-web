from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import AccountPermission, AccountProfile, AccountRoleAssignment, AuthRefreshSession, LoginSelfieLog, RolePermission


class AccountProfileInline(admin.StackedInline):
    model = AccountProfile
    can_delete = False
    extra = 0
    fields = ("role", "lrn", "scopes", "security_tier")
    readonly_fields = ("security_tier",)


@admin.register(AccountProfile)
class AccountProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "lrn", "security_tier", "created_at", "updated_at")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email", "lrn")
    readonly_fields = ("security_tier", "created_at", "updated_at")


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "module_id", "action", "created_at", "updated_at")
    list_filter = ("role", "action")
    search_fields = ("role", "module_id", "action")
    readonly_fields = ("created_at", "updated_at")


@admin.register(AccountRoleAssignment)
class AccountRoleAssignmentAdmin(admin.ModelAdmin):
    list_display = ("account_profile", "role", "permission_mode", "role_version_at_assignment", "updated_at")
    list_filter = ("role", "permission_mode")
    search_fields = ("account_profile__user__username", "account_profile__user__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(AccountPermission)
class AccountPermissionAdmin(admin.ModelAdmin):
    list_display = ("account_profile", "module_id", "action", "effect", "created_at", "updated_at")
    list_filter = ("action", "effect")
    search_fields = ("account_profile__user__username", "account_profile__user__email", "module_id", "action")
    readonly_fields = ("created_at", "updated_at")


@admin.register(AuthRefreshSession)
class AuthRefreshSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "expires_at", "revoked_at", "created_at", "rotated_at")
    list_filter = ("revoked_at", "expires_at")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("user", "token_hash", "account", "expires_at", "revoked_at", "created_at", "rotated_at")


@admin.register(LoginSelfieLog)
class LoginSelfieLogAdmin(admin.ModelAdmin):
    list_display = ("user", "content_type", "size", "ip_address", "created_at")
    search_fields = ("user__username", "user__email", "sha256", "correlation_id")
    readonly_fields = (
        "user",
        "file",
        "content_type",
        "size",
        "sha256",
        "ip_address",
        "user_agent",
        "correlation_id",
        "created_at",
    )


User = get_user_model()

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    inlines = (AccountProfileInline,)
