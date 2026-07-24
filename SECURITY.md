# Security Policy

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, personal information, exam content, or evidence. Report vulnerabilities through the project's private security contact or private repository security channel. The contact address and response targets are `TBD`.

Include the affected area, reproduction steps, impact, and a safe proof of concept. Do not access, alter, or retain data beyond what is necessary to demonstrate the issue.

## Repository security rules

- Never commit secrets. Store local values in ignored environment files and provide placeholders only in `.env.example`.
- Never write credentials, tokens, government identifiers, student records, assessment answers, recordings, or other sensitive information to logs.
- Treat browser code and frontend validation as untrusted. The backend must authenticate, authorize, validate, and enforce all state transitions.
- Apply least privilege to users, services, integrations, databases, and object storage.
- Protect sensitive data in transit and at rest; exact controls and retention periods are `TBD`.
- Audit security-sensitive administrative actions without recording secret or sensitive payloads.
- Review dependencies and generated artifacts before release. Supported versions and remediation service levels are `TBD`.

See [Security architecture](docs/architecture/SECURITY-ARCHITECTURE.md) for the current threat boundaries and pending decisions.
