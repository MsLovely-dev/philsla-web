# ADR-013: Backend Lint, Type, and Format Tooling

- Status: Accepted for the backend foundation
- Date: 2026-07-13
- Decision owners: `TBD`

## Context

The backend foundation uses Django, Django REST Framework, Python 3.13, and pip-tools-managed requirements. Tests and Django checks are already accepted in [ADR-012](ADR-012-BACKEND-TEST-TOOLING-AND-COVERAGE.md).

The project needs a consistent backend lint, type-check, and formatting policy before larger P1 feature work begins.

## Decision

Use the following backend code-quality tooling:

- Ruff for linting, import ordering, and formatting.
- Mypy for static type checking.
- Django and DRF typing support through appropriate mypy stubs/plugins when the tooling dependencies are added.

Accepted commands after tooling is installed:

```powershell
python -m ruff check .
python -m ruff format --check .
python -m mypy .
```

Formatting policy:

- Ruff format is the canonical backend Python formatter.
- Avoid unrelated formatting churn. Format files that are newly created or intentionally touched.
- Use import ordering enforced by Ruff.

Lint policy:

- Start with a practical Ruff ruleset focused on correctness, unused code, import hygiene, modernization, and obvious bug prevention.
- Security-sensitive checks may be added incrementally as backend modules mature.
- Suppressions must be local and justified with a short comment when the reason is not obvious.

Type policy:

- New backend modules should use type annotations for public functions, service boundaries, settings helpers, permission helpers, and domain/application services.
- Mypy should be introduced in a mode strict enough to catch real integration mistakes without blocking early Django scaffolding work.
- Tests may use lighter typing where it improves readability, but test helpers should still be explicit at module boundaries.

Implementation plan:

- Add Ruff, mypy, and Django/DRF typing support to `backend/requirements/tooling.in`.
- Regenerate `backend/requirements/tooling.txt` through the accepted pip-tools workflow.
- Add `pyproject.toml` or equivalent configuration for Ruff and mypy.
- Update backend README commands after the tools are installed and verified.

## Consequences

- The backend has a clear target tooling stack before feature implementation expands.
- Tool installation remains a separate implementation task so dependency locks can be reviewed deliberately.
- CI can later add Ruff and mypy commands without changing the tooling decision.

## Alternatives considered

- Black plus isort plus Flake8: rejected because Ruff can cover formatting, import sorting, and linting with less tooling surface.
- Pyright: deferred because mypy has established Django plugin/stub support and fits Python backend CI usage well.
- No static type checker: rejected because backend service boundaries, permissions, and domain rules benefit from typed contracts.
