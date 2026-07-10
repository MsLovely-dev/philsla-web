# PhilSA Backend

This folder is reserved for the Django + Django REST Framework API.

Planned backend stack:

- Django
- Django REST Framework
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
