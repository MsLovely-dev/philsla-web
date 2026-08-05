# Score Management Demo Verification Plan

Date: 2026-08-05
Owner: A.Depositar
Status: Completion audit executed; backend and focused frontend checks passed

## Goal

Verify and, only if necessary, minimally polish the backend-backed Score Management demo path for Friday.

## Scope

Included:

- Score Management page and candidate detail behavior.
- Score Management frontend service contract.
- Score Management backend API and domain behavior.
- Synthetic seed data readiness.
- Demo narrative.

Excluded:

- System Integration.
- New scoring formulas.
- Raw-score editing or manual recheck workflows in Score Management.
- New backend models, migrations, endpoints, or dependencies without a separate approved plan.

## Files In Scope

- `frontend/src/pages/results/ScoreManagement.tsx`
- `frontend/src/pages/results/ScoreManagement.test.tsx`
- `frontend/src/pages/results/ScoreCandidateDetail.tsx`
- `frontend/src/pages/results/ScoreCandidateDetail.test.tsx`
- `frontend/src/services/scoreManagementService.ts`
- `frontend/src/services/scoreManagementService.test.ts`
- `backend/apps/results/services.py`
- `backend/apps/results/views.py`
- `backend/apps/results/serializers.py`
- `backend/apps/results/urls.py`
- `backend/apps/results/models.py`
- `backend/apps/results/tests/test_score_processing.py`
- `backend/apps/results/tests/test_score_management_api.py`
- `backend/apps/results/tests/test_score_management_models.py`
- `backend/apps/results/tests/test_score_management_seed_command.py`
- `docs/api/API-ENDPOINTS.md`

## Execution Steps

- [x] Confirm this plan is reviewed and approved.
- [ ] Confirm the working branch is `a.depositar/score-management`. Current checkout is `main`, and `worktrees/a.depositar/` is missing.
- [x] Confirm System Integration remains parked.
- [x] Run backend system check. Result: passed with `..\venv\Scripts\python.exe`: `System check identified no issues (0 silenced).`
- [x] Run focused backend Score Management tests. Result: passed with `..\venv\Scripts\python.exe`: 33 tests.
- [x] Run frontend Score Management service and component tests. Result: passed when rerun outside the sandbox after initial `spawn EPERM`.
- [ ] Inspect the Score Management UI behavior against the acceptance criteria in `../specs/2026-08-05-score-management-demo-scope.md`.
- [ ] If a demo-blocking defect appears, write or update the focused failing test first.
- [ ] Apply the smallest code change that fixes the defect.
- [ ] Rerun the focused checks that cover the change.
- [x] Update `../implement/a.depositar.implement.md` with exact commands and observed results.
- [ ] Prepare the Friday talk track from the "Demo Narrative" section below.

## Verification Commands

From `backend/`:

```bash
python manage.py check --settings=config.settings.local
python manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models apps.results.tests.test_score_management_seed_command --settings=config.settings.test
```

From `frontend/`:

```bash
npm test -- ScoreManagement ScoreCandidateDetail scoreManagementService
npm run lint
```

Run `npm run build` if frontend code changes. Run the full backend test suite only if backend behavior changes outside the focused Score Management surface.

## Demo Narrative

Score Management is backend-backed for the demo path. The backend owns score processing, rank, percentile, release state, candidate-profile lookup, and export content. The frontend is a typed client of that contract and is responsible for presentation, filtering controls, action affordances, and visible error states.

What is built:

- Score batch listing.
- Backend-paginated score result listing.
- Search, sort, release-status filtering, and pagination.
- Backend-triggered processing and reprocessing.
- Release of processed results.
- Candidate detail view anchored to the selected score batch and candidate ID.
- CSV export.

What remains `TBD` or future work:

- Production worker/queue architecture for long-running processing.
- Recipient portal contracts after release.
- System Integration reporting and government-agency distribution.
- Final production operational runbook for large-volume processing.

## Approval Gate

- [x] Human reviewer approves this plan before implementation work.
- [ ] Any code change after approval must stay within this plan or require a new reviewed plan.
