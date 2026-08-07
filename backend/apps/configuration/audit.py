import logging

from .models import ConfigurationAuditLog


logger = logging.getLogger("philsa.audit")


def record_configuration_event(*, event: str, outcome: str, request=None, user=None) -> None:
    logger.info(
        "configuration_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": str(getattr(user, "user_id", getattr(user, "id", ""))),
        },
    )


def record_configuration_audit(*, action: str, field_id: int, before: dict, after: dict, request=None, user=None) -> ConfigurationAuditLog:
    create_kwargs = {
        "field_id_snapshot": field_id,
        "action": action,
        "actor_user_id": str(getattr(user, "user_id", getattr(user, "id", ""))),
        "before_json": before,
        "after_json": after,
        "correlation_id": getattr(request, "correlation_id", "") or "",
    }
    if action != "deleted":
        create_kwargs["field_id"] = field_id
    return ConfigurationAuditLog.objects.create(**create_kwargs)
