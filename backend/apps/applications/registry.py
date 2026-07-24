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
    extension_name: str
    sex: str
    school_id: str
    school_name: str
    grade_level: str
    enrollment_status: str
    school_year: str
    is_recognized_school: bool
    email: str = ""
    mobile_number: str = ""
    mother_maiden_full_name: str = ""


class LrnRegistry:
    def find(self, *, lrn: str) -> LrnRecord | None:
        raise NotImplementedError


class MockLrnRegistry(LrnRegistry):
    """Synthetic local/test registry; never use as production identity evidence."""

    records = {
        ("123456789012", date(2008, 5, 15)): LrnRecord(
            lrn="123456789012",
            date_of_birth=date(2008, 5, 15),
            first_name="Lovely Mae",
            middle_name="R",
            last_name="Chavez",
            extension_name="",
            sex="Female",
            school_id="301234",
            school_name="Taysan High School and Child Development Center",
            grade_level="Grade 12",
            enrollment_status="Enrolled",
            school_year="2026-2027",
            is_recognized_school=True,
            email="lovely@yopmail.com",
            mobile_number="09171234567",
            mother_maiden_full_name="Maria Santos Reyes",
        ),
        ("901234567899", date(2008, 5, 15)): LrnRecord(
            lrn="901234567899",
            date_of_birth=date(2008, 5, 15),
            first_name="Ineligible",
            middle_name="",
            last_name="Learner",
            extension_name="",
            sex="Male",
            school_id="309999",
            school_name="Sample National High School",
            grade_level="Grade 11",
            enrollment_status="Enrolled",
            school_year="2026-2027",
            is_recognized_school=True,
            email="ineligible.learner@example.test",
            mobile_number="09179999999",
            mother_maiden_full_name="Sample Mother Learner",
        ),
    }

    def find(self, *, lrn: str) -> LrnRecord | None:
        for (record_lrn, _), record in self.records.items():
            if record_lrn == lrn:
                return record
        return None


class UnavailableLrnRegistry(LrnRegistry):
    def find(self, *, lrn: str) -> LrnRecord | None:
        raise RegistryUnavailable


def get_lrn_registry() -> LrnRegistry:
    if settings.LRN_REGISTRY_PROVIDER == "mock":
        return MockLrnRegistry()
    return UnavailableLrnRegistry()
