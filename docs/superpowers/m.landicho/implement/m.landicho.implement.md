# Ticket 001 — User Authentication Remaining Work Phased Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` only after Maricon Landicho approves this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the bounded, security-relevant gaps in the existing four-step login flow without broad refactoring or unrelated platform changes.

**Architecture:** Preserve the existing `/api/v1/auth/` endpoints, thin DRF views, and authentication workflow in `backend/apps/accounts/services.py`. Add tests before behavior changes, keep client-visible errors generic, and keep security decisions authoritative on the backend.

**Tech stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, DRF SimpleJWT, Django cache interfaces, Django test runner, React 19, and TypeScript 5.8.

**Status:** Phase 1 inspection complete; application implementation remains blocked pending approval of the database-backed lockout proposal.

**Owner and approver:** Maricon Landicho (M.Landicho)

**Specification:** `../specs/2026-08-05-ticket-001-finish-user-authentication-login-design.md`

**Canonical plan:** `../plans/2026-08-05-ticket-001-finish-user-authentication-login-plan.md`

## Recommendation

Proceed phase by phase, with review after each security control. Do not treat Django's default process-local memory cache as a production-grade password-lockout store because multiple workers could maintain different counters. Before Phase 2 implementation, approve either a shared atomic cache configuration or a durable database-backed lockout design with its required migration and rollback review. If neither is approved, complete the OTP-resend and audit phases but keep password lockout explicitly blocked rather than claiming ADR-011 compliance.

## Global constraints

- [x] Read `AGENTS.md`, `build_plan.md`, and `docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md` before drafting this plan.
- [x] Keep Maintenance Table — Student Registration deferred; it is outside Ticket 001.
- [x] Record the approved Ticket 001 solution in `../m.landicho.task.md`.
- [x] Obtain Maricon Landicho's explicit approval to execute Phase 0 before changing application code or tests.
- [x] Work only in `worktrees/m.landicho/` on branch `m.landicho/login`.
- [x] Use a worktree-local Python 3.13.14 environment for dependency-sensitive commands; preserve the separately installed system Python 3.14.5.
- [ ] Keep the existing API routes and response envelope backward compatible.
- [ ] Do not add dependencies, migrations, API-contract changes, or new application files without separate approval.
- [ ] Never log or commit passwords, OTP codes, access/refresh/pending tokens, full LRNs, complete email addresses, selfie payloads, credentials, or personal data.
- [ ] Use synthetic accounts and image content in every automated and manual test.
- [ ] Stop on any baseline or regression failure; do not weaken existing assertions.

---

## Phase 0 — Isolation and clean baseline

**Purpose:** Establish a reproducible starting point before any test or implementation change.

**Files changed:** None.

- [x] Confirm the worktree path with `git rev-parse --show-toplevel`; observed `C:/Users/maricon.landicho/Desktop/PhilSLA/worktrees/m.landicho`.
- [x] Confirm the branch with `git branch --show-current`; observed `m.landicho/login`.
- [x] Confirm the worktree-local virtual environment with `.venv\Scripts\python.exe --version`; observed `Python 3.13.14`.
- [x] Inspect `git status --short`; the new worktree was clean with no reported changes.
- [x] From `backend/`, run `.venv\Scripts\python.exe manage.py check --settings=config.settings.local`; observed no Django system-check issues.
- [x] From `backend/`, run `.venv\Scripts\python.exe manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls --settings=config.settings.test`; observed 23 tests passing with zero failures and errors.
- [ ] From `backend/`, run `python manage.py test --settings=config.settings.test`; expected result is zero failures and zero errors.
- [x] Record the Phase 0 runtime blocker and pause for owner direction before running Django checks or tests.
- [x] Review checkpoint: Maricon accepted the unrelated baseline failures and authorized Phase 1 on 2026-08-05.

## Phase 1 — Lockout storage security decision

**Purpose:** Prevent an implementation that works in one development process but is bypassable across production workers.

**Files changed:** None unless Maricon separately approves configuration or persistence changes.

- [x] Inspect the configured Django cache backend for local, test, and production settings without reading or printing credentials.
- [x] Document whether the production cache supports shared, atomic increment/add operations and reliable expiry across workers: it does not; production inherits Django's process-local `LocMemCache` default.
- [x] Confirm no suitable shared cache is approved/configured; no cache-based lockout design is authorized.
- [x] Draft a separate persistence/migration proposal with rollout and rollback impact in `../plans/2026-08-05-ticket-001-password-lockout-storage-proposal.md`; no model or migration was created.
- [x] Specify that lockout state is related by internal Django user identifier rather than email or LRN.
- [ ] Review checkpoint: Maricon approves the lockout storage design before Phase 2.

## Phase 2 — Password-attempt lockout using test-driven development

**Purpose:** Enforce five failed password attempts within 15 minutes and a 15-minute lockout while preserving anti-enumeration behavior.

**Files expected to change:**

- Modify `backend/apps/accounts/services.py` for lockout state and password-verification orchestration.
- Modify `backend/apps/accounts/tests/test_login_endpoints.py` for endpoint behavior.
- Modify `backend/apps/accounts/tests/test_auth_controls.py` for safe lockout audit behavior.

- [ ] Add a failing test proving the first four wrong-password attempts return the existing generic authentication failure without locking the account.
- [ ] Add a failing test proving the fifth wrong-password attempt creates a 15-minute server-side lockout.
- [ ] Add a failing test proving a correct password is still denied during the lockout without revealing account or lockout state in the response.
- [ ] Add a failing test proving expiration of the lockout permits a fresh password attempt.
- [ ] Add a failing test proving a successful password verification clears the applicable failure counter.
- [ ] Add a failing test proving lockout keys and emitted audit records contain no email, LRN, password, or pending-auth token.
- [ ] Run the focused tests and record the expected failures before implementation.
- [ ] Implement only the minimum backend service behavior needed to pass these tests using the Phase 1-approved storage mechanism.
- [ ] Preserve the existing generic `401 AUTHENTICATION_FAILED` response for invalid, inactive, locked, and wrong-password paths.
- [ ] Run `python manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls --settings=config.settings.test`; expected result is zero failures and zero errors.
- [ ] Inspect the Phase 2 diff for accidental sensitive values, broad refactoring, or API-contract changes.
- [ ] Review checkpoint: Maricon reviews the Phase 2 diff and test evidence before Phase 3.

## Phase 3 — OTP resend maximum using test-driven development

**Purpose:** Enforce `AUTH_OTP_MAX_RESENDS` without extending the pending session's absolute lifetime.

**Files expected to change:**

- Modify `backend/apps/accounts/services.py` for resend-count enforcement.
- Modify `backend/apps/accounts/tests/test_login_endpoints.py` for resend-limit behavior.

- [ ] Add a failing test proving exactly three configured resends are accepted for one pending login.
- [ ] Add a failing test proving the next resend is rejected with the existing safe `429` rate-limit envelope.
- [ ] Add a failing test proving a rejected resend does not send an email or rotate the current OTP.
- [ ] Add a failing test proving accepted resends reset inactivity expiry but never extend absolute expiry.
- [ ] Add a failing test proving a user can still submit the latest valid OTP after the resend limit is reached.
- [ ] Run the focused tests and record the expected failures before implementation.
- [ ] Enforce the configured limit in `resend_login_otp` before generating or emailing another OTP.
- [ ] Keep error metadata limited to a safe retry interval when applicable; never expose the OTP, account, or pending token.
- [ ] Run `python manage.py test apps.accounts.tests.test_login_endpoints --settings=config.settings.test`; expected result is zero failures and zero errors.
- [ ] Inspect the Phase 3 diff for changes outside the approved files and scope.
- [ ] Review checkpoint: Maricon reviews the Phase 3 diff and test evidence before Phase 4.

## Phase 4 — Safe authentication audit coverage

**Purpose:** Emit consistent security events without placing authentication secrets or complete identifiers in logs.

**Files expected to change:**

- Modify `backend/apps/accounts/views.py` for event boundaries and outcomes.
- Modify `backend/apps/accounts/audit.py` only if the existing metadata allowlist must be tightened.
- Modify `backend/apps/accounts/tests/test_auth_controls.py` and `backend/apps/accounts/tests/test_auth_error_safety.py` for audit and leakage checks.

- [ ] Add failing tests for password-failed, password-passed, account-lockout, OTP-sent, OTP-failed, OTP-verified, selfie-saved, and session-created events.
- [ ] Add failing tests proving audit output excludes password, OTP code, access/refresh/pending tokens, email, LRN, request body, and selfie bytes.
- [ ] Run the audit-focused tests and record the expected failures before implementation.
- [ ] Emit events only at server-confirmed boundaries and use the existing correlation ID for request tracing.
- [ ] Restrict audit metadata to approved non-secret values such as event name, outcome, correlation ID, and a non-reversible/internal account reference where required.
- [ ] Avoid recording raw IP addresses or user-agent strings in general application logs under this ticket; durable privacy-reviewed audit storage remains a separate follow-up.
- [ ] Run `python manage.py test apps.accounts.tests.test_auth_controls apps.accounts.tests.test_auth_error_safety --settings=config.settings.test`; expected result is zero failures and zero errors.
- [ ] Inspect captured logs and the Phase 4 diff for sensitive-data leakage.
- [ ] Review checkpoint: Maricon reviews the Phase 4 diff and test evidence before final verification.

## Phase 5 — Regression, manual security smoke test, and handoff

**Purpose:** Demonstrate that the finished ticket preserves the working login flow and safely handles its principal failure paths.

**Files expected to change:**

- Update this implementation log with exact observed results.
- Update API/security documentation only if the implemented contract or security behavior changes and Maricon separately approves that documentation scope.

- [ ] From `backend/`, run `python manage.py check --settings=config.settings.local`; record the exact result.
- [ ] From `backend/`, run `python manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls apps.accounts.tests.test_auth_error_safety apps.accounts.tests.test_token_session_endpoints apps.accounts.tests.test_session_endpoint --settings=config.settings.test`; record total tests, failures, and errors.
- [ ] From `backend/`, run `python manage.py test --settings=config.settings.test`; record total tests, failures, errors, and skips.
- [ ] Manually verify identifier → password → OTP → selfie → session creation using only a synthetic local account.
- [ ] Manually verify invalid identifier, wrong password, fifth-attempt lockout, expired lockout, invalid/expired OTP, fourth resend rejection, selfie rejection, refresh rotation/replay rejection, and logout.
- [ ] Confirm browser-visible errors reveal no account existence, role, scope, lockout state, token, or sensitive payload.
- [ ] Inspect `git diff` and `git diff --check`; confirm the diff is limited to approved files and contains no whitespace errors.
- [ ] Record every exact command and observed result in the execution record below.
- [ ] Obtain code review and Maricon's final acceptance before merge.

## Rollback plan

- [ ] Keep each phase in a separate reviewed commit so a failing phase can be reverted without removing unrelated login behavior.
- [ ] If password lockout causes false lockouts, revert only the Phase 2 commit and retain the existing authentication flow while the storage design is corrected.
- [ ] If OTP resend enforcement blocks valid OTP completion, revert only the Phase 3 commit and retain existing cooldown/account-rate limits.
- [ ] If audit changes expose unexpected data or destabilize requests, disable/revert the new event calls immediately and preserve the existing safe error responses.
- [ ] No migration rollback is expected under the current scope; if Phase 1 approves a migration, its forward and reverse procedure requires a separately reviewed plan before execution.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Process-local cache permits lockout bypass across workers | High with default cache | High | Phase 1 blocks implementation until shared atomic cache or durable persistence is approved. |
| Lockout behavior enables account enumeration | Medium | High | Preserve the same generic `401` response across invalid, inactive, locked, and wrong-password paths. |
| Concurrent password failures lose increments | Medium | High | Require atomic operations from the approved storage mechanism and test the chosen behavior. |
| OTP resend limit invalidates a usable code | Medium | Medium | Check the limit before generating/sending; retain the latest valid OTP after rejection. |
| Audit additions leak sensitive authentication data | Medium | High | Metadata allowlist plus focused log-capture leakage tests. |
| Existing login behavior regresses | Medium | High | Red-green focused tests, complete backend suite, manual four-step smoke test, and per-phase review. |
| Python 3.14 produces environment-specific results | High in current shell | Medium | Use the required Python 3.13 environment before baseline and execution. |

## Definition of done

- [ ] Maricon approved this phased plan before implementation began.
- [ ] Every phase review checkpoint was completed in order.
- [ ] Password lockout uses a production-appropriate shared/atomic or durable storage mechanism.
- [ ] OTP resend count is enforced without extending absolute expiry or invalidating the latest valid code.
- [ ] Required safe audit events are covered without sensitive-data leakage.
- [ ] Focused and complete backend checks pass with exact results recorded.
- [ ] The manual four-step login and security-failure smoke tests pass.
- [ ] The final diff contains only reviewed Ticket 001 changes.
- [ ] Code review and Maricon's final acceptance are recorded before merge.

## Execution record

### Phase 0 — 2026-08-05

- Created the isolated worktree at `C:\Users\maricon.landicho\Desktop\PhilSLA\worktrees\m.landicho` on new branch `m.landicho/login` from commit `d1ec92f`.
- `git rev-parse --show-toplevel`: passed; returned the required Maricon worktree path.
- `git branch --show-current`: passed; returned `m.landicho/login`.
- `git status --short`: passed; returned no changed or untracked files in the new worktree.
- Sandbox verification required a command-scoped `safe.directory` allowance because the escalated worktree creation and sandbox process use different Windows identities; no global or repository Git configuration was changed.
- `python --version`: blocked; returned `Python 3.14.5`, not the required Python 3.13 runtime.
- `py -0p`: confirmed that only `C:\Python314\python.exe` is registered.
- Existing `backend/.venv/Scripts/python.exe --version`: returned `Python 3.14.5`.
- Installed Python 3.13.14 in user scope alongside Python 3.14.5; the existing Python installation was not replaced.
- Created `backend/.venv` inside the isolated worktree with Python 3.13.14.
- Installed `requirements/tooling.txt` successfully. The committed `build==1.5.1` pin produced a package-index warning that the release is yanked; the lock was preserved and not silently upgraded.
- Installed `requirements/dev.txt` successfully with the committed Django 5.2.3, DRF 3.16.0, and SimpleJWT 5.5.1 versions.
- `.venv\Scripts\python.exe manage.py check --settings=config.settings.local`: passed with `System check identified no issues (0 silenced)`.
- The first focused-test attempt was blocked by sandbox write permissions for synthetic selfie media; the approved rerun with worktree write access completed successfully.
- `.venv\Scripts\python.exe manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls --settings=config.settings.test`: passed 23 tests in 54.433 seconds.
- The first complete-suite attempt exceeded the two-minute command limit and produced no result; the same command was rerun with a five-minute limit.
- `.venv\Scripts\python.exe manage.py test --settings=config.settings.test`: ran 212 tests in 191.537 seconds and failed 2 tests:
  - `apps.applications.tests.test_step2_configuration.Step2ConfigurationEndpointTests.test_opencv_selfie_validation_accepts_portrait_webcam_resolution`
  - `apps.applications.tests.test_step2_configuration.Step2ConfigurationEndpointTests.test_opencv_selfie_validation_accepts_standard_webcam_resolution`
- Both failures expected HTTP 200 but received HTTP 400. They are in the applications/OpenCV selfie-validation area, outside Ticket 001's login scope.
- The isolated worktree remained clean after environment setup and tests; `.venv` and generated private media are ignored.
- No application code, tests, dependencies, configuration, or migrations were changed.

### Phase 1 — 2026-08-05

- Verified the existing linked worktree and branch: `C:\Users\maricon.landicho\Desktop\PhilSLA\worktrees\m.landicho` on `m.landicho/login`.
- Inspected `base.py`, `local.py`, `test.py`, and `production.py` without reading or printing environment credentials. None defines `CACHES`.
- Effective-backend checks for local and test both returned `django.core.cache.backends.locmem.LocMemCache`.
- Static inspection confirms production inherits the same Django default; production settings were not executed because they correctly require external secret configuration.
- Inspected committed dependency manifests and accepted ADRs; found no Redis/Memcached client, shared-cache provider, or accepted shared-cache decision.
- Rejected process-local cache as the production lockout boundary because counters and expiry are not shared across workers and do not survive process restart.
- Recommended a minimal additive database-backed lockout-state model because PostgreSQL-compatible persistence is already accepted and can provide cross-worker transaction safety.
- Specified internal Django user ID as the only account reference for the lockout state; raw email and LRN are excluded.
- Created only the documentation proposal at `../plans/2026-08-05-ticket-001-password-lockout-storage-proposal.md`.
- No authentication code, tests, model, migration, dependency, API contract, or runtime configuration changed.
- Phase 2 remains blocked until Maricon approves the storage design and separately authorizes model/migration files.

## Friday P0 fixes

None recorded.
