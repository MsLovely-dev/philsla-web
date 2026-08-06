from django.db import migrations, models


CANDIDATE_CODE_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def _hash_to_candidate_code(value):
    hash_value = 2166136261
    for character in value:
        hash_value ^= ord(character)
        hash_value = (hash_value * 16777619) & 0xFFFFFFFF

    code = ""
    state = hash_value
    for _ in range(6):
        state = ((state ^ (state >> 15)) * 2246822519) & 0xFFFFFFFF
        code += CANDIDATE_CODE_ALPHABET[state % len(CANDIDATE_CODE_ALPHABET)]

    return code


def _format_candidate_id(application):
    registration_date = application.submitted_at or application.created_at
    year = registration_date.year if registration_date else 2026
    code = _hash_to_candidate_code(str(application.id))
    return f"PHL-{year}-{code}"


def backfill_candidate_ids(apps, schema_editor):
    StudentApplication = apps.get_model("applications", "StudentApplication")
    ApplicationAuditLog = apps.get_model("applications", "ApplicationAuditLog")
    used_candidate_ids = set()

    for application in StudentApplication.objects.order_by("created_at", "id").iterator():
        candidate_id = _format_candidate_id(application)
        if candidate_id in used_candidate_ids:
            suffix_code = _hash_to_candidate_code(f"{application.id}:{len(used_candidate_ids)}")
            year = (application.submitted_at or application.created_at).year if (application.submitted_at or application.created_at) else 2026
            candidate_id = f"PHL-{year}-{suffix_code}"

        application.candidate_id = candidate_id
        application.save(update_fields=["candidate_id"])
        used_candidate_ids.add(candidate_id)

    for audit_log in ApplicationAuditLog.objects.filter(
        action="REGISTRATION_SUBMITTED",
        application__isnull=False,
    ).select_related("application").iterator():
        candidate_id = audit_log.application.candidate_id
        if not candidate_id:
            continue
        audit_log.registration_id = candidate_id
        audit_log.applicant_id = candidate_id
        if audit_log.account_id.startswith("PENDING-"):
            audit_log.account_id = f"PENDING-{candidate_id}"
        audit_log.save(update_fields=["registration_id", "applicant_id", "account_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0008_backfill_registration_submitted_audit_logs"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentapplication",
            name="candidate_id",
            field=models.CharField(default="", editable=False, max_length=17),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_candidate_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="studentapplication",
            name="candidate_id",
            field=models.CharField(editable=False, max_length=17, unique=True),
        ),
    ]
