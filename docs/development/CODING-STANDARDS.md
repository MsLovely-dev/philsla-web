# Coding Standards

## General

- Prefer small, cohesive modules and explicit names over hidden coupling.
- Keep business rules separate from transport, persistence, and presentation.
- Never commit secrets or write sensitive information to logs.
- Avoid speculative abstractions; document non-obvious decisions and tradeoffs.
- Update documentation when architecture or business behavior changes.

## Frontend

- Follow the existing React and TypeScript conventions until formatter/linter policies are formally adopted (`TBD`).
- Shared components belong in `frontend/src/components`; feature-specific components belong under their feature.
- API calls must be isolated inside service modules.
- Business logic must not be placed directly inside presentation components.
- Prefer typed component boundaries and transport models. Map API responses into domain/view models in services or adapters.
- Frontend validation is for usability only; the backend must remain authoritative.
- Preserve accessibility and handle loading, empty, error, and success states.

## Backend

The backend uses Django and Django REST Framework. Follow their established project, app, serializer, view, migration, and testing conventions while also applying these rules:

- Backend business logic must not be placed directly inside routes or controllers.
- Validate at the system boundary and enforce invariants in domain/application code.
- Require authentication and authorization independently of frontend behavior.
- Isolate persistence and external integrations behind focused interfaces.
- Use safe, structured logging with no secrets or sensitive information.

## Review expectations

Reject changes with unrelated formatting churn, duplicated business rules, hidden configuration, unhandled errors, undocumented contract changes, or claims of checks that were not run.
