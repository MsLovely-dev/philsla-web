from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AccountProfile
from .roles import PortalRole


@receiver(post_save, sender=get_user_model())
def create_superuser_account_profile(sender, instance, created: bool, **kwargs) -> None:
    """Ensure Django-created superusers can authenticate as System Admins."""

    if not created or not instance.is_superuser:
        return

    AccountProfile.objects.get_or_create(
        user=instance,
        defaults={
            "role": PortalRole.SYSTEM_ADMIN.value,
            "api_permissions": [],
            "scopes": {},
        },
    )
