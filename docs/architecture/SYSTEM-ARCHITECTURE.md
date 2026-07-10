# System Architecture

## Status

This document distinguishes the observed repository from the intended architecture. Runtime infrastructure is not yet defined.

## Current state

PhilSA uses a separated frontend/backend repository layout:

```text
Browser -> frontend/ (React + TypeScript + Vite; mock/local services)
             |
             `-> future documented API -> backend/ (Django + Django REST Framework)
                                               |
                                               `-> database/integrations (TBD)
```

- `frontend/src/App.tsx` currently owns client routes and route guards.
- Frontend code is organized mainly into `pages`, `components`, `services`, `lib`, and assets. Mock data/services support the prototype.
- `backend/` contains placeholders and an environment template, but no executable Django application or dependency manifest yet.
- `docs/` contains the business requirements, modules, user stories, and engineering guidance.
- Root and scoped `AGENTS.md` files provide AI change instructions; `.agents/` is currently empty and reserved for supporting material.

## Architectural boundaries

The frontend owns presentation, interaction, and usability validation. It must consume documented contracts through service modules and must not be trusted for authorization or data integrity.

The future backend owns authentication, authorization, validation, workflows, scoring, persistence, integrations, and audit enforcement. Business logic must not live directly in routes or controllers.

External services mentioned by business documents include identity and education registries, email/SMS, object storage, and proctoring capabilities. Their vendors, contracts, legal bases, and failure behavior are `TBD`.

## Quality attributes

- Security and privacy: least privilege, secure defaults, data minimization, and auditable privileged actions.
- Reliability: explicit failure handling for exam delivery and integrations; targets are `TBD`.
- Accessibility: supported standard and testing approach are `TBD`.
- Scalability: national volume, concurrency, storage, and retention assumptions are `TBD`.
- Observability: actionable telemetry without secrets or sensitive information.

## Related documents

- [Frontend architecture](FRONTEND-ARCHITECTURE.md)
- [Backend architecture](BACKEND-ARCHITECTURE.md)
- [Database design](DATABASE-DESIGN.md)
- [Security architecture](SECURITY-ARCHITECTURE.md)
- [Repository structure ADR](../decisions/ADR-001-REPOSITORY-STRUCTURE.md)
