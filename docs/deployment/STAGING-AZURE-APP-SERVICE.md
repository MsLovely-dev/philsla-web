# Staging Azure App Service Deployment

## Scope

Staging uses two separate Azure App Services:

- `frontend/`: React, TypeScript, and Vite application served from `frontend/dist`.
- `backend/`: Django and Django REST Framework API served by Gunicorn.

This environment is intended for integration testing, smoke testing, and demonstrations with synthetic data only. Do not use production secrets, production database contents, or real applicant information in staging.

GitHub Actions deployment workflows are `TBD` until the Azure App Service names and deployment credential approach are selected.

For exact local ZIP artifact build commands and package contents, see [artifact build runbook](ARTIFACT-BUILD-RUNBOOK.md).

## Frontend App Service

Use a Node.js App Service. Do not run the Vite development server in Azure.

Deploy the `frontend/` directory contents as the frontend App Service package root.

Build from `frontend/`:

```bash
npm ci
npm run build
```

Startup command:

```bash
npm start
```

The `npm start` script runs `frontend/server.cjs`, which serves static files from `frontend/dist` and falls back to `index.html` for unknown routes so React Router direct navigation works.

Health check path:

```text
/health
```

Required staging build-time environment variables:

```env
VITE_AUTH_SERVICE_MODE="backend"
VITE_BACKEND_API_BASE_URL="https://<backend-staging-app>.azurewebsites.net"
```

Any `VITE_*` value and `GEMINI_API_KEY` value used by Vite can be embedded into the browser bundle. Do not put server secrets in frontend App Service settings.

## Frontend ZIP Deploy Package

For the initial frontend staging smoke test, package only the `frontend/` directory contents. The ZIP root should contain `package.json`, `package-lock.json`, `server.cjs`, `dist/`, `src/`, and the frontend config files. Because this package root is `frontend/`, the App Service startup command is:

```bash
npm start
```

Set the staging backend URL in the local shell before building the package:

```powershell
$env:VITE_AUTH_SERVICE_MODE="backend"
$env:VITE_BACKEND_API_BASE_URL="https://<backend-staging-app>.azurewebsites.net"
```

Then run from the repository root:

```powershell
.\scripts\package-frontend-zip.ps1
```

The script runs `npm run build` in `frontend/`, then writes:

```text
artifacts/philsla-frontend-staging.zip
```

The package excludes local-only folders and files such as `node_modules/`, local `.env` files, reports, and logs. Deploy `artifacts/philsla-frontend-staging.zip` to the frontend App Service with ZIP Deploy.

## Backend App Service

Use a Python App Service with Python 3.13.

If the deployment package root is the repository root, use paths exactly as shown below. If the deployment package root is `backend/`, remove the `backend/` path prefix from the install command and omit `--chdir backend` from the startup command.

For repository-root ZIP deploys, keep `SCM_DO_BUILD_DURING_DEPLOYMENT=true` in the backend App Service settings. Azure Oryx reads the root `requirements.txt`, which points to `backend/requirements/base.txt`.

Install dependencies from `backend/`:

```bash
python -m pip install -r backend/requirements/base.txt
```

Collect static files during deployment:

```bash
python manage.py collectstatic --noinput --settings=config.settings.staging
```

Startup command:

```bash
gunicorn --chdir backend config.wsgi:application --bind=0.0.0.0:$PORT
```

App setting:

```env
DJANGO_SETTINGS_MODULE="config.settings.staging"
```

Health check path:

```text
/api/v1/health/
```

## Backend ZIP Deploy Package

For the initial staging smoke test, package the repository root without adding an extra parent directory. The ZIP root should contain `backend/`, `frontend/`, `docs/`, `requirements.txt`, and the root files.

From the repository root, set the same staging environment variables needed by `config.settings.staging`, then run:

```powershell
.\scripts\package-backend-zip.ps1
```

The script runs:

```powershell
cd backend
python manage.py collectstatic --noinput --settings=config.settings.staging
cd ..
```

Then it writes:

```text
artifacts/philsla-backend-staging.zip
```

The package excludes local-only folders and files such as `.git/`, virtual environments, `node_modules/`, local `.env` files, local media, reports, and build artifacts.

Deploy `artifacts/philsla-backend-staging.zip` to the backend App Service with ZIP Deploy.

## Backend App Settings

Set these in the staging backend App Service. Values below are placeholders only.

```env
DJANGO_SETTINGS_MODULE="config.settings.staging"
DJANGO_SECRET_KEY="<staging-secret-key>"
DJANGO_ALLOWED_HOSTS="<backend-staging-app>.azurewebsites.net"
DJANGO_CSRF_TRUSTED_ORIGINS="https://<frontend-staging-app>.azurewebsites.net"
DJANGO_CORS_ALLOWED_ORIGINS="https://<frontend-staging-app>.azurewebsites.net"
DJANGO_SECURE_SSL_REDIRECT="true"
DJANGO_SECURE_HSTS_SECONDS="0"
DATABASE_URL="<staging-supabase-postgres-url>"
FRONTEND_BASE_URL="https://<frontend-staging-app>.azurewebsites.net"
ACTIVE_EXAM_CYCLE_ID="2026"
```

For initial smoke testing only, unfinished verification integrations may use controlled mocks:

```env
STAGING_ALLOW_MOCK_INTEGRATIONS="true"
LRN_REGISTRY_PROVIDER="mock"
STEP2_DOCUMENT_RECOGNITION_PROVIDER="mock"
STEP1_SELFIE_FACE_PROVIDER="opencv"
```

Keep `STAGING_ALLOW_MOCK_INTEGRATIONS="false"` when staging handles real applicant information.

For email smoke tests, console email is acceptable:

```env
AUTH_EMAIL_PROVIDER="console"
DEFAULT_FROM_EMAIL="PhilSA Admissions <no-reply@example.test>"
```

For realistic email testing, configure Azure Communication Services SMTP with staging-only credentials:

```env
AUTH_EMAIL_PROVIDER="azure_communication_services_smtp"
AZURE_COMMUNICATION_EMAIL_SENDER="PhilSA Admissions <no-reply@your-verified-domain.example>"
AZURE_COMMUNICATION_EMAIL_SMTP_HOST="smtp.azurecomm.net"
AZURE_COMMUNICATION_EMAIL_SMTP_PORT="587"
AZURE_COMMUNICATION_EMAIL_SMTP_USERNAME="<staging-smtp-username>"
AZURE_COMMUNICATION_EMAIL_SMTP_PASSWORD="<staging-smtp-password>"
DEFAULT_FROM_EMAIL="PhilSA Admissions <no-reply@your-verified-domain.example>"
```

## Controlled Migration Procedure

Run migrations as a release step, not on every application startup.

Before migration:

```bash
python manage.py check --settings=config.settings.staging
python manage.py showmigrations --settings=config.settings.staging
```

Apply migration:

```bash
python manage.py migrate --settings=config.settings.staging
```

After migration:

```bash
python manage.py showmigrations --settings=config.settings.staging
```

Then restart or deploy the backend App Service and verify:

```text
https://<backend-staging-app>.azurewebsites.net/api/v1/health/
```

Expected response:

```json
{"status":"ok"}
```

## Deployment Checklist

- Frontend and backend App Services are separate.
- Frontend build uses `VITE_AUTH_SERVICE_MODE=backend`.
- Frontend `VITE_BACKEND_API_BASE_URL` points to the staging backend URL.
- Backend `DJANGO_ALLOWED_HOSTS` includes the staging backend host.
- Backend `DJANGO_CSRF_TRUSTED_ORIGINS` and `DJANGO_CORS_ALLOWED_ORIGINS` include the staging frontend origin.
- Backend uses a staging-only `DATABASE_URL`.
- Staging database contains synthetic data only.
- Migrations are run intentionally as a release step.
- Health checks are configured for both App Services.
- Mock integrations are explicitly enabled only when acceptable for the staging test purpose.
