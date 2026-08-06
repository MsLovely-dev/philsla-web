# A.Depositar Implementation Log

Owner: A.Depositar
Primary story: Score Management
System Integration: Parked

## 2026-08-05 - Documentation Setup

Plan/spec reference:

- `docs/superpowers/a.depositar/a.depositar.task.md`
- `docs/superpowers/a.depositar/specs/2026-08-05-score-management-demo-scope.md`
- `docs/superpowers/a.depositar/plans/2026-08-05-score-management-demo-verification.md`

Work completed:

- Created the A.Depositar per-developer Superpowers documentation structure.
- Corrected Score Management sprint scope from prototype-only to backend-backed demo/verification.
- Parked System Integration as non-priority for the sprint.
- Recorded initial demo path, guardrails, verification plan, and acceptance criteria.

Application files changed:

- None.

Verification:

- Documentation-only change.
- Link and factual-consistency review completed during the 2026-08-05 completion audit.

## 2026-08-05 - Completion Audit

Approved plan:

- `docs/superpowers/a.depositar/plans/2026-08-05-score-management-demo-verification.md`

Commands run:

- `git branch --show-current`
- `if (Test-Path worktrees\a.depositar) { 'worktree exists' } else { 'worktree missing' }`
- Score Management path existence check for all files named in the verification plan.
- `python manage.py check --settings=config.settings.local` from `backend/`
- `..\venv\Scripts\python.exe manage.py check --settings=config.settings.local` from `backend/`
- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models apps.results.tests.test_score_management_seed_command --settings=config.settings.test` from `backend/`
- `..\venv\Scripts\python.exe manage.py check --settings=config.settings.local` from `backend/` after backend repairs
- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models apps.results.tests.test_score_management_seed_command --settings=config.settings.test` from `backend/` after backend repairs
- `npm test -- ScoreManagement ScoreCandidateDetail scoreManagementService` from `frontend/`
- `npm run lint` from `frontend/`

Observed results:

- Current checkout is `main`, not `a.depositar/score-management`.
- `worktrees/a.depositar/` is missing.
- All Score Management file paths named in the verification plan exist.
- Backend check with the default `python` failed before Django setup completed: `ModuleNotFoundError: No module named 'rest_framework_simplejwt'`.
- Backend check with `..\venv\Scripts\python.exe` failed before Django setup completed: `django.core.exceptions.ImproperlyConfigured: Application labels aren't unique, duplicates: results`.
- Focused backend Score Management tests with `..\venv\Scripts\python.exe` failed before tests ran for the same duplicate `results` app-label issue.
- Retry with `..\venv\Scripts\python.exe` then exposed malformed merged backend artifacts in `apps.results`: invalid `models.py` indentation, malformed `urls.py`, invalid `from __future__` placement in `views.py` and `services.py`, malformed `0001_initial.py`, and conflicting results migration leaves.
- After repairing those backend artifacts, `..\venv\Scripts\python.exe manage.py check --settings=config.settings.local` passed: `System check identified no issues (0 silenced).`
- After repairing those backend artifacts, focused backend Score Management tests passed: 33 tests.
- First frontend focused test attempt failed in the sandbox with `Error: spawn EPERM` while Vitest/Vite started esbuild.
- Frontend focused tests passed after escalation: 3 test files passed, 16 tests passed.
- `npm run lint` failed with existing TypeScript errors outside the Score Management files and missing export dependencies (`fflate`, `jspdf`, `jspdf-autotable`).

Code changes:

- Repaired malformed backend results configuration and source files enough for Django check and focused backend Score Management tests to run:
  - `backend/config/settings/base.py`
  - `backend/config/urls.py`
  - `backend/apps/results/models.py`
  - `backend/apps/results/urls.py`
  - `backend/apps/results/views.py`
  - `backend/apps/results/services.py`
  - `backend/apps/results/migrations/0001_initial.py`
  - `backend/apps/results/migrations/0006_merge_score_management_and_exam_review.py`
- Documentation checklists and this implementation log were updated to reflect observed status.

Notes:

- Backend verification now passes with the repo venv.
- Frontend focused tests for Score Management passed; repository-wide TypeScript lint remains failing due unrelated files and missing export dependencies.
- System Integration remains parked.

## 2026-08-05 - Score Candidate Account Seed

Plan/spec reference:

- `docs/superpowers/a.depositar/specs/2026-08-05-score-candidate-account-seed-design.md`
- `docs/superpowers/a.depositar/plans/2026-08-05-score-candidate-account-seed.md`

Work completed:

- Extended `seed_score_candidate_profiles` so score-seeded candidates receive synthetic student accounts.
- Linked seeded `StudentApplication.owner` to the synthetic student user.
- Created or reused `AccountProfile` rows with role `STUDENT` and matching LRN.
- Created inherited `AccountRoleAssignment` rows for seeded student profiles.
- Kept `--reset` scoped to seeded application rows; existing accounts are not deleted.

Test-first evidence:

- Added failing test in `backend/apps/results/tests/test_score_management_seed_command.py`.
- Red run: `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_seed_command --settings=config.settings.test`
- Red result: failed because seeded applications had `owner=None`.
- Green run: same focused seed command test.
- Green result: passed, 2 tests.

Verification:

- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_seed_command --settings=config.settings.test`
  - Passed, 2 tests.
- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test`
  - Passed, 23 tests.
- `..\venv\Scripts\python.exe manage.py check --settings=config.settings.local`
  - Passed, `System check identified no issues (0 silenced).`

Files changed:

- `backend/apps/applications/management/commands/seed_score_candidate_profiles.py`
- `backend/apps/results/tests/test_score_management_seed_command.py`
- `docs/superpowers/a.depositar/specs/2026-08-05-score-candidate-account-seed-design.md`
- `docs/superpowers/a.depositar/plans/2026-08-05-score-candidate-account-seed.md`
- `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

## 2026-08-06 - Score Management Three Demo Batches

Plan reference:

- `docs/superpowers/a.depositar/plans/2026-08-06-score-management-three-demo-batches.md`

Work completed:

- Updated the deterministic Score Management seed to create three demo batches:
  - `SESSION-2027-REGULAR`
  - `SESSION-2027-STEM`
  - `SESSION-2027-SPECIAL`
- Kept `SESSION-2027-REGULAR` available for existing demo links and API tests.
- Made `--count` mean candidates per batch. For example, `--count 500` now creates 1,500 score rows across three batches.
- Added unique candidate IDs, score IDs, LRNs, ranking population IDs, and exam set IDs for each batch.
- Updated seed command output to report total records across all batches.
- Updated linked student profile seed expectations so candidate applications/accounts can be created for all three demo batches.

Test-first evidence:

- Added failing test in `backend/apps/results/tests/test_score_management_seed_command.py`.
- Red run: `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_seed_command --settings=config.settings.test`
- Red result: failed because only `SESSION-2027-REGULAR` existed.

Verification:

- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_seed_command apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models --settings=config.settings.test`
  - Passed, 35 tests.
- `..\venv\Scripts\python.exe manage.py check --settings=config.settings.local`
  - Passed, `System check identified no issues (0 silenced).`

Files changed:

- `backend/apps/results/services.py`
- `backend/apps/results/management/commands/seed_score_management.py`
- `backend/apps/results/tests/test_score_processing.py`
- `backend/apps/results/tests/test_score_management_api.py`
- `backend/apps/results/tests/test_score_management_seed_command.py`
- `docs/superpowers/a.depositar/plans/2026-08-06-score-management-three-demo-batches.md`
- `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

## 2026-08-06 - Score Release Email Notification

Plan reference:

- `docs/superpowers/a.depositar/plans/2026-08-06-score-release-email-notification.md`

Work completed:

- Added student email availability notification after successful Score Management release.
- Added a branded HTML email alternative aligned with the current PhilSLA email/UI style.
- Email links to the Student Portal results page.
- Email does not include score, rank, percentile, LRN, answer content, or qualification details.
- Missing or ambiguous application matches are skipped without rolling back the release.
- Seeded synthetic emails ending in `@philsa.example.test` are skipped so local/demo releases do not spend time sending hundreds of placeholder notifications.
- Release API now returns sent, skipped, and failed notification counts.

Test-first evidence:

- Added failing release email test in `backend/apps/results/tests/test_score_management_api.py`.
- Red run: `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api.ScoreManagementApiTests.test_release_sends_result_available_email_without_scores --settings=config.settings.test`
- Red result: failed with missing `notificationSentCount` in release response.
- Green run: same focused release email test.
- Green result: passed.
- Added failing branded-email assertion for the HTML alternative.
- Red result: failed because the release email had no HTML alternative.
- Green result: passed after switching release notifications to `EmailMultiAlternatives`.
- Added failing synthetic seed email skip test.
- Red result: release sent to `@philsa.example.test`.
- Green result: release skipped seeded synthetic email while preserving real email notification behavior.

Verification:

- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api.ScoreManagementApiTests.test_release_sends_result_available_email_without_scores --settings=config.settings.test`
  - Passed, 1 test.
- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api.ScoreManagementApiTests.test_release_skips_email_when_application_match_is_ambiguous --settings=config.settings.test`
  - Passed, 1 test.
- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test`
  - Passed, 26 tests.
- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_seed_command apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models --settings=config.settings.test`
  - Passed, 38 tests.
- `..\venv\Scripts\python.exe manage.py check --settings=config.settings.local`
  - Passed, `System check identified no issues (0 silenced).`

Files changed:

- `backend/apps/results/services.py`
- `backend/apps/results/views.py`
- `backend/apps/results/tests/test_score_management_api.py`
- `docs/api/API-ENDPOINTS.md`
- `docs/superpowers/a.depositar/specs/2026-08-06-us-sr-014-score-management.md`
- `docs/superpowers/a.depositar/plans/2026-08-06-score-release-email-notification.md`
- `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

## 2026-08-06 - Score Release Notification Outbox

Plan reference:

- `docs/superpowers/a.depositar/plans/2026-08-06-score-release-notification-outbox.md`

Work completed:

- Replaced synchronous release email sending with a durable Score Management notification outbox.
- Added `ScoreReleaseNotification` with pending/sent/failed status, attempts, failure reason, queued timestamp, sent timestamp, uniqueness, and dispatch indexes.
- Updated release to bulk-queue eligible student notifications and return `notificationQueuedCount`.
- Added `dispatch_score_release_notifications --limit N` to send queued result-available emails out-of-band.
- Preserved the branded HTML email and no-score/no-rank/no-LRN safety rule.
- Kept ambiguous application matches and seeded synthetic `@philsa.example.test` emails skipped.
- Added read-only Django admin visibility for queued release notifications.

Test-first evidence:

- Red run: `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test`
- Red result: failed because `ScoreReleaseNotification` did not exist.
- After adding the model/service/command, the focused API suite exposed an invalid `.values("personal")` query against a property-backed application field.
- Fixed the queue builder to select related `personal_info` application objects instead.

Verification:

- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test`
  - Passed, 27 tests.
- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_seed_command apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models --settings=config.settings.test`
  - Passed, 39 tests.
- `..\venv\Scripts\python.exe manage.py check --settings=config.settings.local`
  - Passed, `System check identified no issues (0 silenced).`
- `..\venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local`
  - Passed, `No changes detected.`

Files changed:

- `backend/apps/results/admin.py`
- `backend/apps/results/models.py`
- `backend/apps/results/migrations/0007_scorereleasenotification.py`
- `backend/apps/results/services.py`
- `backend/apps/results/views.py`
- `backend/apps/results/management/commands/dispatch_score_release_notifications.py`
- `backend/apps/results/tests/test_score_management_api.py`
- `docs/api/API-ENDPOINTS.md`
- `docs/superpowers/a.depositar/plans/2026-08-06-score-release-notification-outbox.md`
- `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

## 2026-08-06 - Score Release Email Background Worker

Plan reference:

- User-approved plan: add lightweight Django RQ + Redis background dispatch for Score Management release emails.

Work completed:

- Added `django-rq` to backend dependencies and configured the default RQ queue through `REDIS_URL`.
- Added `SCORE_RELEASE_EMAIL_AUTO_ENQUEUE` and `SCORE_RELEASE_EMAIL_DISPATCH_BATCH_SIZE` settings.
- Added `apps.results.jobs.dispatch_score_release_notification_batch()` to reuse the existing outbox dispatch service.
- Updated `release_score_session()` to enqueue the dispatch job with `transaction.on_commit()` after notification rows are queued.
- Kept tests isolated from Redis by disabling auto-enqueue in test settings and mocking the enqueue path in the focused test.
- Required `REDIS_URL` in production settings so production does not silently run without the worker backend.
- Documented local worker startup and manual fallback dispatch.

Test-first evidence:

- Added failing test in `backend/apps/results/tests/test_score_management_api.py` for release auto-enqueue.
- Red result: enqueue mock was not called because `TestCase` defers `transaction.on_commit()` callbacks.
- Updated the test to use `captureOnCommitCallbacks(execute=True)`.
- Green result: focused Score Management API tests passed.

Verification:

- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_management_api --settings=config.settings.test`
  - Passed, 28 tests.
- `..\venv\Scripts\python.exe manage.py test apps.results.tests.test_score_processing apps.results.tests.test_score_management_seed_command apps.results.tests.test_score_management_api apps.results.tests.test_score_management_models --settings=config.settings.test`
  - Passed, 40 tests.
- `..\venv\Scripts\python.exe manage.py check --settings=config.settings.local`
  - Passed, `System check identified no issues (0 silenced).`
- `..\venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local`
  - Passed, `No changes detected.`
- Production settings check with fake non-secret env values:
  - `..\venv\Scripts\python.exe manage.py check --settings=config.settings.production`
  - Passed, `System check identified no issues (0 silenced).`

Dependency note:

- `..\venv\Scripts\pip-compile.exe --output-file=requirements\base.txt --strip-extras requirements\base.in` was used to regenerate the lock.
- The local launcher did not have Python 3.13 available (`py -3.13 --version` failed), so the lock was generated by the current venv runtime.

Files changed:

- `backend/.env.example`
- `backend/README.md`
- `backend/config/settings/base.py`
- `backend/config/settings/production.py`
- `backend/config/settings/test.py`
- `backend/requirements/base.in`
- `backend/requirements/base.txt`
- `backend/apps/results/jobs.py`
- `backend/apps/results/services.py`
- `backend/apps/results/tests/test_score_management_api.py`
- `docs/api/API-ENDPOINTS.md`
- `docs/superpowers/a.depositar/implement/a.depositar.implement.md`
