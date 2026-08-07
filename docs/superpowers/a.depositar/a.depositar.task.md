# A.Depositar Task Brief - Score Management

Date: 2026-08-05
Owner: Alvy Depositar (`a.depositar`)
Worktree: `worktrees/a.depositar/`
Primary branch: `a.depositar/score-management`
Parked branch: `a.depositar/system-integration`

## Sprint Priority

Score Management is the only priority for A.Depositar in this sprint. System Integration is explicitly parked unless sprint ownership reprioritizes it.

## Current Scope Decision

The original sprint brief classified Score Management as a red prototype-only track with no backend entity. Current repository evidence shows that classification is stale. Score Management now has backend-owned endpoints, frontend service wiring, component tests, service tests, backend domain tests, API tests, and seed command tests.

The sprint scope is therefore:

- Verify and polish the backend-backed Score Management demo path.
- Keep scoring, ranking, percentile, release, export, and candidate-profile behavior backend-authoritative.
- Avoid adding new product behavior unless a reviewed plan is approved.
- Use only synthetic data in docs, demos, tests, screenshots, and logs.
- Keep System Integration out of scope for this sprint.

## Evidence

- API contract: `docs/api/API-ENDPOINTS.md`
- Existing feature design: `docs/superpowers/specs/2026-07-31-score-management-design.md`
- Existing backend phase-1 plan: `docs/superpowers/plans/2026-08-03-backend-score-processing-phase-1.md`
- Frontend page: `frontend/src/pages/results/ScoreManagement.tsx`
- Candidate detail page: `frontend/src/pages/results/ScoreCandidateDetail.tsx`
- Frontend service: `frontend/src/services/scoreManagementService.ts`
- Frontend tests:
  - `frontend/src/pages/results/ScoreManagement.test.tsx`
  - `frontend/src/pages/results/ScoreCandidateDetail.test.tsx`
  - `frontend/src/services/scoreManagementService.test.ts`
- Backend tests:
  - `backend/apps/results/tests/test_score_processing.py`
  - `backend/apps/results/tests/test_score_management_api.py`
  - `backend/apps/results/tests/test_score_management_models.py`
  - `backend/apps/results/tests/test_score_management_seed_command.py`

## Wednesday Deliverables

- [x] Create A.Depositar Score Management task docs.
- [x] Park System Integration.
- [x] Review the Score Management sprint plan in `plans/2026-08-05-score-management-demo-verification.md`.
- [x] Confirm local backend/frontend setup can run the focused checks. Backend checks pass with `..\venv\Scripts\python.exe`; frontend focused tests pass outside the sandbox.

## Thursday Deliverables

- [x] Execute only the approved Score Management plan.
- [x] Verify backend Score Management checks. Django local check passed and focused Score Management backend tests passed: 33 tests.
- [x] Verify frontend Score Management checks. Focused Vitest command passed: 3 test files, 16 tests.
- [ ] Polish only issues that block the Friday demo path.
- [x] Record exact commands and observed results in `implement/a.depositar.implement.md`.

## Friday Deliverables

- [ ] Freeze code by midday.
- [ ] Rehearse the Score Management demo path.
- [ ] Report what is built, what is backend-backed, and what remains `TBD`.
- [ ] Apply only P0 fixes after midday, through PR review.

No new Score Management product behavior after freeze unless it is a P0 demo blocker and receives PR review.

Freeze status:

- Demo path verified: partial. Backend checks, focused backend Score Management tests, focused frontend Score Management tests, and API-level demo rehearsal passed. Live browser rehearsal was not started in this execution.
- P0 blockers: none found in focused Score Management verification. Repository-wide frontend lint still fails on unrelated TypeScript debt outside the Score Management demo path.
- Follow-up plans required: Application Review result synchronization; recipient-target release ledger for schools and government; expanded Score Management audit events; PostgreSQL-compatible large-batch rehearsal; official ranking and percentile methodology confirmation.

Remaining work classification:

- Demo blocker: none found in focused Score Management backend verification, focused frontend verification, or API-level rehearsal.
- P0 post-freeze fix: none identified.
- Post-demo implementation plan required: Application Review result synchronization; expanded Score Management audit events; recipient-target release ledger and API behavior for schools and government.
- External contract required: school, government, DepEd, CHED, TESDA, and Student Portal result-display/delivery contracts.
- Production rehearsal required: PostgreSQL-compatible large-batch rehearsal and official ranking/percentile methodology confirmation.
- Out of scope for this sprint: System Integration and downstream external recipient delivery.

## Demo Path

1. Open Score Management as `SYSTEM_ADMIN`.
2. Load available examination sessions.
3. Select a batch.
4. Show backend-paginated candidate score results.
5. Search/filter/sort candidate results.
6. Process scoring for a ready batch, or explain processed state for seeded demo data.
7. Open candidate detail and show read-only score/profile context.
8. Release processed results.
9. Export processed score results.

## Guardrails

- Do not edit raw scores or final scores in Score Management.
- Do not move rechecking into Score Management; corrections belong upstream in Exam Review or in an approved reprocessing workflow.
- Do not trust frontend state as authoritative.
- Do not commit secrets, real LRN data, real candidate records, real exam content, answer keys, or sensitive payloads.
- Do not expose arbitrary application-profile lookup from Score Management.
- Do not claim verification passed unless the command was run and the result was observed.
