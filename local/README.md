# Local-only workspace

This folder is ignored by Git and is meant for personal, machine-specific setup.

Suggested contents:

- `docker-compose.yml`
- Dockerfiles or override files
- local env files
- temporary scripts or notes you do not want shared

Current Docker setup:

- frontend runs in its own container on `http://localhost:3000`
- backend runs in its own container on `http://localhost:8000`
- backend uses a separate Postgres container, so it stays closer to the production database engine

Start it with:

```powershell
docker compose -f local/docker-compose.yml up --build
```
