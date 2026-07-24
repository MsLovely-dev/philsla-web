# ADR-001: Repository Structure

- Status: Accepted for current organization
- Date: 2026-07-10
- Decision owners: `TBD`

## Context

The repository contains an implemented React/TypeScript/Vite prototype in `frontend/`, business documents in `docs/`, and backend placeholder directories in `backend/`. The frontend currently uses mock/local services. Django and Django REST Framework were subsequently adopted in [ADR-002](ADR-002-BACKEND-FRAMEWORK.md), but no backend dependency manifest or application exists yet.

## Decision

Maintain a separated frontend and backend structure within this repository:

- `frontend/` contains the React and TypeScript application.
- `backend/` is the boundary for the future Django and Django REST Framework backend.
- `docs/` contains business and project documentation.
- Root and scoped `AGENTS.md` files define repository and directory-specific AI instructions; `.agents/` may contain supporting AI material.

Recommend an incremental feature-based frontend organization under `frontend/src/features/` and a modular backend concept under `backend/apps/api/src/modules/`. These are target recommendations, not authorization to create directories or move current files.

## Consequences

- Frontend and backend can evolve and deploy independently while sharing reviewed API contracts.
- Cross-boundary behavior must be documented and versioned.
- Some duplication in tooling and setup is expected.
- Existing frontend files remain in their current page/component structure until an approved, behavior-preserving migration.
- The placeholder backend tree may not match the final stack and should not drive technology selection.

## Alternatives considered

- A single framework serving frontend and backend: not selected because no backend choice has been approved.
- Immediate source restructuring: deferred to avoid broad moves without feature tests and an approved migration.
- Separate repositories: `TBD`; current co-location supports coordinated documentation and contract work.
