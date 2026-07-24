# ADR-002: Backend Framework

- Status: Accepted
- Date: 2026-07-10
- Decision owners: `TBD`

## Context

The repository reserves `backend/` for a service separated from the React frontend. Earlier documentation proposed Django and Django REST Framework, but the framework had not been formally selected and no backend application had been implemented.

## Decision

Use Django as the backend application framework and Django REST Framework for the HTTP API.

This decision does not authorize scaffolding in a documentation-only change. The supported Python and framework versions, dependency tooling, database, authentication, background jobs, storage, deployment, and API schema tooling remain `TBD` and require separate decisions where material.

## Consequences

- Backend modules must follow Django project/app conventions while preserving business-capability boundaries.
- HTTP endpoints should use Django REST Framework serializers, views/viewsets, permissions, and exception handling where appropriate.
- Business logic must remain outside views, viewsets, and serializers when it represents domain workflows or reusable rules.
- Django migrations will manage database schema changes once a database and project structure are selected.
- Backend tests can use Django/DRF testing facilities; the detailed testing toolchain remains `TBD`.

## Alternatives considered

Alternative backend frameworks were not recorded in the repository. Comparative evaluation details are `TBD`.
