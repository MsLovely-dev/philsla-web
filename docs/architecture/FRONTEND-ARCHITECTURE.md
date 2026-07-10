# Frontend Architecture

## Current implementation

The application under `frontend/` uses React 19, TypeScript, Vite, React Router, and Tailwind's Vite integration. `src/App.tsx` declares the routes, `src/PhilSAContext.tsx` provides application context, and `src/services/` contains mock services/data. Pages are grouped partly by role or function; shared UI is under `src/components/`.

The application is currently a prototype backed by mock/local behavior. Existing files must remain in place until a dedicated migration is approved.

## Recommended target structure

Adopt feature folders incrementally when feature work justifies moving a coherent slice:

```text
frontend/src/features/
|-- authentication/
|-- student-registration/
|-- assessment/
|-- exam-delivery/
|-- proctoring/
|-- scoring-results/
`-- administration/
```

Each feature may contain its own components, hooks, services, types, validation, and tests. Do not create empty folders solely to match this diagram.

## Placement rules

- Components used across multiple features belong in `frontend/src/components`.
- Feature-specific components belong under their respective feature.
- Remote API calls and request/response mapping must be isolated inside service modules.
- Business logic must not be placed directly inside presentation components.
- Shared utilities belong in `src/lib` only when they are genuinely feature-independent.
- Frontend validation is for usability only. The backend must remain authoritative for validation and all security or business decisions.
- Avoid a feature importing another feature's internals. Promote truly shared contracts or UI to a shared location.

## State, routing, and testing

The current context and routing approach may continue during incremental development. Decisions about server-state management, form libraries, component testing, end-to-end testing, and route-level code splitting are `TBD`. Behavior changes require updated tests once the applicable test tooling is selected.

## Migration approach

1. Select one bounded feature and define its public entry points.
2. Move code without changing behavior, with tests or characterization evidence.
3. Redirect imports and verify the build/type check.
4. Repeat only after review; avoid a repository-wide move in one change.
