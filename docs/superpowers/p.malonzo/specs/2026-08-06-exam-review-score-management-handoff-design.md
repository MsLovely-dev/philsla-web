# Exam Review to Score Management Handoff Design

**Date:** 2026-08-06
**Owner:** P.Malonzo
**Status:** Approved design; implementation remains uncommitted

## Objective

Make the existing Exam Review release action perform a real, synchronous handoff to Score Management. A successful release must create or safely update the candidate's unprocessed `CandidateScore` and then finalize the Exam Review. A failed handoff must leave both systems unchanged.

## Scope

This change covers one candidate score moving from a completed Exam Review into the existing Score Management intake data. It does not process rankings, release results to students, introduce asynchronous messaging, or redesign Score Management sessions.

## Architecture

Score Management remains the sole owner of `CandidateScore` creation and update rules. `apps.results.services` will expose a small synchronous intake function that accepts a completed Exam Review score payload. `apps.exam_reviews.services.release_exam_review` will call that function inside its existing database transaction before changing the review to `FINALIZED`.

No new database model or cross-app foreign key is required. The existing unique constraint on `(session, candidate_id)` identifies the Score Management record, while the Exam Review's `exam_set_code` selects the target Score Management `ExamSet`.

## Matching and field mapping

The handoff must find exactly one `apps.results.models.ExamSet` whose `code` equals `ExamReviewRecord.exam_set_code`.

- No matching ExamSet: return HTTP `409` and keep the Exam Review `GRADED`.
- More than one matching ExamSet across sessions: return HTTP `409` and keep the Exam Review `GRADED`.
- Exactly one match: use that ExamSet's session and ranking population.

The `CandidateScore` fields are populated as follows:

| CandidateScore field | Source |
|---|---|
| `session` | matched Score Management ExamSet |
| `ranking_population` | matched Score Management ExamSet |
| `exam_set` | matched Score Management ExamSet |
| `candidate_id` | linked `StudentApplication.candidate_id` |
| `lrn` | linked `StudentApplication.lrn` |
| `candidate_name` | linked personal-info first, middle, last, and suffix values, with empty parts omitted |
| `raw_score` | `ExamReviewRecord.total_score` |
| `max_score` | `ExamReviewRecord.max_score` |
| `final_score` | `(total_score / max_score) * 100`, rounded half-up to two decimal places |
| `review_status` | `APPROVED` |
| `release_status` | `NOT_RELEASED` |

A newly created score receives the deterministic ID `EXAM-REVIEW-{review UUID}`. The existing 80-character primary-key limit accommodates this value.

The handoff rejects an application without a candidate ID or 12-digit LRN, and rejects a score with a zero maximum or values outside the `CandidateScore` numeric limits. These are safe `409` release conflicts; no partial write occurs.

## Existing-score behavior

The service looks up an existing `CandidateScore` by the target session and candidate ID.

- If none exists, it creates the score using the mapping above.
- If one exists and the session is `READY_FOR_PROCESSING`, the service updates the source score, identity snapshot, ExamSet, and ranking population.
- If the session was already processed or results were released, the service rejects the handoff with HTTP `409`.
- If the existing candidate score has ranking, processing-batch, processed-at, released-at, or released-status data, the service rejects the handoff even if the session status is inconsistent.

This prevents a late Exam Review release from silently invalidating official ranking or release data.

## Transaction and locking

The release operation remains one `transaction.atomic` unit. It locks the Exam Review, target Score Management ExamSet/session, and any existing candidate score before writing. The order is:

1. Validate that the review is `GRADED` and has zero pending subjective items.
2. Resolve and validate the Score Management ExamSet/session.
3. Create or safely update the CandidateScore.
4. Mark the Exam Review `FINALIZED` and record reviewer/time metadata.

Any exception rolls back both the CandidateScore write and Exam Review finalization.

## API and frontend behavior

The existing release endpoint and response shape remain unchanged. On success, the frontend changes to the finalized state only after receiving the API response and may continue to display `Released to Score Management`, which will then be truthful.

On a handoff conflict, the backend uses the repository's structured error envelope and the frontend displays the returned message. The release button remains available after an error so an administrator can correct the missing or ambiguous Score Management configuration and retry.

## Development seed alignment

Synthetic Exam Review data will use a Score Management exam-set code that exists after running the existing Score Management seed command, and synthetic applications will receive valid 12-digit LRNs. Running both seed commands will therefore provide a demonstrable end-to-end handoff without making either seed command own the other app's records.

## Testing

Backend tests will prove:

- a graded, complete review creates an approved CandidateScore with the exact mapped values and becomes finalized;
- an eligible unprocessed CandidateScore is updated rather than duplicated;
- a missing or ambiguous ExamSet returns `409` without finalizing;
- a processed or released score/session returns `409` without changing either record;
- invalid candidate identity returns `409` without partial writes;
- the computed percentage uses two-decimal half-up rounding; and
- existing pending-subjective and grading-state guards continue to work.

Frontend tests will continue to prove that success changes the UI to `Released to Score Management` and a backend conflict is displayed without changing the review to finalized.

## Non-goals

- Ranking and percentile calculation
- Score batch processing
- Student-facing results release
- Government reporting or analytics
- Event queues, outbox tables, or background workers
- Historical backfill of already-finalized Exam Reviews

## Rollback

Because the design adds no schema, rollback consists of reverting the service, test, seed, and documentation changes. CandidateScore records already handed off are production data and must not be deleted automatically; any data rollback requires an explicitly reviewed administrative operation.
