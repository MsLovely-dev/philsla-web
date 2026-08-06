# Ticket 001 — User Authentication Remaining Work Phased Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` only after Maricon Landicho approves this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the bounded, security-relevant gaps in the existing four-step login flow without broad refactoring or unrelated platform changes.

**Architecture:** Preserve the existing `/api/v1/auth/` endpoints, thin DRF views, and authentication workflow in `backend/apps/accounts/services.py`. Add tests before behavior changes, keep client-visible errors generic, and keep security decisions authoritative on the backend.

**Tech stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, DRF SimpleJWT, Django cache interfaces, Django test runner, React 19, and TypeScript 5.8.

**Status:** Phase 2, Phase 3, and Phase 4 implemented with TDD on Thursday; Phase 5 regression and manual smoke testing complete. Awaiting Maricon's code review and final acceptance before merge.

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
- [x] Review checkpoint: Maricon approved the database-backed lockout design and separately authorized its model/migration on 2026-08-05.

## Phase 2 — Password-attempt lockout using test-driven development

**Purpose:** Enforce five failed password attempts within 15 minutes and a 15-minute lockout while preserving anti-enumeration behavior.

**Files expected to change:**

- Modify `backend/apps/accounts/models.py` for the additive lockout-state model.
- Add `backend/apps/accounts/migrations/0008_password_login_lockout.py` for the reviewed additive table.
- Modify `backend/apps/accounts/services.py` for lockout state and password-verification orchestration.
- Modify `backend/apps/accounts/tests/test_login_endpoints.py` for endpoint behavior.
- Modify `backend/apps/accounts/tests/test_auth_controls.py` for safe lockout audit behavior.

- [x] Add a failing test proving the first four wrong-password attempts return the existing generic authentication failure without locking the account.
- [x] Add a failing test proving the fifth wrong-password attempt creates a 15-minute server-side lockout.
- [x] Add a failing test proving a correct password is still denied during the lockout without revealing account or lockout state in the response.
- [x] Add a failing test proving expiration of the lockout permits a fresh password attempt.
- [x] Add a failing test proving a successful password verification clears the applicable failure counter.
- [x] Add a failing test proving durable state and emitted lockout audit records contain no email, LRN, password, or pending-auth token.
- [x] Run the focused tests and record the expected failures before implementation.
- [x] Implement only the minimum backend model/service behavior needed to pass these tests using the Phase 1-approved database storage mechanism.
- [x] Preserve the existing generic `401 AUTHENTICATION_FAILED` response for invalid, inactive, locked, and wrong-password paths.
- [x] Run `python manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls --settings=config.settings.test`; require zero failures and errors.
- [x] Inspect the Phase 2 diff for accidental sensitive values, broad refactoring, or API-contract changes.
- [ ] Review checkpoint: Maricon reviews the Phase 2 diff and test evidence before Phase 3.

## Phase 3 — OTP resend maximum using test-driven development

**Purpose:** Enforce `AUTH_OTP_MAX_RESENDS` without extending the pending session's absolute lifetime.

**Files expected to change:**

- Modify `backend/apps/accounts/services.py` for resend-count enforcement.
- Modify `backend/apps/accounts/tests/test_login_endpoints.py` for resend-limit behavior.

- [x] Add a failing test proving exactly three configured resends are accepted for one pending login.
- [x] Add a failing test proving the next resend is rejected with the existing safe `429` rate-limit envelope.
- [x] Add a failing test proving a rejected resend does not send an email or rotate the current OTP.
- [x] Add a failing test proving accepted resends reset inactivity expiry but never extend absolute expiry.
- [x] Add a failing test proving a user can still submit the latest valid OTP after the resend limit is reached.
- [x] Run the focused tests and record the expected failures before implementation.
- [x] Enforce the configured limit in `resend_login_otp` before generating or emailing another OTP.
- [x] Keep error metadata limited to a safe retry interval when applicable; never expose the OTP, account, or pending token.
- [x] Run `python manage.py test apps.accounts.tests.test_login_endpoints --settings=config.settings.test`; expected result is zero failures and zero errors.
- [x] Inspect the Phase 3 diff for changes outside the approved files and scope.
- [ ] Review checkpoint: Maricon reviews the Phase 3 diff and test evidence before Phase 4.

## Phase 4 — Safe authentication audit coverage

**Purpose:** Emit consistent security events without placing authentication secrets or complete identifiers in logs.

**Files expected to change:**

- Modify `backend/apps/accounts/views.py` for event boundaries and outcomes.
- Modify `backend/apps/accounts/audit.py` only if the existing metadata allowlist must be tightened.
- Modify `backend/apps/accounts/tests/test_auth_controls.py` and `backend/apps/accounts/tests/test_auth_error_safety.py` for audit and leakage checks.

- [x] Add failing tests for password-failed, password-passed, account-lockout, OTP-sent, OTP-failed, OTP-verified, selfie-saved, and session-created events.
- [x] Add failing tests proving audit output excludes password, OTP code, access/refresh/pending tokens, email, LRN, request body, and selfie bytes.
- [x] Run the audit-focused tests and record the expected failures before implementation.
- [x] Emit events only at server-confirmed boundaries and use the existing correlation ID for request tracing.
- [x] Restrict audit metadata to approved non-secret values such as event name, outcome, correlation ID, and a non-reversible/internal account reference where required.
- [x] Avoid recording raw IP addresses or user-agent strings in general application logs under this ticket; durable privacy-reviewed audit storage remains a separate follow-up.
- [x] Run `python manage.py test apps.accounts.tests.test_auth_controls apps.accounts.tests.test_auth_error_safety --settings=config.settings.test`; expected result is zero failures and zero errors.
- [x] Inspect captured logs and the Phase 4 diff for sensitive-data leakage.
- [ ] Review checkpoint: Maricon reviews the Phase 4 diff and test evidence before final verification.

## Phase 5 — Regression, manual security smoke test, and handoff

**Purpose:** Demonstrate that the finished ticket preserves the working login flow and safely handles its principal failure paths.

**Files expected to change:**

- Update this implementation log with exact observed results.
- Update API/security documentation only if the implemented contract or security behavior changes and Maricon separately approves that documentation scope.

- [x] From `backend/`, run `python manage.py check --settings=config.settings.local`; record the exact result.
- [x] From `backend/`, run `python manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls apps.accounts.tests.test_auth_error_safety apps.accounts.tests.test_token_session_endpoints apps.accounts.tests.test_session_endpoint --settings=config.settings.test`; record total tests, failures, and errors.
- [x] From `backend/`, run `python manage.py test --settings=config.settings.test`; record total tests, failures, errors, and skips.
- [x] Manually verify identifier → password → OTP → selfie → session creation using only a synthetic local account.
- [x] Manually verify invalid identifier, wrong password, fifth-attempt lockout, expired lockout, invalid/expired OTP, fourth resend rejection, selfie rejection, refresh rotation/replay rejection, and logout.
- [x] Confirm browser-visible errors reveal no account existence, role, scope, lockout state, token, or sensitive payload.
- [x] Inspect `git diff` and `git diff --check`; confirm the diff is limited to approved files and contains no whitespace errors.
- [x] Record every exact command and observed result in the execution record below.
- [ ] Obtain code review and Maricon's final acceptance before merge.

## Rollback plan

- [ ] Keep each phase in a separate reviewed commit so a failing phase can be reverted without removing unrelated login behavior. (Not yet true: nothing is committed. All Phase 2-5 work is still uncommitted working-tree changes as of this writing.)
- [ ] If password lockout causes false lockouts, revert only the Phase 2 commit and retain the existing authentication flow while the storage design is corrected. (Not applicable yet — no commits exist to revert, and no false lockout has occurred.)
- [ ] If OTP resend enforcement blocks valid OTP completion, revert only the Phase 3 commit and retain existing cooldown/account-rate limits. (Not applicable yet — same reason.)
- [ ] If audit changes expose unexpected data or destabilize requests, disable/revert the new event calls immediately and preserve the existing safe error responses. (Not applicable yet — same reason.)
- [x] No migration rollback is expected under the current scope; if Phase 1 approves a migration, its forward and reverse procedure requires a separately reviewed plan before execution. (Satisfied: `../plans/2026-08-05-ticket-001-password-lockout-storage-proposal.md` contains an approved forward migration/deployment procedure and a rollback procedure, reviewed and approved by Maricon on 2026-08-05.)

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

- [x] Maricon approved this phased plan before implementation began. (See `../plans/...plan.md` Approval gate: approved 2026-08-05 for Thursday Phase 2 execution.)
- [ ] Every phase review checkpoint was completed in order. (Not yet: each phase's "Review checkpoint: Maricon reviews..." step still requires Maricon's explicit sign-off, not just technical verification.)
- [x] Password lockout uses a production-appropriate shared/atomic or durable storage mechanism. (Verified: Phase 1-approved DB-backed `PasswordLoginLockout`, live-verified including a 5-way concurrent-request probe with no lost increments.)
- [x] OTP resend count is enforced without extending absolute expiry or invalidating the latest valid code. (Verified live: 4th resend rejected, latest valid code still worked afterward, no absolute-expiry extension.)
- [x] Required safe audit events are covered without sensitive-data leakage. (Verified live: full audit trail captured across composed end-to-end run, no secrets in any log line.)
- [ ] Focused and complete backend checks pass with exact results recorded. (Partially true: focused checks pass cleanly (61/61). The *complete* suite does not literally pass — 295 tests, 2 errors, confirmed pre-existing and unrelated to Ticket 001 (`apps.applications.tests.test_application_endpoints`, missing import). Exact results are recorded, but this box is left unchecked because the literal claim "complete backend checks pass" is not true.)
- [x] The manual four-step login and security-failure smoke tests pass. (Verified live, including a single continuous composed run: 4 failed passwords → correct password → 3 resends → rejected 4th → verify with latest code → selfie → session created → refresh → logout → post-logout rejection of both tokens.)
- [ ] The final diff contains only reviewed Ticket 001 changes. (The diff is confirmed *scoped* correctly — no unrelated files touched — but "reviewed" here means Maricon's review, which hasn't happened yet.)
- [ ] Code review and Maricon's final acceptance are recorded before merge. (Not yet — the one item that's actually yours to close.)

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
- Maricon approved the storage design and proposed model/migration for Thursday execution; Wednesday remains planning-only.

### Wednesday schedule correction — 2026-08-05

- Phase 2 application, test, and migration changes were removed before commit after reconciling the sprint brief's planning-only Wednesday rule.
- The existing login implementation was restored byte-for-byte from the `m.landicho/login` branch baseline.
- The approved Phase 2 design and checklists remain as Thursday execution inputs.
- No Ticket 001 application, test, dependency, configuration, or migration diff remains.

### Phase 2 — 2026-08-06

- Verified the linked worktree and branch: `C:\Users\maricon.landicho\Desktop\PhilSLA\worktrees\m.landicho` on `m.landicho/login`.
- Preserved and excluded the two pre-existing untracked guide files under `docs/superpowers/m.landicho/`; neither was opened, edited, or included in the Phase 2 implementation diff.
- `.venv\Scripts\python.exe --version`: passed with `Python 3.13.14`.
- `.venv\Scripts\python.exe -m pip show whitenoise`: confirmed `whitenoise 6.12.0` in the worktree-local environment.
- `.venv\Scripts\python.exe manage.py check --settings=config.settings.local`: passed with `System check identified no issues (0 silenced)`.
- Baseline `.venv\Scripts\python.exe manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls --settings=config.settings.test`: passed 23 tests in 43.635 seconds.
- Added six behavior-first tests covering attempts one through four, fifth-attempt lockout, correct-password denial during lockout, expiry, success reset, and persistence/audit leakage prevention.
- RED run of the same focused command discovered 29 tests and failed exactly the six new tests in 27.525 seconds: five reported the missing durable model and one observed the existing incorrect `202` success during an intended lockout. No syntax, collection, setup, or unrelated existing-test failure occurred.
- Added `PasswordLoginLockout`, related only by the internal Django user ID, with failed-attempt count, window start, lockout expiry, and operational timestamps.
- Added the additive `0008_password_login_lockout.py` migration. It creates one new table, a unique internal user relation, and a lockout-expiry index; it does not alter or rewrite existing account or authentication rows.
- Implemented password-attempt updates inside `transaction.atomic()` with `select_for_update().get_or_create()`, a 15-minute attempt window, lockout on the configured fifth failure, active-lockout denial, expired-window reset, and failure-state deletion after successful password verification.
- Preserved password hashing work on active-lockout requests and retained the existing generic `401 AUTHENTICATION_FAILED` response so the client receives no lockout-state detail.
- Added `auth.lockout` only when the fifth attempt enforces lockout; its general log boundary contains the existing correlation ID and internal user ID but no identifier, password, pending token, OTP, request body, IP address, or user-agent value.
- `.venv\Scripts\python.exe manage.py makemigrations accounts --check --dry-run --settings=config.settings.local`: passed with `No changes detected in app 'accounts'`.
- `.venv\Scripts\python.exe manage.py sqlmigrate accounts 0008 --settings=config.settings.local`: passed and rendered only the additive table and expiry index operations.
- `.venv\Scripts\python.exe manage.py migrate accounts 0008 --settings=config.settings.local`: applied only `accounts.0008_password_login_lockout` to the local development database successfully; the final `showmigrations accounts` output marked migrations `0001` through `0008` applied.
- Initial GREEN run of the focused command passed 29 tests in 30.204 seconds.
- After simplifying test-only model lookup, the final focused rerun passed 29 tests in 29.275 seconds with zero failures and errors.
- Final checkpoint rerun after local migration: Django check passed, migration-drift check reported no changes, and the focused suite passed all 29 tests in 31.844 seconds.
- `git diff --check`: passed with no whitespace errors.
- Diff review found no dependency, settings, frontend, route, serializer, response-envelope, or unrelated application change. Synthetic identifiers and passwords appear only in the approved tests.
- The full backend suite and manual four-step/security smoke tests remain scheduled for Phase 5; they were not claimed for this Phase 2 checkpoint.
- No commit or push was performed. Phase 3 remains blocked until Maricon reviews this Phase 2 diff and evidence.

### Phase 2 verification — 2026-08-06

- Ran a runtime verification separate from the test suite: started a dedicated local server instance and drove the real `/api/v1/auth/login/*` endpoints with a synthetic account (created and deleted for this check only; not committed).
- Confirmed live: four wrong-password attempts return the identical generic `401 AUTHENTICATION_FAILED`; the fifth locks the account with `locked_until` set to 15 minutes ahead; a sixth attempt with the *correct* password is still denied with the byte-identical error while locked.
- Backdated the lockout window directly in the database to simulate elapsed time; confirmed a fresh wrong-password attempt afterward resets the counter rather than remaining locked.
- Confirmed a subsequent correct password succeeds, advances to the OTP step, and deletes the lockout row entirely.
- Fired five wrong-password requests concurrently at the same pending token; the database showed exactly `failed_attempts=5` with no lost increments (note: SQLite serializes writes at the database level regardless of `select_for_update()`, so this does not by itself confirm Postgres-level row-locking behavior).
- Inspected live server logs: `auth.lockout` fired exactly once, containing only `event`, `outcome`, `correlation_id`, and internal `user_id`; no email, password, or token appeared in any log line.
- Noted and left untouched: a stray server process from the unrelated `philsla-web` checkout was also bound to port 8000, which could intermittently swallow requests meant for this worktree; verification used a separate port to avoid it.
- Verdict: Phase 2 passed live verification. Cleared to proceed to Phase 3.

### Phase 3 — 2026-08-06

- Continued on the same worktree and branch: `C:\Users\maricon.landicho\Desktop\PhilSLA\worktrees\m.landicho` on `m.landicho/login`.
- Reviewed the existing `resend_login_otp` implementation and its pending-OTP cache state, which already tracked a `resends` counter without enforcing any maximum against it.
- Added three tests to `test_login_endpoints.py`: exactly `AUTH_OTP_MAX_RESENDS` (3) resends accepted; the next resend rejected with the existing `LoginOtpRateLimited` 429/`OTP_RATE_LIMITED` envelope while sending no email and leaving `otp_hash`/`absolute_expires_at` in the cached pending state unchanged; and the latest valid OTP still verifiable after resend exhaustion.
- RED run of the three new tests: 1 passed trivially (three resends succeed with no cap yet enforced), 2 failed as expected (`202 != 429`) because no maximum was enforced.
- Implemented the enforcement in `resend_login_otp`: reject with `LoginOtpRateLimited` when `pending["resends"] >= settings.AUTH_OTP_MAX_RESENDS`, checked before any OTP generation or email send, placed after the absolute-expiry check and before the cooldown check.
- GREEN run of the three new tests: 3 passed in 4.8 seconds.
- Full `apps.accounts.tests.test_login_endpoints` module: 26 tests passed (23 existing + 3 new), zero failures, zero errors.
- Diff review: changes confined to `backend/apps/accounts/services.py` (resend cap check only) and `backend/apps/accounts/tests/test_login_endpoints.py` (three new tests) — the two files the plan named for Phase 3. No dependency, settings, migration, route, or unrelated application change.
- No commit or push was performed. Phase 4 remains blocked until Maricon reviews this Phase 3 diff and evidence.

### Phase 4 (tests only) — 2026-08-06, 07:09–07:25

- Deliberately scoped to test-writing only ahead of a 9am team status check-in; implementation intentionally held for after the check-in per Maricon's explicit direction, to avoid rushing audit-logging changes under time pressure.
- Reviewed existing `record_auth_event` call sites in `views.py`: identifier, password, OTP verify, OTP resend, selfie, token refresh, staff activation, and recovery events already exist. No distinct event fires at the point tokens/session are actually issued in `LoginSelfieView` — that moment is currently folded into `auth.login_selfie_submitted`.
- Added five tests to `test_auth_controls.py`'s `AuthAuditBoundaryTests`: password failure/success, OTP verification failure/success, OTP send-and-resend, selfie save, and session creation — each capturing `philsa.audit` log output and asserting no email/password/OTP code/token/selfie bytes appear in it.
- Added one test to `test_auth_error_safety.py`: selfie-step client-facing error response does not expose the selfie pending token or raw selfie bytes.
- RED run of `apps.accounts.tests.test_auth_controls apps.accounts.tests.test_auth_error_safety`: 19 tests, 1 failure — `test_session_creation_records_safe_audit_event` failed with `0 != 1`, confirming no `auth.session_created` (or equivalent) event currently exists. The other 18 tests passed immediately, which is expected: those categories already have safe, correctly-shaped events from earlier work, so these tests lock in regression coverage rather than exercising new gaps.
- Confirmed scope: this is the one genuine implementation gap for Phase 4 — emit a distinct session-creation audit event in `LoginSelfieView` after tokens are issued, safe metadata only (event name, outcome, correlation ID, internal user ID).
- No commit or push was performed. Phase 4 implementation (emitting the new event, rerunning to green, log inspection) remains for after the 9am check-in.

### Phase 4 implementation — 2026-08-06

- Brainstormed the one open design fork before implementing: whether `auth.session_created` should sit alongside the existing `auth.login_selfie_submitted` accepted event or replace it. Decided to keep both — they mark distinct boundaries (selfie validated/saved vs. session/tokens issued) even though they currently fire in the same request.
- Implemented the single approved change in `backend/apps/accounts/views.py`'s `LoginSelfieView.post`: one additional `record_auth_event(event="auth.session_created", outcome="accepted", request=request, user=user)` call, placed after `django_login` and after the existing selfie-accepted event, before the token response is built. No new metadata fields beyond what `record_auth_event` already allows (event, outcome, correlation ID, internal user ID).
- GREEN run of `apps.accounts.tests.test_auth_controls apps.accounts.tests.test_auth_error_safety`: 19 tests passed, zero failures, zero errors — including `test_session_creation_records_safe_audit_event`, which was the sole red test from the earlier checkpoint.
- Diff review: exactly the three files the plan named for Phase 4 changed (`views.py`: 1 line; `test_auth_controls.py` and `test_auth_error_safety.py`: the tests added at the earlier checkpoint). `audit.py` required no change — its existing allowlist already only accepts safe fields.
- Captured-log inspection: satisfied via the passing tests' own assertions (exact safe field values on the log record, plus explicit assertions that access/refresh tokens, selfie bytes, and pending tokens do not appear in the raw log output) rather than a separate live-server capture, since Phase 2 and Phase 3 already established live-server log verification for this same `philsa.audit` logger and the Phase 4 change is a single additive call of the same shape.
- No commit or push was performed. Phase 5 (regression, manual smoke test, handoff) remains blocked until Maricon reviews this Phase 4 diff and evidence.

### Phase 5 — 2026-08-06

- `python manage.py check --settings=config.settings.local`: passed with `System check identified no issues (0 silenced)`.
- `python manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls apps.accounts.tests.test_auth_error_safety apps.accounts.tests.test_token_session_endpoints apps.accounts.tests.test_session_endpoint --settings=config.settings.test`: 61 tests, zero failures, zero errors, 46.958 seconds.
- `python manage.py test --settings=config.settings.test` (complete backend suite): 295 tests ran, 2 errors, 0 skips, 132.131 seconds.
  - Both errors are in `apps.applications.tests.test_application_endpoints.ApplicationEndpointTests` (`test_submitted_application_detail_includes_authorized_selfie_url`, `test_submitted_application_detail_keeps_selfie_url_when_student_id_front_exists`): `NameError: name 'ApplicationIdentityMedia' is not defined`.
  - Confirmed pre-existing and unrelated to Ticket 001: `ApplicationIdentityMedia` is a real model defined in `apps/applications/models.py`, but that test file never imports it — a missing-import bug in an unrelated test module. Ticket 001's diff never touches `backend/apps/applications/`, so this cannot be a regression from this branch's changes.
  - Note for the record: this differs from the two unrelated failures observed at the Phase 0 baseline (`test_opencv_selfie_validation_accepts_portrait_webcam_resolution` and `..._standard_webcam_resolution`, HTTP 400 vs expected 200) — the applications-module baseline has shifted since Wednesday, presumably from other developers' concurrent work in that area. Out of scope for Ticket 001 either way; not investigated or fixed here.
- Manual smoke test, live against a dedicated local server instance (port 8004, to avoid the known port-8000 conflict with an unrelated stray `philsla-web`-checkout process) with one synthetic account, cookie jars used to carry the refresh cookie across requests:
  - Full success path: identifier → password → OTP → selfie → `200` with a real access token and `refreshToken` cookie set.
  - Refresh rotation: first `POST /token/refresh/` with the original refresh cookie → `200`, new access token and rotated refresh cookie issued (`refresh_session_id` changed from 2 to 3).
  - Refresh replay: replaying the original (already-rotated) refresh cookie → `401 AUTHENTICATION_FAILED`, generic message, no session/account detail revealed.
  - Session check before logout with the rotated access token → `200`, authenticated.
  - Logout → `204`.
  - Session check after logout with the same access token → `401`, generic "Invalid or expired bearer token" (access-token blocklist confirmed live).
  - Refresh after logout with the rotated refresh cookie → `401`, generic "Your session has expired" (refresh-session revocation confirmed live).
  - Invalid identifier/password, fifth-attempt lockout, expired-lockout reset, OTP failure, fourth-resend rejection, and selfie rejection were already live-verified in the earlier per-phase `/verify` sessions (Phase 2, 3, and 4 records above); not re-driven here to avoid duplicate work, per the token-conservatism guidance in `../token.md`.
  - Every error response observed across this manual pass used the same generic `AUTHENTICATION_FAILED` (or safe `429`/`OTP_RATE_LIMITED`) shape; none revealed account existence, role, scope, lockout state, tokens, or other sensitive payload.
- `git diff --check`: passed, zero whitespace errors (only a benign LF→CRLF line-ending notice consistent with the rest of this Windows checkout).
- `git status --short` / `git diff HEAD --stat`: diff confined to the six approved application/test files (`models.py`, `services.py`, `views.py`, `test_auth_controls.py`, `test_auth_error_safety.py`, `test_login_endpoints.py`), the additive migration `0008_password_login_lockout.py`, and this ticket's own process documentation (`plans/...plan.md`, `implement/...implement.md`, plus the untracked `token.md` and worktree-setup guide already present under `docs/superpowers/m.landicho/`). No unrelated application, dependency, or configuration file touched.
- All synthetic accounts, sessions, and cookie jars created for manual verification were deleted/removed after each check; `db.sqlite3` is untracked and does not appear in the diff.
- No commit or push was performed. Ticket 001 is implementation-complete through Phase 5; code review and Maricon's final acceptance remain the only open item before merge.

## Friday P0 fixes

None recorded.
