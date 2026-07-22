from django.db import migrations


SUBMITTED_STATUSES = ("SUBMITTED", "RESUBMITTED", "APPROVED", "FOR_CORRECTION", "REJECTED")


def backfill_registration_submitted_audit_logs(apps, schema_editor):
    StudentApplication = apps.get_model("applications", "StudentApplication")
    ApplicationAuditLog = apps.get_model("applications", "ApplicationAuditLog")

    existing_registration_ids = set(
        ApplicationAuditLog.objects.filter(action="REGISTRATION_SUBMITTED")
        .values_list("registration_id", flat=True)
    )
    audit_logs = []

    for application in StudentApplication.objects.filter(
        submitted_at__isnull=False,
        status__in=SUBMITTED_STATUSES,
    ).iterator():
        registration_id = str(application.id)
        if registration_id in existing_registration_ids:
            continue

        owner_id = str(application.owner_id) if application.owner_id else ""
        audit_logs.append(
            ApplicationAuditLog(
                application_id=application.id,
                action="REGISTRATION_SUBMITTED",
                event="application_submitted",
                outcome="success",
                registration_id=registration_id,
                applicant_id=registration_id,
                account_id=owner_id or f"PENDING-{registration_id}",
                actor_user_id=owner_id or "ANONYMOUS",
                actor_role="STUDENT",
                created_at=application.submitted_at,
            )
        )

    ApplicationAuditLog.objects.bulk_create(audit_logs)


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0007_applicationauditlog"),
    ]

    operations = [
        migrations.RunPython(
            backfill_registration_submitted_audit_logs,
            migrations.RunPython.noop,
        ),
    ]
