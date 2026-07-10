# PhilSA Backend

> **Current status:** Django and Django REST Framework are the adopted backend frameworks, but no executable project or dependency manifest exists yet. Database, authentication, job processing, storage, and deployment choices remain `TBD`. See [backend architecture](../docs/architecture/BACKEND-ARCHITECTURE.md).

This folder is reserved for the Django + Django REST Framework API.

Adopted application/API stack:

- Django
- Django REST Framework

Other earlier stack proposals, not yet adopted:

- PostgreSQL
- Celery + Redis
- S3-compatible file storage
- JWT or external identity provider integration for authentication and RBAC

Suggested future structure:

```text
backend/
├── config/
├── apps/
│   ├── accounts/
│   ├── applications/
│   ├── exams/
│   ├── proctoring/
│   ├── results/
│   ├── audit/
│   └── support/
├── requirements/
├── manage.py
└── README.md
```
