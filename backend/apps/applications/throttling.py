from rest_framework.throttling import ScopedRateThrottle


class DeviceScopedRateThrottle(ScopedRateThrottle):
    """Apply the public registration limit by network/device identity, even if a session is present."""

    def get_cache_key(self, request, view):
        if not self.scope:
            return None
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
