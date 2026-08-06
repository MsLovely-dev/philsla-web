import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .roles import PortalRole, get_security_tier


def login_selfie_upload_to(instance, filename):
    extension = ".png" if instance.content_type == "image/png" else ".jpg"
    return f"private/login-selfies/{instance.user_id}/{uuid.uuid4().hex}{extension}"


class AccountProfile(models.Model):
    """Portal authorization profile for a Django-auth user account."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="account_profile")
    role = models.CharField(max_length=32, choices=[(role.value, role.value) for role in PortalRole])
    lrn = models.CharField("LRN", max_length=12, unique=True, null=True, blank=True)
    scopes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__email", "user__username"]

    def clean(self) -> None:
        super().clean()
        if self.lrn and (not self.lrn.isdigit() or len(self.lrn) != 12):
            raise ValidationError({"lrn": "LRN must be exactly 12 numeric digits."})
        if self.lrn and self.role != PortalRole.STUDENT.value:
            raise ValidationError({"lrn": "Only Student accounts may have an LRN login identifier."})

    @property
    def security_tier(self) -> int | None:
        return get_security_tier(self.role)

    def __str__(self) -> str:
        identifier = self.user.email or self.user.username
        return f"{identifier} ({self.role})"


class PermissionAction(models.TextChoices):
    READ = "READ", "READ"
    WRITE = "WRITE", "WRITE"
    EDIT = "EDIT", "EDIT"
    DELETE = "DELETE", "DELETE"
    APPROVE = "APPROVE", "APPROVE"
    REJECT = "REJECT", "REJECT"


class RolePermission(models.Model):
    """Baseline module permission granted by a portal role."""

    role = models.CharField(max_length=32, choices=[(role.value, role.value) for role in PortalRole])
    module_id = models.CharField(max_length=16)
    action = models.CharField(max_length=16, choices=PermissionAction.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["role", "module_id", "action"]
        constraints = [
            models.UniqueConstraint(fields=["role", "module_id", "action"], name="uniq_role_permission"),
        ]
        indexes = [
            models.Index(fields=["role", "module_id", "action"]),
        ]

    def __str__(self) -> str:
        return f"{self.role}: MOD_{self.module_id}_{self.action}"


class AccountRoleAssignment(models.Model):
    """Permission inheritance mode for an account profile."""

    class PermissionMode(models.TextChoices):
        INHERIT = "INHERIT", "INHERIT"
        CUSTOM = "CUSTOM", "CUSTOM"

    account_profile = models.OneToOneField(
        AccountProfile,
        on_delete=models.CASCADE,
        related_name="role_assignment",
    )
    role = models.CharField(max_length=32, choices=[(role.value, role.value) for role in PortalRole])
    permission_mode = models.CharField(
        max_length=16,
        choices=PermissionMode.choices,
        default=PermissionMode.INHERIT,
    )
    role_version_at_assignment = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["account_profile__user__email"]
        indexes = [
            models.Index(fields=["role", "permission_mode"]),
        ]


class AccountPermission(models.Model):
    """Account-specific permission difference from the account role baseline."""

    class Effect(models.TextChoices):
        ALLOW = "ALLOW", "ALLOW"
        DENY = "DENY", "DENY"

    account_profile = models.ForeignKey(
        AccountProfile,
        on_delete=models.CASCADE,
        related_name="account_permissions",
    )
    module_id = models.CharField(max_length=16)
    action = models.CharField(max_length=16, choices=PermissionAction.choices)
    effect = models.CharField(max_length=8, choices=Effect.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["account_profile_id", "module_id", "action"]
        constraints = [
            models.UniqueConstraint(
                fields=["account_profile", "module_id", "action"],
                name="uniq_account_permission_decision",
            ),
        ]
        indexes = [
            models.Index(fields=["account_profile", "module_id", "action"]),
            models.Index(fields=["module_id", "action", "effect"]),
        ]

    def __str__(self) -> str:
        return f"{self.account_profile_id}: {self.effect} MOD_{self.module_id}_{self.action}"


class PasswordLoginLockout(models.Model):
    '''Durable password-attempt and lockout state for one Django user.'''

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_login_lockout',
    )
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    window_started_at = models.DateTimeField(null=True, blank=True)
    locked_until = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class AuthRefreshSession(models.Model):
    """Persistent refresh-token session boundary for backend auth."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auth_refresh_sessions")
    token_hash = models.CharField(max_length=64, unique=True)
    account = models.JSONField(default=dict)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    rotated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["token_hash"]),
            models.Index(fields=["user", "revoked_at", "expires_at"]),
        ]

    @property
    def is_active(self) -> bool:
        from django.utils import timezone

        return self.revoked_at is None and self.expires_at > timezone.now()


class PasswordRecoveryToken(models.Model):
    """Single-use password recovery token stored as a digest."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="password_recovery_tokens")
    token_hash = models.CharField(max_length=64, unique=True)
    requested_identifier = models.CharField(max_length=254, blank=True, default="")
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["token_hash"]),
            models.Index(fields=["user", "used_at", "expires_at"]),
        ]

    @property
    def is_active(self) -> bool:
        from django.utils import timezone

        return self.used_at is None and self.expires_at > timezone.now()


class LoginSelfieLog(models.Model):
    """Captured selfie evidence required before issuing a login session."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="login_selfie_logs")
    file = models.FileField(upload_to=login_selfie_upload_to)
    content_type = models.CharField(max_length=32)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    ip_address = models.CharField(max_length=45, blank=True, default="")
    user_agent = models.CharField(max_length=512, blank=True, default="")
    correlation_id = models.CharField(max_length=80, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["sha256"]),
        ]
