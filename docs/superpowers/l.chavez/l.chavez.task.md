# L.Chavez Task Brief

Owner: L.Chavez
Sprint branch in local checkout: `l.chavez/student-reg`
Branch named in `build_plan.md`: `l.chavez/student-registration`
Primary story: Student Registration
Secondary stories: User Account Creation (RBAC), Review Student Application

## Sprint Order

1. Student Registration
2. User Account Creation (RBAC)
3. Review Student Application

Registration goes first because it is the active branch and the sprint plan names it as the Thursday AM deliverable. RBAC follows because account creation and role assignment are foundational to approved-registration activation. Review Application is last because the sprint plan explicitly allows it to slip to Friday AM if needed.

## Student Registration Scope

Standardize the backend-generated candidate ID prefix away from `PS-` and onto `PHL-`.

Target format:

```text
PHL-YYYY-XXXXXX
```

Reasoning:

- `build_plan.md` asks for the candidate ID prefix fix in `generate_candidate_id` and says to confirm no `PS-` references remain.
- `docs/api/API-ENDPOINTS.md` already uses Score Management examples such as `PHL-2027-000001`.
- `PHL-YYYY-XXXXXX` fits the existing `StudentApplication.candidate_id` `max_length=17`, avoiding a migration during this sprint.
- Existing active candidate IDs should not be mass-renamed without a separate migration and rollout review.

## Student Registration Pending Tasks

- [x] Get human approval for `docs/superpowers/l.chavez/specs/2026-08-05-student-registration-candidate-id-prefix.md`.
- [x] Get human approval for `docs/superpowers/l.chavez/plans/2026-08-05-student-registration-candidate-id-prefix.md`.
- [ ] Confirm whether to stay on local branch `l.chavez/student-reg` or rename/switch to the branch named in `build_plan.md`.
- [x] Update backend candidate ID generation and tests.
- [x] Update frontend candidate ID formatting helper and tests.
- [x] Update API documentation examples and contract text.
- [x] Search for remaining `PS-` candidate ID references and intentionally classify any non-registration synthetic data that remains.
- [x] Run focused backend application tests.
- [x] Run focused frontend utility tests.
- [x] Log implementation results in `docs/superpowers/l.chavez/implement/l.chavez.implement.md`.

## Later Story Notes

RBAC and Review Student Application remain active sprint stories, but they are outside this Student Registration plan. They need separate specs and reviewed plans before execution.
