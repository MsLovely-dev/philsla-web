# Exam Review Status Correction Design

**Owner:** Prince Barachiel Malonzo (P.Malonzo)

**Date:** 2026-08-06

## Purpose

Correct the active sprint plan so it no longer describes Exam Review as a mock-only feature with no backend. The correction must reflect the implemented `apps.exam_reviews` boundary and the backend-connected frontend without expanding the task into application development.

## Confirmed Current State

- `backend/apps/exam_reviews` owns persisted review records, review items, answer-sheet metadata, grading status changes, subjective item scoring, and release.
- The API remains under `/api/v1/results/exam-reviews/` and exposes list, detail, grading-status, answer-sheet upload, item-score, and release operations.
- `ExamReviewList.tsx` and `ExamReviewDetail.tsx` use `backendExamReviewService`; neither production component imports mock Exam Review data.
- The focused list, detail, and service test suite passes 11 tests across 3 files.
- The owner-supplied completion assessment is approximately 95% and "ahead of plan." This percentage is a reporting estimate, not a computed coverage or delivery metric.

## Documentation Changes

Only the active `build_plan.md` will change.

1. Update the P.Malonzo Exam Review roster row from the red "no backend entity" classification to a green status that records approximately 95% completion and the real backend/API path.
2. Replace the stale instruction to confirm an empty backend and mock-only frontend with a concise evidence-based description of the implemented Exam Review app and service wiring.
3. Replace the obsolete "fix broken mock-data references" work item with verification and polish of the backend-connected list/detail, rubric, grading, scoring, and release walkthrough.
4. Preserve Exam Results Release & Analytics as a separate roadmap-only story whose readiness gating, holds, and government-reporting interface are not implemented by this correction.
5. Preserve Student Portal as out of scope.

## Historical Records

`PhilSLA_Friday_Sprint_Task_Briefs (5) 1.md` remains unchanged as a historical snapshot of the original sprint assumptions. The current plan will supersede those assumptions for active status reporting rather than rewriting the archived source.

## Non-Goals

- No frontend or backend production-code changes.
- No API, model, migration, route, permission, or seed-data changes.
- No Results Release & Analytics implementation.
- No change to other developers' status rows or assigned work.
- No attempt to fix unrelated repository-wide TypeScript diagnostics.

## Verification

- Search `build_plan.md` and confirm its P.Malonzo Exam Review sections no longer say "no backend entity," "empty stub," "entirely on mock data," or "broken mock-data references."
- Confirm the revised statements match `backend/apps/exam_reviews`, `frontend/src/services/backendExamReviewService.ts`, and the existing P.Malonzo task and implementation records.
- Run `git diff --check` and review the documentation diff for scope and factual consistency.
- Application tests are not required for the implementation because the approved change is documentation-only; the focused 11-test run is discovery evidence, not a post-change application verification claim.
