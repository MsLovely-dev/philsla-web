# Root AGENTS.md Tech-Stack Alignment Design

## Purpose

Update the repository-root `AGENTS.md` so that agent instructions describe PhilSLA's implemented or formally accepted technology stack, current repository boundaries, security controls, and verification commands. The update must remove stale claims that the backend is merely reserved or unimplemented without turning proposed technology into a mandate.

## Approved boundary

- Include only technology that is implemented in the repository or formally accepted by an architecture decision record.
- Keep deployment, asynchronous processing, and the concrete private object-storage provider explicitly unresolved as `TBD`.
- Change only the root `AGENTS.md` during implementation.
- Do not modify `frontend/AGENTS.md`, `backend/AGENTS.md`, or `docs/AGENTS.md` under this task.
- Preserve the rule that a closer `AGENTS.md` adds directory-specific constraints, while accepted repository architecture and stack decisions remain authoritative.

## Repository evidence

The design is based on these current repository sources:

- `frontend/package.json`: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, React Router 7, Vitest, Testing Library, and Playwright.
- `backend/requirements/base.in`: Django 5.2, Django REST Framework 3.16, SimpleJWT, psycopg, and OpenCV headless.
- `backend/README.md`: Python 3.13, implemented Django/DRF foundation, JWT-backed login/session handling, email OTP, Supabase Postgres configuration, and current verification commands.
- `docs/decisions/ADR-002-BACKEND-FRAMEWORK.md`: Django and DRF are accepted.
- `docs/decisions/ADR-003-FRONTEND-TOOLING.md`: current frontend state, Vitest/Testing Library, Playwright, and TypeScript no-emit verification are accepted.
- `docs/decisions/ADR-004-BACKEND-DEPENDENCY-MANAGEMENT.md`: Python 3.13 and pip-tools-managed dependency locks are accepted.
- `docs/decisions/ADR-007-SUPABASE-POSTGRES-DATABASE-PROVIDER.md`: Supabase Postgres is the accepted database provider; Supabase Auth and Supabase Storage are not implied.
- `docs/decisions/ADR-009-AUTHENTICATION-SESSION-AND-ACCOUNT-PROVISIONING.md` and `ADR-011-USER-AUTHENTICATION-FLOW.md`: Django-managed accounts, mandatory authentication flow, JWT access tokens, and rotating refresh tokens are accepted.
- `docs/decisions/ADR-012-BACKEND-TEST-TOOLING-AND-COVERAGE.md`: Django's test runner and behavior-based backend coverage are accepted.
- `docs/decisions/ADR-013-BACKEND-LINT-TYPE-FORMAT-TOOLING.md`: Ruff and mypy are accepted targets but are not yet installed in `backend/requirements/tooling.in`; root instructions must not claim those checks are currently runnable.
- `docs/decisions/ADR-014-API-SCHEMA-TOOLING-AND-PUBLICATION.md`: OpenAPI 3 and DRF Spectacular are accepted targets, but DRF Spectacular is not yet installed; root instructions must distinguish accepted direction from implemented tooling.

## Selected approach

Use a targeted stack-alignment update rather than a minimal wording correction or a full duplication of scoped instructions.

The root file will provide repository-wide facts and invariants. Scoped `AGENTS.md` files will continue to own directory-specific conventions. This gives agents enough context to choose correct tools and commands without creating multiple copies of every frontend and backend rule.

## Proposed root instruction structure

### 1. Scope and precedence

- State that root instructions apply to the entire repository.
- Require agents to read the closest scoped `AGENTS.md` before editing.
- State that scoped instructions may add directory-specific rules but must not silently replace formally accepted stack decisions.
- Direct agents to current ADRs and architecture documents when a scoped instruction or older document conflicts with repository evidence.

### 2. Repository boundaries

- `frontend/`: implemented React application.
- `backend/`: implemented Django/DRF API service, independently buildable and deployable from the frontend.
- `docs/`: business, architecture, API, decision, and development documentation.
- `.agents/`: supporting AI material; `AGENTS.md` files remain authoritative instructions.
- Frontend and backend communicate only through documented, versioned API contracts.

### 3. Implemented and accepted stack

Record these stack facts concisely:

- Frontend runtime and build: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, and React Router 7.
- Frontend tests: Vitest, jsdom, React Testing Library, Testing Library user-event, jest-dom, and Playwright.
- Backend runtime and framework: Python 3.13, Django 5.2, and Django REST Framework 3.16.
- Backend authentication support: Django-managed accounts, DRF SimpleJWT access/refresh tokens, refresh-session rotation/replay controls, and email OTP.
- Backend dependency management: pinned requirements generated with pip-tools; edit `.in` manifests and review regenerated `.txt` locks.
- Database: PostgreSQL-compatible persistence with Supabase Postgres as the accepted provider, configured through `DATABASE_URL`.
- Local/test database behavior: SQLite may support isolated local/test execution; persistence-backed integration behavior must be verified against PostgreSQL-compatible storage.
- API: REST endpoints under `/api/v1/`; OpenAPI 3 with DRF Spectacular is accepted but schema tooling must not be treated as implemented until dependencies/configuration exist.
- Accepted-but-not-installed quality tooling: Ruff and mypy must not be required as current checks until their dependencies and configuration are committed.
- Unresolved: deployment platform, asynchronous job system, and concrete private S3-compatible object-storage provider remain `TBD`.

### 4. Architecture and coding boundaries

- Keep frontend API calls and transport mapping in service modules.
- Keep business orchestration out of presentation components.
- Use controlled React state and typed feature-local validation by default; do not add form or server-state libraries without a demonstrated need and reviewed decision.
- Keep Django/DRF views and serializers thin; place workflows and reusable business rules in domain/application services.
- Treat the backend as authoritative for validation, authentication, authorization, state transitions, scoring, eligibility, and audit decisions.
- Require API contract documentation and tests for API changes.
- Require reviewed migrations, rollout impact, and rollback procedures for data-model changes.
- Avoid unrelated restructuring and dependency additions.

### 5. Security and sensitive data

- Never commit or log secrets, credentials, database URLs, service-role keys, personal data, real exam content, answer keys, proctoring evidence, or sensitive integration payloads.
- Do not expose secrets through `VITE_*` variables, browser bundles, source maps, logs, or UI error messages.
- Do not treat frontend routes, roles, local storage, or client-submitted state as authorization or integrity controls.
- Enforce input validation, deny-by-default permissions, object-level authorization, lifecycle rules, and safe audit behavior on the backend.
- Use synthetic data in tests, fixtures, examples, screenshots, and documentation.
- Require production settings to receive secrets through environment configuration and fail safely when required values are missing.

### 6. Testing and error handling

- Frontend behavior changes require focused Vitest/Testing Library coverage; critical browser journeys use Playwright.
- Frontend work must preserve loading, empty, error, permission-denied, responsive, keyboard, and accessibility states where relevant.
- Backend endpoint tests cover success, invalid input, unauthenticated access, permission denial, object-level denial, not found, conflicts/state transitions, audit expectations, and safe error envelopes where applicable.
- Backend business rules should be tested below the HTTP layer when practical.
- Errors and logs must remain actionable without leaking secrets or sensitive assessment/identity information.
- Never weaken tests or assertions to make a check pass.

### 7. Verification commands

Require only commands that currently exist:

- Frontend, from `frontend/`:
  - `npm test`
  - `npm run lint` (TypeScript `--noEmit`, not ESLint)
  - `npm run build`
  - `npm run test:e2e` when the changed behavior affects a covered browser journey
- Backend, from `backend/`:
  - `python manage.py check --settings=config.settings.local`
  - focused Django tests for the changed module
  - `python manage.py test --settings=config.settings.test`
  - production settings check with fake non-secret environment values when production settings change
- Documentation-only changes require link and factual-consistency review; application builds are not mandatory unless application/configuration behavior changes or the requester asks for them.
- Final reports must list exact commands and observed results, including skipped checks and pre-existing failures.

## Data flow and failure behavior

The instruction change does not alter application data flow. It clarifies the required future flow: React components use typed service modules, services call documented `/api/v1/` endpoints, DRF validates and authorizes requests, domain/application services enforce business rules, and Django persists through the configured database.

If repository evidence and an instruction conflict, agents must stop treating the disputed technology as settled, inspect the accepted ADRs and current configuration, and report the inconsistency. They must not invent a replacement stack or silently follow a stale statement.

## Verification strategy for the AGENTS.md edit

- Inspect the final diff and confirm only root `AGENTS.md` changed during implementation.
- Confirm every named implemented version/tool exists in current manifests or accepted documentation.
- Confirm accepted-but-not-installed tooling is labeled accurately.
- Confirm unresolved decisions remain explicit rather than being invented.
- Confirm security, API, migration, testing, and reporting requirements remain at least as strict as the current root instructions.
- Scan for stale statements such as “backend is reserved,” “backend is not implemented,” React 18, direct Supabase JS data access, or mandatory Ruff/mypy commands before installation.
- Do not run application builds for the documentation-only edit unless application/configuration files change or the user requests builds.

## Non-goals

- Do not edit scoped `AGENTS.md` files.
- Do not change dependencies, application code, settings, schemas, migrations, tests, or architecture decisions.
- Do not adopt Supabase Auth, Supabase Storage, a deployment platform, an asynchronous job system, a new state-management library, a new form library, or additional test tools.
- Do not rewrite business requirements or architecture documents.

## Known follow-up risk

The currently modified `docs/AGENTS.md` contains stack statements that conflict with repository evidence, including React 18 and direct Supabase JS data access. That file is outside this approved scope and must not be edited or staged here. A separate review should reconcile it after the root instructions are updated.

## Acceptance criteria

- Root `AGENTS.md` no longer describes the backend as merely reserved or unimplemented.
- Root instructions name only implemented or formally accepted stack choices and clearly label accepted-but-not-installed tools.
- Unresolved platform decisions remain explicit.
- Repository boundaries, API separation, security authority, migration discipline, and verification expectations are clear.
- Current runnable frontend and backend commands are accurate.
- Scoped instruction files and unrelated working-tree changes remain untouched.
