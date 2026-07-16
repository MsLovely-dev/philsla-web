from dataclasses import dataclass

from django.conf import settings


class DocumentRecognitionUnavailable(Exception):
    pass


@dataclass(frozen=True)
class StudentIdDetails:
    student_name: str
    school_name: str


class StudentIdRecognizer:
    def extract(self, *, front_file, back_file=None) -> StudentIdDetails:
        raise NotImplementedError


class MockStudentIdRecognizer(StudentIdRecognizer):
    """Deterministic local/test adapter; never production identity evidence."""

    def extract(self, *, front_file, back_file=None) -> StudentIdDetails:
        return StudentIdDetails(
            student_name="Lovely Mae R Chavez",
            school_name="Taysan High School and Child Development Center",
        )


class UnavailableStudentIdRecognizer(StudentIdRecognizer):
    def extract(self, *, front_file, back_file=None) -> StudentIdDetails:
        raise DocumentRecognitionUnavailable


def get_student_id_recognizer() -> StudentIdRecognizer:
    if settings.STEP2_DOCUMENT_RECOGNITION_PROVIDER == "mock":
        return MockStudentIdRecognizer()
    return UnavailableStudentIdRecognizer()
