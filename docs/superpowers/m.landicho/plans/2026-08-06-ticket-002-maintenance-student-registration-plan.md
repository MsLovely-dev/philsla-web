# Ticket 002 — Maintenance Table — Student Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not execute a task without Maricon Landicho's approval.

**Goal:** Verify and harden the existing Student Registration Maintenance feature without rebuilding it, correcting frontend route/navigation access so it matches the backend's authoritative `SYSTEM_ADMIN` + `DEPED_ADMIN` contract. Confirmed against current code, this is a two-sided fix, not a one-directional tightening: revoke the `UNIVERSITY_ADMIN` and `ADMISSIONS_REVIEWER` frontend access that today reaches this screen despite the backend rejecting their API calls, and add the `DEPED_ADMIN` frontend access that today has no path to a feature the backend already permits.

**Architecture:** Preserve the existing database-backed `/api/v1/configuration/` CRUD and public Step 1 configuration flow. Retain the exact server-derived backend role alongside the existing frontend display role, then use a strict role boundary for this maintenance route so frontend access matches the backend contract exactly. As of this plan, `routes.tsx`, `MaintenanceHub.tsx`, and `DashboardLayout.tsx` all grant `SYSTEM_ADMIN`, `UNIVERSITY_ADMIN`, and `ADMISSIONS_REVIEWER` — the latter two are rejected by the backend (`views.py` requires exactly `SYSTEM_ADMIN`/`DEPED_ADMIN`) — while `DEPED_ADMIN` has no frontend path at all, because `backendAuthService.mapRole` collapses DepEd, CHED, and TESDA into one `GOVERNMENT` display role. The backend remains the authoritative authorization and validation boundary throughout.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Vitest, React Testing Library, Django 5.2, Django REST Framework 3.16, and Python 3.13.

**Owner and approver:** Maricon Landicho (M.Landicho)

**Branch:** `m.landicho/maintenance-student-registration`

**Status:** Approved by Maricon Landicho on 2026-08-06 for execution, starting with Task 0.

## Global Constraints

- Work only in `worktrees/m.landicho/` on branch `m.landicho/maintenance-student-registration`.
- Preserve existing versioned API routes, response envelopes, CRUD behavior, filters, pagination, public configuration consumption, validation, verification-method safeguards, and audit behavior.
- Treat backend roles, permissions, validation, and lifecycle rules as authoritative.
- Permit this maintenance capability only to exact backend roles `SYSTEM_ADMIN` and `DEPED_ADMIN`; do not grant it to the frontend umbrella role `GOVERNMENT`.
- Do not trust browser storage, frontend route state, module labels, or client-submitted roles as authorization controls.
- Never log or commit credentials, tokens, LRNs, registration submissions, personal data, real identity data, or sensitive configuration payloads.
- Use synthetic configuration and identity data in tests, manual verification, screenshots, and documentation.
- Do not restore, open, or commit the stashed `token.md` as part of Ticket 002.
- Do not add dependencies, migrations, API-contract changes, or backend model changes without separate approval.
- Stop on baseline or regression failures; never weaken an existing assertion.
- Obtain Maricon's review after every task and before any commit, push, or later task.

---

## Planned File Structure

- Modify `frontend/src/types.ts` to retain a typed exact backend role on the authenticated user.
- Modify `frontend/src/services/backendAuthService.ts` to map the exact server role without changing the current display-role behavior.
- Modify `frontend/src/services/backendAuthService.test.ts` to prove DepEd remains distinguishable from CHED and TESDA.
- Create `frontend/src/routing/roleAccess.ts` for one focused strict-role predicate shared by routing and navigation.
- Create `frontend/src/routing/roleAccess.test.ts` for exact-role behavior.
- Modify `frontend/src/App.tsx`, `frontend/src/routing/routes.tsx`, and `frontend/src/routing/RouteGuards.tsx` to pass and enforce strict backend-role access for the Ticket 002 route.
- Modify `frontend/src/routing/routes.test.tsx` and `frontend/src/routing/RouteGuards.test.tsx` for direct-route authorization coverage.
- Modify `frontend/src/components/DashboardLayout.tsx` and `frontend/src/pages/admin/maintenance/MaintenanceHub.tsx` so discovery matches route access.
- Create focused navigation tests only where current test seams support deterministic role checks without broad component refactoring.
- Modify `frontend/src/services/backendApplicationService.test.ts` to cover Student Registration Maintenance transport contracts.
- Create `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx` for screen behavior.
- Update `docs/superpowers/m.landicho/implement/m.landicho.implement.md` with exact commands and observed results during execution.

---

### Task 0: Isolation and Baseline

**Files:** None.

**Interfaces:**

- Consumes: merged `origin/main`, the existing linked Maricon worktree, and committed dependency locks.
- Produces: a recorded clean baseline that separates pre-existing failures from Ticket 002 regressions.

- [ ] **Step 1: Verify isolation and branch**

Run:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git status --short --branch
```

Expected: the Maricon worktree, branch `m.landicho/maintenance-student-registration`, and no application/test changes before execution.

- [ ] **Step 2: Verify runtimes and existing dependency state**

Run:

```powershell
backend\.venv\Scripts\python.exe --version
cmd /c npm --version
```

Expected: Python 3.13.x and an available npm runtime. If frontend packages are absent, install only from the committed lock without changing it:

```powershell
cd frontend
cmd /c npm ci
```

- [ ] **Step 3: Run the focused backend baseline**

Run from `backend/`:

```powershell
.venv\Scripts\python.exe manage.py check --settings=config.settings.local
.venv\Scripts\python.exe manage.py test apps.configuration.tests.test_configurable_field_endpoints --settings=config.settings.test
```

Expected: no Django system-check issues and all 18 configuration endpoint tests passing.

- [ ] **Step 4: Run the focused frontend baseline**

Run from `frontend/`:

```powershell
cmd /c npm test -- --run src/services/backendAuthService.test.ts src/routing/routes.test.tsx src/routing/RouteGuards.test.tsx src/services/backendApplicationService.test.ts src/pages/admin/maintenance/MaintenanceCenterTables.test.tsx
```

Expected: zero failures. Stop and record any pre-existing failure before editing.

- [ ] **Step 5: Review checkpoint**

Record exact baseline results in the implementation log and obtain Maricon's approval before Task 1.

---

### Task 1: Preserve the Exact Server-Derived Role

**Files:**

- Modify `frontend/src/types.ts`.
- Modify `frontend/src/services/backendAuthService.ts`.
- Modify `frontend/src/services/backendAuthService.test.ts`.

**Interfaces:**

- Produces: `BackendPortalRole`, `User.backendRole`, and a session mapping that retains the exact backend role while preserving the existing frontend `User.role` display mapping.
- Consumes: `BackendSessionResponse.user.role` from the authenticated backend session only.

- [ ] **Step 1: Add failing session-mapping tests**

Add synthetic session-response cases proving:

```typescript
expect(depedSession.user).toMatchObject({ role: 'GOVERNMENT', backendRole: 'DEPED_ADMIN' });
expect(chedSession.user).toMatchObject({ role: 'GOVERNMENT', backendRole: 'CHED_ADMIN' });
expect(tesdaSession.user).toMatchObject({ role: 'GOVERNMENT', backendRole: 'TESDA_ADMIN' });
expect(systemSession.user).toMatchObject({ role: 'SYSTEM_ADMIN', backendRole: 'SYSTEM_ADMIN' });
```

- [ ] **Step 2: Run the tests and confirm RED**

```powershell
cmd /c npm test -- --run src/services/backendAuthService.test.ts
```

Expected: failures because `backendRole` is not yet retained.

- [ ] **Step 3: Add the exact backend-role type**

Define the backend role union in `types.ts` using the committed backend roles, including `SYSTEM_ADMIN`, `CHED_ADMIN`, `DEPED_ADMIN`, and `TESDA_ADMIN`, and add:

```typescript
export interface User {
  // existing fields remain unchanged
  backendRole?: BackendPortalRole;
}
```

- [ ] **Step 4: Map only validated server roles**

Update `BackendAuthService.mapUser` to retain a validated exact role from `response.user.role`. Unknown or null roles must leave `backendRole` undefined; they must never be accepted from browser storage or caller input.

- [ ] **Step 5: Run GREEN and type checking**

```powershell
cmd /c npm test -- --run src/services/backendAuthService.test.ts
cmd /c npm run lint
```

Expected: zero failures and zero TypeScript errors.

- [ ] **Step 6: Review checkpoint**

Inspect the diff for accidental authentication behavior changes. Obtain Maricon's approval before Task 2.

---

### Task 2: Enforce Strict Route Authorization

**Files:**

- Create `frontend/src/routing/roleAccess.ts`.
- Create `frontend/src/routing/roleAccess.test.ts`.
- Modify `frontend/src/App.tsx`.
- Modify `frontend/src/routing/routes.tsx`.
- Modify `frontend/src/routing/RouteGuards.tsx`.
- Modify `frontend/src/routing/routes.test.tsx`.
- Modify `frontend/src/routing/RouteGuards.test.tsx`.

**Interfaces:**

- Produces: a strict access predicate based on `User.role` and the server-derived `User.backendRole`, plus route metadata that can disable module-permission override for this security boundary.
- Consumes: `SYSTEM_ADMIN` frontend role and exact `DEPED_ADMIN` backend role.

- [ ] **Step 1: Add failing strict-role tests**

Cover this exact matrix:

```typescript
expect(canAccessStudentRegistrationMaintenance(systemAdmin)).toBe(true);
expect(canAccessStudentRegistrationMaintenance(depedAdmin)).toBe(true);
expect(canAccessStudentRegistrationMaintenance(universityAdmin)).toBe(false);
expect(canAccessStudentRegistrationMaintenance(admissionsReviewer)).toBe(false);
expect(canAccessStudentRegistrationMaintenance(chedAdmin)).toBe(false);
expect(canAccessStudentRegistrationMaintenance(tesdaAdmin)).toBe(false);
```

Add route tests proving the registration route declares strict access and cannot be opened through module-permission fallback by a disallowed role.

- [ ] **Step 2: Run the tests and confirm RED**

```powershell
cmd /c npm test -- --run src/routing/roleAccess.test.ts src/routing/routes.test.tsx src/routing/RouteGuards.test.tsx
```

Expected: failure because strict exact-role metadata and enforcement do not exist.

- [ ] **Step 3: Implement the focused predicate**

The predicate must be equivalent to:

```typescript
export function canAccessStudentRegistrationMaintenance(user: User): boolean {
  return user.role === 'SYSTEM_ADMIN' || user.backendRole === 'DEPED_ADMIN';
}
```

Do not accept the umbrella `GOVERNMENT` role by itself.

- [ ] **Step 4: Extend route metadata without changing other routes**

Add a narrow strict-role hook to `AppRouteDefinition` and `ProtectedRoute`. Configure only `/admin/maintenance/registration` to use it. Preserve current module-permission behavior for every unrelated route.

- [ ] **Step 5: Run GREEN and regression route tests**

```powershell
cmd /c npm test -- --run src/routing/roleAccess.test.ts src/routing/routes.test.tsx src/routing/RouteGuards.test.tsx
cmd /c npm run lint
```

Expected: exact matrix passes; unrelated route-guard behavior remains green.

- [ ] **Step 6: Review checkpoint**

Confirm the frontend guard improves navigation behavior but does not replace backend authorization. Obtain Maricon's approval before Task 3.

---

### Task 3: Align Navigation Discovery

**Files:**

- Modify `frontend/src/components/DashboardLayout.tsx`.
- Modify `frontend/src/pages/admin/maintenance/MaintenanceHub.tsx`.
- Add focused tests at the smallest existing test seams for sidebar and hub discovery.

**Interfaces:**

- Consumes: `canAccessStudentRegistrationMaintenance(user)` from Task 2.
- Produces: matching visibility in the sidebar and Maintenance Hub.

- [ ] **Step 1: Add failing discovery tests**

Prove System Admin and DepEd Admin see the Student Registration link/card, while University Admin, Admissions Reviewer, CHED Admin, and TESDA Admin do not.

- [ ] **Step 2: Run the tests and confirm RED**

Run the focused new navigation tests. Expected: current University Admin/Admissions Reviewer cases are incorrectly visible and DepEd is not represented exactly.

- [ ] **Step 3: Reuse the strict predicate**

Replace only the Student Registration subitem/card role arrays with the shared predicate. Do not change access to the other maintenance modules.

- [ ] **Step 4: Run GREEN, keyboard, and route regression tests**

```powershell
cmd /c npm test -- --run src/routing/roleAccess.test.ts src/routing/routes.test.tsx src/routing/RouteGuards.test.tsx
cmd /c npm run lint
```

Also run the new navigation test files explicitly. Expected: exact discovery matrix passes.

- [ ] **Step 5: Review checkpoint**

Inspect navigation diffs for unrelated role changes and obtain Maricon's approval before Task 4.

---

### Task 4: Complete Transport and Screen Behavior Coverage

**Files:**

- Modify `frontend/src/services/backendApplicationService.test.ts`.
- Create `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx`.
- Modify production code only when a new failing test proves a defect within the approved scope.

**Interfaces:**

- Consumes: existing `BackendApplicationService` methods and `StudentRegistrationMaintenance` callbacks.
- Produces: focused behavioral evidence for real API use and required UI states.

- [ ] **Step 1: Add service contract tests**

Verify the exact paths and verbs for public list, paginated admin list, create, patch, and delete. Use synthetic values such as `Sample Enrollment Category`; never use real student data.

- [ ] **Step 2: Add component tests**

Mock the service boundary and cover:

- Loading and empty states.
- Paginated records.
- Search and status/priority/input-type filters.
- Create and edit success.
- Client-visible validation failure.
- Backend error presentation.
- Delete confirmation, success, and failure.
- Verification-method toggle behavior.
- Locked PhilSys presentation.
- Accessible button, toggle, form, and error labels.
- No local-storage or mock-record fallback.

- [ ] **Step 3: Run tests and classify failures**

```powershell
cmd /c npm test -- --run src/services/backendApplicationService.test.ts src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx
```

Expected: transport tests should describe current behavior; any component failure must be classified as a test-seam issue or confirmed product defect before production code changes.

- [ ] **Step 4: Implement only confirmed minimum fixes**

Do not restructure `MaintenancePageTemplate`, add state libraries, change endpoints, or introduce dependencies. Each production change must correspond to a reviewed failing test.

- [ ] **Step 5: Run focused GREEN and frontend regression**

```powershell
cmd /c npm test -- --run src/services/backendAuthService.test.ts src/routing/roleAccess.test.ts src/routing/routes.test.tsx src/routing/RouteGuards.test.tsx src/services/backendApplicationService.test.ts src/pages/admin/maintenance/MaintenanceCenterTables.test.tsx src/pages/admin/maintenance/StudentRegistrationMaintenance.test.tsx
cmd /c npm run lint
cmd /c npm run build
```

Expected: zero failures and zero TypeScript/build errors.

- [ ] **Step 6: Review checkpoint**

Obtain Maricon's approval before Task 5.

---

### Task 5: Backend Security Regression and End-to-End Handoff

**Files:**

- Modify `docs/superpowers/m.landicho/implement/m.landicho.implement.md` with observed evidence.
- Do not modify backend application files unless a separately reviewed backend defect is proven.

**Interfaces:**

- Consumes: existing backend configuration endpoints and completed frontend behavior.
- Produces: final regression, manual verification, scope, and security evidence.

- [ ] **Step 1: Run backend checks**

From `backend/`:

```powershell
.venv\Scripts\python.exe manage.py check --settings=config.settings.local
.venv\Scripts\python.exe manage.py test apps.configuration.tests.test_configurable_field_endpoints --settings=config.settings.test
.venv\Scripts\python.exe manage.py test --settings=config.settings.test
```

Record exact totals, failures, errors, and skips. Do not claim the complete suite passed if any failure remains.

- [ ] **Step 2: Manually verify with synthetic data**

Verify:

1. System Admin and DepEd Admin discovery and direct access.
2. Denial for University Admin, Admissions Reviewer, CHED Admin, TESDA Admin, student, and unauthenticated callers.
3. List, search, filter, pagination, create, edit, enable/disable, and permitted deletion.
4. Public Step 1 reflects enabled configuration and excludes disabled rows.
5. Duplicate, unsupported verification method, locked PhilSys, last-active-method, and predefined-delete protections remain enforced.

- [ ] **Step 3: Inspect security and scope**

```powershell
git diff --check
git status --short
git diff --stat origin/main...HEAD
```

Inspect logs and fixtures for credentials, tokens, LRNs, personal data, request bodies, or sensitive payloads. Confirm no dependency, migration, model, or API-contract change.

- [ ] **Step 4: Record exact evidence**

Append commands, results, pre-existing failures, manual scenarios, and skipped checks to the implementation log.

- [ ] **Step 5: Final review gate**

Obtain code review and Maricon's final acceptance before commit, push, or merge. Follow the repository PR workflow; never commit directly to `main`.

---

## Rollback

- Revert the exact-role preservation and strict-route changes together if authenticated navigation regresses.
- Preserve backend enforcement throughout rollback; never broaden backend permissions as a fallback.
- Revert component-only fixes separately when their focused tests identify a regression.
- No database rollback is expected because the approved plan contains no model or migration change.

## Definition of Done

- [x] Maricon approved this written plan before implementation.
- [x] Every task followed RED → GREEN → review. (Tasks 1-4 TDD'd with explicit RED confirmation before implementation; Task 0 baseline and Task 5 verification have no applicable RED/GREEN cycle by nature.)
- [x] Only exact `SYSTEM_ADMIN` and `DEPED_ADMIN` identities can discover and navigate to the screen. (Live-verified: 200/200 for these two, 403 for University Admin/Admissions Reviewer/CHED/TESDA, 401 unauthenticated; sidebar and Hub discovery live-verified for the granted/denied roles tested.)
- [x] Confirmed intentional: this grants `DEPED_ADMIN` a frontend path that did not previously exist (new capability, matching pre-existing backend authorization) while revoking the `UNIVERSITY_ADMIN`/`ADMISSIONS_REVIEWER` frontend access that was previously reachable but always backend-rejected. Not purely a security tightening.
- [x] Backend denial remains authoritative for every other role. (Confirmed: backend `require_roles` never modified; frontend strict-access checks are additive UX, not the security boundary.)
- [x] Existing configuration CRUD, filters, pagination, validation, safeguards, public consumption, and audit behavior remain functional. (Task 5 Step 2: full CRUD live through the real UI and API; duplicate/unsupported-method/locked-PhilSys/last-active-method/predefined-delete protections all live-verified; public Step 1 reflection live-verified; zero backend files touched, so audit behavior is untouched by construction.)
- [x] Focused frontend and backend checks pass with exact evidence. (Recorded per-task in the implementation log throughout.)
- [x] Complete-suite results and any pre-existing failures are disclosed accurately. (352 backend tests, 1 pre-existing unrelated failure in `apps.universities`, confirmed untouched by this diff; frontend regression 89/93 with the one already-known pre-existing `MaintenanceCenterTables.test.tsx` localStorage issue.)
- [x] Manual verification uses synthetic data and passes. (Task 5 Step 2, synthetic `*.yopmail.com` accounts and fabricated field values throughout.)
- [x] Final diff is limited to approved Ticket 002 files and contains no sensitive data. (Task 5 Step 3: 15 files, exactly the approved application/test files plus this ticket's own process docs; scanned clean for credentials/secrets.)
- [ ] Code review and Maricon's final acceptance are recorded before merge.

## Approval Gate

- [x] Maricon Landicho reviews and approves this plan for execution. (Approved 2026-08-06, after revising the Goal/Architecture framing and syncing the branch with `origin/main`.)
- [x] No application or test implementation begins before that approval is recorded.
