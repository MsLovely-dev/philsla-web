# Exam Review Completion Hardening and Status Correction Design

**Owner:** Prince Barachiel Malonzo (P.Malonzo)

**Date:** 2026-08-06

## Purpose

Finish the remaining Exam Review hardening work and correct the active sprint plan so it no longer describes the feature as mock-only with no backend. The application change must prevent incomplete subjective grading from being marked complete or released, while the documentation correction must reflect the implemented `apps.exam_reviews` boundary and backend-connected frontend.

## Confirmed Current State

- `backend/apps/exam_reviews` owns persisted review records, review items, answer-sheet metadata, grading status changes, subjective item scoring, and release.
- The API remains under `/api/v1/results/exam-reviews/` and exposes list, detail, grading-status, answer-sheet upload, item-score, and release operations.
- `ExamReviewList.tsx` and `ExamReviewDetail.tsx` use `backendExamReviewService`; neither production component imports mock Exam Review data.
- The focused list, detail, and service test suite passes 11 tests across 3 files.
- The focused backend Exam Review suite passes 19 tests.
- The owner-supplied completion assessment is approximately 95% and "ahead of plan." This percentage is a reporting estimate, not a computed coverage or delivery metric.

## Confirmed Defect

`set_exam_review_grading_status` accepts `GRADED` for any non-finalized record without checking `pending_subjective_items`. `release_exam_review` checks only that the record status is `GRADED`. The list UI likewise enables "Mark as Graded" for submitted records even when their pending count is greater than zero.

Together, these gaps allow an incomplete review to move from `SUBMITTED` to `GRADED` and then `FINALIZED`, bypassing the persisted subjective-item readiness state. Existing tests cover valid transitions but do not cover this incomplete-review path.

## Backend Design

- `set_exam_review_grading_status` will reject a transition to `GRADED` when `pending_subjective_items` is greater than zero.
- `release_exam_review` will independently reject release when `pending_subjective_items` is greater than zero, protecting legacy or inconsistent records that are already marked `GRADED`.
- Both rejections will use an HTTP `409` conflict with a safe message that includes the remaining item count but no candidate, response, answer-key, or score detail.
- Returning a graded review to `SUBMITTED`, scoring subjective items, and all existing finalized-record locks remain unchanged.

## Frontend Design

### Review queue

- Disable "Mark as Graded" when `pendingSubjectiveItems` is greater than zero.
- Give the disabled action an accessible explanation containing the pending count.
- Preserve the backend conflict message as a defensive error path in case data changes after the queue loads.

### Review detail

- Show the release action only when the review is `GRADED` and `pendingSubjectiveItems` is zero.
- For a legacy/inconsistent `GRADED` record with pending items, show a clear readiness notice instead of a release action.
- When a subjective item has no rubric text, render "No rubric provided for this item." rather than an empty rubric region.
- Preserve existing scoring inputs, automated-score labeling, upload behavior, status badges, and subject navigation.

## Error Handling

The backend remains authoritative for grading and release readiness. Frontend disabling improves usability but is not an authorization or integrity control. A stale browser request that reaches the backend after readiness changes receives the `409` conflict and displays the existing action error treatment.

## Test Design

- Add a backend API regression proving a seeded review with pending subjective items cannot be marked `GRADED`.
- Add a backend release regression for a deliberately inconsistent `GRADED` record with pending subjective items.
- Add a list component regression proving incomplete records cannot open the grading confirmation or call the service.
- Add a detail component regression proving incomplete graded records do not expose release and explain the blocker.
- Add a detail component regression for the missing-rubric fallback.
- Preserve the existing valid grading, scoring, release, upload, permission, and service tests.

## Documentation Changes

The active `build_plan.md` will also change.

1. Update the P.Malonzo Exam Review roster row from the red "no backend entity" classification to a green status that records approximately 95% completion and the real backend/API path.
2. Replace the stale instruction to confirm an empty backend and mock-only frontend with a concise evidence-based description of the implemented Exam Review app and service wiring.
3. Replace the obsolete "fix broken mock-data references" work item with completion of the grading-readiness guard and polish of the backend-connected list/detail, rubric, grading, scoring, and release walkthrough.
4. Preserve Exam Results Release & Analytics as a separate roadmap-only story whose readiness gating, holds, and government-reporting interface are not implemented by this correction.
5. Preserve Student Portal as out of scope.

## Historical Records

`PhilSLA_Friday_Sprint_Task_Briefs (5) 1.md` remains unchanged as a historical snapshot of the original sprint assumptions. The current plan will supersede those assumptions for active status reporting rather than rewriting the archived source.

## Non-Goals

- No model, migration, route, permission, dependency, or seed-data changes.
- No redesign of the Exam Review workflow beyond grading-readiness enforcement and the approved rubric fallback.
- No Results Release & Analytics implementation.
- No change to other developers' status rows or assigned work.
- No attempt to fix unrelated repository-wide TypeScript diagnostics.

## Verification

- Search `build_plan.md` and confirm its P.Malonzo Exam Review sections no longer say "no backend entity," "empty stub," "entirely on mock data," or "broken mock-data references."
- Confirm the revised statements match `backend/apps/exam_reviews`, `frontend/src/services/backendExamReviewService.ts`, and the existing P.Malonzo task and implementation records.
- Run the focused backend Exam Review suite.
- Run the focused frontend list, detail, and service suite.
- Run the frontend TypeScript check and build; disclose unrelated pre-existing diagnostics separately from changed-file failures.
- Run `git diff --check` and review the complete diff for scope and factual consistency.
