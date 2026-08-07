from dataclasses import dataclass
from datetime import date
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.module_loading import import_string


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
    def find(self, *, lrn: str, date_of_birth: str = "") -> LrnRecord | None:
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

    def find(self, *, lrn: str, date_of_birth: str = "") -> LrnRecord | None:
        for (record_lrn, _), record in self.records.items():
            if record_lrn == lrn:
                return record
        return None


class UnavailableLrnRegistry(LrnRegistry):
    def find(self, *, lrn: str, date_of_birth: str = "") -> LrnRecord | None:
        raise RegistryUnavailable


class DepEdLrnRegistry(LrnRegistry):
    """DepEd LRN verification boundary for the approved test API."""

    def find(self, *, lrn: str, date_of_birth: str = "") -> LrnRecord | None:
        if not date_of_birth:
            return None
        try:
            parsed_date_of_birth = date.fromisoformat(date_of_birth)
        except ValueError:
            return None

        payload = {"lrn": lrn, "dateOfBirth": parsed_date_of_birth.isoformat()}
        response = self._post_verify(payload, request_id=str(uuid4()))
        if not response.get("verified"):
            return None

        learner = response.get("learner")
        if not isinstance(learner, dict):
            raise RegistryUnavailable
        record = self._record_from_learner(learner)
        if record.lrn != lrn:
            return None
        return record

    def _post_verify(self, payload: dict[str, str], request_id: str) -> dict:
        verify_url = str(getattr(settings, "LRN_DEPED_VERIFY_URL", "")).strip()
        token = str(getattr(settings, "LRN_DEPED_API_TOKEN", "")).strip()
        if not verify_url or not token:
            raise RegistryUnavailable

        request = Request(
            verify_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "X-Request-ID": request_id,
            },
            method="POST",
        )
        try:
            with self._open(request, timeout=settings.LRN_DEPED_TIMEOUT_SECONDS) as response:
                if getattr(response, "status", 200) != 200:
                    raise RegistryUnavailable
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code in {400, 404}:
                return {"verified": False}
            raise RegistryUnavailable from exc
        except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            raise RegistryUnavailable from exc

    def _open(self, request: Request, timeout: int):
        return urlopen(request, timeout=timeout)

    def _record_from_learner(self, learner: dict) -> LrnRecord:
        try:
            lrn = str(learner.get("lrn", "")).strip()
            date_of_birth = date.fromisoformat(str(learner.get("dateOfBirth", "")).strip())
            first_name, middle_name, last_name = _split_full_name(str(learner.get("fullName", "")).strip())
        except (TypeError, ValueError) as exc:
            raise RegistryUnavailable from exc
        return LrnRecord(
            lrn=lrn,
            date_of_birth=date_of_birth,
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            extension_name="",
            sex=_normalize_sex(str(learner.get("sex", "")).strip()),
            school_id=str(learner.get("schoolId", "")).strip(),
            school_name=str(learner.get("schoolName", "")).strip(),
            grade_level=str(learner.get("gradeLevel", "")).strip(),
            enrollment_status=_normalize_enrollment_status(str(learner.get("enrollmentStatus", "")).strip()),
            school_year=_normalize_school_year(str(learner.get("schoolYear", "")).strip()),
            is_recognized_school=True,
        )


def get_lrn_registry() -> LrnRegistry:
    registry_class = getattr(settings, "LRN_REGISTRY_CLASS", "")
    if registry_class:
        try:
            return registry_class()
        except TypeError:
            return import_string(registry_class)()

    if settings.LRN_REGISTRY_PROVIDER == "mock":
        return MockLrnRegistry()
    if settings.LRN_REGISTRY_PROVIDER == "deped":
        return DepEdLrnRegistry()
    if settings.LRN_REGISTRY_PROVIDER == "unavailable":
        return UnavailableLrnRegistry()
    raise ImproperlyConfigured(f"Unsupported LRN_REGISTRY_PROVIDER: {settings.LRN_REGISTRY_PROVIDER}")


def _split_full_name(full_name: str) -> tuple[str, str, str]:
    parts = [part for part in full_name.split() if part]
    if not parts:
        raise RegistryUnavailable
    if len(parts) == 1:
        return parts[0], "", ""
    if len(parts) == 2:
        return parts[0], "", parts[1]
    return parts[0], " ".join(parts[1:-1]), parts[-1]


def _normalize_sex(value: str) -> str:
    normalized = value.strip().upper()
    if normalized == "F":
        return "Female"
    if normalized == "M":
        return "Male"
    return value.strip()


def _normalize_enrollment_status(value: str) -> str:
    normalized = value.strip().upper()
    if normalized == "ENROLLED":
        return "Enrolled"
    return value.strip()


def _normalize_school_year(value: str) -> str:
    if value:
        return value
    cycle_id = str(getattr(settings, "ACTIVE_EXAM_CYCLE_ID", "")).strip()
    if cycle_id.isdigit():
        return f"{cycle_id}-{int(cycle_id) + 1}"
    return "TBD"
