# ADR-004: Backend Dependency Management

- Status: Accepted for the backend foundation
- Date: 2026-07-10
- Decision owners: `TBD`

## Context

The Django backend needs reproducible local and CI installations while remaining simple enough for the initial service foundation. Python 3.13 is the supported development runtime, but the repository previously pinned only direct dependencies and did not lock transitive packages.

## Decision

Use pip requirements files and `pip-tools`:

- Maintain direct application constraints in `backend/requirements/base.in`.
- Maintain development constraints in `backend/requirements/dev.in`.
- Pin the lock-generation tool in `backend/requirements/tooling.in`.
- Commit the generated `base.txt`, `dev.txt`, and `tooling.txt` lock files.
- Install environments from generated `.txt` files, never directly from `.in` files.
- Regenerate locks with Python 3.13 after intentionally changing a corresponding `.in` file.

The lock files pin transitive dependencies but do not currently include package hashes. Hash enforcement and automated dependency updates remain `TBD`.

## Consequences

- Local and CI environments resolve the same committed versions.
- Direct dependency intent remains separate from generated transitive pins.
- Dependency upgrades are explicit and reviewable in lock-file diffs.
- Lock regeneration requires the pinned `pip-tools` environment and package-index access.

## Alternatives considered

- Direct pins without transitive locks: rejected because transitive versions could drift.
- Poetry, Pipenv, or uv: deferred because adding a broader project-management tool is not currently necessary.
- Hash-locked requirements: deferred pending the CI and supply-chain policy.
