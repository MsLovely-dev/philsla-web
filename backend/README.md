# PhilSA Backend

> **Current status:** A minimal Django and Django REST Framework project, versioned API namespace, Django Admin, safe health endpoint, standard API error envelope, Supabase Postgres `DATABASE_URL` settings, safe structured request logging, database-backed auth account profiles, JWT-backed login/session handling, Django email-backend OTP delivery, and baseline tests are implemented. Job processing, storage provider, deployment, and production database operations remain `TBD`. See [backend architecture](../docs/architecture/BACKEND-ARCHITECTURE.md).

## Local setup

Python 3.13 is the current supported development runtime. Use a virtual environment and install the exactly pinned direct dependencies:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements/tooling.txt
python -m pip install -r requirements/dev.txt
python manage.py migrate --settings=config.settings.local
python manage.py runserver --settings=config.settings.local
```

To load the repeatable synthetic Exam Review queue for local development, run after migrations:

```powershell
python manage.py seed_exam_reviews --settings=config.settings.local
```

The command creates or updates seven clearly labeled demo candidates and review records, including 20 synthetic review items per exam across Math, English, Filipino, and Science. The item data includes synthetic questions, choices, student responses, response duration, expected answers, rubrics, automated score recommendations, and official points for local Exam Review testing. It does not seed uploaded answer-sheet files and is not required for production startup.

Local settings allow the prototype frontend session to read only these `DEMO-2026` summaries without a backend bearer token. This development-only access is disabled by default in base and production settings; authenticated role checks continue to protect all non-demo Exam Review records.

Local and test settings use SQLite for development convenience. PostgreSQL-compatible storage is the accepted application database engine, and Supabase Postgres is the accepted database provider.

Production settings read the database connection from `DATABASE_URL`. Do not commit real Supabase project URLs, credentials, passwords, service-role keys, connection strings, or pooled connection secrets.

For persistence-backed integration development, use PostgreSQL-compatible storage through `DATABASE_URL`. Keep local, staging, and production databases separate, and use synthetic data outside production. Supabase backup/restore, connection pooling values, migration rollout rules, rollback expectations, seed data rules, and recovery objectives are documented in the [database design notes](../docs/architecture/DATABASE-DESIGN.md).

Authentication configuration follows the accepted three-step portal flow in [ADR-011](../docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md). DRF is wired to a Bearer authentication hook for JWT access tokens. Refresh JWTs are stored in an HttpOnly `refreshToken` cookie and backed by the refresh-session table for rotation and replay detection. Permission helpers provide deny-by-default role checks and object-level authorization hooks for future business endpoints.

For local manual login, create the database tables and a real Django Admin superuser:

```powershell
python manage.py migrate --settings=config.settings.local
python manage.py createsuperuser --settings=config.settings.local
```

Use an email address when creating the superuser. Newly created superusers receive a `SYSTEM_ADMIN` account profile automatically and can log in through the backend auth flow by email and password.

For non-superuser accounts, open `http://localhost:8000/admin/`, create a Django user, then add an `Account profile` with the required role and optional Student LRN.

Login and student registration OTP emails are sent through Django's configured email backend. Local console-only OTP emails use:

```env
AUTH_EMAIL_PROVIDER="console"
DEFAULT_FROM_EMAIL="PhilSA Admissions <no-reply@example.test>"
```

To send local development registration OTP emails to real inboxes through Brevo SMTP, use:

```env
AUTH_EMAIL_PROVIDER="brevo_smtp"
BREVO_EMAIL_SENDER="PhilSA Admissions <no-reply@your-verified-domain.example>"
BREVO_SMTP_HOST="smtp-relay.brevo.com"
BREVO_SMTP_PORT="587"
BREVO_SMTP_USERNAME="your-brevo-smtp-login"
BREVO_SMTP_PASSWORD="your-brevo-smtp-key"
BREVO_SMTP_USE_TLS="true"
DEFAULT_FROM_EMAIL="PhilSA Admissions <no-reply@your-verified-domain.example>"
```

The Brevo sender should be verified in Brevo before relying on delivery. Keep SMTP login values and keys in local environment files only.

Azure Communication Services Email is the production email provider because the platform is expected to deploy on Azure. Switch the same OTP implementation to Azure Communication Services SMTP with environment settings like:

```env
AUTH_EMAIL_PROVIDER="azure_communication_services_smtp"
AZURE_COMMUNICATION_EMAIL_ENABLED="false"
AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING=""
AZURE_COMMUNICATION_EMAIL_ENDPOINT=""
AZURE_COMMUNICATION_EMAIL_SENDER="PhilSA Admissions <no-reply@your-verified-domain.example>"
AZURE_COMMUNICATION_EMAIL_SMTP_HOST="smtp.azurecomm.net"
AZURE_COMMUNICATION_EMAIL_SMTP_PORT="587"
AZURE_COMMUNICATION_EMAIL_SMTP_USERNAME=""
AZURE_COMMUNICATION_EMAIL_SMTP_PASSWORD=""
DEFAULT_FROM_EMAIL="PhilSA Admissions <no-reply@your-verified-domain.example>"
```

Keep `AUTH_EMAIL_PROVIDER="console"` for local console-only development, or use `AUTH_EMAIL_PROVIDER="brevo_smtp"` when real dev email delivery is needed. Do not commit Azure connection strings, access keys, Brevo SMTP keys, SMTP passwords, sender secrets, or verified-domain credentials.

Security settings use strict defaults for cookies and headers. Local development allows only localhost origins. Production must provide `DJANGO_ALLOWED_HOSTS`; trusted CSRF/CORS origins remain environment-specific until deployment domains are selected.

## Checks and smoke test

```powershell
python manage.py check --settings=config.settings.local
python manage.py test --settings=config.settings.test
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/
```

The smoke test returns `{"status":"ok"}`.

## Frontend connection

The frontend dev server runs on port `3000`. Local backend settings allow `http://localhost:3000` and `http://127.0.0.1:3000` for CSRF/CORS, while retaining `5173` for compatibility with default Vite setups.

To point the frontend at this backend, set the frontend `.env.local` values:

```env
VITE_AUTH_SERVICE_MODE="backend"
VITE_BACKEND_API_BASE_URL="http://localhost:8000"
```

With a migrated backend database, a real Django user/account profile, backend service mode, and a configured email backend, the frontend can complete manual login against the backend auth endpoints. Full production login still needs lockout persistence and production-grade token/session storage hardening.

## Dependency updates

Edit the appropriate `.in` manifest, then regenerate and review its committed lock file from Python 3.13:

```powershell
python -m piptools compile --cache-dir=.venv/pip-tools-cache --strip-extras --output-file=requirements/base.txt requirements/base.in
python -m piptools compile --cache-dir=.venv/pip-tools-cache --strip-extras --output-file=requirements/dev.txt requirements/dev.in
python -m piptools compile --cache-dir=.venv/pip-tools-cache --strip-extras --output-file=requirements/tooling.txt requirements/tooling.in
```

Install from `.txt` lock files only. See [ADR-004](../docs/decisions/ADR-004-BACKEND-DEPENDENCY-MANAGEMENT.md) for the accepted strategy.

## Structure

```text
backend/
|-- config/             # URL and environment-specific settings
|-- apps/core/          # Health and cross-cutting API baseline
|-- apps/<capability>/  # Reserved business capability boundaries
|-- requirements/
|-- manage.py
`-- README.md
```
