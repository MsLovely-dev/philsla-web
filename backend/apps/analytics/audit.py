import logging

logger = logging.getLogger("philsa.audit")


def record_analytics_event(*, event: str, outcome: str, request=None, user=None) -> None:
    """Emit only identifiers and workflow metadata; never analytics payloads."""
    user_id = str(getattr(user, "user_id", getattr(user, "id", ""))) if user is not None else ""
    logger.info(
        "analytics_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": user_id,
        },
    )
