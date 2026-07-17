from dataclasses import dataclass

from django.conf import settings


class DocumentRecognitionUnavailable(Exception):
    pass


class SelfieFaceValidationUnavailable(Exception):
    pass


class SelfieFaceValidationFailed(Exception):
    pass


@dataclass(frozen=True)
class StudentIdDetails:
    student_name: str
    school_name: str


@dataclass(frozen=True)
class SelfieFaceValidationResult:
    face_count: int
    confidence: float
    bounding_box: dict[str, int]


class StudentIdRecognizer:
    def extract(self, *, front_file, back_file=None) -> StudentIdDetails:
        raise NotImplementedError


class SelfieFaceValidator:
    def validate(self, *, image_file, content_type: str) -> SelfieFaceValidationResult:
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


class MockSelfieFaceValidator(SelfieFaceValidator):
    """Deterministic test adapter; production must use a real face detector."""

    def validate(self, *, image_file, content_type: str) -> SelfieFaceValidationResult:
        return SelfieFaceValidationResult(
            face_count=1,
            confidence=100.0,
            bounding_box={"x": 10, "y": 10, "width": 100, "height": 100},
        )


class OpenCvSelfieFaceValidator(SelfieFaceValidator):
    def validate(self, *, image_file, content_type: str) -> SelfieFaceValidationResult:
        try:
            import cv2
            import numpy as np
        except Exception as exc:
            raise SelfieFaceValidationUnavailable("OpenCV is not installed.") from exc

        raw_bytes = image_file.read()
        image_file.seek(0)
        decoded = cv2.imdecode(np.frombuffer(raw_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        if decoded is None:
            raise SelfieFaceValidationFailed("Selfie image could not be decoded.")

        gray = cv2.cvtColor(decoded, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        detector = cv2.CascadeClassifier(cascade_path)
        if detector.empty():
            raise SelfieFaceValidationUnavailable("OpenCV frontal face detector is unavailable.")

        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=6,
            minSize=(80, 80),
        )
        if len(faces) == 0:
            raise SelfieFaceValidationFailed("No frontal face was detected in the selfie.")
        if len(faces) > 1:
            raise SelfieFaceValidationFailed("Only one face is allowed in the selfie.")

        x, y, width, height = [int(value) for value in faces[0]]
        image_height, image_width = gray.shape[:2]
        face_area_ratio = (width * height) / float(image_width * image_height)
        center_x = x + (width / 2)
        center_y = y + (height / 2)
        horizontal_offset = abs(center_x - (image_width / 2)) / image_width
        vertical_offset = abs(center_y - (image_height / 2)) / image_height

        if face_area_ratio < 0.08:
            raise SelfieFaceValidationFailed("Move closer to the camera so your face is clear.")
        if face_area_ratio > 0.65:
            raise SelfieFaceValidationFailed("Move slightly back so your full face is visible.")
        if horizontal_offset > 0.22 or vertical_offset > 0.24:
            raise SelfieFaceValidationFailed("Center your face in the camera frame.")

        return SelfieFaceValidationResult(
            face_count=1,
            confidence=round(min(100.0, max(0.0, face_area_ratio * 250)), 2),
            bounding_box={"x": x, "y": y, "width": width, "height": height},
        )


class UnavailableSelfieFaceValidator(SelfieFaceValidator):
    def validate(self, *, image_file, content_type: str) -> SelfieFaceValidationResult:
        raise SelfieFaceValidationUnavailable


def get_student_id_recognizer() -> StudentIdRecognizer:
    if settings.STEP2_DOCUMENT_RECOGNITION_PROVIDER == "mock":
        return MockStudentIdRecognizer()
    return UnavailableStudentIdRecognizer()


def get_selfie_face_validator() -> SelfieFaceValidator:
    if settings.STEP1_SELFIE_FACE_PROVIDER == "opencv":
        return OpenCvSelfieFaceValidator()
    if settings.STEP1_SELFIE_FACE_PROVIDER == "mock":
        return MockSelfieFaceValidator()
    return UnavailableSelfieFaceValidator()
