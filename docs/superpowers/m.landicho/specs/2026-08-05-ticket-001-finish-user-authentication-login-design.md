# Ticket 001 — Finish User Authentication Login Design

**Date:** 2026-08-05

**Owner:** Maricon Landicho (M.Landicho)

**Status:** Approved design for Thursday execution; no Ticket 001 implementation remains from Wednesday

## Goal

Finish the bounded security gaps in the existing PhilSLA four-step login flow while preserving its implemented API contracts and avoiding unrelated refactoring.

## Current state

The primary identifier → password → email OTP → selfie → session flow already exists across the Django backend and React frontend. Backend endpoints also exist for OTP resend, session lookup, refresh rotation, logout, and token revocation. Current tests cover the main success path and several negative cases.

The remaining bounded gaps selected for Ticket 001 are:

- The configured five-attempt password lockout is not enforced.
- The configured three-resend OTP maximum is not enforced.
- Authentication audit events do not consistently cover every required security boundary.

## Selected design

Keep DRF views thin and place login security behavior in `backend/apps/accounts/services.py`. Add failing behavior tests before implementation, retain the current endpoint paths and safe error envelope, and expose no new client-visible account state.

Password-attempt state must use an approved shared atomic cache or durable persistence. Django's default process-local cache is not acceptable as a production lockout control because multiple workers could maintain different counters. The storage choice is therefore a mandatory review gate before password-lockout implementation.

Phase 1 confirmed that local, test, and production currently use or inherit Django's process-local `LocMemCache`, with no approved shared-cache provider or dependency. Maricon approved the durable design in `../plans/2026-08-05-ticket-001-password-lockout-storage-proposal.md` for Thursday execution. The approved plan will add database-backed state related only by internal Django user ID; no model or migration remains in the Wednesday worktree.

OTP resend enforcement will check `AUTH_OTP_MAX_RESENDS` before generating or sending another code. Rejection must preserve the latest valid OTP and must not extend the pending login's absolute expiry.

Audit changes will emit events only at server-confirmed boundaries. General application logs may contain event name, outcome, correlation ID, and an approved internal reference, but must not contain passwords, OTP codes, tokens, complete identifiers, request bodies, selfie bytes, raw IP addresses, or user-agent strings.

## Expected files

Existing application files only unless a separate storage decision authorizes more:

- `backend/apps/accounts/services.py`
- `backend/apps/accounts/views.py`
- `backend/apps/accounts/audit.py`
- `backend/apps/accounts/tests/test_login_endpoints.py`
- `backend/apps/accounts/tests/test_auth_controls.py`
- `backend/apps/accounts/tests/test_auth_error_safety.py`

New project-process documentation remains under `docs/superpowers/m.landicho/`.

## Error and security behavior

- Invalid, inactive, locked, and wrong-password paths retain a generic authentication failure.
- Lockout state is keyed by an internal account reference or one-way digest, never raw email or LRN.
- OTP resend exhaustion uses the existing safe rate-limit envelope.
- Pending-auth and session tokens never appear in URLs or logs.
- Refresh tokens remain HttpOnly, Secure, and SameSite=Strict outside local development.
- Tests and manual verification use synthetic accounts and images only.

## Verification design

- Establish a clean baseline under Python 3.13 before edits.
- Add red tests for password-attempt count, lockout duration, expiry, success reset, and leakage prevention.
- Add red tests for three accepted OTP resends, fourth-resend rejection, email-send suppression, absolute-expiry preservation, and latest-code usability.
- Add red tests for password, lockout, OTP, selfie, and session audit boundaries plus sensitive-data exclusion.
- Run focused account tests after each phase, then the complete backend suite.
- Manually smoke-test the four-step success path and security failure paths.

## Deferred work

- Argon2/bcrypt dependency and password-hasher migration.
- Durable audit-event persistence.
- Tier-specific idle and absolute session enforcement.
- Staff activation and invitation redesign.
- Production private-object-storage integration for selfie evidence.
- README alignment and frontend Gemini-key remediation.
- Identifier-step anti-enumeration fix: `start_identifier_login` currently returns a distinguishable response (202 pendingAuthToken vs. immediate 401) depending on whether the identifier resolves to a real account, revealing account existence before the password step. Raised in PR #69 review (bienthehumanoid). Pre-existing behavior, not introduced or fixed by Ticket 001; needs its own design pass on how the password step should behave against a synthetic/no-op account.
- Safe rate/volume audit logging for failed identifier lookups (non-registered-account attempts), to give visibility into spam or credential-stuffing/DDoS-style patterns against the identifier endpoint. Raised in PR #69 review (bienthehumanoid, approving comment). Explicitly deferred by the reviewer at merge time — no identifiers or personal data should be logged, only aggregate/rate signals per the existing safe-audit constraints.

## Acceptance criteria

- The existing four-step login journey remains functional.
- Five password failures within 15 minutes produce a 15-minute server-side lockout using production-appropriate storage.
- A successful password verification clears applicable failure state.
- OTP resends cannot exceed the configured maximum or extend absolute expiry.
- Required safe audit events are covered without sensitive-data leakage.
- Focused and complete backend checks pass, with exact results recorded.
- Manual security smoke testing passes before merge.
- No implementation begins without Maricon Landicho's approval of the dated plan.
