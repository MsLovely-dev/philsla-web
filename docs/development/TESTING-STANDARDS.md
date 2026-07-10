# Testing Standards

## Current state

The frontend package exposes a TypeScript no-emit check through `npm run lint` and a Vite build, but no test runner or test files were identified during this documentation review. Django and Django REST Framework are selected for the backend, but no project or test configuration exists yet. Testing tools beyond Django's available test facilities and coverage thresholds are `TBD`.

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
- Backend: unit tests for domain rules, integration tests for persistence/adapters, endpoint authorization/validation tests, migration tests, and consumer/contract tests.
- Security/performance: targeted tests based on threat models and capacity targets once those are defined.

## Reporting

Change reports must list the exact commands run, their result, and any checks not run. Documentation-only changes should validate links and consistency; an application build is optional unless application/configuration files changed or the requester requires it.
