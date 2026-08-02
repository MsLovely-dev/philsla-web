# Local Workspace Agent Instructions

These instructions apply only inside `local/` and are meant to guide development work for this repo without affecting the shared project files.

## Purpose

- Treat `local/` as a personal workspace for setup files, notes, and temporary development artifacts.
- Keep all machine-specific or work-in-progress material here so it stays out of version control.
- Use this area to define how development should be approached while waiting for broader repo changes.

## Development Style

- Prefer the smallest change that solves the task.
- Preserve the repository's current architecture unless a task explicitly asks for a migration.
- Keep frontend, backend, and docs responsibilities separate.
- Avoid rewriting shared code unless the change is clearly needed for the assigned feature.
- Do not move files across major folders unless the migration is explicitly approved.

## Best-Practice Modes

Use the following operating modes as a practical checklist:

### 1. Architecture-First Mode

- Read the relevant docs before editing code.
- Confirm the intended module boundaries.
- Identify where business logic belongs before implementing UI or API work.

### 2. Contract-First Mode

- Define the API/data shape before wiring frontend calls.
- Keep request and response mapping in service modules.
- Do not invent backend behavior in the frontend.

### 3. Backend-Authoritative Mode

- Put validation, state transitions, and business rules in the backend.
- Treat frontend checks as usability only.
- Do not rely on client state for authorization or persistence decisions.

### 4. UI-Then-Service Mode

- Keep React components focused on rendering, forms, and user interaction.
- Move API calls, transformation logic, and reusable business rules into service or domain modules.
- Preserve loading, empty, error, and success states.

### 5. Test-As-You-Go Mode

- Update or add tests when behavior changes.
- Prefer the lowest practical test layer for the change.
- Verify the result before calling the work complete.

### 6. Local-Isolation Mode

- Keep Docker, local env files, and personal notes in `local/`.
- Do not commit local-only settings, secrets, or temporary files.
- Avoid changing shared project defaults when a local override is enough.

## Repository Rules To Follow

- Use the frontend service layer in `frontend/src/services/` for remote calls and transport mapping.
- Keep backend business logic out of route handlers and views.
- Follow the documentation in `docs/` when implementing feature behavior.
- If architecture or contract details are missing, mark them as `TBD` rather than inventing them.

## Working With The Exam Modules

For the assigned exam work, follow this order:

1. Question Bank
2. Exam Blueprint
3. Exam Sets

Implementation guidance:

- Treat the question bank as the source data.
- Treat the blueprint as the rule and structure layer.
- Treat exam sets as the assembly and publication layer.
- Keep UI state separate from backend workflow state.

## Verification Standard

- Inspect the diff before finishing.
- Run the relevant checks for the changed area.
- Do not claim validation unless the command was actually run and observed.
- If a check is skipped, state that clearly.

## Communication Standard

- Prefer short, concrete progress updates while working.
- Ask for confirmation only when a choice materially changes the implementation.
- If a local-only decision is needed, make the safest reasonable assumption and document it.

