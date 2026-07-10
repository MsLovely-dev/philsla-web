# PhilSA Web

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

The backend folder is reserved for the Django + Django REST Framework service.

Planned stack:

- Django
- Django REST Framework
- PostgreSQL
- Celery + Redis
- S3-compatible object storage
