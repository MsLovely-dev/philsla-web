# Ticket 001 — Finish User Authentication Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan phase by phase. Steps use checkbox (`- [ ]`) syntax for tracking. Do not execute a phase without Maricon Landicho's approval.

**Goal:** Complete the bounded password-lockout, OTP-resend, and safe-audit gaps in the existing four-step login flow.

**Architecture:** Preserve the current `/api/v1/auth/` routes and move no responsibilities across layers. Tests define each security behavior first; `services.py` owns workflow rules, DRF views own HTTP orchestration, and `audit.py` owns the safe event boundary.

**Tech stack:** Python 3.13, Django 5.2, Django REST Framework 3.16, DRF SimpleJWT, Django test runner, React 19, and TypeScript 5.8.

**Status:** Phase 1 inspection complete. Database-backed lockout storage is proposed; no application implementation is authorized until Maricon approves it.

**Specification:** `../specs/2026-08-05-ticket-001-finish-user-authentication-login-design.md`

## Global constraints

- Work only in `worktrees/m.landicho/` on branch `m.landicho/login`.
- Use Python 3.13 for baseline and verification commands.
- Keep API routes and the standard error envelope backward compatible.
- Preserve generic authentication failures and anti-enumeration behavior.
- Never log or commit authentication secrets, complete identifiers, selfie payloads, credentials, or personal data.
- Use synthetic data only.
- Do not add dependencies, migrations, API-contract changes, or new application files without separate approval.
- Stop on a failed baseline or regression check; do not weaken assertions.

---

## Phase 0 — Isolation and clean baseline

**Deliverable:** A clean `m.landicho/login` worktree with Python 3.13 and passing backend baseline checks.

- [x] Create `C:\Users\maricon.landicho\Desktop\PhilSLA\worktrees\m.landicho` on branch `m.landicho/login`.
- [x] Confirm `git status --short` reports a clean new worktree.
- [x] Install Python 3.13.14 alongside the existing system Python 3.14 installation.
- [x] Create a worktree-local `backend/.venv` using Python 3.13.14.
- [x] Install the committed `requirements/tooling.txt` and `requirements/dev.txt` locks into that environment.
- [x] Run `python manage.py check --settings=config.settings.local`; observed no system-check issues.
- [x] Run `python manage.py test apps.accounts.tests.test_login_endpoints apps.accounts.tests.test_auth_controls --settings=config.settings.test`; observed 23 tests passing.
- [ ] Run `python manage.py test --settings=config.settings.test`; require zero failures and errors.
- [x] Record the full-suite result in `../implement/m.landicho.implement.md`: 212 tests ran with two failures outside Ticket 001.
- [x] Stop for Maricon's review before deciding whether to investigate the unrelated baseline failures or proceed with an explicit exception.

## Phase 1 — Lockout storage decision

**Deliverable:** An approved production-appropriate storage mechanism for password-attempt counters and lockouts.

- [x] Inspect local, test, and production cache configuration without printing credentials.
- [x] Confirm no approved shared cache provides cross-worker atomic operations and reliable expiry; production inherits process-local `LocMemCache`.
- [x] Prepare the separate database-persistence and migration proposal at `2026-08-05-ticket-001-password-lockout-storage-proposal.md`.
- [x] Specify the internal Django user identifier as the state relation; exclude email and LRN.
- [ ] Obtain Maricon's approval before password-lockout tests or implementation.

## Phase 2 — Password lockout with TDD

**Files:**

- Modify `backend/apps/accounts/services.py`.
- Modify `backend/apps/accounts/tests/test_login_endpoints.py`.
- Modify `backend/apps/accounts/tests/test_auth_controls.py`.

- [ ] Add failing tests for attempts one through four without lockout.
- [ ] Add a failing test for lockout on the fifth failure.
- [ ] Add failing tests for correct-password denial during lockout, lockout expiry, and success-state reset.
- [ ] Add a failing leakage test covering lockout keys and audit output.
- [ ] Run the focused tests and record the expected red result.
- [ ] Implement only the behavior required by those tests using the Phase 1-approved storage.
- [ ] Preserve the generic `401 AUTHENTICATION_FAILED` response for invalid, inactive, locked, and wrong-password paths.
- [ ] Rerun the focused tests and require zero failures and errors.
- [ ] Inspect the diff and stop for Maricon's review.

## Phase 3 — OTP resend maximum with TDD

**Files:**

- Modify `backend/apps/accounts/services.py`.
- Modify `backend/apps/accounts/tests/test_login_endpoints.py`.

- [ ] Add failing tests for three accepted resends and rejection of the next resend.
- [ ] Add failing tests proving rejection sends no email, rotates no OTP, and extends no absolute expiry.
- [ ] Add a failing test proving the latest valid OTP remains usable after resend exhaustion.
- [ ] Run the focused tests and record the expected red result.
- [ ] Enforce `AUTH_OTP_MAX_RESENDS` before code generation and email delivery.
- [ ] Use the existing safe `429` rate-limit envelope without exposing account or token data.
- [ ] Rerun `apps.accounts.tests.test_login_endpoints` and require zero failures and errors.
- [ ] Inspect the diff and stop for Maricon's review.

## Phase 4 — Safe audit events with TDD

**Files:**

- Modify `backend/apps/accounts/views.py`.
- Modify `backend/apps/accounts/audit.py` only if its allowlist requires tightening.
- Modify `backend/apps/accounts/tests/test_auth_controls.py`.
- Modify `backend/apps/accounts/tests/test_auth_error_safety.py`.

- [ ] Add failing tests for password failure/success, lockout, OTP send/failure/verification, selfie save, and session creation.
- [ ] Add failing tests excluding passwords, codes, tokens, email, LRN, request bodies, and selfie bytes from audit output.
- [ ] Run the focused tests and record the expected red result.
- [ ] Emit events only after server-confirmed outcomes and include the existing correlation ID.
- [ ] Limit metadata to approved non-secret values.
- [ ] Rerun the audit and error-safety tests and require zero failures and errors.
- [ ] Inspect captured logs and stop for Maricon's review.

## Phase 5 — Regression, smoke test, and handoff

**Deliverable:** Evidence that Ticket 001 is secure, regression-free, reviewable, and reversible.

- [ ] Run `python manage.py check --settings=config.settings.local`.
- [ ] Run the focused login, audit, error-safety, token-session, and session test modules.
- [ ] Run `python manage.py test --settings=config.settings.test`.
- [ ] Manually verify identifier → password → OTP → selfie → session using a synthetic account.
- [ ] Manually verify invalid identifier/password, lockout, expiry, OTP failures, resend exhaustion, selfie rejection, refresh replay rejection, and logout.
- [ ] Confirm browser errors reveal no account existence, role, scope, lockout state, token, or sensitive payload.
- [ ] Inspect `git diff` and `git diff --check`.
- [ ] Record exact commands, results, skips, and pre-existing failures in `../implement/m.landicho.implement.md`.
- [ ] Obtain code review and Maricon's final acceptance before merge.

## Rollback

- Keep each implementation phase in a separate reviewed commit.
- Revert only the affected phase if lockout, resend, or audit behavior regresses.
- Preserve the existing login flow while a reverted security control is corrected.
- If Phase 1 authorizes a migration, create and approve a separate migration rollback plan before execution.

## Approval gate

- [ ] Maricon Landicho reviewed and approved this dated plan.
- [x] Phase 0 runtime and focused baseline checks completed; Maricon explicitly accepted the two unrelated full-suite failures for proceeding to Phase 1.
- [ ] Each later phase requires its own review checkpoint.
