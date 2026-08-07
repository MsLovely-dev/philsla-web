from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.applications.registry import DepEdLrnRegistry


class LrnVerificationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.url = reverse("applications:verify-lrn")

    def verify(self, lrn="123456789012", verification_category="email", verification_value="lovely@yopmail.com"):
        return self.client.post(
            self.url,
            {
                "lrn": lrn,
                "verificationCategory": verification_category,
                "verificationValue": verification_value,
            },
            format="json",
        )

    def test_valid_lrn_returns_read_only_registry_profile_and_proof(self):
        response = self.verify()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["dateOfBirth"], "2008-05-15")
        self.assertEqual(response.data["profile"]["firstName"], "Lovely Mae")
        self.assertEqual(response.data["profile"]["middleName"], "R")
        self.assertEqual(response.data["profile"]["lastName"], "Chavez")
        self.assertEqual(response.data["profile"]["sex"], "Female")
        self.assertEqual(response.data["profile"]["schoolId"], "301234")
        self.assertEqual(response.data["profile"]["schoolName"], "Taysan High School and Child Development Center")
        self.assertEqual(response.data["profile"]["gradeLevel"], "Grade 12")
        self.assertEqual(response.data["profile"]["enrollmentStatus"], "Enrolled")
        self.assertEqual(response.data["profile"]["schoolYear"], "2026-2027")
        self.assertTrue(response.data["profile"]["identityVerified"])
        self.assertNotIn("studentIdImage", response.data["profile"])
        self.assertTrue(response.data["verificationToken"])

    def test_invalid_format_is_rejected_before_registry_lookup(self):
        response = self.verify(lrn="123")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_FAILED")
        self.assertEqual(response.data["error"]["fields"]["lrn"][0], "Please enter a valid 12-digit LRN.")

    def test_unknown_lrn_is_rejected(self):
        response = self.verify(lrn="111111111111")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "LRN_VERIFICATION_FAILED")

    def test_registered_information_mismatch_is_rejected(self):
        response = self.verify(verification_value="different@example.test")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "LRN_VERIFICATION_FAILED")
        self.assertIn("does not match", response.data["error"]["message"])

    def test_can_verify_with_registered_birthday(self):
        response = self.verify(verification_category="birthday", verification_value="2008-05-15")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["verificationToken"])

    def test_non_grade_12_student_is_flagged_for_reviewer_attention(self):
        response = self.verify(
            lrn="901234567899",
            verification_value="ineligible.learner@example.test",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["profile"]["currentGrade12EnrollmentConfirmed"])
        self.assertTrue(response.data["profile"]["requiresAdmissionsReviewerAttention"])

    def test_fifth_failed_attempt_starts_lrn_cooldown(self):
        for _ in range(4):
            self.assertEqual(self.verify(lrn="111111111111").status_code, 400)
        fifth = self.verify(lrn="111111111111")
        self.assertEqual(fifth.status_code, 429)
        self.assertEqual(fifth.data["error"]["code"], "LRN_COOLDOWN")
        self.assertGreater(fifth.data["error"]["meta"]["retryAfterSeconds"], 0)
        self.assertLessEqual(fifth.data["error"]["meta"]["retryAfterSeconds"], 900)
        self.assertEqual(self.verify(lrn="111111111111").status_code, 429)

    def test_failed_attempt_limit_is_scoped_to_verification_category(self):
        for _ in range(5):
            self.verify(verification_value="wrong@example.test")

        response = self.verify(verification_value="wrong@example.test")
        self.assertEqual(response.status_code, 429)

        birthday_response = self.verify(
            verification_category="birthday",
            verification_value="2008-05-15",
        )
        self.assertEqual(birthday_response.status_code, 200)
        self.assertTrue(birthday_response.data["verificationToken"])

    @override_settings(LRN_REGISTRY_PROVIDER="unavailable")
    def test_registry_unavailable_has_specific_retryable_error(self):
        response = self.verify()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"]["code"], "LRN_REGISTRY_UNAVAILABLE")

    @override_settings(LRN_REGISTRY_PROVIDER="deped")
    def test_deped_provider_requires_birthday_verification(self):
        response = self.verify()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "LRN_VERIFICATION_FAILED")
        self.assertNotIn("123456789012", str(response.data))
        self.assertNotIn("lovely@yopmail.com", str(response.data))

    @override_settings(
        LRN_REGISTRY_PROVIDER="deped",
        LRN_DEPED_VERIFY_URL="https://deped.example.test/api/v1/learners/verify",
        LRN_DEPED_API_TOKEN="test-token",
    )
    def test_deped_birthday_verification_uses_upstream_registry(self):
        captured = {}

        class FakeDepEdRegistry(DepEdLrnRegistry):
            def _post_verify(self, payload, request_id):
                captured["payload"] = payload
                captured["request_id"] = request_id
                return {
                    "verified": True,
                    "learner": {
                        "lrn": "817222062752",
                        "fullName": "Juan Garcia",
                        "dateOfBirth": "2012-08-07",
                        "sex": "F",
                        "schoolId": "TEST-0001",
                        "schoolName": "Sample National High School",
                        "gradeLevel": "Grade 12",
                        "enrollmentStatus": "ENROLLED",
                    },
                }

        with override_settings(LRN_REGISTRY_CLASS=FakeDepEdRegistry):
            response = self.verify(
                lrn="817222062752",
                verification_category="birthday",
                verification_value="2012-08-07",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured["payload"], {"lrn": "817222062752", "dateOfBirth": "2012-08-07"})
        self.assertTrue(captured["request_id"])
        self.assertEqual(response.data["profile"]["firstName"], "Juan")
        self.assertEqual(response.data["profile"]["lastName"], "Garcia")
        self.assertEqual(response.data["profile"]["sex"], "Female")
        self.assertEqual(response.data["profile"]["schoolId"], "TEST-0001")
        self.assertEqual(response.data["profile"]["enrollmentStatus"], "Enrolled")
        self.assertEqual(response.data["profile"]["schoolYear"], "2026-2027")
        self.assertNotIn("test-token", str(response.data))

    @override_settings(
        LRN_REGISTRY_PROVIDER="deped",
        LRN_DEPED_VERIFY_URL="https://deped.example.test/api/v1/learners/verify",
        LRN_DEPED_API_TOKEN="test-token",
    )
    def test_deped_verification_rejects_mismatched_learner_lrn(self):
        class FakeDepEdRegistry(DepEdLrnRegistry):
            def _post_verify(self, payload, request_id):
                return {
                    "verified": True,
                    "learner": {
                        "lrn": "999999999999",
                        "fullName": "Juan Garcia",
                        "dateOfBirth": "2012-08-07",
                        "sex": "F",
                        "schoolId": "TEST-0001",
                        "schoolName": "Sample National High School",
                        "gradeLevel": "Grade 12",
                        "enrollmentStatus": "ENROLLED",
                    },
                }

        with override_settings(LRN_REGISTRY_CLASS=FakeDepEdRegistry):
            response = self.verify(
                lrn="817222062752",
                verification_category="birthday",
                verification_value="2012-08-07",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "LRN_VERIFICATION_FAILED")
        self.assertNotIn("999999999999", str(response.data))


class DepEdLrnRegistryTests(TestCase):
    @override_settings(
        LRN_DEPED_VERIFY_URL="https://deped.example.test/api/v1/learners/verify",
        LRN_DEPED_API_TOKEN="test-token",
        LRN_DEPED_TIMEOUT_SECONDS=7,
    )
    def test_find_posts_lrn_and_birthday_with_bearer_token_and_maps_success_response(self):
        captured = {}

        class FakeDepEdRegistry(DepEdLrnRegistry):
            def _open(self, request, timeout):
                captured["url"] = request.full_url
                captured["timeout"] = timeout
                captured["authorization"] = request.headers["Authorization"]
                captured["content_type"] = request.headers["Content-type"]
                captured["request_id"] = request.headers["X-request-id"]
                captured["body"] = request.data.decode("utf-8")

                class Response:
                    status = 200

                    def __enter__(self):
                        return self

                    def __exit__(self, exc_type, exc, traceback):
                        return False

                    def read(self):
                        return (
                            b'{"verified": true, "learner": {"lrn": "817222062752", '
                            b'"fullName": "Juan Garcia", "dateOfBirth": "2012-08-07", '
                            b'"sex": "F", "schoolId": "TEST-0001", '
                            b'"schoolName": "Sample National High School", '
                            b'"gradeLevel": "Grade 12", "enrollmentStatus": "ENROLLED"}}'
                        )

                return Response()

        record = FakeDepEdRegistry().find(lrn="817222062752", date_of_birth="2012-08-07")

        self.assertEqual(record.lrn, "817222062752")
        self.assertEqual(record.first_name, "Juan")
        self.assertEqual(record.last_name, "Garcia")
        self.assertEqual(record.date_of_birth.isoformat(), "2012-08-07")
        self.assertEqual(record.sex, "Female")
        self.assertEqual(record.enrollment_status, "Enrolled")
        self.assertEqual(captured["url"], "https://deped.example.test/api/v1/learners/verify")
        self.assertEqual(captured["timeout"], 7)
        self.assertEqual(captured["authorization"], "Bearer test-token")
        self.assertEqual(captured["content_type"], "application/json")
        self.assertTrue(captured["request_id"])
        self.assertIn('"lrn": "817222062752"', captured["body"])
        self.assertIn('"dateOfBirth": "2012-08-07"', captured["body"])
