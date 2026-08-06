from dataclasses import dataclass
from decimal import Decimal

from django.contrib.auth import get_user_model

from apps.configuration.models import University, UniversityClassification
from apps.results.models import ExaminationSession, ReleaseMetric, ReleasePolicy, ReleasePolicyStatus


@dataclass(frozen=True)
class ReleaseFixture:
    admin: object
    session: ExaminationSession
    university: University


def make_release_fixture(*, key: str = "one") -> ReleaseFixture:
    """Create the core synthetic records used by release model tests."""
    admin = get_user_model().objects.create_user(
        username=f"release-admin-{key}",
        email=f"release-admin-{key}@example.test",
    )
    session = ExaminationSession.objects.create(id=f"RELEASE-{key}", name=f"Release session {key}")
    university = University.objects.create(
        code=f"REL-{key}".upper(),
        name=f"Release University {key}",
        classification=UniversityClassification.PUBLIC,
        region="Region I",
        city="Test City",
        established_year=2020,
        created_by=admin,
    )
    return ReleaseFixture(admin=admin, session=session, university=university)


def make_policy(**overrides) -> ReleasePolicy:
    fixture = overrides.pop("fixture", None) or make_release_fixture()
    values = {
        "session": fixture.session,
        "university": fixture.university,
        "metric": ReleaseMetric.PERCENTILE,
        "qualified_threshold": Decimal("85.00"),
        "waitlist_enabled": False,
        "waitlist_lower_threshold": None,
        "status": ReleasePolicyStatus.DRAFT,
        "version": 1,
        "created_by": fixture.admin,
    }
    values.update(overrides)
    return ReleasePolicy(**values)
