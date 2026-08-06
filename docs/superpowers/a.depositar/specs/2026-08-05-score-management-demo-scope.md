# Score Management Demo Scope

Date: 2026-08-05
Owner: A.Depositar
Status: Draft for sprint review

## Problem

The sprint brief asks A.Depositar to prepare Score Management for a Friday presentation. The brief also says Score Management has no backend entity, but the current repository already includes backend Score Management endpoints, frontend service wiring, tests, and seed support.

The sprint needs a corrected, narrow scope: demonstrate the backend-backed Score Management workflow honestly, verify it, and avoid inventing new behavior the day before rehearsal.

## Goal

Prepare a presentation-ready Score Management path that shows:

- backend-owned score processing;
- backend-computed rank and percentile;
- candidate result listing with search, filter, sort, and pagination;
- read-only candidate detail anchored to a selected score record;
- controlled result release;
- CSV export;
- clear explanation of remaining `TBD` production concerns.

## Non-Goals

- Build System Integration.
- Add new scoring formulas.
- Edit raw score or final score values in Score Management.
- Add a manual recheck workflow in Score Management.
- Add new dependencies.
- Add new backend models, migrations, or API endpoints unless separately approved.
- Use real candidate, LRN, exam, answer, identity, or integration payload data.

## Current Behavior To Preserve

Score Management uses `frontend/src/services/scoreManagementService.ts` to call versioned backend endpoints under `/api/v1/results/score-management/`.

The frontend page at `frontend/src/pages/results/ScoreManagement.tsx`:

- loads score batches;
- loads paginated result rows;
- searches, filters, and sorts through backend query parameters;
- triggers process or reprocess actions;
- blocks reprocessing after release;
- triggers batch release;
- exports CSV;
- navigates to candidate detail.

The candidate detail page at `frontend/src/pages/results/ScoreCandidateDetail.tsx`:

- loads a score-anchored candidate profile;
- displays score components, result status, and limited registration context;
- treats the profile as read-only.

## Backend Contract

The documented Score Management endpoints are:

- `GET /api/v1/results/score-management/batches/`
- `POST /api/v1/results/score-management/batches/{sessionId}/process/`
- `GET /api/v1/results/score-management/batches/{sessionId}/results/`
- `GET /api/v1/results/score-management/batches/{sessionId}/results/{candidateId}/profile/`
- `POST /api/v1/results/score-management/batches/{sessionId}/release/`
- `GET /api/v1/results/score-management/batches/{sessionId}/export/`

Backend behavior is authoritative for validation, scoring computation, rank, percentile, release status, permissions, and export content.

## Demo Data

Use synthetic seed data only.

Recommended local seed command:

```bash
python manage.py seed_score_management --count 200000 --seed 2027 --reset
```

The demo can use a smaller count if local hardware or time makes 200,000 rows impractical. Any reduced count should be disclosed as a local demo dataset size, not a production limit.

## Acceptance Criteria

- [x] The Score Management page loads batches from the backend service. Covered by focused frontend tests and service wiring.
- [x] The results table loads backend-paginated score rows. Covered by focused frontend tests and service wiring.
- [x] Search, filter, sort, and pagination send the expected backend query parameters. Search behavior covered by focused frontend tests; service query mapping covered by service tests.
- [x] Process scoring calls the backend process endpoint. Covered by service tests.
- [x] Reprocess scoring is available only before release and uses the backend process endpoint with reprocessing enabled. Covered by focused frontend/service tests for reprocess behavior and released-state blocking.
- [x] Release is blocked until processing is complete. Covered by focused backend, frontend, and service tests.
- [x] Released batches disable reprocessing and release actions. Covered by focused frontend tests.
- [x] Candidate detail loads through the score-anchored profile endpoint. Covered by candidate detail/service tests.
- [x] Export uses the backend CSV endpoint. Covered by service tests.
- [ ] Errors are visible but do not expose sensitive payloads.
- [ ] The demo narrative distinguishes implemented behavior from remaining `TBD` production concerns.

Audit note, 2026-08-05: backend acceptance was freshly confirmed after repairing malformed results app configuration, model, URL, service, and migration artifacts. Frontend focused tests passed after sandbox escalation.

## Risks And Open Items

- Production asynchronous processing remains `TBD` in repository instructions; current demo should not imply final queue/worker infrastructure is complete.
- Production recipient portals for result distribution remain separate work.
- Production integration reporting is out of scope for this sprint.
- Data volume verification depends on local environment capacity and must be recorded honestly.
