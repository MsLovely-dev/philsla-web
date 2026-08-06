# Maricon Landicho (M.Landicho) — Sprint Task Brief

## Ticket 001 — User Authentication (Login): Finish the Remaining Work

| Field | Value |
|---|---|
| Owner | Maricon Landicho (M.Landicho) |
| Module | BRD-01 Login |
| Status | In progress — green track |
| Worktree | `worktrees/m.landicho/` |
| Branch | `m.landicho/login` |
| Plan status | Reviewed and approved for Thursday execution |
| Implementation status | Wednesday planning only; no Ticket 001 code changes remain |

### Request

Finish the remaining work for User Authentication (Login). Read `AGENTS.md` and `build_plan.md` before creating a plan, preserve secure-coding requirements, and obtain Maricon Landicho's review and approval of the plan before implementation.

### Current implementation assessment

The login capability is substantially implemented. The repository already contains:

- Backend endpoints for identifier, password, OTP verification/resend, selfie logging, session lookup, refresh, logout, and token revocation under `/api/v1/auth/`.
- Django-managed accounts, server-derived roles and scopes, JWT access tokens, persistent rotating refresh sessions, hashed OTP comparison, generic authentication errors, throttling, and safe error-envelope tests.
- A frontend identifier → password → OTP → selfie flow using the isolated backend authentication service.
- Focused backend and frontend tests for the main success path and several negative paths.

The green status therefore means the principal flow exists; it does not mean every security requirement in `docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md` is complete.

### Proposed solution — awaiting review

Use a narrow, test-first gap-closing change that preserves the working four-step flow:

1. Enforce the configured password policy of five failed attempts within 15 minutes followed by a 15-minute lockout.
2. Enforce the configured maximum of three OTP resends per pending login.
3. Complete safe authentication audit events for password failure/success, lockout, OTP send/failure/verification, selfie completion, and session creation without recording secrets or full identifiers.
4. Extend the existing login and authentication-control test files before changing behavior.
5. Run the focused login suite, the complete backend suite, Django configuration checks, and a manual four-step smoke test.

The implementation should modify existing application and test files where practical. Any newly created planning or process-documentation file must be stored only under `docs/superpowers/m.landicho/`.

### Explicitly deferred follow-up gaps

These items require broader architecture, dependency, persistence, or deployment decisions and are excluded from Ticket 001's proposed sprint implementation:

- Argon2/bcrypt adoption and dependency-lock changes.
- Durable audit-event persistence.
- Tier-specific idle and absolute session enforcement.
- Staff activation/invitation redesign.
- Production private-object-storage integration for login selfies.
- General README alignment and frontend Gemini-key remediation.

### Secure-coding constraints

- Treat the backend as authoritative for authentication, account state, role, scope, session, and lockout decisions.
- Preserve generic failure responses and anti-enumeration behavior.
- Never log or commit passwords, OTP codes, tokens, full LRNs, complete email addresses, selfie payloads, credentials, or personal data.
- Store only one-way digests for secrets where persistence is required and use constant-time comparisons where applicable.
- Do not place pending-auth or session tokens in URLs.
- Keep refresh tokens in HttpOnly, Secure, SameSite=Strict cookies outside local development.
- Use synthetic identities and images in tests and documentation.
- Do not weaken existing assertions or bypass backend permission and lifecycle checks.
- Do not add dependencies, migrations, or API-contract changes without separate review.

### Acceptance criteria for the proposed solution

- The existing identifier → password → OTP → selfie journey remains functional.
- Five failed password attempts trigger a 15-minute server-side lockout and successful authentication clears the applicable failure state.
- OTP resend attempts cannot exceed the configured maximum and do not extend the absolute pending-auth lifetime.
- Authentication audit events are emitted with safe metadata and without sensitive values.
- Existing and new focused login tests pass, followed by the complete backend test suite and Django configuration check.
- Manual smoke testing covers success, invalid identifier/password, lockout, invalid/expired OTP, resend limit, selfie failure, session creation, refresh, and logout.
- No implementation begins until the design/spec and implementation plan have both been reviewed and approved by Maricon Landicho.

### Review gate

This entry records the approved solution and task scope. The phased implementation plan is stored in `implement/m.landicho.implement.md` at the owner's request. Implementation remains blocked until Maricon explicitly approves that phased plan.

## Active story

- **Story:** User Authentication (Login)
- **Module:** BRD-01 Login
- **Status:** In progress
- **Track:** Real build/fix work
- **Worktree:** `worktrees/m.landicho/`
- **Branch:** `m.landicho/login`

## Ticket 002 — Maintenance Table — Student Registration

| Field | Value |
|---|---|
| Owner | Maricon Landicho (M.Landicho) |
| Module | Maintenance & Config |
| Sprint status | Reactivated by Maricon for Ticket 002 planning on 2026-08-06 with sprint-owner clearance; `build_plan.md` roster and Thursday section updated same day to record the change |
| Implementation assessment | Substantially implemented in the current system; verification and targeted hardening remain |
| Branch | `m.landicho/maintenance-student-registration`, created sequentially from merged `origin/main` |
| Plan status | Draft saved at `plans/2026-08-06-ticket-002-maintenance-student-registration-plan.md`; awaiting Maricon's review |
| Implementation status | Blocked until Maricon reviews and approves the written plan |

### Existing implementation evidence

- `frontend/src/pages/admin/maintenance/StudentRegistrationMaintenance.tsx` provides a database-backed maintenance screen with list, search, filtering, pagination, create, update, delete, loading, success, and error behavior.
- `frontend/src/services/backendApplicationService.ts` isolates the screen's calls to the versioned `/api/v1/configuration/` endpoints.
- `frontend/src/pages/StudentApplication.tsx` consumes enabled Student Registration configuration dynamically.
- `backend/apps/configuration/` provides persistent configurable fields, versioned public/admin APIs, validation, transactions, role enforcement, verification-method safeguards, and safe configuration audit events.
- The focused backend configuration suite currently contains 18 passing endpoint tests. Frontend verification remains incomplete because Vitest dependencies were not installed in this worktree when the assessment was performed.

### Approved solution for future planning

Treat Ticket 002 as verification and targeted gap closure, not a new implementation or rewrite:

1. Preserve the existing CRUD, filters, pagination, configurable-field validation, registration-method safeguards, public configuration consumption, and audit behavior.
2. Align frontend route and navigation visibility with the documented backend/API authorization contract: `SYSTEM_ADMIN` and `DEPED_ADMIN` only.
3. Keep backend role checks as the authoritative security boundary; frontend visibility must not be treated as authorization.
4. Add focused frontend coverage for authorized access, denied roles, loading, empty, API-error, CRUD, and validation states.
5. Re-run the focused backend configuration suite and relevant frontend tests, then manually verify the maintenance-to-registration configuration flow with synthetic data.
6. Fix only confirmed gaps through the smallest reviewed changes; do not restructure the feature or add dependencies without separate approval.

### Secure-coding constraints

- Enforce deny-by-default backend permissions and preserve server-side validation for every create, update, and delete operation.
- Do not trust frontend routes, browser state, or client-submitted roles as access controls.
- Do not log or commit credentials, tokens, LRNs, registration submissions, personal data, or sensitive configuration payloads.
- Keep audit metadata limited to safe event names, outcomes, correlation IDs, and internal user references.
- Use synthetic configuration and identity data in automated tests, manual verification, screenshots, and documentation.
- Preserve generic, safe API error envelopes and do not expose internal exceptions or authorization details.
- Do not add an API-contract change, dependency, model change, or migration without separate review and approval.

### Acceptance criteria for a future approved implementation

- Only `SYSTEM_ADMIN` and `DEPED_ADMIN` can discover and use the maintenance screen; all other roles are denied by the backend.
- Authorized administrators can list, search, filter, paginate, create, edit, enable or disable, and delete permitted Student Registration fields through the real API.
- Verification methods retain the existing predefined-value, uniqueness, single-active-method, locked-PhilSys, last-active-method, and delete protections.
- Enabled configuration is reflected in the public Step 1 registration form without exposing disabled or administrative-only data.
- Loading, empty, validation, API-error, permission-denied, keyboard, responsive, and accessibility behavior is verified where applicable.
- Focused backend and frontend checks pass, and exact observed results are recorded in the implementation log.

### Review gate

Maricon reactivated Ticket 002 for branch setup and planning on 2026-08-06, with sprint-owner clearance. The branch and written plan now exist, but no application or test changes are authorized. Before implementation, Maricon must review and approve `plans/2026-08-06-ticket-002-maintenance-student-registration-plan.md`. `build_plan.md`'s original deferred status has been updated (roster row and Thursday section) to record this reactivation.

## Wednesday — planning and scope lock

- [x] Audit `backend/apps/accounts/` against `docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md`.
- [x] Produce a concrete gap list against the four-step login flow; do not implement fixes yet.
- [x] Complete the Superpowers brainstorm/spec phase and save its output under `specs/`.
- [x] Prepare a reviewed implementation plan under `plans/`; Maricon approved it for Thursday execution.
- [x] Explicitly keep Maintenance Table — Student Registration parked.
- [x] Confirm the root `AGENTS.md` applies; no scoped `backend/AGENTS.md` or `frontend/AGENTS.md` exists.
- [x] Confirm the isolated worktree and branch: `worktrees/m.landicho/` on `m.landicho/login`.
- [x] Confirm no Ticket 001 application, test, dependency, configuration, or migration diff remains after restoring the Wednesday planning-only state.
- [ ] Maricon states at standup: “No commits to `main` without PR review.”

**Deliverable:** Written login gap list, reviewed plan for Thursday, and confirmation that the maintenance-table story is parked.

## Thursday — execution

- Execute the approved gap-closing plan on `m.landicho/login`.
- Run `test_login_endpoints.py` in full.
- Add tests for new edge cases before fixing them.
- Manually smoke-test the complete four-step login flow end to end.
- Record implementation work and observed verification results in `implement/m.landicho.implement.md`.

## Friday — freeze and rehearse

- Support the full rehearsal and demonstrate login live in the morning.
- After midday, make P0 fixes only and route them through PR review.
- Append any Friday P0 fixes and verification evidence to the implementation log.

## Working rules

- Work only from the dedicated `m.landicho` Git worktree and the `m.landicho/login` branch.
- Follow the plan → test → implement → review workflow.
- Do not commit directly to `main`; use PR review.
- Never record secrets, credentials, tokens, personal data, or sensitive authentication payloads in these artifacts.
