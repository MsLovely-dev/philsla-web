import logging

from .models import ApplicationAuditLog


logger = logging.getLogger("philsa.audit")


def _client_ip(request) -> str:
    if request is None:
        return ""
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def record_application_event(*, event: str, outcome: str, request=None, user=None, application=None) -> None:
    """Emit only identifiers and workflow metadata; never application payloads."""
    user_id = str(getattr(user, "user_id", getattr(user, "id", ""))) if user is not None else ""
    logger.info(
        "application_event",
        extra={
            "event": event,
            "outcome": outcome,
            "correlation_id": getattr(request, "correlation_id", None),
            "user_id": user_id,
        },
    )

    if event == "student_account_activated" and outcome == "success" and application is not None:
        registration_id = str(application.id)
        candidate_id = getattr(application, "candidate_id", "") or registration_id
        account_id = str(getattr(application, "owner_id", "")) or user_id
        ApplicationAuditLog.objects.create(
            application=application,
            action="REGISTRATION_STUDENT_ACCOUNT_ACTIVATED",
            event=event,
            outcome=outcome,
            registration_id=candidate_id,
            applicant_id=candidate_id,
            account_id=account_id,
            actor_user_id=account_id or "ANONYMOUS",
            actor_role="Student",
            session_id=request.headers.get("X-Registration-Session-Id", "") if request is not None else "",
            ip_address=_client_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT", "") if request is not None else "")[:512],
            correlation_id=str(getattr(request, "correlation_id", "")),
        )
        return

    if application is None or event != "application_submitted" or outcome != "success":
        return

    registration_id = str(application.id)
    candidate_id = getattr(application, "candidate_id", "") or registration_id
    ApplicationAuditLog.objects.create(
        application=application,
        action="REGISTRATION_SUBMITTED",
        event=event,
        outcome=outcome,
        registration_id=candidate_id,
        applicant_id=candidate_id,
        account_id=user_id or f"PENDING-{candidate_id}",
        actor_user_id=user_id or "ANONYMOUS",
        actor_role=str(getattr(user, "role", "")) if user is not None else "Student",
        session_id=request.headers.get("X-Registration-Session-Id", "") if request is not None else "",
        ip_address=_client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT", "") if request is not None else "")[:512],
        correlation_id=str(getattr(request, "correlation_id", "")),
    )
