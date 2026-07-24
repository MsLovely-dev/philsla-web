from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .roles import PortalRole, get_security_tier


class AccountProfile(models.Model):
    """Portal authorization profile for a Django-auth user account."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="account_profile")
    role = models.CharField(max_length=32, choices=[(role.value, role.value) for role in PortalRole])
    lrn = models.CharField("LRN", max_length=12, unique=True, null=True, blank=True)
    api_permissions = models.JSONField(default=list, blank=True)
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
