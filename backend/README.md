# PhilSA Backend

> **Current status:** A minimal Django and Django REST Framework project, versioned API namespace, Django Admin, safe health endpoint, standard API error envelope, Supabase Postgres `DATABASE_URL` settings, safe structured request logging, database-backed auth account profiles, cache-backed local-development login/session handling, and baseline tests are implemented. Production OTP email delivery, job processing, storage provider, deployment, and production database operations remain `TBD`. See [backend architecture](../docs/architecture/BACKEND-ARCHITECTURE.md).

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

Local and test settings use SQLite for development convenience. PostgreSQL-compatible storage is the accepted application database engine, and Supabase Postgres is the accepted database provider.

Production settings read the database connection from `DATABASE_URL`. Do not commit real Supabase project URLs, credentials, passwords, service-role keys, connection strings, or pooled connection secrets.

For persistence-backed integration development, use PostgreSQL-compatible storage through `DATABASE_URL`. Keep local, staging, and production databases separate, and use synthetic data outside production. Supabase backup/restore, connection pooling values, migration rollout rules, rollback expectations, seed data rules, and recovery objectives are documented in the [database design notes](../docs/architecture/DATABASE-DESIGN.md).

Authentication configuration follows the accepted three-step portal flow in [ADR-011](../docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md). DRF is wired to a Bearer authentication hook for cache-backed local-development tokens. Permission helpers provide deny-by-default role checks and object-level authorization hooks for future business endpoints.

For local manual login, create the database tables and a real Django Admin superuser:

```powershell
python manage.py migrate --settings=config.settings.local
python manage.py createsuperuser --settings=config.settings.local
```

Use an email address when creating the superuser. Newly created superusers receive a `SYSTEM_ADMIN` account profile automatically and can log in through the backend auth flow by email and password.

For non-superuser accounts, open `http://localhost:8000/admin/`, create a Django user, then add an `Account profile` with the required role and optional Student LRN.

Until email delivery is implemented, local manual login needs the OTP helper enabled in the backend environment:

```env
AUTH_LOCAL_EXPOSE_OTP="true"
```

`AUTH_LOCAL_EXPOSE_OTP=true` returns the generated OTP to the frontend so the current prototype login page can complete the backend flow. Keep this disabled outside local development. OTP email delivery, lockout persistence, and production-grade token storage remain future work.

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

With a migrated backend database, a real Django user/account profile, and local OTP exposure enabled, the frontend can complete manual login against the backend auth endpoints. Full production login remains pending OTP email delivery, lockout persistence, and production-grade token/session storage.

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
