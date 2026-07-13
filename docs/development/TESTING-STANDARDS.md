# Testing Standards

## Current state

The frontend package uses Vitest with jsdom, React Testing Library, Testing Library user-event, and jest-dom for fast unit and component-level behavior tests. Playwright covers critical browser-level journeys, including desktop and mobile routing behavior. These choices are accepted in [ADR-003](../decisions/ADR-003-FRONTEND-TOOLING.md). The package also exposes a TypeScript no-emit check through `npm run lint` and a Vite build. Additional browser coverage, non-Chromium coverage, and frontend coverage thresholds remain `TBD`.

Backend foundation tests use Django's built-in test runner, Django test utilities, and DRF test utilities as accepted in [ADR-012](../decisions/ADR-012-BACKEND-TEST-TOOLING-AND-COVERAGE.md). Backend coverage expectations are behavior-based for now; numeric coverage thresholds remain deferred until coverage tooling is accepted.

## Required policy

- Tests must be added or updated when behavior changes.
- Test business rules at the lowest practical layer and critical workflows across boundaries.
- Cover success, validation, authorization, error, retry/concurrency, and state-transition cases where applicable.
- Never use production secrets or personal data in tests or snapshots.
- Keep tests deterministic and make external integrations replaceable with controlled fakes or contract environments.
- A failing or skipped test must be disclosed; do not weaken an assertion merely to make a check pass.
- Codex and contributors must not claim tests passed unless they actually ran them and observed success.

## Recommended layers

- Frontend: unit tests for domain utilities/hooks, component interaction/accessibility tests, service contract tests, and a small set of end-to-end critical journeys.
- Forms: test feature-local validation helpers and submit-state transitions directly; add component tests for user-facing validation behavior.
- Service state: test service contracts and mock/API adapters separately from presentation components.
- Backend: unit tests for domain rules, integration tests for persistence/adapters, endpoint authorization/validation tests, migration tests, and consumer/contract tests.
- Security/performance: targeted tests based on threat models and capacity targets once those are defined.

## Backend baseline

Run backend checks and tests from `backend/`:

```powershell
python manage.py check --settings=config.settings.local
python manage.py test --settings=config.settings.test
```

When production settings change, also run a production settings check with fake non-secret environment values:

```powershell
python manage.py check --settings=config.settings.production
```

Backend endpoint tests must cover success, validation failure, authentication failure, permission denial, object-level authorization denial, not-found behavior, conflict/state-transition behavior, and standard error shape where applicable. Security-sensitive workflows must also cover token/session behavior, account state, lockout/rate-limit behavior, audit expectations, and safe logging.

## Reporting

Change reports must list the exact commands run, their result, and any checks not run. Documentation-only changes should validate links and consistency; an application build is optional unless application/configuration files changed or the requester requires it.
