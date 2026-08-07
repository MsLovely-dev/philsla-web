# System Integration Provider Placeholders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe backend provider placeholders and a frontend system-integration status surface so PhilSLA can show readiness for LRN and National ID registration APIs without breaking the currently active Manual Registration path.

**Architecture:** Keep the browser connected only to PhilSLA backend APIs. Add unavailable provider classes behind backend registration boundaries, expose safe provider-readiness metadata through a PhilSLA endpoint, and update the frontend to display backend connectivity plus registration-method integration status. Manual Registration remains the active usable path; LRN and PhilSys remain locked or unavailable until official API contracts, credentials, and security review are completed.

**Tech Stack:** Django 5.2, Django REST Framework 3.16, Python 3.13, React 19, TypeScript 5.8, Vite 6, Vitest, React Testing Library.

## Global Constraints

- Do not call DepEd, PhilSys, or any external provider from the frontend.
- Do not add external API credentials, URLs, tokens, certificates, or real student data.
- Preserve `POST /api/v1/applications/registration/lrn/verify/` request and response behavior for the frontend.
- Preserve Manual Registration as the active successful registration path.
- Add only safe placeholder providers that return the existing safe unavailable behavior until a real API contract is provided.
- Production must reject mock providers and must not silently treat a placeholder as a completed integration.
- No raw LRN, birth date, National ID, or registry payloads may be logged.
- Existing frontend service calls must remain isolated in `frontend/src/services/`.
- Existing backend business rules must remain in application services and provider/adaptor boundaries, not in views.

---

## File Structure

- Modify: `backend/apps/applications/registry.py`
  - Add `DepEdLrnRegistry`, a safe unavailable provider class.
  - Update `get_lrn_registry()` to recognize `LRN_REGISTRY_PROVIDER="deped"` and return the unavailable DepEd stub.
- Create: `backend/apps/applications/philsys_registry.py`
  - Define the future PhilSys provider boundary with an unavailable `PhilSysRegistry` implementation.
- Modify: `backend/config/settings/base.py`
  - Add `PHILSYS_REGISTRY_PROVIDER`.
  - Add optional provider status labels used by the frontend-readiness endpoint.
- Modify: `backend/config/settings/production.py`
  - Reject `PHILSYS_REGISTRY_PROVIDER="mock"` in production.
  - Continue allowing `PHILSYS_REGISTRY_PROVIDER="unavailable"` until the real provider is implemented.
- Modify: `backend/config/settings/staging.py`
  - Reject mock PhilSys unless `STAGING_ALLOW_MOCK_INTEGRATIONS=true`.
- Create: `backend/apps/applications/integration_status.py`
  - Build safe registration integration status data without exposing secrets or raw provider settings.
- Modify: `backend/apps/applications/views.py`
  - Add a public read-only API view for registration integration status.
- Modify: `backend/apps/applications/urls.py`
  - Add `GET /api/v1/applications/registration/integration-status/`.
- Test: `backend/apps/applications/tests/test_integration_status.py`
  - Cover status endpoint and safe placeholder behavior.
- Modify: `backend/apps/applications/tests/test_lrn_verification.py`
  - Cover `LRN_REGISTRY_PROVIDER="deped"` returning the same safe unavailable error.
- Modify: `frontend/src/services/backendApplicationService.ts`
  - Add typed `getRegistrationIntegrationStatus()` service call.
- Test: `frontend/src/services/backendApplicationService.test.ts`
  - Cover endpoint path and response mapping.
- Modify: `frontend/src/pages/StudentApplication.tsx`
  - Update the registration method chooser/status area to show backend connectivity and provider readiness.
  - Ensure Manual Registration remains selectable and usable when LRN/PhilSys are unavailable.
- Test: `frontend/src/pages/StudentApplication.test.tsx`
  - Add focused behavior tests for Manual Registration staying active and integration status rendering.
- Modify: `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.tsx`
  - Add explanatory status copy for System Integration readiness in Registration Methods.
- Test: `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx`
  - Cover that PhilSys remains locked and Manual Entry/LRN controls are not regressed.
- Modify: `docs/api/API-ENDPOINTS.md`
  - Document the new safe frontend-readiness endpoint.
- Modify: `docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md`
  - Add an update noting the unavailable provider placeholder and frontend status surface.
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`
  - Record implementation and verification results after execution.

---

### Task 1: Backend LRN Provider Placeholder

**Files:**
- Modify: `backend/apps/applications/registry.py`
- Test: `backend/apps/applications/tests/test_lrn_verification.py`

**Interfaces:**
- Consumes: existing `class LrnRegistry`, `class LrnRecord`, `class RegistryUnavailable`.
- Produces: `class DepEdLrnRegistry(LrnRegistry)` and `get_lrn_registry()` support for `LRN_REGISTRY_PROVIDER="deped"`.

- [ ] **Step 1: Add failing backend test for the DepEd placeholder**

Append this test to `LrnVerificationTests` in `backend/apps/applications/tests/test_lrn_verification.py`:

```python
    @override_settings(LRN_REGISTRY_PROVIDER="deped")
    def test_deped_placeholder_returns_safe_unavailable_error(self):
        response = self.verify()
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error"]["code"], "LRN_REGISTRY_UNAVAILABLE")
        self.assertNotIn("123456789012", str(response.data))
        self.assertNotIn("lovely@yopmail.com", str(response.data))
```

- [ ] **Step 2: Run the focused failing test**

Run from `backend/`:

```powershell
python manage.py test apps.applications.tests.test_lrn_verification.LrnVerificationTests.test_deped_placeholder_returns_safe_unavailable_error --settings=config.settings.test
```

Expected result: fail because `get_lrn_registry()` does not yet recognize `deped`.

- [ ] **Step 3: Add the unavailable DepEd provider class**

In `backend/apps/applications/registry.py`, add this class after `UnavailableLrnRegistry`:

```python
class DepEdLrnRegistry(LrnRegistry):
    """Integration placeholder for the future DepEd LRN API.

    This class exists so environments can be wired with
    LRN_REGISTRY_PROVIDER=deped before the official API contract is available.
    It must keep returning RegistryUnavailable until endpoint, auth, payload,
    error mapping, timeout, rate-limit, and data-retention rules are approved.
    """

    def find(self, *, lrn: str) -> LrnRecord | None:
        raise RegistryUnavailable
```

- [ ] **Step 4: Route the provider name to the placeholder**

Update `get_lrn_registry()` in `backend/apps/applications/registry.py`:

```python
def get_lrn_registry() -> LrnRegistry:
    if settings.LRN_REGISTRY_PROVIDER == "mock":
        return MockLrnRegistry()
    if settings.LRN_REGISTRY_PROVIDER == "deped":
        return DepEdLrnRegistry()
    return UnavailableLrnRegistry()
```

- [ ] **Step 5: Run LRN verification tests**

Run from `backend/`:

```powershell
python manage.py test apps.applications.tests.test_lrn_verification --settings=config.settings.test
```

Expected result: all LRN verification tests pass.

---

### Task 2: Backend PhilSys Provider Boundary

**Files:**
- Create: `backend/apps/applications/philsys_registry.py`
- Modify: `backend/config/settings/base.py`
- Modify: `backend/config/settings/production.py`
- Modify: `backend/config/settings/staging.py`
- Test: `backend/apps/applications/tests/test_integration_status.py`

**Interfaces:**
- Produces: `class PhilSysRegistryUnavailable(Exception)`, `class PhilSysRegistry`, `class UnavailablePhilSysRegistry`, `get_philsys_registry()`.
- Produces setting: `PHILSYS_REGISTRY_PROVIDER`.

- [ ] **Step 1: Create failing tests for PhilSys provider safety**

Create `backend/apps/applications/tests/test_integration_status.py` with:

```python
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings

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
```

- [ ] **Step 2: Run the focused failing test**

Run from `backend/`:

```powershell
python manage.py test apps.applications.tests.test_integration_status.PhilSysRegistryPlaceholderTests --settings=config.settings.test
```

Expected result: fail because `philsys_registry.py` does not exist.

- [ ] **Step 3: Create the PhilSys registry boundary**

Create `backend/apps/applications/philsys_registry.py`:

```python
from dataclasses import dataclass

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class PhilSysRegistryUnavailable(Exception):
    pass


@dataclass(frozen=True)
class PhilSysRecord:
    national_id_reference: str
    first_name: str
    middle_name: str
    last_name: str
    date_of_birth: str
    sex: str


class PhilSysRegistry:
    def find(self, *, national_id: str) -> PhilSysRecord | None:
        raise NotImplementedError


class UnavailablePhilSysRegistry(PhilSysRegistry):
    def find(self, *, national_id: str) -> PhilSysRecord | None:
        raise PhilSysRegistryUnavailable


class PhilSysApiRegistry(PhilSysRegistry):
    """Integration placeholder for the future PhilSys API."""

    def find(self, *, national_id: str) -> PhilSysRecord | None:
        raise PhilSysRegistryUnavailable


def get_philsys_registry() -> PhilSysRegistry:
    provider = settings.PHILSYS_REGISTRY_PROVIDER
    if provider == "unavailable":
        return UnavailablePhilSysRegistry()
    if provider == "philsys":
        return PhilSysApiRegistry()
    raise ImproperlyConfigured(f"Unsupported PHILSYS_REGISTRY_PROVIDER: {provider}")
```

- [ ] **Step 4: Add the backend setting**

In `backend/config/settings/base.py`, after `LRN_REGISTRY_PROVIDER`, add:

```python
PHILSYS_REGISTRY_PROVIDER = os.environ.get("PHILSYS_REGISTRY_PROVIDER", "unavailable")
```

- [ ] **Step 5: Guard production and staging settings**

In `backend/config/settings/production.py`, after the LRN mock guard, add:

```python
if PHILSYS_REGISTRY_PROVIDER == "mock":  # noqa: F405
    raise ImproperlyConfigured("PHILSYS_REGISTRY_PROVIDER=mock is not allowed in production.")
```

In `backend/config/settings/staging.py`, inside the `if not STAGING_ALLOW_MOCK_INTEGRATIONS:` block, add:

```python
    if PHILSYS_REGISTRY_PROVIDER == "mock":  # noqa: F405
        raise ImproperlyConfigured("PHILSYS_REGISTRY_PROVIDER=mock requires STAGING_ALLOW_MOCK_INTEGRATIONS=true.")
```

- [ ] **Step 6: Run the focused PhilSys tests**

Run from `backend/`:

```powershell
python manage.py test apps.applications.tests.test_integration_status.PhilSysRegistryPlaceholderTests --settings=config.settings.test
```

Expected result: pass.

---

### Task 3: Backend Registration Integration Status Endpoint

**Files:**
- Create: `backend/apps/applications/integration_status.py`
- Modify: `backend/apps/applications/views.py`
- Modify: `backend/apps/applications/urls.py`
- Test: `backend/apps/applications/tests/test_integration_status.py`

**Interfaces:**
- Produces function: `registration_integration_status() -> dict`.
- Produces endpoint: `GET /api/v1/applications/registration/integration-status/`.
- Response shape:

```json
{
  "backend": { "status": "connected" },
  "methods": [
    {
      "id": "manual",
      "label": "Manual Registration",
      "status": "available",
      "active": true,
      "message": "Manual Registration is available."
    },
    {
      "id": "lrn",
      "label": "LRN Verification",
      "status": "placeholder",
      "active": false,
      "message": "LRN verification is prepared for provider integration but no live DepEd connection is active."
    },
    {
      "id": "philsys",
      "label": "PhilSys National ID",
      "status": "locked",
      "active": false,
      "message": "PhilSys National ID integration is locked until official API requirements are approved."
    }
  ]
}
```

- [ ] **Step 1: Add failing endpoint tests**

Append this class to `backend/apps/applications/tests/test_integration_status.py`:

```python
from django.urls import reverse
from rest_framework.test import APIClient


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
```

- [ ] **Step 2: Run the focused failing endpoint tests**

Run from `backend/`:

```powershell
python manage.py test apps.applications.tests.test_integration_status.RegistrationIntegrationStatusEndpointTests --settings=config.settings.test
```

Expected result: fail because the endpoint and URL name do not exist.

- [ ] **Step 3: Create the status builder**

Create `backend/apps/applications/integration_status.py`:

```python
from django.conf import settings


def _lrn_status() -> tuple[str, bool, str]:
    provider = settings.LRN_REGISTRY_PROVIDER
    if provider == "mock":
        return ("mock", False, "LRN verification is using synthetic local or test data.")
    if provider == "deped":
        return (
            "placeholder",
            False,
            "LRN verification is prepared for provider integration but no live DepEd connection is active.",
        )
    return (
        "unavailable",
        False,
        "LRN verification is not connected to a live provider.",
    )


def _philsys_status() -> tuple[str, bool, str]:
    provider = settings.PHILSYS_REGISTRY_PROVIDER
    if provider == "philsys":
        return (
            "placeholder",
            False,
            "PhilSys National ID integration is prepared for provider integration but no live connection is active.",
        )
    return (
        "locked",
        False,
        "PhilSys National ID integration is locked until official API requirements are approved.",
    )


def registration_integration_status() -> dict:
    lrn_status, lrn_active, lrn_message = _lrn_status()
    philsys_status, philsys_active, philsys_message = _philsys_status()
    return {
        "backend": {"status": "connected"},
        "methods": [
            {
                "id": "manual",
                "label": "Manual Registration",
                "status": "available",
                "active": True,
                "message": "Manual Registration is available.",
            },
            {
                "id": "lrn",
                "label": "LRN Verification",
                "status": lrn_status,
                "active": lrn_active,
                "message": lrn_message,
            },
            {
                "id": "philsys",
                "label": "PhilSys National ID",
                "status": philsys_status,
                "active": philsys_active,
                "message": philsys_message,
            },
        ],
    }
```

- [ ] **Step 4: Add the API view**

In `backend/apps/applications/views.py`, import the status builder:

```python
from .integration_status import registration_integration_status
```

Add this view after `LrnVerificationView`:

```python
class RegistrationIntegrationStatusView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request) -> Response:
        return Response(registration_integration_status())
```

- [ ] **Step 5: Add the URL route**

In `backend/apps/applications/urls.py`, add the route before variable application-id routes:

```python
path("registration/integration-status/", views.RegistrationIntegrationStatusView.as_view(), name="registration-integration-status"),
```

- [ ] **Step 6: Run endpoint tests**

Run from `backend/`:

```powershell
python manage.py test apps.applications.tests.test_integration_status --settings=config.settings.test
```

Expected result: pass.

---

### Task 4: Frontend Service Contract For Integration Status

**Files:**
- Modify: `frontend/src/services/backendApplicationService.ts`
- Test: `frontend/src/services/backendApplicationService.test.ts`

**Interfaces:**
- Consumes endpoint: `GET /api/v1/applications/registration/integration-status/`.
- Produces type: `RegistrationIntegrationStatus`.
- Produces method: `getRegistrationIntegrationStatus(): Promise<ServiceResult<RegistrationIntegrationStatus>>`.

- [ ] **Step 1: Add failing frontend service test**

Append to `frontend/src/services/backendApplicationService.test.ts`:

```typescript
it('loads registration integration status from the backend', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    backend: { status: 'connected' },
    methods: [
      { id: 'manual', label: 'Manual Registration', status: 'available', active: true, message: 'Manual Registration is available.' },
      { id: 'lrn', label: 'LRN Verification', status: 'placeholder', active: false, message: 'LRN verification is prepared for provider integration but no live DepEd connection is active.' },
      { id: 'philsys', label: 'PhilSys National ID', status: 'locked', active: false, message: 'PhilSys National ID integration is locked until official API requirements are approved.' },
    ],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const service = new BackendApplicationService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

  const result = await service.getRegistrationIntegrationStatus();

  expect(result.ok).toBe(true);
  expect(fetcher).toHaveBeenCalledWith(
    'http://backend.test/api/v1/applications/registration/integration-status/',
    expect.objectContaining({ credentials: 'include' }),
  );
});
```

- [ ] **Step 2: Run the focused failing test**

Run from `frontend/`:

```powershell
npm test -- backendApplicationService.test.ts
```

Expected result: fail because the service method does not exist.

- [ ] **Step 3: Add the response types**

In `frontend/src/services/backendApplicationService.ts`, near the other exported registration interfaces, add:

```typescript
export type RegistrationIntegrationMethodId = 'manual' | 'lrn' | 'philsys';
export type RegistrationIntegrationMethodStatus = 'available' | 'mock' | 'placeholder' | 'unavailable' | 'locked';

export interface RegistrationIntegrationMethod {
  id: RegistrationIntegrationMethodId;
  label: string;
  status: RegistrationIntegrationMethodStatus;
  active: boolean;
  message: string;
}

export interface RegistrationIntegrationStatus {
  backend: { status: 'connected' };
  methods: RegistrationIntegrationMethod[];
}
```

- [ ] **Step 4: Add the service method**

Inside `BackendApplicationService`, add:

```typescript
  getRegistrationIntegrationStatus(): Promise<ServiceResult<RegistrationIntegrationStatus>> {
    return this.apiClient.request<RegistrationIntegrationStatus>('/api/v1/applications/registration/integration-status/');
  }
```

- [ ] **Step 5: Run the frontend service test**

Run from `frontend/`:

```powershell
npm test -- backendApplicationService.test.ts
```

Expected result: pass.

---

### Task 5: Frontend Student Registration Status Surface

**Files:**
- Modify: `frontend/src/pages/StudentApplication.tsx`
- Create: `frontend/src/pages/StudentApplication.test.tsx`

**Interfaces:**
- Consumes: `backendApplicationService.getRegistrationIntegrationStatus()`.
- Produces visible status text for backend connectivity and method readiness.
- Preserves `verificationPath === "manual"` flow and final `createDraft()` submission behavior.

- [ ] **Step 1: Add failing page tests**

Create `frontend/src/pages/StudentApplication.test.tsx` with focused tests using existing project test setup:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StudentApplication from './StudentApplication';
import { backendApplicationService } from '../services/backendApplicationService';

vi.mock('../PhilSAContext', () => ({
  usePhilSA: () => ({
    user: null,
    addAuditLog: vi.fn(),
    addTicket: vi.fn(),
    inputModules: [{ id: 'student_reg', isActive: true }],
  }),
}));

vi.mock('../services/backendApplicationService', async () => {
  const actual = await vi.importActual<typeof import('../services/backendApplicationService')>('../services/backendApplicationService');
  return {
    ...actual,
    backendApplicationService: {
      listPublicStudentRegistrationFields: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          { id: 'manual', section: 'Step 1 Registration', type: 'Verification Method', value: 'Manual Entry', status: true },
          { id: 'lrn', section: 'Step 1 Registration', type: 'Verification Method', value: 'Learner Reference Number (LRN)', status: false },
          { id: 'philsys', section: 'Step 1 Registration', type: 'Verification Method', value: 'PhilSys National ID', status: false },
        ],
      }),
      getRegistrationIntegrationStatus: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          backend: { status: 'connected' },
          methods: [
            { id: 'manual', label: 'Manual Registration', status: 'available', active: true, message: 'Manual Registration is available.' },
            { id: 'lrn', label: 'LRN Verification', status: 'placeholder', active: false, message: 'LRN verification is prepared for provider integration but no live DepEd connection is active.' },
            { id: 'philsys', label: 'PhilSys National ID', status: 'locked', active: false, message: 'PhilSys National ID integration is locked until official API requirements are approved.' },
          ],
        },
      }),
    },
  };
});

describe('StudentApplication integration status', () => {
  it('shows backend connectivity and keeps manual registration available', async () => {
    render(<StudentApplication />);

    expect(await screen.findByText(/PhilSLA API connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Manual Registration is available/i)).toBeInTheDocument();
    expect(screen.getByText(/no live DepEd connection is active/i)).toBeInTheDocument();
  });

  it('does not call LRN verification when manual registration is selected', async () => {
    const user = userEvent.setup();
    render(<StudentApplication />);

    await waitFor(() => expect(screen.getByText(/Manual Registration is available/i)).toBeInTheDocument());
    await user.click(screen.getByText(/Manual Entry/i));

    expect(backendApplicationService.getRegistrationIntegrationStatus).toHaveBeenCalled();
    expect(screen.queryByText(/Verify LRN/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused failing page test**

Run from `frontend/`:

```powershell
npm test -- StudentApplication.test.tsx
```

Expected result: fail because the integration status UI is not present.

- [ ] **Step 3: Add integration status state**

In `frontend/src/pages/StudentApplication.tsx`, extend imports:

```typescript
  type RegistrationIntegrationStatus,
```

Add state near existing registration config state:

```typescript
  const [integrationStatus, setIntegrationStatus] = useState<RegistrationIntegrationStatus | null>(null);
  const [integrationStatusError, setIntegrationStatusError] = useState('');
```

- [ ] **Step 4: Load integration status without blocking registration**

Add an effect near the existing registration field loading effect:

```typescript
  useEffect(() => {
    let isMounted = true;
    const loadIntegrationStatus = async () => {
      const result = await backendApplicationService.getRegistrationIntegrationStatus();
      if (!isMounted) return;
      if (result.ok) {
        setIntegrationStatus(result.data);
        setIntegrationStatusError('');
      } else {
        setIntegrationStatus(null);
        setIntegrationStatusError('PhilSLA API status could not be loaded. Manual Registration remains available.');
      }
    };
    void loadIntegrationStatus();
    return () => {
      isMounted = false;
    };
  }, []);
```

- [ ] **Step 5: Render a compact integration status section**

In the registration method selection area, render:

```tsx
<div className="rounded-xl border border-slate-200 bg-white p-4">
  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
    System Integration
  </p>
  <p className="mt-1 text-sm font-black text-philsa-navy">
    {integrationStatus ? 'PhilSLA API connected' : 'PhilSLA API status pending'}
  </p>
  {integrationStatusError && (
    <p className="mt-2 text-xs font-bold text-amber-700">{integrationStatusError}</p>
  )}
  <div className="mt-3 grid gap-2 sm:grid-cols-3">
    {(integrationStatus?.methods ?? [
      { id: 'manual', label: 'Manual Registration', status: 'available', active: true, message: 'Manual Registration is available.' },
      { id: 'lrn', label: 'LRN Verification', status: 'unavailable', active: false, message: 'LRN verification is not connected to a live provider.' },
      { id: 'philsys', label: 'PhilSys National ID', status: 'locked', active: false, message: 'PhilSys National ID integration is locked until official API requirements are approved.' },
    ]).map(method => (
      <div key={method.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-black text-philsa-navy">{method.label}</p>
        <p className="mt-1 text-[11px] font-semibold text-slate-600">{method.message}</p>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 6: Preserve manual fallback on status failure**

Do not disable `verificationPath === "manual"` when `integrationStatus` is `null`, when the status endpoint returns a service failure, or when LRN/PhilSys statuses are `placeholder`, `unavailable`, or `locked`.

- [ ] **Step 7: Run the focused page test**

Run from `frontend/`:

```powershell
npm test -- StudentApplication.test.tsx
```

Expected result: pass.

---

### Task 6: Frontend Maintenance Screen Update

**Files:**
- Modify: `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.tsx`
- Test: `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx`

**Interfaces:**
- Consumes current registration method rows.
- Produces clearer admin-facing copy that separates API connectivity from live external integration.

- [ ] **Step 1: Add failing maintenance test**

Append to `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx`:

```typescript
it('explains that system integration placeholders do not mean live external APIs are connected', async () => {
  render(<StudentRegistrationMaintenance />);

  await screen.findByText(/Registration Methods/i);
  await userEvent.click(screen.getByText(/Registration Methods/i));

  expect(screen.getByText(/Frontend API connectivity only confirms PhilSLA backend reachability/i)).toBeInTheDocument();
  expect(screen.getByText(/Manual Entry remains the active fallback/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused failing maintenance test**

Run from `frontend/`:

```powershell
npm test -- StudentRegistrationMaintenance.test.tsx
```

Expected result: fail because the copy is not present.

- [ ] **Step 3: Update Registration Methods copy**

Replace the existing paragraph under `selectedSection === 'Registration Methods'` in `StudentRegistrationMaintenance.tsx` with:

```tsx
<p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-700">
  Frontend API connectivity only confirms PhilSLA backend reachability. Manual Entry remains the active fallback.
  LRN and PhilSys provider placeholders prepare the backend for official APIs, but they do not indicate live external
  registry connections.
</p>
```

- [ ] **Step 4: Run the focused maintenance test**

Run from `frontend/`:

```powershell
npm test -- StudentRegistrationMaintenance.test.tsx
```

Expected result: pass.

---

### Task 7: Documentation And Contract Update

**Files:**
- Modify: `docs/api/API-ENDPOINTS.md`
- Modify: `docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md`
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Documents endpoint: `GET /api/v1/applications/registration/integration-status/`.
- Documents that placeholders are not live external integrations.

- [ ] **Step 1: Update API endpoint table**

In `docs/api/API-ENDPOINTS.md`, add this implemented endpoint near the registration endpoints:

```markdown
| `GET` | `/api/v1/applications/registration/integration-status/` | Public; no credentials required | `AllowAny` | Return safe frontend-facing status for PhilSLA backend connectivity and registration provider readiness | Implemented; external DepEd and PhilSys providers remain unavailable placeholders |
```

- [ ] **Step 2: Add endpoint detail section**

Add:

```markdown
### `GET /api/v1/applications/registration/integration-status/`

This endpoint lets the frontend show System Integration readiness without calling external registries directly. It confirms PhilSLA backend reachability and reports Manual Registration, LRN Verification, and PhilSys National ID readiness using safe labels only. It must not expose provider URLs, credentials, tokens, raw registry payloads, real LRN values, National ID values, or student records.

Manual Registration is reported as `available`. LRN may report `unavailable`, `mock`, or `placeholder` depending on `LRN_REGISTRY_PROVIDER`. PhilSys reports `locked` or `placeholder` depending on `PHILSYS_REGISTRY_PROVIDER`. Placeholder statuses mean the backend boundary exists but no live external API is connected.
```

- [ ] **Step 3: Update A.Depositar spec**

Append a section:

```markdown
## 2026-08-07 Provider Placeholder Preparation

PhilSLA may add unavailable provider placeholders for DepEd LRN and PhilSys so frontend System Integration status can show backend readiness without claiming live external connectivity. Manual Registration remains the currently active registration path. The frontend status surface must distinguish PhilSLA backend connectivity from live external registry integration.
```

- [ ] **Step 4: Update implementation log after execution**

After code is implemented and verified, add:

```markdown
## System Integration Provider Placeholder Preparation

Implemented safe provider placeholders for future DepEd LRN and PhilSys registration integrations, plus a frontend System Integration status surface. Manual Registration remained the active usable path.

Verification:
- `python manage.py test apps.applications.tests.test_lrn_verification --settings=config.settings.test`
- `python manage.py test apps.applications.tests.test_integration_status --settings=config.settings.test`
- `npm test -- backendApplicationService.test.ts`
- `npm test -- StudentApplication.test.tsx`
- `npm test -- StudentRegistrationMaintenance.test.tsx`
- `npm run lint`
- `npm run build`
```

---

### Task 8: Full Regression Verification

**Files:**
- Verify only.

**Interfaces:**
- Confirms backend registration, frontend service, and frontend build behavior remain intact.

- [ ] **Step 1: Run backend system check**

Run from `backend/`:

```powershell
python manage.py check --settings=config.settings.local
```

Expected result: no Django system check errors.

- [ ] **Step 2: Run focused backend tests**

Run from `backend/`:

```powershell
python manage.py test apps.applications.tests.test_lrn_verification apps.applications.tests.test_integration_status --settings=config.settings.test
```

Expected result: pass.

- [ ] **Step 3: Run frontend focused tests**

Run from `frontend/`:

```powershell
npm test -- backendApplicationService.test.ts StudentApplication.test.tsx StudentRegistrationMaintenance.test.tsx
```

Expected result: pass.

- [ ] **Step 4: Run frontend type check**

Run from `frontend/`:

```powershell
npm run lint
```

Expected result: TypeScript `--noEmit` passes.

- [ ] **Step 5: Run frontend build**

Run from `frontend/`:

```powershell
npm run build
```

Expected result: Vite build passes.

- [ ] **Step 6: Inspect diff**

Run from repository root:

```powershell
git diff -- backend/apps/applications/registry.py backend/apps/applications/philsys_registry.py backend/apps/applications/integration_status.py backend/apps/applications/views.py backend/apps/applications/urls.py backend/config/settings/base.py backend/config/settings/production.py backend/config/settings/staging.py backend/apps/applications/tests/test_lrn_verification.py backend/apps/applications/tests/test_integration_status.py frontend/src/services/backendApplicationService.ts frontend/src/services/backendApplicationService.test.ts frontend/src/pages/StudentApplication.tsx frontend/src/pages/StudentApplication.test.tsx frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.tsx frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx docs/api/API-ENDPOINTS.md docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md docs/superpowers/a.depositar/implement/a.depositar.implement.md
```

Expected result:

- No external credentials or URLs were added.
- Manual Registration remains available.
- LRN and PhilSys are described as placeholders or unavailable, not live integrations.
- Frontend still calls PhilSLA backend only.
- Existing LRN verification behavior is unchanged except that `LRN_REGISTRY_PROVIDER="deped"` now fails closed with the existing unavailable error.
