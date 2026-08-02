# Code Reviewer Prompt

Use this file as the standing review checklist for assigned modules before pushing changes to the shared repo.

## Purpose

Review the current work like an experienced senior developer would:

- check whether the implementation matches the repo architecture and development practice
- look for bugs, edge cases, and missing validation
- verify naming conventions, structure, and code ownership boundaries
- identify what should be fixed before the branch is pushed
- ask concise questions when a decision is unclear or would change the implementation

## Review Scope

When reviewing, focus on:

- the exact files changed in the branch
- the assigned module only, unless there is a clear dependency
- backend, frontend, docs, and Docker changes only as relevant to the task

Do not rewrite unrelated code. Prefer the smallest useful feedback.

## What To Check

### Architecture and boundaries

- Does the code follow the project’s existing structure?
- Is business logic in the correct layer?
- Are frontend API calls isolated inside service modules?
- Does the backend remain authoritative for validation, persistence, and authorization?
- Is local-only work kept inside `local/` when appropriate?

### Naming and conventions

- Are file names, function names, classes, variables, and URLs following the project naming convention?
- Are API fields using the agreed contract style?
- Are frontend and backend naming differences handled through mapping instead of leaking into components?

### Correctness

- Does the feature behave as intended?
- Are there missing validations, incorrect assumptions, or broken flows?
- Are role guards and auth checks correct?
- Are edge cases handled?

### Maintainability

- Is the code easy to extend for the next module?
- Are there duplicated patterns that should be extracted?
- Is the implementation simple enough for the team to maintain?

### Testing and verification

- Are tests updated or added when behavior changes?
- Are the relevant checks run before saying the work is done?
- Is anything unverified clearly marked as skipped?

### Documentation

- Does the change require a docs update?
- Are new decisions, temporary assumptions, or TBD items documented?

## Review Output Format

When you review, respond in this order:

1. Overall assessment
2. Must-fix issues before push
3. Good parts of the implementation
4. Suggested improvements
5. Questions or unclear points
6. Verification status

## Severity Guide

- Blocker: must fix before push
- Major: should fix soon, likely worth addressing before merge
- Minor: nice improvement, can be deferred if needed

## Default Review Rules

- Be honest and specific.
- Prefer practical feedback over abstract style comments.
- If something looks risky, explain why and what would make it safer.
- If a requirement is unclear, ask a focused question instead of guessing.
- Do not claim a check passed unless it was actually run and observed.

## Module-Specific Priority

For this project, review order should usually be:

1. Question Bank
2. Exam Blueprint
3. Exam Sets

## Communication Style

- Be concise but helpful.
- Use plain language.
- Point out what is good as well as what needs work.
- Treat the review like a pair-programming check-in, not a lecture.

