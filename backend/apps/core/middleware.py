from collections.abc import Callable
import logging
from time import perf_counter
from uuid import uuid4

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.utils.cache import patch_vary_headers

logger = logging.getLogger("philsa.request")


class CorrelationIdMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request.correlation_id = str(uuid4())
        started_at = perf_counter()
        response = self.get_response(request)
        response["X-Correlation-ID"] = request.correlation_id

        resolver_match = getattr(request, "resolver_match", None)
        route = getattr(resolver_match, "route", None) or "unresolved"
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.info(
            "request_completed",
            extra={
                "correlation_id": request.correlation_id,
                "duration_ms": duration_ms,
                "event": "request_completed",
                "method": request.method,
                "route": route,
                "status_code": response.status_code,
            },
        )
        return response


class CorsAllowlistMiddleware:
    """Apply CORS headers only for explicitly configured origins."""

    allowed_methods = "DELETE, GET, OPTIONS, PATCH, POST, PUT"
    allowed_headers = "Authorization, Content-Type, X-CSRFToken, X-Registration-Token"

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        origin = request.headers.get("Origin")
        if self._is_preflight(request) and self._origin_allowed(origin):
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if self._origin_allowed(origin):
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true" if settings.CORS_ALLOW_CREDENTIALS else "false"
            response["Access-Control-Allow-Methods"] = self.allowed_methods
            response["Access-Control-Allow-Headers"] = self.allowed_headers
            patch_vary_headers(response, ("Origin",))

        return response

    def _origin_allowed(self, origin: str | None) -> bool:
        return bool(origin and origin in settings.CORS_ALLOWED_ORIGINS)

    def _is_preflight(self, request: HttpRequest) -> bool:
        return request.method == "OPTIONS" and "Access-Control-Request-Method" in request.headers
