# ADR-012: Backend Test Tooling and Coverage Expectations

- Status: Accepted for the backend foundation
- Date: 2026-07-13
- Decision owners: `TBD`

## Context

The backend foundation already uses Django and Django REST Framework. Baseline tests currently run through Django's built-in test runner and use Django/DRF test utilities.

The project needs a stable backend testing baseline before P1 authentication and student-journey APIs are implemented.

## Decision

Use Django's built-in test runner as the backend test runner for the foundation phase.

Accepted test tools:

- `django.test.TestCase` for database-backed behavior.
- `django.test.SimpleTestCase` for settings, pure functions, and no-database behavior.
- `django.test.override_settings` for scoped settings behavior.
- DRF's `APIRequestFactory`, `force_authenticate`, and API test utilities for API view, authentication, and permission behavior.
- Python standard-library assertions and test doubles unless a later ADR accepts pytest, factory libraries, or additional plugins.

Backend tests must be run with:

```powershell
python manage.py test --settings=config.settings.test
```

Backend configuration checks must be run with:

```powershell
python manage.py check --settings=config.settings.local
```

Production settings changes must also be checked with production settings using fake non-secret environment values:

```powershell
python manage.py check --settings=config.settings.production
```

Coverage expectations are behavior-based for now:

- Every implemented endpoint must cover success, validation failure, authentication failure, permission denial, not found, conflict/state-transition failure, and unexpected-error shape where applicable.
- Every security-sensitive workflow must cover positive and negative cases, including authentication, authorization, token/session behavior, account state, rate/lockout behavior, audit emission, and safe logging.
- Every object-specific endpoint must include object-level authorization tests for allowed and denied users.
- Domain services must have unit tests for business rules and state transitions independent of HTTP where practical.
- Persistence/integration adapters must be tested with controlled fakes or isolated test databases; production services and credentials must not be used.
- Migrations that alter data or constraints must include migration/rollback verification notes and tests where practical.
- Tests must use synthetic data only and must not include personal data, credentials, exam content, proctoring evidence, or sensitive operational payloads.

Numeric coverage thresholds are not accepted yet because coverage tooling is not part of the backend dependency baseline. A later ADR may add `coverage.py`, pytest, factory libraries, mutation testing, contract testing, or CI threshold enforcement.

## Consequences

- Backend contributors can add tests without introducing new test dependencies.
- Behavior coverage is required even without a numeric percentage gate.
- CI can rely on `manage.py check` and `manage.py test` until a later tooling decision expands the test stack.
- The checklist item for lint/type/format tooling remains separate.

## Alternatives considered

- Adopt pytest and pytest-django now: deferred to keep the foundation minimal and avoid adding tooling before the backend domain model exists.
- Add numeric coverage thresholds immediately: deferred because coverage tooling and CI threshold enforcement are not yet accepted.
- Rely only on endpoint smoke tests: rejected because backend business rules, permissions, and object scopes require lower-level and negative-path tests.
