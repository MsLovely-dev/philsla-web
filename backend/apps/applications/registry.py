from dataclasses import dataclass
from datetime import date

from django.conf import settings


class RegistryUnavailable(Exception):
    pass


@dataclass(frozen=True)
class LrnRecord:
    lrn: str
    date_of_birth: date
    first_name: str
    middle_name: str
    last_name: str
    school_name: str
    grade_level: str
    is_recognized_school: bool


class LrnRegistry:
    def find(self, *, lrn: str, date_of_birth: date) -> LrnRecord | None:
        raise NotImplementedError


class MockLrnRegistry(LrnRegistry):
    """Synthetic local/test registry; never use as production identity evidence."""

    records = {
        ("123456789012", date(2008, 5, 15)): LrnRecord(
            lrn="123456789012",
            date_of_birth=date(2008, 5, 15),
            first_name="Sample",
            middle_name="Test",
            last_name="Learner",
            school_name="Sample National High School",
            grade_level="Grade 12",
            is_recognized_school=True,
        ),
        ("901234567899", date(2008, 5, 15)): LrnRecord(
            lrn="901234567899",
            date_of_birth=date(2008, 5, 15),
            first_name="Ineligible",
            middle_name="",
            last_name="Learner",
            school_name="Sample National High School",
            grade_level="Grade 11",
            is_recognized_school=True,
        ),
    }

    def find(self, *, lrn: str, date_of_birth: date) -> LrnRecord | None:
        return self.records.get((lrn, date_of_birth))


class UnavailableLrnRegistry(LrnRegistry):
    def find(self, *, lrn: str, date_of_birth: date) -> LrnRecord | None:
        raise RegistryUnavailable


def get_lrn_registry() -> LrnRegistry:
    if settings.LRN_REGISTRY_PROVIDER == "mock":
        return MockLrnRegistry()
    return UnavailableLrnRegistry()
