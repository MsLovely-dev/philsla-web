from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

from apps.applications.philsys_registry import (
    PhilSysRegistryUnavailable,
    UnavailablePhilSysRegistry,
    get_philsys_registry,
)


class PhilSysRegistryPlaceholderTests(SimpleTestCase):
    @override_settings(PHILSYS_REGISTRY_PROVIDER="unavailable")
    def test_default_philsys_registry_is_unavailable(self):
        registry = get_philsys_registry()
        self.assertIsInstance(registry, UnavailablePhilSysRegistry)
        with self.assertRaises(PhilSysRegistryUnavailable):
            registry.find(national_id="1234-5678-9012")

    @override_settings(PHILSYS_REGISTRY_PROVIDER="philsys")
    def test_philsys_provider_name_is_safe_placeholder(self):
        registry = get_philsys_registry()
        with self.assertRaises(PhilSysRegistryUnavailable):
            registry.find(national_id="1234-5678-9012")

    @override_settings(PHILSYS_REGISTRY_PROVIDER="unsupported")
    def test_unknown_philsys_provider_fails_closed(self):
        with self.assertRaises(ImproperlyConfigured):
            get_philsys_registry()


class RegistrationIntegrationStatusEndpointTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("applications:registration-integration-status")

    @override_settings(LRN_REGISTRY_PROVIDER="unavailable", PHILSYS_REGISTRY_PROVIDER="unavailable")
    def test_status_reports_manual_available_and_external_methods_unavailable(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        methods = {item["id"]: item for item in response.data["methods"]}
        self.assertEqual(response.data["backend"]["status"], "connected")
        self.assertEqual(methods["manual"]["status"], "available")
        self.assertTrue(methods["manual"]["active"])
        self.assertEqual(methods["lrn"]["status"], "unavailable")
        self.assertFalse(methods["lrn"]["active"])
        self.assertEqual(methods["philsys"]["status"], "locked")
        self.assertFalse(methods["philsys"]["active"])

    @override_settings(LRN_REGISTRY_PROVIDER="deped", PHILSYS_REGISTRY_PROVIDER="philsys")
    def test_status_reports_placeholder_providers_without_claiming_live_connection(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        methods = {item["id"]: item for item in response.data["methods"]}
        self.assertEqual(methods["lrn"]["status"], "placeholder")
        self.assertFalse(methods["lrn"]["active"])
        self.assertEqual(methods["philsys"]["status"], "placeholder")
        self.assertFalse(methods["philsys"]["active"])
        self.assertNotIn("token", str(response.data).lower())
        self.assertNotIn("secret", str(response.data).lower())
