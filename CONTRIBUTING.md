# Contributing to PhilSA

## Before changing code

Read the root `AGENTS.md`, the scoped instructions for the area, the relevant business documents, and [coding standards](docs/development/CODING-STANDARDS.md). Confirm whether the request describes current behavior or a proposal.

## Workflow

1. Create a focused branch using the convention in [Git workflow](docs/development/GIT-WORKFLOW.md).
2. Keep frontend, backend, documentation, and configuration changes narrowly scoped.
3. Add or update tests whenever behavior changes.
4. Update documentation whenever architecture, API contracts, setup, or business behavior changes.
5. Run the relevant checks and record what actually ran. Never state that a check passed without running it.
6. Review the diff for secrets, sensitive information, generated output, and unrelated changes.
7. Open a review with the change summary, rationale, validation evidence, risks, and pending decisions.

## Local commands

Frontend commands are run from `frontend/`:

```bash
npm run lint
npm run build
```

No backend validation command exists because the Django project and dependency manifest have not been implemented. Once scaffolding is approved, document the exact Django test, formatting, linting, and migration checks here.

Follow the [definition of done](docs/development/DEFINITION-OF-DONE.md) and report any unmet item explicitly.
