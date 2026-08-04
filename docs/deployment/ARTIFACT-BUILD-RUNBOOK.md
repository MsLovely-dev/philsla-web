# Artifact Build Runbook

This runbook documents how to build the local ZIP artifacts used for the initial Azure App Service staging deployment.

Generated artifacts are written under `artifacts/`, which is ignored by git.

## Backend ZIP

Artifact:

```text
artifacts/philsla-backend-staging.zip
```

Package root:

```text
backend/
frontend/
docs/
requirements.txt
AGENTS.md
README.md
SECURITY.md
CONTRIBUTING.md
```

The backend ZIP is a repository-root package because the backend App Service startup command assumes this layout:

```bash
gunicorn --chdir backend config.wsgi:application --bind=0.0.0.0:$PORT
```

Azure build automation should have:

```env
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

Azure Oryx detects the root `requirements.txt`, which points to:

```text
backend/requirements/base.txt
```

### Full Backend Package

Set staging environment variables in the local PowerShell session before running the full package command:

```powershell
$env:DJANGO_SECRET_KEY="<staging-secret>"
$env:DJANGO_ALLOWED_HOSTS="philsla-staging-api-hcc6hhegbvfud8av.eastasia-01.azurewebsites.net"
$env:DJANGO_CSRF_TRUSTED_ORIGINS="https://<frontend-staging-domain>,https://philsla-staging-api-hcc6hhegbvfud8av.eastasia-01.azurewebsites.net"
$env:DJANGO_CORS_ALLOWED_ORIGINS="https://<frontend-staging-domain>"
$env:DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
$env:ACTIVE_EXAM_CYCLE_ID="2026"
$env:STAGING_ALLOW_MOCK_INTEGRATIONS="true"
$env:LRN_REGISTRY_PROVIDER="mock"
$env:STEP2_DOCUMENT_RECOGNITION_PROVIDER="mock"
$env:STEP1_SELFIE_FACE_PROVIDER="opencv"
$env:AUTH_EMAIL_PROVIDER="console"
```

Then run from the repository root:

```powershell
.\scripts\package-backend-zip.ps1
```

The script runs:

```powershell
cd backend
python manage.py collectstatic --noinput --settings=config.settings.staging
cd ..
```

Then it creates `artifacts/philsla-backend-staging.zip`.

### Backend Package Without Local Collectstatic

For the first smoke deploy, if staging env vars are already configured in Azure but not locally, create the ZIP without local static collection:

```powershell
.\scripts\package-backend-zip.ps1 -SkipCollectStatic
```

Then run static collection inside Azure after deployment:

```bash
cd /home/site/wwwroot/backend
python manage.py collectstatic --noinput --settings=config.settings.staging
```

### Backend ZIP Exclusions

The backend package excludes:

```text
.git/
artifacts/
backend/.venv/
backend/venv/
backend/private-media/
frontend/node_modules/
frontend/dist/
frontend/test-results/
frontend/playwright-report/
frontend/coverage/
__pycache__/
.env
.env.local
db.sqlite3
*.pyc
*.pyo
```

## Frontend ZIP

Artifact:

```text
artifacts/philsla-frontend-staging.zip
```

Package root:

```text
package.json
package-lock.json
server.cjs
dist/
src/
vite.config.ts
tsconfig.json
index.html
```

The frontend ZIP packages the contents of `frontend/`, not the whole repository and not only `dist/`.

The frontend App Service startup command should be:

```bash
npm start
```

`server.cjs` serves `dist/` and falls back to `index.html` for React Router routes.

### Build Frontend Package

Set the Vite build-time variables in the local PowerShell session:

```powershell
$env:VITE_AUTH_SERVICE_MODE="backend"
$env:VITE_BACKEND_API_BASE_URL="https://philsla-staging-api-hcc6hhegbvfud8av.eastasia-01.azurewebsites.net"
```

Then run from the repository root:

```powershell
.\scripts\package-frontend-zip.ps1
```

The script runs `npm run build` in `frontend/`, then creates `artifacts/philsla-frontend-staging.zip`.

Vite embeds `VITE_BACKEND_API_BASE_URL` into the generated JavaScript at build time. Changing frontend App Service environment variables after deployment does not change the already-built bundle unless Azure rebuilds the app.

### Verify Frontend Bundle

After building, verify the staging backend URL is present:

```powershell
cd frontend
Select-String -Path ".\dist\assets\*" -Pattern "philsla-staging-api" -SimpleMatch
cd ..
```

Expected result: at least one match.

### Frontend ZIP Exclusions

The frontend package excludes:

```text
frontend/node_modules/
frontend/test-results/
frontend/playwright-report/
frontend/coverage/
.env
.env.local
*.log
```

## Local Issues Observed

On Windows, `npm ci` may fail if native package binaries are locked by another process, OneDrive sync, or antivirus. In that case, close running Node/Vite processes and retry. During the staging artifact build, `npm install` was used to repair `node_modules` after `npm ci` failed on a locked native package.

If Vite fails with `spawn EPERM`, rerun the build after closing processes that may hold native Node package files. In this environment, the package script was run with elevated execution permission so esbuild could spawn successfully.

## Post-Deploy Commands

Do not run migrations in the App Service startup command.

After backend ZIP deployment, run manually inside the backend App Service SSH/Kudu console:

```bash
cd /home/site/wwwroot/backend
python manage.py migrate --settings=config.settings.staging
```

Then restart the backend App Service and verify:

```text
https://philsla-staging-api-hcc6hhegbvfud8av.eastasia-01.azurewebsites.net/api/v1/health/
```
