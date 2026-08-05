# PhilSA Repository Instructions

These instructions apply to the entire repository. Read the closest scoped `AGENTS.md` before editing files in a subdirectory.

## Instruction precedence and sources of truth

- A scoped `AGENTS.md` may add directory-specific rules but must not silently replace the repository's formally accepted stack or architecture decisions.
- When instructions, older documentation, manifests, configuration, or code disagree, inspect the current implementation and accepted ADRs, report the inconsistency, and do not invent a replacement decision.
- Treat current manifests and configuration as evidence of what is implemented. Treat accepted ADRs as authoritative for approved direction. Keep unapproved choices explicit as `TBD`.

## Repository boundaries

- `frontend/` is the implemented React, TypeScript, and Vite application.
- `backend/` is the implemented Django and Django REST Framework API service.
- `docs/` contains business, architecture, API, decision, security, and development documentation, including `docs/superpowers/` — per-developer AI-assisted workflow artifacts (see "AI-assisted development workflow" below).
- `.agents/` is reserved for supporting AI material. Root and scoped `AGENTS.md` files are the authoritative agent instructions.
- Keep frontend and backend independently buildable and deployable. They communicate only through documented, versioned API contracts.
- `frontend/` is the implemented React, TypeScript, and Vite application.
- `backend/` is the implemented Django and Django REST Framework API service.
- `docs/` contains business, architecture, API, decision, security, and development documentation.
- `.agents/` is reserved for supporting AI material. Root and scoped `AGENTS.md` files are the authoritative agent instructions.
- Keep frontend and backend independently buildable and deployable. They communicate only through documented, versioned API contracts.

## AI-assisted development workflow

- The accepted agent for AI-assisted development sessions is **Claude Code with the Superpowers plugin**. Superpowers enforces a plan → test → implement → review discipline on top of Claude Code's default agentic behavior — sessions must not go from prompt directly to code changes without a reviewed plan.
- This is a process convention, not an architecture decision: it governs how changes get proposed and reviewed, and does not itself authorize deviating from any other rule in this document (smallest-change principle, security rules, testing requirements, contract/migration review, etc.).
- Superpowers is a third-party, community-maintained plugin, not an Anthropic or internally-audited tool. Formal security review (what it reads, writes, and can access) against the "Security and sensitive data" rules below is `TBD` and should happen before it is pointed at data covering LRN, PhilSys, exam content, or proctoring evidence.

### Developer isolation

- Each developer works in their own git worktree, so no two developers' sessions ever operate against the same checkout — this is what makes single-owner-per-story assignment enforceable at the tooling level, not just by convention.
- Worktrees are named after each developer's short code (below), lowercase: `worktrees/<code>/`.

### Developer short codes

Format: `<Initial(s)>.<Lastname>`. One letter by default; extended to two letters only where a single initial would collide with another developer on the team. Capitalized form for documentation, tables, and anything human-read; lowercase for every folder, branch, and filename.

| Developer | Short code | Lowercase form |
|---|---|---|
| Lovely Mae Chavez | L.Chavez | `l.chavez` |
| Maricon Landicho | M.Landicho | `m.landicho` |
| Jude Cabigon | Ju.Cabigon | `ju.cabigon` |
| Ian Chris Sandoval | I.Sandoval | `i.sandoval` |
| bienvenido.mendoza | B.Mendoza | `b.mendoza` |
| Prince Barachiel Malonzo | P.Malonzo | `p.malonzo` |
| Alvy Depositar | A.Depositar | `a.depositar` |
| JP Mayordo | JP.Mayordo | `jp.mayordo` |
| Joshua Ganapin | Jo.Ganapin | `jo.ganapin` |

### `docs/superpowers/` structure

One folder per developer, named after their lowercase short code:

```
docs/superpowers/<code>/
├── <code>.task.md          # current task brief / working reference for that developer
├── plans/                  # reviewed, human-approved implementation plans (approval required before execution)
├── specs/                  # Superpowers brainstorm/spec-phase output — what is being built and why
└── implement/
    └── <code>.implement.md # implementation log: what was built, against which plan, what was verified
```

This is distinct from `.agents/`, which remains reserved per the rule above for supporting AI material (shared skill/config assets, not per-developer process documentation). `docs/superpowers/` is per-developer, human-reviewable development documentation and falls within the existing `docs/` boundary.

## Adopted technology stack

### Frontend

- React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, and React Router 7.
- Use controlled React state, typed form models, and feature-local validation helpers by default.
- Do not add form, server-state, or global-state libraries until a demonstrated need and reviewed decision justify them.
- Use Vitest with jsdom, React Testing Library, Testing Library user-event, and jest-dom for unit/component behavior.
- Use Playwright for critical browser journeys.

### Backend

- Python 3.13, Django 5.2, Django REST Framework 3.16, and DRF SimpleJWT.
- Django-managed accounts and the backend are authoritative for identity, account status, roles, permissions, and session state.
- Manage dependencies with pip-tools: edit the applicable `.in` manifest, regenerate the matching pinned `.txt` lock with Python 3.13, and review the lock-file diff.
- Use Django's built-in test runner and Django/DRF test utilities unless a later accepted decision changes the test stack.

### Data and API

- Use PostgreSQL-compatible persistence with Supabase Postgres as the accepted database provider, configured through `DATABASE_URL` without committed credentials.
- SQLite may be used for isolated local and test execution. Persistence-backed integration behavior must be verified against PostgreSQL-compatible storage.
- Expose REST APIs under the versioned `/api/v1/` namespace and keep request, response, authentication, permission, error, and pagination contracts documented.
- OpenAPI 3 with DRF Spectacular is accepted direction, but do not treat schema tooling as installed until its dependency and configuration are committed.
- Ruff and mypy are accepted backend quality-tooling direction, but do not require or claim those checks until their dependencies and configuration are committed.
- Deployment, asynchronous processing, and the concrete private S3-compatible object-storage provider remain `TBD`.

## Architecture and change rules

- Make the smallest change that satisfies the request. Do not restructure code or add dependencies without explicit scope and justification.
- Isolate frontend API calls and transport mapping in service modules. Components must not call remote endpoints directly.
- Keep business rules and orchestration out of presentation components; use focused hooks, domain utilities, or services with tests.
- Frontend validation improves usability only. The backend remains authoritative for validation, authentication, authorization, state transitions, scoring, eligibility, and audit decisions.
- Keep Django/DRF views and serializers thin. Put workflows and reusable business rules in application/domain services.
- API changes require reviewed contract documentation and tests.
- Data-model changes require reviewed migrations, rollout impact, and rollback procedures.
- Update tests when behavior changes. Update documentation when architecture, API contracts, security behavior, or business behavior changes.
- Mark unresolved architecture and business decisions as `TBD`; do not invent requirements.

## Security and sensitive data

- Never commit or log secrets, credentials, tokens, database URLs, service-role keys, personal data, real exam content, answer keys, proctoring evidence, or sensitive integration payloads.
- Do not expose secrets through `VITE_*` variables, browser bundles, source maps, logs, screenshots, fixtures, examples, or UI error messages.
- Do not trust frontend routes, browser storage, client-submitted roles, identifiers, scores, or status values as authorization or integrity controls.
- Enforce input validation, deny-by-default permissions, object-level authorization, lifecycle rules, and safe audit behavior on the backend.
- Use synthetic data in tests, fixtures, screenshots, examples, and documentation.
- Supply production secrets through environment configuration. Required production settings must fail safely when values are missing or invalid.
- Keep errors and logs actionable without exposing sensitive assessment, identity, authentication, proctoring, or integration data.

## Testing and error handling

- Frontend behavior changes require focused Vitest/Testing Library coverage; critical affected browser journeys require Playwright coverage.
- Preserve relevant loading, empty, validation, error, permission-denied, responsive, keyboard, and accessibility states in frontend work.
- Backend endpoint tests must cover success, invalid input, unauthenticated access, permission denial, object-level denial, not found, conflicts/state transitions, audit expectations, and safe error envelopes where applicable.
- Test backend business rules below the HTTP layer when practical.
- Never weaken or remove an assertion merely to make a check pass. Disclose failing or skipped checks.

## Verification

Before reporting completion, inspect the diff and run the checks relevant to the changed area.

From `frontend/`, as applicable:

- `npm test`
- `npm run lint` — TypeScript `--noEmit`, not ESLint
- `npm run build`
- `npm run test:e2e` when a covered browser journey changes

From `backend/`, as applicable:

- `python manage.py check --settings=config.settings.local`
- Focused Django tests for the changed module
- `python manage.py test --settings=config.settings.test`
- When production settings change, run the production settings check with fake non-secret environment values.

Documentation-only changes require link and factual-consistency review. Application builds are not mandatory unless application/configuration behavior changes or the requester asks for them.

Never claim tests, builds, linting, validation, or security checks passed unless the relevant command was actually run and its result observed. Final reports must list exact commands and results, including skipped checks and pre-existing failures.
