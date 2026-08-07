# Score Release Notification Outbox Plan

Owner: A.Depositar  
Module: Score Management  
Date: 2026-08-06

## Context

Score Management release currently sends result-available email notifications during the release request. That makes the admin action depend on SMTP latency and can be slow during performance testing.

The release action should remain fast and production-ready by marking results as released and queueing notification work durably. Email delivery should run separately through a dispatch command.

## Scope

- Add a durable Score Management notification outbox model.
- Queue result-available email notifications when a score session is released.
- Keep the release endpoint from sending email synchronously.
- Add a management command that sends queued notifications.
- Preserve the existing branded email content and avoid including score/rank/percentile values in the email.
- Keep seed/synthetic `@philsa.example.test` addresses skipped.

## Tasks

1. Add tests showing release queues notifications without sending email immediately.
2. Add tests showing the dispatch command sends the queued branded email.
3. Add `ScoreReleaseNotification` model, statuses, uniqueness, and indexes.
4. Refactor `release_score_session` to bulk-create notification rows.
5. Add `dispatch_score_release_notifications` service and management command.
6. Update API/development docs and implementation log.
7. Run focused backend checks.

## Acceptance Checks

- Releasing a processed session returns quickly without SMTP sends.
- Eligible students get one queued notification per released score.
- Ambiguous or synthetic student application emails are skipped.
- Dispatch sends the branded email with only the portal link and no score values.
- Sent/failed state and attempt count are recorded.
