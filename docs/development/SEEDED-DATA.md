# Development Seeded Dataset

## Purpose

The backend includes a deterministic Django management command that creates a local-only PhilSA dataset for development, testing, stakeholder walkthroughs, dashboards, report screens, registration review queues, and role-based access checks.

The seeder uses only existing persisted models. It does not create schema, migrations, production defaults, or real personal data.

## Prerequisites

- Run backend migrations first.
- Use local or test settings, not production settings.
- Keep `DEBUG=True`.
- Use a non-production database name and host.

Typical local setup:

```powershell
cd backend
python manage.py migrate --settings=config.settings.local
```

## Commands

Seed the full dataset:

```powershell
python manage.py seed_development_data --settings=config.settings.local
```

Seed a smaller dataset:

```powershell
python manage.py seed_development_data --profile minimal --settings=config.settings.local
```

Seed one area:

```powershell
python manage.py seed_development_data --module accounts --settings=config.settings.local
python manage.py seed_development_data --module configuration --settings=config.settings.local
python manage.py seed_development_data --module applications --settings=config.settings.local
python manage.py seed_development_data --module auth-history --settings=config.settings.local
```

Reset only seeded rows and reseed:

```powershell
python manage.py seed_development_data --reset-seeded --settings=config.settings.local
```

Other options:

- `--profile minimal|full`: controls dataset breadth. Default: `full`.
- `--volume N`: controls full-profile application volume. Values below 50 are raised to 50 for `full`.
- `--random-seed N`: keeps generated preference distribution deterministic. Default: `20260730`.

## Development Accounts

All seeded accounts use the development-only password:

```text
Password1!
```

Primary accounts:

| Email | Role |
| --- | --- |
| `admin@example.test` | `SYSTEM_ADMIN` |
| `manager@example.test` | `ADMISSIONS_REVIEWER` |
| `staff@example.test` | `PROCTOR` |
| `viewer@example.test` | `EXECUTIVE` |

Additional full-profile accounts cover all non-student roles and at least 20 student accounts such as `student.01@example.test`.

To log in through the React app with these seeded accounts, run the frontend in backend auth mode:

```env
VITE_AUTH_SERVICE_MODE="backend"
VITE_BACKEND_API_BASE_URL=""
VITE_BACKEND_PROXY_TARGET="http://127.0.0.1:8000"
```

The local settings expose a development OTP in the login response, and the login page displays it on the OTP step. Restart the Vite dev server after changing frontend environment variables.

## Seeded Modules

The full profile seeds:

- Account users and `AccountProfile` records across all portal roles.
- Default role permission assignments and representative role scopes.
- Student registration configurable fields, including enabled and disabled fields.
- Step 2 identity verification configurations across historical and current policies.
- Student applications across all workflow statuses: `DRAFT`, `SUBMITTED`, `FOR_CORRECTION`, `RESUBMITTED`, `APPROVED`, and `REJECTED`.
- Step 2 verification records across `IN_PROGRESS`, `PASSED`, `MANUAL_REVIEW`, and `REJECTED`.
- Identity media records pointing to a safe placeholder PNG at `backend/private-media/seed-assets/seed-placeholder.png`.
- Registration submission, correction, resubmission, review, and activation audit logs.
- Auth refresh sessions, password recovery tokens, and login selfie logs.

## Expected Counts

The default full profile creates at least:

- 33 seeded users
- 33 account profiles
- 21 seeded configurable fields
- 3 Step 2 verification configurations
- 60 student applications
- 60 Step 2 verification records
- 160 identity media references
- 230 application audit logs
- 18 refresh sessions
- 18 password recovery tokens
- 18 login selfie logs

Counts are safe to increase through `--volume`.

## Idempotency

The command uses natural seed keys:

- Usernames beginning with `seed-`
- Candidate IDs beginning with `SEED-`
- Token, audit, and file hashes beginning with `seed`
- Configuration remarks beginning with `[Seeded]`

Rerunning the command updates or preserves seeded rows instead of creating duplicates. Existing non-seeded rows are not deleted or reset.

## Removing Seeded Rows

Use:

```powershell
python manage.py seed_development_data --reset-seeded --settings=config.settings.local
```

The reset deletes only records with the seeder markers listed above, then recreates the selected profile/module.

## Production Safety

The command refuses to run when:

- `DJANGO_SETTINGS_MODULE` contains `production`
- `DJANGO_ENV`, `APP_ENV`, `ENVIRONMENT`, or `PHILSA_ENV` equals `production`
- `DEBUG=False`
- The configured database name or host contains `prod` or `production`

There is no production override.

## Known Limitations

- The current backend has no persisted organizations, departments, branches, teams, comments, notifications, or generic attachment tables. The seed command does not invent those structures.
- School, region, reviewer assignment, course preference, archive, and PWD details are represented inside existing JSON fields.
- The seeder creates operationally useful workflow states directly where no service exists for historical backfill.
- The placeholder PNG is intentionally tiny and synthetic; it is not identity evidence.

## Verification

Useful checks:

```powershell
python manage.py test apps.core.tests.test_seed_development_data --settings=config.settings.test
python manage.py check --settings=config.settings.local
python manage.py seed_development_data --settings=config.settings.local
python manage.py seed_development_data --settings=config.settings.local
```
