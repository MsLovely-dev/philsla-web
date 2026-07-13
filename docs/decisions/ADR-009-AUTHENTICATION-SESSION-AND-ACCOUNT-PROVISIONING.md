# ADR-009: Authentication, Session, and Account Provisioning

- Status: Accepted for the backend foundation
- Date: 2026-07-13
- Decision owners: `TBD`

## Context

PhilSA needs a backend-authoritative account model before protected APIs are implemented. Existing frontend prototype flows and older business stories mention student account creation, but the backend must not allow users to self-assign roles or bypass registration review.

Supabase Postgres is accepted only as the database provider. Supabase Auth remains a separate decision and is not adopted by this ADR.

## Decision

Use Django-managed backend accounts and server-side session authentication for the initial browser-facing API.

Authentication and session approach:

- The backend is the source of truth for identity, account status, roles, and permissions.
- Use Django's authentication foundation for backend-managed users, password hashing, and server-side sessions.
- Browser clients authenticate through backend session endpoints. Token-based API authentication for non-browser clients remains `TBD`.
- Do not trust frontend local storage, route guards, submitted roles, or client-provided account state for authorization.
- Supabase Auth is not adopted. Any future external identity provider requires a separate ADR and migration plan.

Account provisioning approach:

- Students submit a registration application through the Student Registration process.
- Submitting a registration application does not immediately create an active student account.
- The registration application must complete required identity verification, validation, and review.
- A student account is created and activated only after approval by an authorized reviewer or an approved system-controlled approval process.
- Upon approval, the backend creates the student account and automatically assigns the Student role.
- Students may not assign, modify, or elevate their own roles.
- Accounts for System Administrators, Admission Reviewers, Proctors, Examiners, Support Personnel, and other internal users are not available through public self-registration.
- During initial deployment, the development or deployment team may create initial administrative accounts only with documented authorization from the designated business or system owner.
- After operational handover, authorized System Administrators manage non-student account creation, activation, suspension, deactivation, and approved role assignment.
- Developers must not routinely create or manage production user accounts after operational handover except through an approved and auditable support process.

Auditing requirements:

- Student account creation, non-student account creation, account-status changes, password resets, role assignments, role removals, and access revocations must be recorded in the audit trail.
- Audit entries must identify the actor, target account, action, outcome, timestamp, and correlation ID without storing sensitive payloads.

## Consequences

- The next implementation step should configure session authentication endpoints and backend permission classes around this account model.
- Student registration and account activation are separate workflow stages.
- Existing prototype stories that imply direct student account creation are superseded for backend implementation by this ADR.
- Password policy, MFA, account recovery, invitation details, and email confirmation flows remain `TBD` until the related checklist item is decided.
- CORS, CSRF, cookie, trusted-origin, and deployment-specific security settings remain `TBD` until the deployment model is selected.

## Alternatives considered

- Public student self-registration that immediately creates active accounts: rejected because registration must pass verification and review before account activation.
- Supabase Auth: deferred because Supabase Auth was explicitly kept separate from the Supabase Postgres database decision.
- JWT-only browser authentication: deferred because the current browser-facing service can use backend-managed server-side sessions while non-browser token needs remain undefined.
