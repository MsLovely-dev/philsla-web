# PhilSA Repository Instructions

These instructions apply to the entire repository. A closer `AGENTS.md` adds rules for its directory.

## Repository boundaries

- `frontend/` is the current React, TypeScript, and Vite application.
- `backend/` is reserved for a separate Django application exposing APIs through Django REST Framework. Its database and runtime architecture remain `TBD`.
- `docs/` contains business, architecture, API, and development documentation.
- `.agents/` is reserved for supporting AI material. The authoritative AI instructions are the root and scoped `AGENTS.md` files.
- Keep frontend and backend independently buildable and deployable. Communicate through a documented API contract.

## Change rules

- Read the nearest scoped `AGENTS.md` before editing.
- Make the smallest change that satisfies the request. Do not restructure code unless explicitly requested.
- Do not put secrets, credentials, tokens, personal data, exam content, or sensitive information in source, fixtures, documentation, commits, or logs.
- Frontend validation improves usability only; the backend must validate and authorize every request and remains authoritative.
- Isolate frontend API calls in service modules. Keep business logic out of presentation components.
- Keep backend business logic out of routes and controllers.
- Update tests when behavior changes. Update documentation when architecture or business behavior changes.
- Mark unresolved architecture and business decisions as `TBD`; do not invent requirements.
- Never claim tests, builds, linting, or validation passed unless the relevant command was actually run and its result observed.

## Verification

Before reporting completion, inspect the diff, run the checks relevant to the changed area, and disclose skipped checks. Documentation-only changes do not require application builds unless requested, but links and factual consistency must be reviewed.
