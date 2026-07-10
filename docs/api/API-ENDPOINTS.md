# API Endpoints

## Current state

There are no implemented backend endpoints. The frontend currently uses mock/local services. Every path below is a capability inventory, not an approved or available contract.

## Candidate endpoint groups

| Capability | Candidate base path | Status |
| --- | --- | --- |
| Authentication and sessions | `/api/v1/auth` | `TBD` |
| Student registration/applications | `/api/v1/applications` | `TBD` |
| Student and registry verification | `/api/v1/verifications` | `TBD` |
| Assessments and question banks | `/api/v1/assessments` | `TBD` |
| Exam schedules, attempts, responses | `/api/v1/exams` | `TBD` |
| Proctoring sessions and incidents | `/api/v1/proctoring` | `TBD` |
| Scores and result release | `/api/v1/results` | `TBD` |
| Administrative users/configuration | `/api/v1/administration` | `TBD` |
| External integrations | `/api/v1/integrations` | `TBD` |
| Authorized audit queries | `/api/v1/audit-events` | `TBD` |

Do not implement from this table alone. For each endpoint, approve the actor, authorization rule, request/response schema, validation, state transition, idempotency/concurrency behavior, audit event, errors, rate limit, privacy classification, retention, and tests.

## Contract workflow

1. Link the endpoint to approved requirements in [BRD](../BRD.md), [modules](../MODULES.md), or [user stories](../USER_STORY.md).
2. Define the contract according to [API standards](API-STANDARDS.md).
3. Review security and privacy implications.
4. Implement backend and frontend service adapters against the same contract.
5. Add backend, contract, and relevant frontend tests before marking it available.
