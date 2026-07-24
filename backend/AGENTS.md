# Backend Instructions

These instructions apply under `backend/` in addition to the root `AGENTS.md`.

- The backend is not implemented, but Django and Django REST Framework are the adopted application and API frameworks. Persistence, job processing, storage, authentication, and deployment choices remain `TBD`.
- Follow Django and Django REST Framework conventions while preserving the documented modular business boundaries.
- Do not scaffold or install the backend unless the task explicitly requests implementation.
- Keep HTTP routes/controllers thin. Put use cases and business rules in application/domain services, with infrastructure behind interfaces where practical.
- The backend is authoritative for validation, authentication, authorization, state transitions, scoring, eligibility, and audit decisions.
- Validate all inputs and enforce object-level authorization. Never trust roles, identifiers, scores, or status values supplied by a client.
- Never log secrets or sensitive student, identity, assessment, proctoring, or integration data.
- API changes require contract documentation and tests. Data model changes require a reviewed migration and rollback approach.
- The proposed module layout is documented in `../docs/architecture/BACKEND-ARCHITECTURE.md`; do not create it until the stack and migration plan are approved.
