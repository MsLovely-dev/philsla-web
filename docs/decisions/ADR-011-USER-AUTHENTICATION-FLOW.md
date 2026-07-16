# ADR-011: User Authentication Flow

- Status: Accepted for the backend foundation
- Date: 2026-07-13
- Decision owners: `TBD`

## Context

User story `US-SR-002` defines a shared login flow for registered PhilSLA users. It supersedes the earlier browser session assumption in [ADR-009](ADR-009-AUTHENTICATION-SESSION-AND-ACCOUNT-PROVISIONING.md) for portal authentication.

The flow must support Student login by LRN or email, staff/admin login by email, mandatory password verification, mandatory email OTP verification, security-tier session policies, anti-enumeration controls, and audit logging at each step.

## Decision

Use a three-step backend-authenticated login flow for all portal users:

1. Identifier entry.
2. Password verification.
3. Mandatory six-digit email OTP verification.

No full session is issued until all three steps succeed server-side.

Identifier resolution:

- A 12-digit numeric identifier is looked up only against verified Students-by-LRN.
- An email-formatted identifier is looked up against Students-by-email first, then staff/admin Users-by-email.
- Email uniqueness must be enforced across students and staff/admin users.
- Inputs that match neither LRN nor email format should be rejected client-side where possible, but the backend must still validate format.
- The user must never be asked to select a role during login.
- Role, account status, security tier, and object scope are resolved server-side and are not exposed to the client during pending authentication.

Pending authentication:

- Step 1 success issues a short-lived, single-purpose pending-auth token for the password step.
- Step 2 password success invalidates the Step 1 token, issues an OTP-scoped pending-auth token, generates an OTP, and sends it by email.
- Pending-auth tokens must expire after 5-10 minutes of inactivity and must not be exposed in URL query strings.
- Pending-auth tokens may be carried by an approved header or HttpOnly cookie.

Password policy:

- Store passwords only as non-reversible hashes using Argon2 or bcrypt.
- Passwords must be at least 8 characters and include uppercase, lowercase, number, and special-character classes.
- Five failed password attempts within 15 minutes locks the account for 15 minutes.
- Staff/admin first login requires password activation through a secure 24-48 hour time-limited activation link.
- Default or temporary passwords must not remain valid beyond first use.

MFA approach:

- Mandatory email OTP is the baseline second factor for all portal roles.
- SMS OTP, authenticator apps, passkeys, hardware keys, and risk-based step-up authentication are not part of the baseline implementation.
- Any future additional MFA factor requires a separate security decision, migration path, recovery process, and user-support operating model.

Email OTP policy:

- OTPs are six-digit numeric codes generated with a cryptographically secure random generator.
- OTPs expire after 5 minutes, are single-use, and are stored only as hashes.
- A maximum of five OTP verification attempts is allowed per pending-auth session.
- Resend invalidates the prior OTP, enforces a 30-60 second cooldown, and allows at most three resends per pending-auth session.
- A maximum of five pending-auth session restarts per identifier per hour is required to limit email-bombing and brute-force abuse.
- OTP emails must include the six-digit code, expiry notice, and support warning. They must not include clickable login links.

Password and account recovery:

- Password recovery uses the account's verified email address only.
- A recovery request must not reveal whether the identifier exists, whether the account is inactive, or whether the account belongs to a student or staff/admin user.
- Recovery links must be single-use, stored server-side only as hashes, and expire after 30 minutes.
- Recovery links must not create a session. After password reset, the user must complete the normal three-step login flow.
- A password reset invalidates all active access and refresh tokens for the account.
- Recovery is denied with a generic message for suspended, deactivated, unverified, role-revoked, or scope-revoked accounts.
- Staff/admin account recovery may also be initiated by an authorized `SYSTEM_ADMIN`, but the reset must still send a user-controlled activation/recovery link to the account email. System administrators must not set a reusable password for another user.
- Support-assisted recovery must be auditable and must not disclose or modify credentials outside the approved recovery flow.

Invitation and activation:

- Student accounts are not invited by staff/admin users. Students may begin public self-registration, and successful registration submission activates the Student account immediately.
- Staff/admin accounts are provisioned only by an authorized `SYSTEM_ADMIN`.
- Staff/admin provisioning sends a secure activation link to the provisioned email address.
- Activation links must be single-use, stored server-side only as hashes, and expire after 24-48 hours.
- Activation requires the user to set their own password before the normal login flow is available.
- Expired or revoked activation links require a new audited resend by an authorized `SYSTEM_ADMIN`.
- Invitation, activation, resend, cancellation, password reset, and recovery completion events must be written to the audit trail.

Full session:

- After OTP success, issue a short-lived access token and rotating refresh token.
- Access token lifetime is approximately 15 minutes.
- Refresh token is stored in an HttpOnly, Secure, SameSite=Strict cookie with approximately seven-day expiry unless a shorter security-tier policy applies.
- Refresh tokens rotate on every use and the previous refresh token is invalidated.
- Login succeeds only if the account, role assignment, and applicable institution/testing-center/region scope are active.
- Role deactivation, reassignment, account suspension, or scope revocation must invalidate active sessions and refresh tokens.

Security tiers:

| Tier | Roles | Idle timeout | Absolute session cap | Additional controls |
| --- | --- | --- | --- | --- |
| Tier 1 | `STUDENT` | 20 minutes | 12 hours | Student-owned access only. |
| Tier 2 | `ADMISSIONS_REVIEWER`, `PROCTOR`, `UNIVERSITY_ADMIN`, `TESTING_CENTER_ADMIN` | 10 minutes | 8 hours | Scope enforcement on every API call. |
| Tier 3 | `PROCTOR_ADMIN`, `EXAM_ADMINISTRATOR`, `SYSTEM_ADMIN` | 10 minutes | 8 hours | Optional IP allowlist or VPN range check when enabled. |
| Tier 4 | `CHED_ADMIN`, `DEPED_ADMIN`, `TESDA_ADMIN`, `EXECUTIVE` | 10 minutes | 8 hours | Read/reporting API access only unless a later ADR expands authority. |

Error handling:

- Login must not reveal whether an identifier exists, whether the account is inactive, or whether a role/scope exists.
- Not found, inactive, suspended, unverified, role-revoked, and wrong-secret paths must use generic messages and timing-safe comparisons where applicable.
- IP allowlist denials must use a generic denial message and be logged as security events.

Audit requirements:

- Record identifier-submitted, password-failed, password-passed, otp-sent, otp-failed, otp-verified, session-created, lockout, resend, session-revoked, and denial events.
- Audit entries must include timestamp, masked identifier, outcome, IP, user agent, device details where available, correlation ID, and server-resolved role/scope for staff/admin logins.
- Sensitive values such as passwords, OTP codes, tokens, full identifiers, and email payloads must never be logged.

Out of scope:

- Proctor Admin testing-center PC or Tauri-app enrollment is not part of this human login flow. It requires a separate machine-identity mechanism such as enrollment token plus device certificate or mTLS.
- Non-email MFA factors and machine-identity recovery are outside this baseline.

## Consequences

- [ADR-009](ADR-009-AUTHENTICATION-SESSION-AND-ACCOUNT-PROVISIONING.md) remains the account-provisioning decision, but its earlier browser server-side session assumption is superseded by this ADR.
- Authentication implementation must include pending-auth token storage, OTP hashing, email delivery integration, refresh-token rotation, session revocation, account lockout, rate limits, audit events, and security-tier enforcement.
- Account implementation must include activation, password reset, recovery-link hashing, recovery rate limits, and full session revocation after password reset.
- API clients must not receive role or permission details before OTP verification succeeds.
- CORS, CSRF, cookie domain, trusted origins, TLS termination, WAF/API gateway rate limits, email provider, and deployment-specific security settings remain `TBD`.

## Alternatives considered

- Single-step email/password login: rejected because US-SR-002 requires mandatory email OTP.
- Role-selected login: rejected because identifier resolution is format-driven and role selection would increase enumeration and routing risk.
- Server-side browser sessions only: superseded because US-SR-002 requires access and rotating refresh tokens after OTP verification.
- System-admin-assigned temporary passwords: rejected because users must set their own password through a single-use activation or recovery link.
