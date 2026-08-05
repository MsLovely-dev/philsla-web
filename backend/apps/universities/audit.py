import logging


logger = logging.getLogger("philsa.audit")


def record_university_event(*, event: str, outcome: str, request=None, user=None) -> None:
    logger.info(
        "university_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": str(getattr(user, "user_id", getattr(user, "id", ""))),
        },
    )


def record_college_course_event(*, event: str, outcome: str, request=None, user=None) -> None:
    logger.info(
        "college_course_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": str(getattr(user, "user_id", getattr(user, "id", ""))),
        },
    )
