from rest_framework.throttling import ScopedRateThrottle


SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


class MaintenanceWriteRateThrottle(ScopedRateThrottle):
    """Rate-limit mutating requests on maintenance registries, per authenticated
    user. Read (safe) methods are never throttled, so browsing the registry is
    unaffected while mass create/update/delete floods are bounded.
    """

    def allow_request(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        if not self.scope:
            return None
        user = request.user
        ident = (
            getattr(user, "user_id", None)
            or getattr(user, "pk", None)
            or self.get_ident(request)
        )
        return self.cache_format % {"scope": self.scope, "ident": ident}
