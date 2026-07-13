# PhilSA Backend

> **Current status:** A minimal Django and Django REST Framework project, versioned API namespace, safe health endpoint, standard API error envelope, Supabase Postgres `DATABASE_URL` settings, safe structured request logging, baseline auth configuration, and baseline tests are implemented. Login endpoints, token issuance/validation, OTP delivery, job processing, storage provider, deployment, and database operations remain `TBD`. See [backend architecture](../docs/architecture/BACKEND-ARCHITECTURE.md).

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

Local and test settings use SQLite only for the current no-persistence foundation. PostgreSQL-compatible storage is the accepted application database engine, and Supabase Postgres is the accepted database provider.

Production settings read the database connection from `DATABASE_URL`. Do not commit real Supabase project URLs, credentials, passwords, service-role keys, connection strings, or pooled connection secrets.

For persistence-backed development, use PostgreSQL-compatible storage through `DATABASE_URL`; SQLite is only for the current no-persistence foundation. Keep local, staging, and production databases separate, and use synthetic data outside production. Supabase backup/restore, connection pooling values, migration rollout rules, rollback expectations, seed data rules, and recovery objectives are documented in the [database design notes](../docs/architecture/DATABASE-DESIGN.md).

Authentication configuration follows the accepted three-step portal flow in [ADR-011](../docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md). DRF is wired to a Bearer authentication hook that rejects tokens until login, refresh, and revocation workflows are implemented.

## Checks and smoke test

```powershell
python manage.py check --settings=config.settings.local
python manage.py test --settings=config.settings.test
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/
```

The smoke test returns `{"status":"ok"}`.

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
