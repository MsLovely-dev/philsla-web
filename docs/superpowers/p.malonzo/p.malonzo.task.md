# Prince Barachiel Malonzo (P.Malonzo) — Sprint Task Brief

| Field | Value |
|---|---|
| Owner | Prince Barachiel Malonzo (P.Malonzo) |
| Worktree | `worktrees/p.malonzo/` |
| Sprint | Wednesday 2026-08-05 through Friday 2026-08-07 |
| Primary module | BRD-05 Exam Review |
| Official primary branch | `p.malonzo/exam-review` |
| Current checkout | `p.malonzo/exam-review`; owner directed execution in the current checkout |
| Documentation status | Design, specification, plan, and implementation record complete |
| Implementation status | Code repair verified; branch publication authorized; local database recovery choice pending |

## Stories

| Priority | Story | Module | Branch | Track | Status |
|---|---|---|---|---|---|
| 1 | Exam Review | BRD-05 Scoring & Results | `p.malonzo/exam-review` | Repair and isolate the implemented feature | Primary — design review |
| 2 | Exam Results Release & Analytics | BRD-05 Scoring & Results | `p.malonzo/results-release` | Separate roadmap cycle | Not started |
| 3 | Student Portal | Student Portal | No branch this sprint | Parked | Out of scope |

Score Management belongs to A.Depositar. Student Registration belongs to L.Chavez. P.Malonzo's Exam Review work may use their documented interfaces, but it must not take ownership of those modules.

## Current reality check

The original sprint plan described `backend/apps/results` as an empty stub and the Exam Review screens as mock-only. That description is no longer accurate.

- Commit `5594e8e` introduced a database-backed Exam Review implementation, API endpoints, answer-sheet handling, tests, and frontend service wiring.
- Commit `9f49e3b` represents the valid Score Management implementation merged into `main`.
- Merge commit `4affde0` combined independently developed Exam Review and Score Management files by concatenating conflicting sections instead of integrating them.
- Pull request merge `ad6d357` then placed the broken combined package on `main`; later documentation merges did not repair it.
- `backend/config/settings/base.py` registers `apps.results` twice, and `backend/config/urls.py` includes `apps.results.urls` twice.
- `python manage.py check --settings=config.settings.local` currently stops with `Application labels aren't unique, duplicates: results`.
- Direct compilation also reports malformed Python in the results initial migration, models, services, URLs, and views.
- The Exam Review frontend pages and services exist, but their backend cannot start while the shared results package remains broken.

## Confirmed scope decision

Repair Exam Review by giving it an independent Django application boundary instead of continuing to co-own `apps.results` with Score Management.

- Restore `apps.results` as the Score Management app without changing its contracts or behavior.
- Move Exam Review backend ownership to `apps.exam_reviews`.
- Preserve existing browser routes and `/api/v1/results/exam-reviews/...` API contracts.
- Preserve explicit connections to Student Applications and account roles.
- Keep release semantics unchanged: Exam Review release marks a review `FINALIZED`; it does not create or update a Score Management record.
- Do not redesign the Exam Review UI or implement CSV, OCR, or OMR answer recognition in this repair.

The approved design is recorded in `specs/2026-08-05-exam-review-repair-design.md`. A detailed implementation plan is not created until the owner reviews that written specification.

## Delivery sequence

### Wednesday — evidence and scope lock

- Record the current failure state and ownership boundaries.
- Complete the Exam Review repair design and owner review.
- Keep Results Release & Analytics as the next, separate roadmap cycle.
- Keep Student Portal explicitly parked with no branch or implementation work.

### Thursday — approved Exam Review repair

- Work only from `worktrees/p.malonzo/` on `p.malonzo/exam-review`.
- Execute the reviewed implementation plan with tests before behavior changes.
- Restore Score Management from its valid implementation and move Exam Review to `apps.exam_reviews`.
- Verify backend startup, migration safety, both modules' focused tests, and the existing Exam Review frontend contract.

### Friday — freeze and handoff

- Complete regression verification and the Exam Review walkthrough.
- Record exact commands and results in `implement/p.malonzo.implement.md`.
- Make only reviewed priority fixes after the freeze point.
- Present Results Release & Analytics as a separately scoped roadmap, not as completed Exam Review functionality.

## Constraints

- Use the dedicated P.Malonzo worktree and official per-story branch before application changes.
- Use Python 3.13 for backend dependency-sensitive checks; the current Python 3.14 virtual environment is not the accepted project runtime.
- Preserve the public Exam Review API, frontend routes, permissions, and response contracts.
- Keep Score Management behavior and migration history owned by its module.
- Do not delete a database, fake migrations, silently move historical tables, or discard another developer's work.
- Use synthetic applicants, exam content, answer sheets, and identities in tests and documentation.
- Never commit secrets, tokens, credentials, real exam material, answer keys, personal data, or private file paths.
- Do not begin implementation until both the written specification and the later implementation plan pass their human-review gates.

## Related artifacts

- Exam Review specification: `specs/2026-08-05-exam-review-repair-design.md`
- Future implementation plan: `plans/2026-08-05-exam-review-repair-plan.md`
- Future implementation record: `implement/p.malonzo.implement.md`
- Results Release & Analytics: separate specification and roadmap cycle after the Exam Review repair plan is approved
- Student Portal: parked in this task brief only
