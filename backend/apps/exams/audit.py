import logging


logger = logging.getLogger("philsa.audit")


def record_exam_blueprint_maintenance_event(*, event: str, outcome: str, request=None, user=None) -> None:
    logger.info(
        "exam_blueprint_maintenance_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": str(getattr(user, "id", "")),
        },
    )
