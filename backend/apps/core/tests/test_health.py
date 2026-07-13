import json
import logging
from uuid import UUID

from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase, override_settings

from apps.core.database import database_config_from_url
from apps.core.logging import SafeJsonFormatter


@override_settings(ROOT_URLCONF="config.urls")
class HealthEndpointTests(TestCase):
    def test_health_returns_safe_response(self) -> None:
        response = self.client.get("/api/v1/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
        UUID(response.headers["X-Correlation-ID"])

    def test_unsupported_method_uses_standard_error_shape(self) -> None:
        response = self.client.post("/api/v1/health/", data={}, content_type="application/json")

        self.assertEqual(response.status_code, 405)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "METHOD_NOT_ALLOWED")
        self.assertEqual(payload["error"]["message"], 'Method "POST" not allowed.')
        self.assertEqual(payload["error"]["fields"], {})
        self.assertEqual(payload["error"]["correlationId"], response.headers["X-Correlation-ID"])
        UUID(payload["error"]["correlationId"])

    def test_request_log_uses_safe_structured_fields(self) -> None:
        with self.assertLogs("philsa.request", level="INFO") as captured:
            response = self.client.get(
                "/api/v1/health/?token=secret-token",
                headers={"Authorization": "Bearer secret-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(captured.records), 1)

        record = captured.records[0]
        self.assertEqual(record.event, "request_completed")
        self.assertEqual(record.method, "GET")
        self.assertEqual(record.route, "api/v1/health/")
        self.assertEqual(record.status_code, 200)
        self.assertEqual(record.correlation_id, response.headers["X-Correlation-ID"])
        self.assertIsInstance(record.duration_ms, float)

        formatted = SafeJsonFormatter().format(record)
        payload = json.loads(formatted)
        self.assertEqual(payload["event"], "request_completed")
        self.assertEqual(payload["correlation_id"], response.headers["X-Correlation-ID"])
        self.assertNotIn("secret-token", formatted)
        self.assertNotIn("Authorization", formatted)
        self.assertNotIn("token=", formatted)

    @override_settings(CORS_ALLOWED_ORIGINS=["https://frontend.example.test"])
    def test_cors_allowlist_adds_headers_for_allowed_origin(self) -> None:
        response = self.client.get("/api/v1/health/", headers={"Origin": "https://frontend.example.test"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], "https://frontend.example.test")
        self.assertEqual(response.headers["Access-Control-Allow-Credentials"], "true")
        self.assertIn("Origin", response.headers["Vary"])

    @override_settings(CORS_ALLOWED_ORIGINS=["https://frontend.example.test"])
    def test_cors_allowlist_ignores_untrusted_origin(self) -> None:
        response = self.client.get("/api/v1/health/", headers={"Origin": "https://evil.example.test"})

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)


class DatabaseUrlConfigTests(TestCase):
    def test_database_url_builds_postgresql_config_without_logging_credentials(self) -> None:
        config = database_config_from_url(
            "postgresql://user%40example.com:p%40ss@db.example.supabase.co:6543/philsa?connect_timeout=10"
        )

        self.assertEqual(config["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(config["NAME"], "philsa")
        self.assertEqual(config["USER"], "user@example.com")
        self.assertEqual(config["PASSWORD"], "p@ss")
        self.assertEqual(config["HOST"], "db.example.supabase.co")
        self.assertEqual(config["PORT"], 6543)
        self.assertEqual(config["OPTIONS"], {"connect_timeout": "10", "sslmode": "require"})

    def test_database_url_rejects_non_postgresql_scheme(self) -> None:
        with self.assertRaisesMessage(ImproperlyConfigured, "PostgreSQL scheme"):
            database_config_from_url("sqlite:///db.sqlite3")
