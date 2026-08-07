# Login Failed-Attempt Indicator — Design

**Date:** 2026-08-07

**Owner:** Maricon Landicho (M.Landicho)

**Status:** Approved for implementation

## Problem

The backend correctly hides account state during login per ADR-011's anti-enumeration requirement (BR-10, AC-02, AC-05): non-existent identifiers, deactivated accounts, wrong passwords, and an active password lockout (Ticket 001 Phase 2, BR-03) all return the identical generic `401` message. Verified live: this is working exactly as designed.

The gap is on the frontend: `LoginPage.tsx` has zero awareness of repeated failures. A user who is genuinely locked out sees the exact same "Incorrect email/LRN or password" message on their 20th attempt as on their 1st, with no hint that continuing to retry is pointless for the next 15 minutes.

## Constraint

Any fix must not reintroduce what ADR-011 explicitly prohibits: the response must never let the frontend distinguish *why* an attempt failed (wrong password vs. locked vs. deactivated vs. non-existent account). This is a hard constraint, not a preference.

## Design

Pure client-side addition to `LoginPage.tsx`. No backend changes, no new API calls, no API contract changes — the frontend already receives everything it needs (a generic `401` on every failure type), so nothing server-side needs to change.

**State:** two pieces of local component state:
- `failedAttemptCount: number`
- `lastAttemptedIdentifier: string`

**Behavior:**
- On every password-step `401` response, compare the submitted identifier to `lastAttemptedIdentifier`.
  - Same identifier → increment `failedAttemptCount`.
  - Different identifier → reset `failedAttemptCount` to 1, update `lastAttemptedIdentifier`.
- When `failedAttemptCount >= 5`, render an additional soft banner alongside (not instead of) the existing generic error message. **5, not an earlier warning number** — matches the backend's real `AUTH_PASSWORD_MAX_ATTEMPTS` (Ticket 001 Phase 2), so the banner only appears exactly when the account is actually locked, never before. An earlier threshold (e.g. 3) would show "please wait" while the user still has legitimate attempts left — misleading if their next password happens to be correct.
- Reset `failedAttemptCount` to 0 on: successful login, the identifier field being edited, or a page reload. No persistence (e.g. no `localStorage`) — this is intentionally ephemeral, best-effort UX, not a security control.

**Copy:** "Multiple sign-in attempts have failed. For your security, please wait a few minutes before trying again." No attempt number shown. No "locked" or "account" language. No claim about whether the account exists.

This message is deliberately identical whether the identifier is real, fake, locked, or already known-invalid — because the frontend genuinely doesn't know which, and must not act like it does.

## What this does not do

- Does not know or display the real 15-minute lockout timer (server-authoritative, never exposed to the client).
- Does not distinguish lockout from repeated wrong-password entry from a non-existent account being retried.
- Does not persist across page reloads or devices — it's a soft, local nudge, not enforcement. The real enforcement is entirely server-side (Ticket 001 Phase 2), already shipped.

## Error handling

Purely additive UI. If this logic fails for any reason, the existing generic error still renders correctly beneath it — this code path never blocks or replaces existing error handling.

## Testing

Component-level tests only (no backend/integration test needed, since nothing server-side changes):
- Banner does not show on attempts 1–4.
- Banner shows starting at attempt 5.
- Counter does not persist across a fresh component mount (no in-app path exists from the password step back to the identifier step to test an in-session reset directly — only the activation/passwordChange steps have a "Change Account" button).
- Counter resets when the identifier field changes (defensive; not currently reachable from the password step, but correct if that path is ever added).
