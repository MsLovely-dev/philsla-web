from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient


class LrnVerificationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.url = reverse("applications:verify-lrn")

    def verify(self, lrn="123456789012", dob="2008-05-15"):
        return self.client.post(self.url, {"lrn": lrn, "dateOfBirth": dob}, format="json")

    def test_valid_lrn_and_dob_return_read_only_registry_profile_and_proof(self):
        response = self.verify()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["firstName"], "Sample")
        self.assertEqual(response.data["profile"]["schoolName"], "Sample National High School")
        self.assertNotIn("studentIdImage", response.data["profile"])
        self.assertTrue(response.data["verificationToken"])

    def test_invalid_format_is_rejected_before_registry_lookup(self):
        response = self.verify(lrn="123")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_FAILED")
        self.assertEqual(response.data["error"]["fields"]["lrn"][0], "Please enter a valid 12-digit LRN.")

    def test_mismatched_lrn_and_dob_are_rejected(self):
        response = self.verify(dob="2008-05-16")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "LRN_VERIFICATION_FAILED")

    def test_non_grade_12_student_is_ineligible(self):
        response = self.verify(lrn="901234567899")
        self.assertEqual(response.status_code, 400)
        self.assertIn("not currently enrolled in Grade 12", response.data["error"]["message"])

    def test_fifth_failed_attempt_starts_lrn_cooldown(self):
        for _ in range(4):
            self.assertEqual(self.verify(dob="2000-01-01").status_code, 400)
        fifth = self.verify(dob="2000-01-01")
        self.assertEqual(fifth.status_code, 429)
        self.assertEqual(fifth.data["error"]["code"], "LRN_COOLDOWN")
        self.assertEqual(self.verify().status_code, 429)

    @override_settings(LRN_REGISTRY_PROVIDER="unavailable")
    def test_registry_unavailable_has_specific_retryable_error(self):
        response = self.verify()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"]["code"], "LRN_REGISTRY_UNAVAILABLE")
