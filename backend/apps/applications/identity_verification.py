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
        image_height, image_width = gray.shape[:2]
        short_side = min(image_width, image_height)
        long_side = max(image_width, image_height)
        min_short_side = min(settings.STEP1_SELFIE_MIN_IMAGE_WIDTH, settings.STEP1_SELFIE_MIN_IMAGE_HEIGHT)
        min_long_side = max(settings.STEP1_SELFIE_MIN_IMAGE_WIDTH, settings.STEP1_SELFIE_MIN_IMAGE_HEIGHT)
        min_face_ratio = settings.STEP1_SELFIE_MIN_FACE_RATIO
        detected_faces = [[int(value) for value in face] for face in faces]

        if len(detected_faces) == 0:
            raise SelfieFaceValidationFailed("No frontal face was detected in the selfie.")

        plausible_faces = [
            face
            for face in detected_faces
            if max(face[2] / float(image_width), face[3] / float(image_height)) >= min_face_ratio * 0.75
        ]
        if not plausible_faces:
            plausible_faces = [max(detected_faces, key=lambda face: face[2] * face[3])]

        if len(plausible_faces) > 1:
            raise SelfieFaceValidationFailed("Only one face is allowed in the selfie.")

        x, y, width, height = plausible_faces[0]
        face_size_ratio = max(width / float(image_width), height / float(image_height))
        padding_x = int(width * 0.2)
        padding_y = int(height * 0.2)
        crop_x1 = max(0, x - padding_x)
        crop_y1 = max(0, y - padding_y)
        crop_x2 = min(image_width, x + width + padding_x)
        crop_y2 = min(image_height, y + height + padding_y)
        face_gray = original_gray[crop_y1:crop_y2, crop_x1:crop_x2]
        blur_source = face_gray if face_gray.size else original_gray
        blur_score = float(cv2.Laplacian(blur_source, cv2.CV_64F).var())
        brightness_score = float(original_gray.mean())
        eye_detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
        detected_eye_count: int | None = None
        if not eye_detector.empty():
            upper_face_gray = original_gray[y : y + max(1, int(height * 0.6)), x : x + width]
            eyes = eye_detector.detectMultiScale(
                upper_face_gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(max(12, int(width * 0.08)), max(12, int(height * 0.08))),
            )
            detected_eye_count = len(eyes)
        mouth_detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_smile.xml")
        detected_mouth_count: int | None = None
        if not mouth_detector.empty():
            lower_face_gray = original_gray[y + int(height * 0.45) : y + height, x : x + width]
            mouths = mouth_detector.detectMultiScale(
                lower_face_gray,
                scaleFactor=1.2,
                minNeighbors=8,
                minSize=(max(24, int(width * 0.18)), max(12, int(height * 0.08))),
            )
            detected_mouth_count = len(mouths)
        center_x = x + (width / 2)
        center_y = y + (height / 2)
        horizontal_offset = abs(center_x - (image_width / 2)) / image_width
        vertical_offset = abs(center_y - (image_height / 2)) / image_height
        face_visibility_passed = (
            (detected_eye_count is None or detected_eye_count >= 2)
            and (detected_mouth_count is None or detected_mouth_count >= 1)
        )
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
            "faceVisibility": {
                "status": "pass" if face_visibility_passed else "fail",
                "value": {
                    "eyes": detected_eye_count,
                    "lowerFaceFeatures": detected_mouth_count,
                },
                "threshold": "both eyes and lower face visible",
            },
            "eyesOpen": {
                "status": "pass" if detected_eye_count is None or detected_eye_count >= 2 else "fail",
                "value": None if detected_eye_count is None else detected_eye_count >= 2,
                "threshold": "both eyes detected",
            },
            "lowerFaceVisibility": {
                "status": "pass" if detected_mouth_count is None or detected_mouth_count >= 1 else "fail",
                "value": detected_mouth_count,
                "threshold": "mouth or lower face feature detected",
            },
            "faceOrientation": {"status": "not_evaluated", "value": None, "threshold": "+/-20 degrees yaw/pitch/roll"},
            "brightness": {
                "status": "pass",
                "value": round(brightness_score, 2),
                "threshold": f"{settings.STEP1_SELFIE_MIN_BRIGHTNESS:g}-{settings.STEP1_SELFIE_MAX_BRIGHTNESS:g}",
            },
            "imageResolution": {
                "status": "pass",
                "value": {"width": image_width, "height": image_height},
                "threshold": f">= {min_long_side} x {min_short_side} in either orientation",
            },
        }

        if short_side < min_short_side or long_side < min_long_side:
            checks["imageResolution"]["status"] = "fail"
            raise SelfieFaceValidationFailed(
                f"Selfie image resolution must be at least {min_long_side} x {min_short_side} pixels in either orientation."
            )

        if face_size_ratio < settings.STEP1_SELFIE_MIN_FACE_RATIO:
            checks["faceSize"]["status"] = "fail"
            raise SelfieFaceValidationFailed("Move closer to the camera so your face is clear.")
        if face_size_ratio > settings.STEP1_SELFIE_MAX_FACE_RATIO:
            checks["faceSize"]["status"] = "fail"
            raise SelfieFaceValidationFailed("Move slightly back so your full face is visible.")
        if horizontal_offset > 0.22 or vertical_offset > 0.24:
            raise SelfieFaceValidationFailed("Center your face in the camera frame.")
        if detected_eye_count is not None and detected_eye_count < 2:
            raise SelfieFaceValidationFailed("Keep your full face visible and unobstructed.")
        if detected_mouth_count is not None and detected_mouth_count < 1:
            raise SelfieFaceValidationFailed("Keep your mouth and lower face visible and unobstructed.")
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
