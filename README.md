# PhilSA Web

PhilSA is a Philippine student assessment platform currently represented by a React prototype and business documentation. The repository separates the frontend and the future backend so their responsibilities and deployment can evolve independently.

## Current repository

```text
.
|-- .agents/            # Reserved supporting AI material (currently empty)
|-- backend/            # Planned Django + Django REST Framework backend
|-- docs/               # Business and engineering documentation
|-- frontend/           # React 19 + TypeScript + Vite application
|-- AGENTS.md           # Repository-wide AI instructions
|-- CONTRIBUTING.md
`-- SECURITY.md
```

The frontend currently uses local/mock services. Django and Django REST Framework are selected for the backend, but no backend application has been implemented. The database, authentication provider, deployment model, and integration contracts remain `TBD`.

## Frontend development

Prerequisite: a Node.js/npm version compatible with the committed dependencies (`TBD`: supported versions).

```bash
cd frontend
npm install
npm run dev
```

Available scripts include `npm run build`, `npm run preview`, and `npm run lint`. In this repository, `lint` currently invokes TypeScript with `--noEmit`; it is not an ESLint command.

Environment files are intentionally ignored except `.env.example`. Never commit real credentials. The existing Vite configuration reads `GEMINI_API_KEY`; use of a client-exposed key in a production architecture must be resolved before deployment.

## Documentation

- [Business requirements](docs/BRD.md)
- [Modules](docs/MODULES.md)
- [User stories](docs/USER_STORY.md)
- [System architecture](docs/architecture/SYSTEM-ARCHITECTURE.md)
- [API standards](docs/api/API-STANDARDS.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

Current-state statements and recommendations are deliberately separated. Proposed directory structures must not be treated as implemented until a reviewed change creates them.
