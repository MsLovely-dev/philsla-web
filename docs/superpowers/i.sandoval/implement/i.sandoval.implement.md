# I.Sandoval Implementation Log

## Exam Sets API integration

- Date: 2026-08-05
- Branch: `i.sandoval/exam-sets`
- Reviewed plan: `docs/superpowers/i.sandoval/plans/2026-08-05-exam-sets-api-integration.md`
- Reviewed design: `docs/superpowers/i.sandoval/specs/2026-08-05-exam-sets-api-integration-design.md`

### Implemented

- Repaired pre-existing `apps.results` merge corruption that prevented Django from loading. Preserved both Score Management and Exam Review models, services, views, routes, and migrations in one linear migration graph.
- Added `current_version_id` to Blueprint list/create/update representations and documented the additive contract.
- Added typed Blueprint and Exam Set frontend transport mapping for list, create, update, clone, lifecycle transition, and delete.
- Added `useExamSets` to load Exam Sets, Blueprints, and Question Bank records concurrently and to preserve authoritative state on failed mutations.
- Replaced browser-persisted/mock Exam Set assemblies with the backend-backed Exam Sets workspace.
- Added loading, empty, retryable error, mutation error, responsive, keyboard-labelled form, ordered-question, delete-confirmation, server-validation, and workflow-history states.
- Removed `VALIDATING` and `RETIRED` from the Exam Set UI. Removed local assembly storage, mock hashes/signatures, package delivery, and testing-center sync from the Exam Set data path.
- Added a synthetic Playwright journey for remote list, create with Blueprint Version `42` and Question ID `101`, and transition to `ACADEMIC_REVIEW`.
- Enforced the backend lifecycle graph, validation gates, immutable approved/published metadata, and draft-only creation instead of trusting client-submitted status values.
- Restricted Exam Set endpoints and the matching frontend route to `EXAM_ADMINISTRATOR` and `SYSTEM_ADMIN`; narrower object-level assignment remains `TBD` because the current model has no regional or institutional owner.
- Preserved historical Blueprint Version references plus server-owned item points, Blueprint Section, and selection-method metadata during unrelated edits.
- Documented the complete Exam Set endpoint contract, transition conflicts, validation conflicts, and current nationwide administrative scope.
- Added transactional row locking for Exam Set update and transition workflows so stale instances cannot overwrite or bypass a concurrent lifecycle change.
- Added all-or-nothing item-reference validation: unknown or duplicate questions and unknown/cross-Blueprint sections return safe validation errors before existing items are replaced. Unknown Blueprint Version and academic-year references now use the same safe error envelope.
- Corrected academic-year update precedence so frontend name-based changes are applied, while unknown, invalid-ID, and conflicting ID/name references are rejected.

### Commits

- `fbd08af fix: align merged results backend`
- `3df81b6 feat: expose current blueprint version id`
- `b5445cb feat: add exam sets api service`
- `81988c7 feat: manage remote exam sets state`
- `94b8f79 feat: connect exam sets ui to api`
- `c459a40 feat: complete exam sets workflow`

### Verification evidence

Backend, from `backend/` using the Python 3.13 virtual environment:

- `.\.venv\Scripts\python.exe -m compileall apps\results config` — passed after the merge repair.
- `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.local` — passed; `No changes detected`.
- `.\.venv\Scripts\python.exe manage.py test apps.results.tests --settings=config.settings.test` — passed; 50 tests.
- `.\.venv\Scripts\python.exe manage.py test apps.exams.tests.ExamBlueprintApiTests --settings=config.settings.test` — first failed as expected with `KeyError: 'current_version_id'`, then passed; 2 tests.
- `.\.venv\Scripts\python.exe manage.py check --settings=config.settings.local` — passed; no issues.
- `.\.venv\Scripts\python.exe manage.py test apps.exams.tests.ExamSetApiTests --settings=config.settings.test` — failed first on unsafe reference handling, stale-instance lifecycle behavior, and ignored academic-year name updates, then passed; 8 tests.
- `.\.venv\Scripts\python.exe manage.py test apps.exams.tests --settings=config.settings.test` — passed; 11 tests, including lifecycle conflict, validation conflict, stale-instance, invalid-reference rollback, academic-year precedence, unauthenticated, and role-denied cases.
- `.\.venv\Scripts\python.exe manage.py test --settings=config.settings.test` — passed; 283 tests.

Frontend, from `frontend/`:

- `npm test -- backendExamBlueprintService.test.ts backendExamSetService.test.ts` — failed first for the missing Blueprint mapping/service, then passed; 3 tests.
- `npm test -- useExamSets.test.tsx` — failed first because the hook did not exist, then passed; 5 tests.
- `npm test -- ExamSets.test.tsx` — failed first against the mock/local page, then passed together with the matched hook tests; 9 tests in that run.
- `npm test -- backendExamBlueprintService.test.ts backendExamSetService.test.ts useExamSets.test.tsx ExamSets.test.tsx` — passed; 14 tests, including server metadata preservation and clone/transition/delete wiring.
- `npm run test:e2e -- exam-sets.spec.ts` — passed; 1 Chromium test.
- `npm test` — completed with 130 passing and 2 failing tests. Both failures were present in the pre-implementation baseline: `src/services/apiClient.test.ts` (`TypeError: object.stream is not a function`) and `src/routing/RouteGuards.test.tsx` (expected unauthorized redirect but rendered protected content).
- `npm run lint` — failed with 35 pre-existing TypeScript errors in unrelated pages and two existing `BackendQuestionBankService` result-narrowing errors. No errors referenced the changed Exam Sets page, hook, Exam Set service, or Blueprint service.
- `npm run build` — passed; Vite emitted only the existing large-chunk warning.
- `npm run test:e2e` — passed; 9 tests across Chromium and mobile Chromium. Vite logged non-fatal proxy connection warnings for two unrelated admin-auth endpoints because no live Django server was running for those requests.

### Skipped or environmental limits

- PostgreSQL-compatible integration verification was not run because no test `DATABASE_URL` or disposable PostgreSQL/Supabase environment was configured. The full Django suite used the repository test settings.
- The repaired `apps.results` migration graph rebases independently numbered Exam Review migrations after the Score Management sequence. Deployment to a database that already recorded the independent Exam Review migration names requires a reviewed PostgreSQL-compatible rehearsal and migration-history reconciliation before release.
- Production-settings validation was not required because production settings were unchanged.
- No real exam content, answer keys, credentials, personal data, package delivery, or testing-center payloads were used.
