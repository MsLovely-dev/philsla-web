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
    face_covered: bool
    checks: dict[str, dict[str, object]]


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
            face_covered=False,
            checks={
                "faceDetected": {"status": "pass", "value": True, "threshold": "exactly 1 face"},
                "faceSize": {"status": "pass", "value": 0.35, "threshold": "20-70% of image"},
                "blur": {"status": "pass", "value": 150.0, "threshold": "> 100"},
                "faceVisibility": {"status": "pass", "value": 1.0, "threshold": ">= 90%"},
                "eyesOpen": {"status": "pass", "value": True, "threshold": "both eyes detected"},
                "faceOrientation": {"status": "pass", "value": {"yaw": 0, "pitch": 0, "roll": 0}, "threshold": "+/-20 degrees"},
                "brightness": {"status": "pass", "value": 128.0, "threshold": "60-200"},
                "imageResolution": {"status": "pass", "value": {"width": 720, "height": 720}, "threshold": ">= 720 x 720"},
            },
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

        original_gray = cv2.cvtColor(decoded, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(original_gray)
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
        face_size_ratio = max(width / float(image_width), height / float(image_height))
        blur_score = float(cv2.Laplacian(original_gray, cv2.CV_64F).var())
        brightness_score = float(original_gray.mean())
        center_x = x + (width / 2)
        center_y = y + (height / 2)
        horizontal_offset = abs(center_x - (image_width / 2)) / image_width
        vertical_offset = abs(center_y - (image_height / 2)) / image_height
        checks = {
            "faceDetected": {"status": "pass", "value": True, "threshold": "exactly 1 face"},
            "faceSize": {
                "status": "pass",
                "value": round(face_size_ratio, 4),
                "threshold": f"{settings.STEP1_SELFIE_MIN_FACE_RATIO:.0%}-{settings.STEP1_SELFIE_MAX_FACE_RATIO:.0%} of image",
            },
            "blur": {
                "status": "pass",
                "value": round(blur_score, 2),
                "threshold": f"> {settings.STEP1_SELFIE_MIN_LAPLACIAN_VARIANCE:g}",
            },
            "faceVisibility": {"status": "not_evaluated", "value": None, "threshold": ">= 90% landmarks visible"},
            "eyesOpen": {"status": "not_evaluated", "value": None, "threshold": "both eyes detected"},
            "faceOrientation": {"status": "not_evaluated", "value": None, "threshold": "+/-20 degrees yaw/pitch/roll"},
            "brightness": {
                "status": "pass",
                "value": round(brightness_score, 2),
                "threshold": f"{settings.STEP1_SELFIE_MIN_BRIGHTNESS:g}-{settings.STEP1_SELFIE_MAX_BRIGHTNESS:g}",
            },
            "imageResolution": {
                "status": "pass",
                "value": {"width": image_width, "height": image_height},
                "threshold": f">= {settings.STEP1_SELFIE_MIN_IMAGE_WIDTH} x {settings.STEP1_SELFIE_MIN_IMAGE_HEIGHT}",
            },
        }

        if image_width < settings.STEP1_SELFIE_MIN_IMAGE_WIDTH or image_height < settings.STEP1_SELFIE_MIN_IMAGE_HEIGHT:
            checks["imageResolution"]["status"] = "fail"
            raise SelfieFaceValidationFailed("Selfie image resolution must be at least 720 x 720 pixels.")

        if face_size_ratio < settings.STEP1_SELFIE_MIN_FACE_RATIO:
            checks["faceSize"]["status"] = "fail"
            raise SelfieFaceValidationFailed("Move closer to the camera so your face is clear.")
        if face_size_ratio > settings.STEP1_SELFIE_MAX_FACE_RATIO:
            checks["faceSize"]["status"] = "fail"
            raise SelfieFaceValidationFailed("Move slightly back so your full face is visible.")
        if horizontal_offset > 0.22 or vertical_offset > 0.24:
            raise SelfieFaceValidationFailed("Center your face in the camera frame.")
        if blur_score <= settings.STEP1_SELFIE_MIN_LAPLACIAN_VARIANCE:
            checks["blur"]["status"] = "fail"
            raise SelfieFaceValidationFailed("Selfie image is too blurry. Capture a sharper photo.")
        if brightness_score < settings.STEP1_SELFIE_MIN_BRIGHTNESS:
            checks["brightness"]["status"] = "fail"
            raise SelfieFaceValidationFailed("Selfie image is too dark. Move to a brighter area.")
        if brightness_score > settings.STEP1_SELFIE_MAX_BRIGHTNESS:
            checks["brightness"]["status"] = "fail"
            raise SelfieFaceValidationFailed("Selfie image is too bright. Reduce glare and try again.")

        return SelfieFaceValidationResult(
            face_count=1,
            confidence=round(min(100.0, max(0.0, face_size_ratio * 100)), 2),
            bounding_box={"x": x, "y": y, "width": width, "height": height},
            face_covered=False,
            checks=checks,
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
