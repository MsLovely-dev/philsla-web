import logging


logger = logging.getLogger("philsa.audit")


def record_application_event(*, event: str, outcome: str, request=None, user=None) -> None:
    """Emit only identifiers and workflow metadata; never application payloads."""
    logger.info(
        "application_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": str(getattr(user, "user_id", getattr(user, "id", ""))),
        },
    )
