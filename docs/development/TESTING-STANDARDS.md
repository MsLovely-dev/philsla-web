# Testing Standards

## Current state

The frontend package uses Vitest with jsdom, React Testing Library, Testing Library user-event, and jest-dom for fast unit and component-level behavior tests. Playwright covers critical browser-level journeys, including desktop and mobile routing behavior. These choices are accepted in [ADR-003](../decisions/ADR-003-FRONTEND-TOOLING.md). The package also exposes a TypeScript no-emit check through `npm run lint` and a Vite build. Additional browser coverage, non-Chromium coverage, and coverage thresholds remain `TBD`. Django and Django REST Framework are selected for the backend, but no project or backend test configuration exists yet.

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

## Reporting

Change reports must list the exact commands run, their result, and any checks not run. Documentation-only changes should validate links and consistency; an application build is optional unless application/configuration files changed or the requester requires it.
