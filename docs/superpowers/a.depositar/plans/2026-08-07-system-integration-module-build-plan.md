# System Integration Module Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe System Integration module that lets admins verify PhilSLA backend connectivity and view registration-provider readiness for Manual Registration, LRN Verification, and PhilSys National ID without requiring live external APIs.

**Architecture:** The frontend calls only the PhilSLA backend. The backend owns all provider boundaries, future credentials, payload mapping, throttling, retry rules, and safe error envelopes. Manual Registration remains the active registration path; LRN and PhilSys are displayed as unavailable, prepared, or locked until official provider contracts and credentials are approved.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, React Testing Library, Django 5.2, Django REST Framework 3.16, Python 3.13.

## Global Constraints

- The browser must not call DepEd, PhilSys, or any external registry directly.
- The frontend must not contain provider credentials, certificates, tokens, secret URLs, raw LRN values, National ID values, or registry payloads.
- Manual Registration must remain available when provider status cannot be loaded.
- LRN and PhilSys placeholders must not be presented as live production integrations.
- Provider integration details remain backend-owned until official API contracts, credentials, security rules, and operational rules are approved.
- Existing registration behavior must not break while the placeholder module is added.
- Frontend API calls must remain isolated in `frontend/src/services/`.
- Backend endpoints must remain under `/api/v1/`.

---

## File Structure

- Backend provider boundaries:
  - `backend/apps/applications/registry.py`
  - `backend/apps/applications/philsys_registry.py`
- Backend readiness endpoint:
  - `backend/apps/applications/integration_status.py`
  - `backend/apps/applications/views.py`
  - `backend/apps/applications/urls.py`
- Backend settings and safety gates:
  - `backend/config/settings/base.py`
  - `backend/config/settings/staging.py`
  - `backend/config/settings/production.py`
- Frontend service contract:
  - `frontend/src/services/backendApplicationService.ts`
  - `frontend/src/services/backendApplicationService.test.ts`
- Frontend admin System Integration page:
  - `frontend/src/pages/admin/SystemIntegration.tsx`
  - `frontend/src/pages/admin/SystemIntegration.test.tsx`
- Frontend registration surfaces:
  - `frontend/src/pages/StudentApplication.tsx`
  - `frontend/src/pages/StudentApplication.test.tsx`
  - `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.tsx`
  - `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx`
- Documentation:
  - `docs/api/API-ENDPOINTS.md`
  - `docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md`
  - `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

---

### Task 1: Backend Provider Placeholders

**Files:**
- Modify: `backend/apps/applications/registry.py`
- Create: `backend/apps/applications/philsys_registry.py`
- Modify: `backend/config/settings/base.py`
- Modify: `backend/config/settings/staging.py`
- Modify: `backend/config/settings/production.py`
- Test: `backend/apps/applications/tests/test_lrn_verification.py`
- Test: `backend/apps/applications/tests/test_integration_status.py`

**Interfaces:**
- Consumes: existing LRN registry provider boundary.
- Produces: safe `LRN_REGISTRY_PROVIDER="deped"` placeholder.
- Produces: safe `PHILSYS_REGISTRY_PROVIDER` boundary.

- [x] Add a DepEd LRN provider placeholder that returns the existing unavailable behavior.
- [x] Add a PhilSys provider boundary that fails closed until official API requirements are approved.
- [x] Add production and staging settings guards so mock identity providers cannot be enabled accidentally.
- [x] Add tests proving unavailable providers do not expose sensitive submitted identifiers.

### Task 2: Backend Integration Status Endpoint

**Files:**
- Create: `backend/apps/applications/integration_status.py`
- Modify: `backend/apps/applications/views.py`
- Modify: `backend/apps/applications/urls.py`
- Test: `backend/apps/applications/tests/test_integration_status.py`

**Interfaces:**
- Produces: `GET /api/v1/applications/registration/integration-status/`.
- Produces response with `backend.status` and registration method readiness for `manual`, `lrn`, and `philsys`.

- [x] Add a backend status builder that returns safe labels only.
- [x] Report Manual Registration as `available` and active.
- [x] Report LRN as `unavailable`, `mock`, or `placeholder` depending on configured provider.
- [x] Report PhilSys as `locked` or `placeholder` depending on configured provider.
- [x] Add endpoint tests that confirm the response does not expose secrets or provider credentials.

### Task 3: Frontend Service Contract

**Files:**
- Modify: `frontend/src/services/backendApplicationService.ts`
- Test: `frontend/src/services/backendApplicationService.test.ts`

**Interfaces:**
- Produces: `RegistrationIntegrationStatus`.
- Produces: `backendApplicationService.getRegistrationIntegrationStatus()`.

- [x] Add typed frontend models for registration integration methods and statuses.
- [x] Add a service method for `GET /api/v1/applications/registration/integration-status/`.
- [x] Add a focused service test proving the frontend calls the PhilSLA backend endpoint.

### Task 4: Admin System Integration Frontend

**Files:**
- Modify: `frontend/src/pages/admin/SystemIntegration.tsx`
- Test: `frontend/src/pages/admin/SystemIntegration.test.tsx`

**Interfaces:**
- Consumes: `backendApplicationService.getRegistrationIntegrationStatus()`.
- Produces: admin-facing Verify Connection workflow and status display.

- [x] Replace fake localStorage integrations, fake provider endpoints, fake API keys, simulated logs, and credential rotation UI.
- [x] Add a `Verify Connection` button that checks the PhilSLA backend readiness endpoint.
- [x] Add a visible `Connection Status` panel with `Not verified yet`, `Verifying`, `Connected`, and `Failed` states.
- [x] Show Manual Registration, LRN Verification, and PhilSys National ID readiness cards.
- [x] Explain that external registry APIs are not called from the browser.
- [x] Add a focused page test for the button-driven verification flow.

### Task 5: Student Registration Frontend Readiness Notice

**Files:**
- Modify: `frontend/src/pages/StudentApplication.tsx`
- Test: `frontend/src/pages/StudentApplication.test.tsx`

**Interfaces:**
- Consumes: `backendApplicationService.getRegistrationIntegrationStatus()`.
- Preserves: Manual Registration application flow.

- [x] Add a compact System Integration status surface to the student registration flow.
- [x] Show PhilSLA backend connectivity and provider readiness without blocking Manual Registration.
- [x] Keep Manual Registration usable when LRN and PhilSys are unavailable or locked.
- [x] Add a focused test proving Manual Registration remains available.

### Task 6: Registration Maintenance Copy

**Files:**
- Modify: `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.tsx`
- Test: `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx`

**Interfaces:**
- Produces: clear admin copy separating PhilSLA backend connectivity from live external provider integration.

- [x] Add copy explaining that frontend API connectivity confirms only PhilSLA backend reachability.
- [x] State that Manual Entry remains the active fallback.
- [x] State that LRN and PhilSys placeholders do not indicate live external registry connections.
- [x] Add a focused test for the explanatory copy.

### Task 7: Documentation And Verification

**Files:**
- Modify: `docs/api/API-ENDPOINTS.md`
- Modify: `docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md`
- Modify: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Documents: `GET /api/v1/applications/registration/integration-status/`.
- Documents: placeholder status does not mean live provider connectivity.

- [x] Document the backend integration status endpoint.
- [x] Update the System Integration spec with provider-placeholder preparation notes.
- [x] Record implementation and verification results.
- [x] Run focused backend tests.
- [x] Run focused frontend tests.
- [x] Run frontend build.
- [ ] Resolve unrelated repository-wide TypeScript lint errors in separate modules before claiming full repo lint health.

---

## Acceptance Criteria

- Admins can open System Integration and click `Verify Connection`.
- The page shows an immediate status: `Not verified yet`, `Verifying`, `Connected`, or `Failed`.
- A successful verification means the PhilSLA backend readiness endpoint responded.
- A successful verification does not mean DepEd LRN or PhilSys live APIs are connected.
- Manual Registration remains active and usable.
- LRN and PhilSys are shown as prepared, unavailable, or locked until official API details are approved.
- No fake provider keys, fake provider URLs, raw payload logs, real identifiers, or secrets appear in the frontend.

## Verification Commands

Run from `backend/`:

```powershell
..\venv\Scripts\python.exe manage.py check --settings=config.settings.local
..\venv\Scripts\python.exe manage.py test apps.applications.tests.test_lrn_verification apps.applications.tests.test_integration_status --settings=config.settings.test
```

Run from `frontend/`:

```powershell
npm test -- SystemIntegration.test.tsx backendApplicationService.test.ts StudentApplication.test.tsx StudentRegistrationMaintenance.test.tsx
npm run build
npm run lint
```

Current expected status:

- Backend check passes.
- Focused backend integration tests pass.
- Focused frontend integration-readiness tests pass.
- Frontend build passes.
- Frontend lint remains blocked by existing TypeScript errors outside the System Integration page.

## Self-Review

- Spec coverage: This plan covers backend placeholders, backend status endpoint, frontend service, admin System Integration UI, student registration status, maintenance copy, documentation, and verification.
- Placeholder scan: The plan intentionally uses "placeholder" as a runtime provider-readiness status. It does not leave unfinished implementation instructions.
- Type consistency: Frontend status names match `RegistrationIntegrationMethodStatus`; method IDs match `manual`, `lrn`, and `philsys`.
