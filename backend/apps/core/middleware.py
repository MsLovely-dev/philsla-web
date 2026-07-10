from collections.abc import Callable
import logging
from time import perf_counter
from uuid import uuid4

from django.http import HttpRequest, HttpResponse

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
