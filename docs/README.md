# PhilSA Web

> **Current status:** The frontend is implemented as a React/TypeScript/Vite prototype using mock/local services. Django and Django REST Framework are adopted for the backend, but the backend is not implemented. Database and other infrastructure choices remain `TBD`. See [system architecture](architecture/SYSTEM-ARCHITECTURE.md).

## Documentation index

- Business: [BRD](BRD.md), [modules](MODULES.md), and [user stories](USER_STORY.md)
- Architecture: [system](architecture/SYSTEM-ARCHITECTURE.md), [frontend](architecture/FRONTEND-ARCHITECTURE.md), [backend](architecture/BACKEND-ARCHITECTURE.md), [database](architecture/DATABASE-DESIGN.md), and [security](architecture/SECURITY-ARCHITECTURE.md)
- API: [standards](api/API-STANDARDS.md) and [endpoint inventory](api/API-ENDPOINTS.md)
- Development: [coding](development/CODING-STANDARDS.md), [testing](development/TESTING-STANDARDS.md), [Git workflow](development/GIT-WORKFLOW.md), and [definition of done](development/DEFINITION-OF-DONE.md)
- Decisions: [ADR-001 repository structure](decisions/ADR-001-REPOSITORY-STRUCTURE.md) and [ADR-002 backend framework](decisions/ADR-002-BACKEND-FRAMEWORK.md)

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

The backend folder is reserved for the adopted Django + Django REST Framework service.

Framework decision:

- Django
- Django REST Framework

Other items below remain proposals pending separate decisions:
- PostgreSQL
- Celery + Redis
- S3-compatible object storage
