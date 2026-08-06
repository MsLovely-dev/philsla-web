# System Integration DepEd LRN TBD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce sprint documentation that accurately explains PhilSLA's current System Integration state for LRN verification, with the external DepEd LRN API marked as an unresolved dependency.

**Architecture:** This is a documentation-only plan. It does not create a DepEd adapter, change PhilSLA's internal LRN endpoint, add mocks, or alter production settings. The plan records the existing internal PhilSLA boundary and the future external DepEd integration boundary so demo and stakeholder discussions do not overstate production readiness.

**Tech Stack:** Markdown documentation, existing PhilSLA API documentation, existing A.Depositar Superpowers docs.

## Global Constraints

- Do not write application code for System Integration in this sprint.
- Do not invent the DepEd LRN API contract.
- Mark the external DepEd LRN API, credentials, request shape, response shape, error mapping, rate limits, and SLA as `TBD`.
- Distinguish PhilSLA's internal LRN verification endpoint from the external DepEd LRN API.
- Use synthetic examples only.
- Do not include real LRN data, real student records, credentials, tokens, endpoint secrets, certificates, or raw integration payloads.
- Keep Score Management as A.Depositar's primary sprint priority.

---

### Task 1: System Integration DepEd LRN Documentation Plan

**Files:**
- Create: `docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md`
- Create: `docs/superpowers/a.depositar/plans/2026-08-06-system-integration-deped-lrn-tbd.md`
- Modify if needed: `docs/superpowers/a.depositar/a.depositar.task.md`
- Modify if needed: `docs/superpowers/a.depositar/implement/a.depositar.implement.md`

**Interfaces:**
- Consumes: `docs/api/API-ENDPOINTS.md`
- Consumes: `docs/architecture/BACKEND-ARCHITECTURE.md`
- Consumes: `docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md`
- Produces: a documentation-only System Integration plan for the external DepEd LRN API dependency.

- [x] **Step 1: Confirm existing PhilSLA internal LRN endpoint**

Read `docs/api/API-ENDPOINTS.md` and confirm it documents:

```text
POST /api/v1/applications/registration/lrn/verify/
```

Expected finding: PhilSLA's internal endpoint exists and is implemented with a synthetic local/test provider; the production provider remains `TBD`.

- [x] **Step 2: Confirm external DepEd LRN API is the unresolved dependency**

Read the API documentation and architecture notes for LRN/registry provider language.

Expected finding: the unresolved item is the real DepEd LRN provider contract, not PhilSLA's internal endpoint.

- [x] **Step 3: Create the System Integration spec**

Create:

```text
docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md
```

Required sections:

- Purpose.
- Current State.
- External DepEd LRN API Assumption.
- Current Demo Behavior.
- Future Integration Boundary.
- Data Handling Rules.
- Error Mapping Target.
- Related Integrations.
- Risks.
- Open Decisions.
- Sprint Talking Points.

- [x] **Step 4: Mark DepEd API details explicitly as unresolved**

In the spec, list the external DepEd API details that remain unresolved:

- Base URL and environment URLs.
- Authentication method.
- Authorization model and allowed PhilSLA client identity.
- Request payload shape.
- Response payload shape.
- Required search keys.
- Returned learner fields.
- Eligibility signals.
- Error codes and error semantics.
- Rate limits and throttling rules.
- Availability target, timeout expectations, and maintenance windows.
- Retry rules and idempotency expectations.
- Data retention and audit requirements.
- Security review and production credential handling.

- [x] **Step 5: Document the intended future integration boundary**

Add the boundary diagram:

```text
Frontend
  -> PhilSLA internal endpoint
  -> application service
  -> LRN registry provider interface
  -> DepEd LRN API adapter
```

Expected wording: the frontend should call only PhilSLA's internal endpoint; the backend should own the DepEd adapter and response shaping.

- [x] **Step 6: Document demo-safe behavior**

Record that local/test verification uses synthetic records and proves only PhilSLA's internal adapter boundary, not the real DepEd connection.

Expected wording: this is demo-safe behavior only.

- [x] **Step 7: Document security and data-handling constraints**

Record these rules:

- Do not commit DepEd credentials, tokens, endpoint secrets, or certificates.
- Do not log raw DepEd request or response payloads.
- Do not expose raw DepEd payloads to the browser.
- Store only approved minimal verification references and profile fields.
- Use synthetic data in local development, tests, fixtures, screenshots, and demos.
- Treat LRN, birth date, school record data, and verification results as sensitive student information.

- [x] **Step 8: Create this implementation plan**

Create:

```text
docs/superpowers/a.depositar/plans/2026-08-06-system-integration-deped-lrn-tbd.md
```

Expected result: the plan is documentation-only and does not instruct any worker to implement a DepEd adapter.

- [ ] **Step 9: Update A.Depositar task brief if System Integration status needs to be visible**

If the sprint brief needs to show that System Integration now has documentation artifacts, update:

```text
docs/superpowers/a.depositar/a.depositar.task.md
```

Add or update a short section:

```markdown
## System Integration Documentation

- [x] Document external DepEd LRN API as TBD.
- [x] Clarify that PhilSLA's internal LRN verification endpoint exists.
- [x] Keep System Integration documentation-only for the sprint.
```

Verification: read the updated section back and confirm it does not reprioritize System Integration above Score Management.

- [ ] **Step 10: Update implementation log if a sprint paper trail is required**

If the sprint paper trail needs the work recorded, update:

```text
docs/superpowers/a.depositar/implement/a.depositar.implement.md
```

Add a section:

```markdown
## System Integration - DepEd LRN API TBD Documentation

Created documentation clarifying that PhilSLA's internal LRN verification endpoint exists, while the real external DepEd LRN API contract remains TBD. No application code, settings, migrations, or tests were changed.

Verification:
- Read back `docs/superpowers/a.depositar/specs/2026-08-06-system-integration-deped-lrn-tbd.md`.
- Read back `docs/superpowers/a.depositar/plans/2026-08-06-system-integration-deped-lrn-tbd.md`.
```

Verification: read the updated implementation log and confirm it records no code changes.

- [ ] **Step 11: Perform documentation verification**

Run:

```powershell
Get-Content docs\superpowers\a.depositar\specs\2026-08-06-system-integration-deped-lrn-tbd.md
Get-Content docs\superpowers\a.depositar\plans\2026-08-06-system-integration-deped-lrn-tbd.md
rg -n "DepEd LRN API|external DepEd|POST /api/v1/applications/registration/lrn/verify|LRN_REGISTRY_PROVIDER|TBD" docs\superpowers\a.depositar\specs docs\superpowers\a.depositar\plans
```

Expected result:

- The spec and plan both read correctly.
- The docs distinguish the internal PhilSLA endpoint from the external DepEd API.
- The external DepEd API remains marked `TBD`.
- No application tests are required because the work is documentation-only.
