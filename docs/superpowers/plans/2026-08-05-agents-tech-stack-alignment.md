# Root AGENTS.md Tech-Stack Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stale root repository instructions with concise, evidence-backed guidance for PhilSLA's implemented or formally accepted technology stack.

**Architecture:** The root `AGENTS.md` will own repository-wide stack facts, cross-boundary architecture rules, security invariants, and runnable verification commands. Scoped `AGENTS.md` files continue to add directory-specific rules, but they may not silently replace accepted stack decisions; conflicts must be checked against current manifests, configuration, and accepted ADRs.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, React Router 7, Vitest, Testing Library, Playwright, Python 3.13, Django 5.2, Django REST Framework 3.16, SimpleJWT, pip-tools, PostgreSQL-compatible persistence, and Supabase Postgres.

## Global Constraints

- Modify only the repository-root `AGENTS.md` during execution.
- Do not modify or stage `frontend/AGENTS.md`, `backend/AGENTS.md`, `docs/AGENTS.md`, application code, dependencies, settings, schemas, migrations, or tests.
- Include only implemented or formally accepted technology.
- Deployment, asynchronous processing, and the concrete private S3-compatible object-storage provider remain unresolved and must be written as `TBD` rather than invented.
- Label OpenAPI 3 with DRF Spectacular and Ruff/mypy as accepted directions that are not yet installed or runnable.
- Preserve or strengthen current security, API contract, migration, testing, verification, and sensitive-data requirements.
- Use synthetic data only; never add secrets, credentials, personal data, real exam content, answer keys, proctoring evidence, or sensitive operational information.
- Preserve all unrelated working-tree changes.

---

### Task 1: Align the Root Repository Instructions

**Files:**

- Modify: `AGENTS.md`
- Reference: `docs/superpowers/specs/2026-08-05-agents-tech-stack-alignment-design.md`
- Reference: `frontend/package.json`
- Reference: `backend/requirements/base.in`
- Reference: `backend/requirements/tooling.in`
- Reference: `backend/README.md`
- Reference: `docs/decisions/ADR-002-BACKEND-FRAMEWORK.md`
- Reference: `docs/decisions/ADR-003-FRONTEND-TOOLING.md`
- Reference: `docs/decisions/ADR-004-BACKEND-DEPENDENCY-MANAGEMENT.md`
- Reference: `docs/decisions/ADR-007-SUPABASE-POSTGRES-DATABASE-PROVIDER.md`
- Reference: `docs/decisions/ADR-009-AUTHENTICATION-SESSION-AND-ACCOUNT-PROVISIONING.md`
- Reference: `docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md`
- Reference: `docs/decisions/ADR-012-BACKEND-TEST-TOOLING-AND-COVERAGE.md`
- Reference: `docs/decisions/ADR-013-BACKEND-LINT-TYPE-FORMAT-TOOLING.md`
- Reference: `docs/decisions/ADR-014-API-SCHEMA-TOOLING-AND-PUBLICATION.md`

**Interfaces:**

- Consumes: current dependency manifests, backend configuration/README, accepted ADRs, and the approved design specification.
- Produces: repository-wide agent instructions that accurately identify the current stack, authority boundaries, security rules, and runnable verification commands.

- [ ] **Step 1: Run baseline assertions that demonstrate the stale root instructions**

Run from the repository root:

```powershell
& {
  $agents = Get-Content -Raw -LiteralPath '.\AGENTS.md'
  $checks = [ordered]@{
    'implemented backend stated' = $agents.Contains('implemented Django')
    'React 19 stated' = $agents.Contains('React 19')
    'Python 3.13 stated' = $agents.Contains('Python 3.13')
    'Supabase Postgres stated' = $agents.Contains('Supabase Postgres')
    'frontend verification stated' = $agents.Contains('npm run lint')
    'backend verification stated' = $agents.Contains('python manage.py test --settings=config.settings.test')
    'stale reserved-backend wording absent' = -not $agents.Contains('backend/` is reserved')
  }
  $checks.GetEnumerator() | ForEach-Object {
    '{0}: {1}' -f $_.Key, $(if ($_.Value) { 'PASS' } else { 'FAIL' })
  }
  if (@($checks.GetEnumerator() | Where-Object { -not $_.Value }).Count -eq 0) { exit 0 }
  exit 1
}
```

Expected: exit code `1`, with failures for the implemented backend, adopted stack, verification commands, and stale wording assertions.

- [ ] **Step 2: Replace `AGENTS.md` with the approved repository instructions**

Use `apply_patch` to replace the root file with exactly this content:

```markdown
# PhilSA Repository Instructions

These instructions apply to the entire repository. Read the closest scoped `AGENTS.md` before editing files in a subdirectory.

## Instruction precedence and sources of truth

- A scoped `AGENTS.md` may add directory-specific rules but must not silently replace the repository's formally accepted stack or architecture decisions.
- When instructions, older documentation, manifests, configuration, or code disagree, inspect the current implementation and accepted ADRs, report the inconsistency, and do not invent a replacement decision.
- Treat current manifests and configuration as evidence of what is implemented. Treat accepted ADRs as authoritative for approved direction. Keep unapproved choices explicit as `TBD`.

## Repository boundaries

- `frontend/` is the implemented React, TypeScript, and Vite application.
- `backend/` is the implemented Django and Django REST Framework API service.
- `docs/` contains business, architecture, API, decision, security, and development documentation.
- `.agents/` is reserved for supporting AI material. Root and scoped `AGENTS.md` files are the authoritative agent instructions.
- Keep frontend and backend independently buildable and deployable. They communicate only through documented, versioned API contracts.

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
```

- [ ] **Step 3: Run final content assertions**

Run from the repository root:

```powershell
& {
  $agents = Get-Content -Raw -LiteralPath '.\AGENTS.md'
  $package = Get-Content -Raw -LiteralPath '.\frontend\package.json'
  $base = Get-Content -Raw -LiteralPath '.\backend\requirements\base.in'
  $tooling = Get-Content -Raw -LiteralPath '.\backend\requirements\tooling.in'
  $checks = [ordered]@{
    'implemented backend stated' = $agents.Contains('implemented Django and Django REST Framework API service')
    'React version matches manifest' = ($package.Contains('"react": "^19.0.1"') -and $agents.Contains('React 19'))
    'TypeScript version matches manifest' = ($package.Contains('"typescript": "~5.8.2"') -and $agents.Contains('TypeScript 5.8'))
    'Django version matches manifest' = ($base.Contains('Django~=5.2.3') -and $agents.Contains('Django 5.2'))
    'DRF version matches manifest' = ($base.Contains('djangorestframework~=3.16.0') -and $agents.Contains('Django REST Framework 3.16'))
    'Supabase scope accurate' = ($agents.Contains('Supabase Postgres as the accepted database provider') -and -not $agents.Contains('Supabase Auth is adopted'))
    'Ruff and mypy accurately conditional' = (($tooling -notmatch '(?im)^ruff') -and ($tooling -notmatch '(?im)^mypy') -and $agents.Contains('do not require or claim those checks'))
    'DRF Spectacular accurately conditional' = $agents.Contains('do not treat schema tooling as installed')
    'security authority present' = $agents.Contains('deny-by-default permissions, object-level authorization')
    'sensitive assessment data prohibited' = $agents.Contains('real exam content, answer keys')
    'frontend commands present' = ($agents.Contains('npm test') -and $agents.Contains('npm run lint') -and $agents.Contains('npm run build'))
    'backend commands present' = ($agents.Contains('python manage.py check --settings=config.settings.local') -and $agents.Contains('python manage.py test --settings=config.settings.test'))
    'stale reserved-backend wording absent' = -not $agents.Contains('backend/` is reserved')
    'stale unimplemented-backend wording absent' = -not $agents.Contains('backend is not implemented')
  }
  $failed = @($checks.GetEnumerator() | Where-Object { -not $_.Value })
  $checks.GetEnumerator() | ForEach-Object {
    '{0}: {1}' -f $_.Key, $(if ($_.Value) { 'PASS' } else { 'FAIL' })
  }
  if ($failed.Count -gt 0) { exit 1 }
}
```

Expected: exit code `0`; every assertion reports `PASS`.

- [ ] **Step 4: Verify scope and inspect the documentation diff**

Run:

```powershell
git status --short
git diff -- AGENTS.md
git diff --check -- AGENTS.md
```

Expected:

- `AGENTS.md` is the only newly modified file from this execution.
- Existing unrelated changes remain present and untouched.
- The diff contains only the approved stack-alignment rewrite.
- `git diff --check -- AGENTS.md` exits `0` with no whitespace errors.

- [ ] **Step 5: Complete the documentation-only verification review**

Confirm manually against the approved spec:

- Every named version/tool is supported by a current manifest or accepted ADR.
- Accepted-but-not-installed tools are described conditionally.
- Deployment, asynchronous processing, and object-storage provider remain explicit unresolved decisions.
- Security, contract, migration, test, and result-reporting rules are not weakened.
- No relative links were added, so there are no new link targets to validate.
- Application tests and builds are skipped because only root documentation changed; disclose that skip in the final report.

- [ ] **Step 6: Commit only the root instruction change after verification**

Run:

```powershell
git add -- AGENTS.md
git diff --cached --name-only
git commit -m "docs: align agent instructions with stack"
```

Expected:

- The staged-name check prints only `AGENTS.md` before committing.
- The commit succeeds without including pre-existing changes.
