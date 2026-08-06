from pathlib import Path
from uuid import UUID

from django.test import TestCase, override_settings
from django.urls import resolve


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
API_ENDPOINTS_DOC = REPOSITORY_ROOT / "docs" / "api" / "API-ENDPOINTS.md"

IMPLEMENTED_ENDPOINT_CONTRACTS = (
    {
        "method": "GET",
        "path": "/api/v1/health/",
        "response": {"status": "ok"},
        "doc_heading": "### `GET /api/v1/health/`",
        "doc_test_reference": "backend/apps/core/tests/test_health.py",
        "route_namespace": "api-v1",
    },
    {
        "method": "GET",
        "path": "/api/v1/auth/session/",
        "response": None,
        "doc_heading": "### `GET /api/v1/auth/session/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_session_endpoint.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/login/identifier/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/login/identifier/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_login_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/login/password/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/login/password/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_login_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/login/otp/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/login/otp/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_login_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/login/otp/resend/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/login/otp/resend/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_login_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/login/selfie/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/login/selfie/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_login_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/logout/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/logout/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_token_session_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/token/refresh/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/token/refresh/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_token_session_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/token/revoke/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/token/revoke/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_token_session_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/activation/student-registration/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/activation/student-registration/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_activation_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/activation/staff/complete/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/activation/staff/complete/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_activation_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/recovery/password/request/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/recovery/password/request/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_recovery_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/recovery/password/complete/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/recovery/password/complete/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_recovery_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/auth/recovery/admin/request/",
        "response": None,
        "doc_heading": "### `POST /api/v1/auth/recovery/admin/request/`",
        "doc_test_reference": "backend/apps/accounts/tests/test_recovery_endpoints.py",
        "route_namespace": "accounts",
    },
    {
        "method": "POST",
        "path": "/api/v1/applications/registration/email-otp/request/",
        "response": None,
        "doc_heading": "### `POST /api/v1/applications/registration/email-otp/request/`",
        "doc_test_reference": "backend/apps/applications/tests/test_registration_email_otp.py",
        "route_namespace": "applications",
    },
    {
        "method": "POST",
        "path": "/api/v1/applications/registration/email-otp/verify/",
        "response": None,
        "doc_heading": "### `POST /api/v1/applications/registration/email-otp/verify/`",
        "doc_test_reference": "backend/apps/applications/tests/test_registration_email_otp.py",
        "route_namespace": "applications",
    },
    {
        "method": "GET",
        "path": "/api/v1/analytics/national/overview/",
        "response": None,
        "doc_heading": "### `GET /api/v1/analytics/national/overview/`",
        "doc_test_reference": "backend/apps/analytics/tests/test_national_overview.py",
        "route_namespace": "analytics",
    },
)


@override_settings(ROOT_URLCONF="config.urls")
class ApiContractTests(TestCase):
    def test_implemented_endpoint_contracts_are_documented(self) -> None:
        endpoint_docs = API_ENDPOINTS_DOC.read_text(encoding="utf-8")

        for contract in IMPLEMENTED_ENDPOINT_CONTRACTS:
            table_path = f"| `{contract['method']}` | `{contract.get('doc_path', contract['path'])}` |"

            self.assertIn(table_path, endpoint_docs)
            self.assertIn(contract["doc_heading"], endpoint_docs)
            self.assertIn(contract["doc_test_reference"], endpoint_docs)

    def test_implemented_endpoint_contracts_are_routable(self) -> None:
        for contract in IMPLEMENTED_ENDPOINT_CONTRACTS:
            match = resolve(contract["path"])

            self.assertEqual(match.namespace, contract["route_namespace"])

    def test_health_endpoint_matches_documented_contract(self) -> None:
        contract = IMPLEMENTED_ENDPOINT_CONTRACTS[0]

        response = self.client.get(contract["path"])

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), contract["response"])
        UUID(response.headers["X-Correlation-ID"])
