# Student Registration Candidate ID Prefix

Date: 2026-08-05
Owner: L.Chavez
Status: Approved scope for implementation planning

## Problem

Student Registration currently creates applicant-facing candidate IDs with the `PS-` prefix. The sprint brief asks L.Chavez to plan a candidate ID prefix fix in `backend/apps/applications/models.py` and to confirm that no `PS-` references remain after execution.

The repository already contains a stronger candidate ID convention in Score Management API examples: `PHL-2027-000001`. The registration flow should align with that convention without expanding sprint scope into data migration or unrelated demo fixtures.

## Goal

New Student Registration applications should receive backend-generated candidate IDs in this format:

```text
PHL-YYYY-XXXXXX
```

`YYYY` is the registration year. `XXXXXX` is a six-character uppercase alphanumeric code generated from the existing non-ambiguous candidate-code alphabet.

## Non-Goals

- Rename existing persisted candidate IDs in local, shared, staging, or production databases.
- Add a migration solely to change `candidate_id` length.
- Change candidate IDs owned by unrelated modules unless they are registration contract examples or registration tests.
- Change authorization, registration validation, account activation, or admissions-review state transitions.
- Add dependencies.

## Current Behavior

`backend/apps/applications/models.py` defines `generate_candidate_id`. It currently returns `PS-YYYY-XXXX-XXXX` and `StudentApplication.save()` uses that helper when `candidate_id` is blank.

Registration API responses expose this value as read-only `candidateId`. Registration audit rows reuse the same candidate ID for `registration_id` and `applicant_id`.

The frontend helper `frontend/src/lib/utils.ts` also recognizes and formats candidate-like IDs with a `PS-` prefix.

## Proposed Behavior

`generate_candidate_id` should return `PHL-YYYY-XXXXXX`.

The `StudentApplication.candidate_id` field can remain `max_length=17` because `PHL-YYYY-XXXXXX` is exactly 15 characters. This avoids a migration and keeps the sprint change narrow.

Registration endpoint tests should assert the new format. Frontend utility tests should assert the new format for fallback display formatting. API docs should describe the new format and remove the registration contract claim that IDs are `PS-YYYY-XXXX-XXXX`.

## Data And Compatibility

Existing persisted candidate IDs remain valid records. This sprint plan changes generation and documented contract for new registrations only.

If production later requires historical candidate ID normalization, that should be handled by a reviewed migration and rollout plan because candidate IDs are shown to applicants, stored in audit logs, and referenced by downstream result and review surfaces.

## Acceptance Criteria

- [x] New backend-generated registration candidate IDs match `^PHL-\d{4}-[A-Z0-9]{6}$`.
- [x] Backend application endpoint tests assert `PHL-YYYY-XXXXXX`.
- [x] Frontend candidate ID utility tests assert `PHL-YYYY-XXXXXX`.
- [x] API documentation describes registration `candidateId` as `PHL-YYYY-XXXXXX`.
- [x] A repository search no longer finds `PS-` in Student Registration candidate ID generation, registration API contract docs, or registration utility tests, except the intentional negative assertion `self.assertNotIn("PS-", candidate_id)`.
- [x] Any remaining `PS-` references are intentionally outside this story or are called out before merge.

## Risks And Tradeoffs

Changing only new ID generation is lower risk than rewriting existing IDs. The tradeoff is that old local or seeded records may still display their original IDs until explicitly migrated.

Using `PHL-YYYY-XXXXXX` is narrower than `PHL-YYYY-XXXX-XXXX` because it avoids changing `candidate_id` length. The tradeoff is a six-character random code instead of an eight-character random code, but the existing alphabet still provides enough space for demo and normal registration volumes when combined with the database uniqueness check already in `StudentApplication.save()`.
