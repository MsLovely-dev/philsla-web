# ADR-003: Frontend Tooling

- Status: Accepted for current frontend prototype
- Date: 2026-07-10
- Decision owners: `TBD`

## Context

The frontend is an existing React 19, TypeScript, and Vite prototype. It already includes Vitest, jsdom, React Testing Library, Testing Library user-event, jest-dom, and Playwright. The application is currently mock/local-service backed, and backend API contracts remain `TBD`.

The priority checklist required documented decisions for form, server-state, component-test, and end-to-end-test tooling before expanding feature modules.

## Decision

Use the current frontend tooling as the standard unless a later feature need justifies a new dependency:

- Forms: use controlled React state, typed form models, and feature-local validation helpers for now. Do not add a form library until repeated form complexity proves it is needed.
- Server state: keep data access behind typed service interfaces and mock/API adapters. Continue using local React state and context for prototype state until real backend integration creates a clear need for a server-state library.
- Component tests: use Vitest with jsdom, React Testing Library, Testing Library user-event, and jest-dom.
- End-to-end tests: use Playwright for critical browser journeys, including representative desktop and mobile routing behavior.
- Type checks: keep `npm run lint` as the TypeScript no-emit check.
- Production build verification: use `npm run build` when application code or configuration changes affect bundling.

## Consequences

- Feature work can proceed without adding speculative dependencies.
- Form and server-state choices remain easy to replace because business workflows and transport behavior should live in hooks, domain utilities, or service modules rather than presentation components.
- Tests should cover behavior through service-contract tests, component interaction tests, and a small set of Playwright journeys.
- A future backend integration may revisit server-state tooling once caching, invalidation, retries, pagination, and synchronization needs are concrete.

## Alternatives considered

- Add a form library now: deferred because the current codebase has not established repeated validation and schema complexity that warrants the dependency.
- Add a server-state library now: deferred until backend API behavior and caching requirements are approved.
- Replace existing test tooling: not selected because the current Vitest, Testing Library, and Playwright setup already covers the required frontend testing layers.
