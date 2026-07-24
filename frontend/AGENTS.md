# Frontend Instructions

These instructions apply under `frontend/` in addition to the root `AGENTS.md`.

- Preserve the current React, TypeScript, and Vite setup unless a task explicitly changes it.
- `src/components/` is for components shared across multiple features. Feature-specific components belong under their respective feature.
- Isolate remote API calls and transport mapping in service modules. Components must not call remote endpoints directly.
- Keep business rules and orchestration out of presentation components; place them in feature hooks, domain utilities, or services with tests.
- Frontend validation is for usability only. Never treat it as an authorization, integrity, or security boundary; the backend remains authoritative.
- Do not expose secrets through Vite variables, bundles, source maps, logs, or UI error messages.
- Preserve accessibility, loading, empty, error, and responsive states when changing UI behavior.
- The proposed `src/features/` organization is documented in `../docs/architecture/FRONTEND-ARCHITECTURE.md`; do not move existing files into it without an approved migration.
- Run only checks that exist in `package.json`, and report their exact outcomes. The current `lint` script is a TypeScript no-emit check.
