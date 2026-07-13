# Frontend Architecture

## Current implementation

The application under `frontend/` uses React 19, TypeScript, Vite, React Router, and Tailwind's Vite integration. `src/routing/routes.tsx` contains typed route definitions and prototype role permissions, while `src/routing/RouteGuards.tsx` applies authentication, role, exam-eligibility, layout, and maintenance guards. `src/App.tsx` renders that configuration, `src/PhilSAContext.tsx` provides application context, and `src/services/` contains mock services/data. Pages are grouped partly by role or function; shared UI is under `src/components/`.

Frontend route guards improve prototype navigation only. They are not an authority for identity, role, account status, permissions, session validity, exam eligibility, or workflow access. Until backend authentication endpoints replace the current mock/local behavior, all frontend-authenticated state must be treated as prototype-only and non-authoritative.

Shared feedback primitives under `src/components/ui/` define accessible loading, empty, error, confirmation-dialog, and notification patterns. Existing feature-specific feedback implementations should adopt these primitives incrementally when their modules change; a repository-wide visual rewrite is not implied.

Service contracts under `src/services/` define the frontend boundary for authentication, application submission, reviewer decisions, and shared service responses. `LocalStorageAuthService` preserves the current prototype session behavior behind the `AuthService` contract. Mock implementations are intentionally replaceable and must not be treated as production API behavior. Frontend role values, local storage sessions, and route-level allowed-role lists must never be sent to the backend as authorization evidence. Future backend request and response schemas remain `TBD` until an API contract is approved.

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
- Service methods should return the shared `ServiceResult` shape so success, validation-error, authorization-error, network-error, and not-found behavior remain consistent across mock and future API adapters.
- Business logic must not be placed directly inside presentation components.
- Shared utilities belong in `src/lib` only when they are genuinely feature-independent.
- Frontend validation is for usability only. The backend must remain authoritative for validation and all security or business decisions.
- Avoid a feature importing another feature's internals. Promote truly shared contracts or UI to a shared location.

## State, routing, and testing

The current context and routing approach may continue during incremental development. Frontend tooling decisions are recorded in [ADR-003](../decisions/ADR-003-FRONTEND-TOOLING.md): controlled React state for forms, service interfaces for mock/API data access, Vitest with React Testing Library for component tests, and Playwright for critical end-to-end browser journeys. Route-level code splitting remains `TBD`. Behavior changes require updated tests at the lowest practical layer and, where appropriate, browser-level coverage for critical journeys.

## Hosting

The frontend uses React Router `BrowserRouter`. Any production static hosting target must be configured to serve `frontend/dist/index.html` for unknown application routes so direct navigation, refresh, and shared links continue to work. Exact hosting provider rewrite syntax is `TBD` until the hosting platform is selected.

Examples of required behavior:

- `/dashboard` returns the built SPA entrypoint.
- `/student/application` returns the built SPA entrypoint.
- `/admin/reviewer/applications/CAND-2026-0001` returns the built SPA entrypoint.
- Static assets under the built asset path are served normally.

## Shared UI Verification

Shared feedback primitives under `frontend/src/components/ui/` were reviewed for P0 readiness:

- Keyboard and focus: `ConfirmationDialog` moves focus to the safe cancel action, traps `Tab` focus inside the open dialog, restores focus on close, supports `Escape`, and blocks dismissal while confirming.
- Labels and semantics: dialogs use `role="alertdialog"`, `aria-modal`, `aria-labelledby`, and `aria-describedby`; loading and notification states use live-region semantics; decorative icons are hidden from assistive technology.
- Contrast: shared states and notification variants use existing PhilSA/Tailwind semantic colors with high-contrast text/background pairings. Any future palette change should recheck these combinations visually.
- Responsive layout: shared state containers use constrained widths and mobile-first spacing; dialog and notification layouts fit narrow viewports through full-width mobile sizing and stacked actions.
- Tests: `frontend/src/components/ui/Feedback.test.tsx` covers live-region semantics, safe initial focus, focus trapping, blocked confirming dismissal, actions, and notification grouping.

## Migration approach

1. Select one bounded feature and define its public entry points.
2. Move code without changing behavior, with tests or characterization evidence.
3. Redirect imports and verify the build/type check.
4. Repeat only after review; avoid a repository-wide move in one change.
