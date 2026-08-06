# I.Sandoval Task Brief

Date: 2026-08-06  
Owner: Ian Chris Sandoval (`i.sandoval`)  
Worktree: `worktrees/i.sandoval/`  
Primary branch: `i.sandoval/exam-sets`

## Active Sprint Scope

### Exam Sets — BRD-02 Item Bank

**Status:** Implemented under a reviewed plan; ready for review and demo/release follow-up.

The original sprint brief described Exam Sets as a prototype-only screen because an API did not then exist. That assessment is now stale: Exam Sets has been integrated with the backend-owned, versioned API. The frontend uses a typed service and remote-state hook; it does not treat mock data or browser-local state as authoritative.

**Approved scope**

- Support the existing Exam Set list, detail, clone, and lifecycle-transition workflow.
- Keep transport mapping in frontend services and keep backend workflow, validation, authorization, and state transitions authoritative.
- Preserve loading, empty, error, permission-denied, and mutation states.
- Use synthetic data only in tests, fixtures, documentation, and demonstrations.

**Out of scope**

- New Exam Sets product behavior, lifecycle states, permission models, data-model changes, or API contracts without a new reviewed plan.
- Treating frontend validation, routes, or stored browser state as an authorization or integrity control.
- Storing sensitive exam content or credentials in browser storage, documentation, logs, screenshots, or fixtures.

**Authoritative artifacts**

- Design: [Exam Sets API Integration Design](specs/2026-08-05-exam-sets-api-integration-design.md)
- Reviewed implementation plan: [Exam Sets API Integration Implementation Plan](plans/2026-08-05-exam-sets-api-integration.md)
- Implementation and verification record: [I.Sandoval Implementation Log](implement/i.sandoval.implement.md)

**Post-implementation follow-up**

- [x] Review the implementation and verification evidence before merging/releasing. (Merged to `main` via PR #80.)
- [x] Resolve or explicitly accept the frontend baseline failures and environmental limits recorded in the implementation log. (Both `apiClient.test.ts` and `RouteGuards.test.tsx` fixed by `11ff29d`; confirmed passing after fast-forwarding this branch to `main`. See the 2026-08-06 follow-up entry in the implementation log.)
- [x] Rehearse the Exam Sets demo using synthetic data only. (Completed 2026-08-06 against real dev servers with a real login and real, unmocked API calls. Found and fixed a P0 blocker in the process — `_actor_profile()` rejected every real (non-`force_authenticate`) login with 403 on all Exam Set/Blueprint/Question write operations; see implementation log for root cause, fix, and the new regression test.)
- [x] Before production use, complete a PostgreSQL-compatible migration rehearsal. (Completed 2026-08-06 against a disposable `postgres:16` container: full migration graph applies cleanly, `apps.results`/`apps.exams` suites pass, full suite parity with SQLite. See implementation log.)
- [x] Security review of this diff. (Completed 2026-08-06: no high/medium findings in the code changes; a pre-existing, repository-wide dependency vulnerability scan is recorded in the implementation log for release-review visibility. See implementation log.)
- [x] Formal release sign-off by a designated reviewer. Approved 2026-08-06 by Ian Chris Sandoval on review of the recorded evidence. See the implementation log's "Release sign-off" entry.

### Maintenance Table — Exam Blueprint (Ticket 001)

**Status:** Deferred; no implementation is authorized.

The Blueprint maintenance-table scope remains blocked on approved ownership, lifecycle, authorization, persistence, API-contract, validation, and audit decisions. The separate Exam Sets integration does not resolve those questions and must not be used as authorization to implement this ticket.

**Resumption gates**

- [ ] Product/sprint ownership explicitly reprioritizes the ticket and assigns an iteration.
- [ ] The Blueprint-versus-Exam-Set boundary and catalog ownership are approved and documented.
- [ ] Authorized operations, lifecycle, validation, audit events, and sensitive-data handling are approved.
- [ ] The backend persistence approach and versioned API contract are reviewed.
- [ ] A test-first implementation plan is reviewed and approved before code changes begin.

## Guardrails

- Follow the reviewed plan → test → implement → review workflow for every change.
- Keep frontend and backend independently deployable and connected only through documented versioned API contracts.
- Never commit or expose credentials, tokens, database URLs, personal data, real exam content, answer keys, or proctoring evidence.
- Report only checks that were actually run; record exact commands and results in the implementation log.
- Do not modify Ticket 001 application code, configuration, schema, endpoint, migration, or tests until all resumption gates are met.

## Source References

- [Repository instructions](../../../AGENTS.md)
- [Sprint task brief](../../../PhilSLA_Friday_Sprint_Task_Briefs%20(5)%201.md)
- [Current Ticket 001 decision record](../../../task.md)
- [Build plan](../../../build_plan.md)
