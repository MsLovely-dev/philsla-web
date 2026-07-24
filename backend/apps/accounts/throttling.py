from django.conf import settings
from rest_framework.throttling import ScopedRateThrottle


class AuthScopedRateThrottle(ScopedRateThrottle):
    """Scoped auth throttle that reads project throttle rates from settings."""

    def get_rate(self) -> str | None:
        if not self.scope:
            return None
        return settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}).get(self.scope)
