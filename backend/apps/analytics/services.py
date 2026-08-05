from django.db.models import Count, Q
from django.utils import timezone

from apps.applications.models import (
    ApplicationStatus,
    Step2VerificationStatus,
    StudentApplication,
    StudentApplicationAddress,
    StudentApplicationCoursePreference,
    StudentApplicationSchoolInfo,
)

VERIFIED_IDENTITY_STATUS = "VERIFIED"


def national_overview() -> dict:
    """Aggregate national registration metrics from real StudentApplication data.

    Scope is all non-DRAFT applications across all exam cycles. This is a
    cumulative national total, not scoped to a single exam cycle or agency --
    no field distinguishes CHED/DEPED/TESDA applications today, and the
    official metrics/aggregation rules are still TBD (see
    docs/architecture/DATABASE-DESIGN.md). Never touches exams/results/
    proctoring/support tables -- they have no models yet.
    """
    registered_qs = StudentApplication.objects.exclude(status=ApplicationStatus.DRAFT)
    total_registered = registered_qs.count()

    total_verified = (
        registered_qs.filter(
            Q(personal_info__identity_verification_status=VERIFIED_IDENTITY_STATUS)
            | Q(step2_verification__status=Step2VerificationStatus.PASSED)
        )
        .distinct()
        .count()
    )

    total_schools = (
        StudentApplicationSchoolInfo.objects.filter(application__in=registered_qs)
        .exclude(school_id="")
        .values("school_id")
        .distinct()
        .count()
    )

    total_universities = (
        StudentApplicationCoursePreference.objects.filter(application__in=registered_qs)
        .exclude(university="")
        .values("university")
        .distinct()
        .count()
    )

    regional_rows = (
        StudentApplicationAddress.objects.filter(application__in=registered_qs)
        .exclude(region="")
        .values("region")
        .annotate(application_count=Count("application_id", distinct=True))
        .order_by("-application_count", "region")
    )

    return {
        "totalRegisteredExaminees": total_registered,
        "totalVerifiedExaminees": total_verified,
        "totalParticipatingSchools": total_schools,
        "totalParticipatingUniversities": total_universities,
        "regionalBreakdown": [
            {"region": row["region"], "applicationCount": row["application_count"]}
            for row in regional_rows
        ],
        "generatedAt": timezone.now().isoformat(),
    }
