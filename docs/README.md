# PhilSA Web

> **Current status:** The frontend is a React/TypeScript/Vite prototype using mock/local services. The Django and Django REST Framework backend foundation now provides a health endpoint, Supabase Postgres `DATABASE_URL` settings, and baseline tests; business APIs, database schema, operations, object storage provider, and other infrastructure choices remain `TBD`. See [system architecture](architecture/SYSTEM-ARCHITECTURE.md).

## Documentation index

- Business: [BRD](BRD.md), [modules](MODULES.md), and [user stories](USER_STORY.md)
- Architecture: [system](architecture/SYSTEM-ARCHITECTURE.md), [frontend](architecture/FRONTEND-ARCHITECTURE.md), [backend](architecture/BACKEND-ARCHITECTURE.md), [database](architecture/DATABASE-DESIGN.md), and [security](architecture/SECURITY-ARCHITECTURE.md)
- API: [standards](api/API-STANDARDS.md) and [endpoint inventory](api/API-ENDPOINTS.md)
- Development: [coding](development/CODING-STANDARDS.md), [testing](development/TESTING-STANDARDS.md), [Git workflow](development/GIT-WORKFLOW.md), [definition of done](development/DEFINITION-OF-DONE.md), [frontend module priority checklist](development/FRONTEND-MODULE-PRIORITY-CHECKLIST.md), and [backend module priority checklist](development/BACKEND-MODULE-PRIORITY-CHECKLIST.md)
- Decisions: [ADR-001 repository structure](decisions/ADR-001-REPOSITORY-STRUCTURE.md), [ADR-002 backend framework](decisions/ADR-002-BACKEND-FRAMEWORK.md), [ADR-003 frontend tooling](decisions/ADR-003-FRONTEND-TOOLING.md), [ADR-004 backend dependency management](decisions/ADR-004-BACKEND-DEPENDENCY-MANAGEMENT.md), [ADR-005 API versioning](decisions/ADR-005-API-VERSIONING.md), [ADR-006 database engine and local development](decisions/ADR-006-DATABASE-ENGINE-AND-LOCAL-DEVELOPMENT.md), [ADR-007 Supabase Postgres database provider](decisions/ADR-007-SUPABASE-POSTGRES-DATABASE-PROVIDER.md), [ADR-008 file/object storage approach](decisions/ADR-008-FILE-OBJECT-STORAGE-APPROACH.md), [ADR-009 authentication/session/account provisioning](decisions/ADR-009-AUTHENTICATION-SESSION-AND-ACCOUNT-PROVISIONING.md), [ADR-010 backend roles and permissions](decisions/ADR-010-BACKEND-ROLES-AND-PERMISSIONS.md), and [ADR-011 user authentication flow](decisions/ADR-011-USER-AUTHENTICATION-FLOW.md)

PhilSA is organized as a full-stack project with separate frontend and backend workspaces.

## Structure

```text
.
├── frontend/   # React + Vite + TypeScript application
├── backend/    # Django + Django REST Framework API
├── BRD.md
├── MODULES.md
└── USER_STORY.md
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

The backend folder contains the initial Django + Django REST Framework service foundation. See its [setup and verification commands](../backend/README.md).

Framework decision:

- Django
- Django REST Framework

Other items below remain proposals pending separate decisions:
- Celery + Redis
