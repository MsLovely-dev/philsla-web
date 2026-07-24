# ADR-010: Backend Roles and Permissions

- Status: Accepted for the backend foundation
- Date: 2026-07-13
- Decision owners: `TBD`

## Context

PhilSA needs a backend-authoritative authorization model before protected business APIs are implemented. The BRD defines primary business roles, while `US-SR-002` defines the 12 portal login roles for authentication and the Student Registration module permission baseline.

Frontend route guards and mock roles are not authoritative. The backend must define the role catalog, permission checks, object scopes, and audit requirements used by APIs.

## Decision

Use backend-enforced single-role RBAC plus object-level authorization.

The backend accepts these 12 portal authentication roles for `US-SR-002`:

| Backend role | Baseline authorization intent |
| --- | --- |
| `STUDENT` | After approved account activation, access the student's own application, exam, permit, support, and released result records. |
| `ADMISSIONS_REVIEWER` | Review assigned student applications, verification evidence, correction requests, approvals, rejections, and scheduling-related review actions. |
| `PROCTOR` | Manage assigned exam-day readiness, attendance, check-in, device readiness, monitoring, and incident reporting for assigned centers or sessions. |
| `PROCTOR_ADMIN` | Administer approved proctoring operations and testing-center proctor/device workflows within assigned scope. Human portal login only; PC/Tauri-app enrollment is out of scope for this role's login. |
| `UNIVERSITY_ADMIN` | Manage university-scoped courses, quotas, applicant views, schedules, and admission decisions within assigned university boundaries. |
| `TESTING_CENTER_ADMIN` | Manage assigned testing-center operations, proctor assignments, room/device readiness, and center-level administration. |
| `EXAM_ADMINISTRATOR` | Manage assessment operations, exam configuration, blueprints, exam sets, release workflows, and nationwide exam administration actions. |
| `SYSTEM_ADMIN` | Manage platform administration, internal user accounts, account statuses, approved role assignments, system configuration, and operational maintenance. |
| `CHED_ADMIN` | Access approved CHED oversight/reporting functions with agency-scoped, minimized data. |
| `DEPED_ADMIN` | Access approved DepEd oversight/reporting functions with agency-scoped, minimized data. |
| `TESDA_ADMIN` | Access approved TESDA oversight/reporting functions with agency-scoped, minimized data. |
| `EXECUTIVE` | Access approved reporting and analytics, preferably aggregate or minimized data, without operational mutation rights. |

Authorization rules:

- Derive identity, account status, role assignments, and permission decisions from backend server-side state.
- Do not accept client-submitted roles, route names, dashboard choices, or local-storage values as authorization evidence.
- Deny access by default unless an endpoint grants a role and object scope explicitly.
- Enforce exactly one role per account. Role reassignment requires an audited `SYSTEM_ADMIN` action.
- Combine role checks with object-level scopes such as application ownership, assigned reviewer, assigned university, assigned testing center, assigned exam session, assigned grading queue, or approved reporting jurisdiction.
- Keep `SYSTEM_ADMIN` administrative power explicit. A system administrator can manage platform configuration and accounts, but must not bypass business workflow approvals unless a specific endpoint grants that action.
- Audit role assignments, role removals, permission-impacting account changes, privileged administrative actions, and sensitive workflow decisions.

## Student Registration module permission baseline

Permission codes:

- `F`: full CRUD.
- `A`: read plus action.
- `C`: create or submit only.
- `R`: read only.
- `X`: no access.

| Action / permission | Student | Admission Reviewer | Proctor | Proctor Admin | University Admin | Testing Ctr Admin | Exam Admin | System Admin | CHED Admin | DepEd Admin | TESDA Admin | Executive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create own registration account | C | X | X | X | X | X | X | X | X | X | X | X |
| Edit personal and LRN-linked profile before submission | F | X | X | X | X | X | X | R | X | X | X | X |
| Upload or replace required documents before submission | F | X | X | X | X | X | X | R | X | X | X | X |
| Submit application and lock profile/document fields | A | X | X | X | X | X | X | X | X | X | X | X |
| View own registration status and submitted data | R | X | X | X | X | X | X | X | X | X | X | X |
| Withdraw or cancel own application before decision | A | X | X | X | X | X | X | X | X | X | X | X |
| View a submitted registration record individually | X | R | X | X | R | X | X | F | X | X | X | X |
| Flag a record for correction or resubmission | X | A | X | X | X | X | X | F | X | X | X | X |
| Manually correct a record on student's behalf | X | X | X | X | X | X | X | F | X | X | X | X |
| Delete or purge a registration record | X | X | X | X | X | X | X | F | X | X | X | X |
| Trigger or re-trigger LRN identity verification | C | A | X | X | X | X | X | F | X | X | X | X |
| View bulk list of registrations, excluding individual detail | X | R | X | X | R | X | X | F | X | X | X | X |

Proctor, Proctor Admin, Testing Center Admin, Exam Admin, CHED Admin, DepEd Admin, TESDA Admin, and Executive have no access to individual Student Registration records in this module unless a later approved requirement changes this matrix.

Frontend prototype role alignment:

| Frontend prototype role | Backend treatment |
| --- | --- |
| `STUDENT` | Accepted backend role. |
| `ADMISSIONS_REVIEWER` | Accepted backend role. |
| `PROCTOR` | Accepted backend role. |
| `PROCTOR_ADMIN` | Accepted backend role. |
| `UNIVERSITY_ADMIN` | Accepted backend role. |
| `TESTING_CENTER_ADMIN` | Accepted backend role. |
| `EXAM_ADMINISTRATOR` | Accepted backend role. |
| `SYSTEM_ADMIN` | Accepted backend role. |
| `EXECUTIVE` | Accepted backend role. |
| `GOVERNMENT` | Prototype grouping only. Replace with agency-specific `CHED_ADMIN`, `DEPED_ADMIN`, or `TESDA_ADMIN` roles for backend authentication. |
| `ITEM_WRITER` | Prototype/functional assessment label only until a later assessment-content ADR accepts it as a login role or permission. |
| `GRADER` | Prototype/functional scoring label only until a later scoring ADR accepts it as a login role or permission. |
| `ACADEMIC_REVIEWER` | Prototype/functional assessment-review label only until separately approved. |
| `TECH_SUPPORT` | Prototype-only until approved. Support personnel accounts are allowed by the provisioning decision, but exact support permissions remain `TBD` and must be least-privilege and audited. |

## Consequences

- Backend permission classes and service-layer checks must be built around this role catalog and deny-by-default object scopes.
- Frontend mock roles that are not in the accepted backend catalog must not be sent as authoritative roles to the backend.
- Account-role storage and admin flows must reject or flag attempts to assign a second role to the same account.
- P1 and P2 APIs must define endpoint-specific permissions before implementation.
- Future acceptance of `ITEM_WRITER`, `GRADER`, `ACADEMIC_REVIEWER`, `GOVERNMENT`, or `TECH_SUPPORT` as backend login roles requires an update to this ADR or a successor ADR.

## Alternatives considered

- Adopt every frontend prototype role as a backend role: rejected because prototype route guards include exploratory roles not yet approved by `US-SR-002`.
- Use role checks only: rejected because PhilSA data access depends on ownership, assignment, jurisdiction, workflow state, and release state.
- Support multiple roles per account: rejected because `US-SR-002` requires exactly one role and one security tier per account for auditability.
- Grant unrestricted business workflow authority to `SYSTEM_ADMIN`: rejected because administrative account control should not automatically bypass domain approvals, segregation of duties, or audit expectations.
