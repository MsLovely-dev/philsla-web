# Git Workflow

## Branches and commits

The hosting platform and protected-branch policy are `TBD`. Until adopted, use short-lived branches named `feature/<topic>`, `fix/<topic>`, `docs/<topic>`, or `chore/<topic>` and keep commits focused and reviewable.

Write imperative commit subjects that explain the outcome. Avoid mixing source moves, behavior changes, dependency updates, and documentation rewrites unless inseparable.

## Pull request expectations

Include the problem, scope, implementation summary, screenshots for relevant UI changes, architecture/API/business documentation changes, exact validation commands and outcomes, security/privacy impact, rollout/rollback notes where relevant, and all `TBD` decisions.

At least one reviewer and required automated checks are recommended; exact ownership and approval counts are `TBD`.

## Repository hygiene

- Never commit secrets, local environment files, dependencies, build output, coverage, caches, or IDE/OS files.
- Do not remove or untrack files as part of unrelated work.
- Inspect `git diff` and `git status --short` before handoff.
- Resolve generated or lockfile changes deliberately; never edit lockfiles by hand.
- Keep architecture decisions in ADRs and link them from affected documentation.

## Releases

Versioning, tagging, environments, deployment approvals, database migration sequencing, and rollback policy are `TBD`.
