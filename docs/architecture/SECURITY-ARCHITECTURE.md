# Security Architecture

## Trust boundaries

The browser and all client-provided values are untrusted. Frontend validation is for usability only. The future backend is the authoritative enforcement point, while external registries, messaging providers, storage, and proctoring services are separate trust boundaries with contracts `TBD`.

Supabase Postgres is accepted only as the database provider. Supabase Auth and Supabase Storage remain separate trust-boundary decisions and must not be enabled or treated as authoritative until accepted by their own ADRs.

Documents, recordings, exports, and evidence must use private S3-compatible object storage after [ADR-008](../decisions/ADR-008-FILE-OBJECT-STORAGE-APPROACH.md). The backend must authorize every object access and must not expose permanent public URLs for sensitive files.

Initial browser authentication uses Django-managed backend accounts and server-side sessions after [ADR-009](../decisions/ADR-009-AUTHENTICATION-SESSION-AND-ACCOUNT-PROVISIONING.md). Supabase Auth is not adopted. Token-based authentication for non-browser clients remains `TBD`.

## Required controls

- Authenticate users and enforce role- and object-level authorization on every protected operation.
- Validate and normalize all backend inputs; enforce allowed workflow transitions server-side.
- Protect sessions/tokens against theft, replay, fixation, and inappropriate lifetime. MFA policy and non-browser token authentication are `TBD`.
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
