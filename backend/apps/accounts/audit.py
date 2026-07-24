import logging


logger = logging.getLogger("philsa.audit")


def record_auth_event(*, event: str, outcome: str, request: object | None = None, user: object | None = None) -> None:
    """Record a safe auth audit boundary event.

    Durable audit persistence is intentionally deferred until the audit module
    is implemented. This boundary only emits approved metadata and must never
    include credentials, OTPs, tokens, identifiers, or request bodies.
    """

    logger.info(
        "auth_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": str(getattr(user, "id", "")) if user is not None else "",
        },
    )
