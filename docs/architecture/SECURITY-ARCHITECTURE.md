# Security Architecture

## Trust boundaries

The browser and all client-provided values are untrusted. Frontend validation is for usability only. The future backend is the authoritative enforcement point, while external registries, messaging providers, storage, and proctoring services are separate trust boundaries with contracts `TBD`.

Supabase Postgres is accepted only as the database provider. Supabase Auth and Supabase Storage remain separate trust-boundary decisions and must not be enabled or treated as authoritative until accepted by their own ADRs.

Documents, recordings, exports, and evidence must use private S3-compatible object storage after [ADR-008](../decisions/ADR-008-FILE-OBJECT-STORAGE-APPROACH.md). The backend must authorize every object access and must not expose permanent public URLs for sensitive files.

Initial portal authentication uses Django-managed backend accounts and the three-step LRN/email, password, and email OTP flow accepted in [ADR-011](../decisions/ADR-011-USER-AUTHENTICATION-FLOW.md). Supabase Auth is not adopted.

## Backend roles and permissions

Backend role and permission rules are accepted in [ADR-010](../decisions/ADR-010-BACKEND-ROLES-AND-PERMISSIONS.md). The portal authentication role catalog is `STUDENT`, `ADMISSIONS_REVIEWER`, `PROCTOR`, `PROCTOR_ADMIN`, `UNIVERSITY_ADMIN`, `TESTING_CENTER_ADMIN`, `EXAM_ADMINISTRATOR`, `SYSTEM_ADMIN`, `CHED_ADMIN`, `DEPED_ADMIN`, `TESDA_ADMIN`, and `EXECUTIVE`.

Frontend prototype-only roles such as `ACADEMIC_REVIEWER`, `GOVERNMENT`, `ITEM_WRITER`, `GRADER`, and `TECH_SUPPORT` are not portal login roles for `US-SR-002` until separately approved. `GOVERNMENT` is replaced by agency-specific oversight roles for authentication: `CHED_ADMIN`, `DEPED_ADMIN`, and `TESDA_ADMIN`.

The backend must enforce deny-by-default role-based access control plus object-level authorization. Role assignment is backend-managed and auditable. API permission checks must derive identity, account status, roles, and object scopes from server-side state, never from client-submitted roles, frontend route guards, or browser storage.

## Frontend authentication status

The current frontend authentication state is prototype-only. Local storage sessions, mock users, route guards, role labels, and dashboard/module visibility are usable for navigation demos and UI development only. They must not be treated as evidence of authentication, authorization, account activation, role assignment, scope assignment, exam eligibility, or workflow state.

Until the backend authentication endpoints from ADR-011 are implemented and integrated, any protected backend API must continue to require server-side authentication and authorization. The frontend may hide or show UI for usability, but every protected operation must be independently enforced by the backend.

## Required controls

- Authenticate users and enforce role- and object-level authorization on every protected operation.
- Validate and normalize all backend inputs; enforce allowed workflow transitions server-side.
- Protect pending-auth tokens, access tokens, and refresh tokens against theft, replay, fixation, and inappropriate lifetime. Mandatory email OTP and security-tier session policy are defined in ADR-011.
- Encrypt sensitive traffic and stored data using approved key management. Exact standards are `TBD`.
- Never commit secrets. Rotate exposed credentials and use environment/secret management outside source control.
- Sensitive information must not be written to logs. This includes credentials, tokens, student records, government identifiers, exam answers, scores before release, and proctoring evidence.
- Record security-relevant actions in tamper-resistant audit history with actor, action, target, outcome, correlation ID, and server-generated UTC timestamp, excluding sensitive payloads.
- Apply rate limits, abuse controls, secure headers, dependency review, and upload validation appropriate to each endpoint.
- Restrict assessment content and results by least privilege and release state.

## High-risk workflows

Identity verification, document upload, exam delivery, scoring changes, results release, administrative role assignment, and proctoring evidence require explicit threat models before production. Consent, accessibility, privacy, retention, appeal, and chain-of-custody requirements are `TBD`.

## Frontend key exposure

The current Vite configuration substitutes `GEMINI_API_KEY` into browser code. Any value embedded in a frontend bundle must be treated as public. Production AI or other privileged integrations should be mediated by an authorized backend or use a deliberately public, restricted credential design; the chosen approach is `TBD`.

See the repository [security policy](../../SECURITY.md).
