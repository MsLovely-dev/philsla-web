# Score Candidate Account Seed Design

Date: 2026-08-05
Owner: A.Depositar
Status: Approved for implementation

## Purpose

Score Management demo data needs matching student accounts and application profiles so Score Candidate Detail can display score-anchored registration information without resetting the database that contains account data.

## Design

Extend the existing `seed_score_candidate_profiles` management command. The command already creates synthetic `StudentApplication` records whose LRNs match `seed_score_management` candidates. It will now also create or reuse one synthetic Django user per score-seeded LRN, create or update the matching `AccountProfile` as `STUDENT`, create the inherited `AccountRoleAssignment`, and set `StudentApplication.owner` to that user.

## Data Rules

- Use synthetic data only.
- Match score candidates by LRN.
- Preserve existing matching student accounts where possible.
- Make the command idempotent.
- On `--reset`, delete only seeded application rows matching the deterministic score-seed LRNs; do not delete existing accounts.
- Use a deterministic default password for synthetic demo accounts only.

## Account Shape

- Username: `score.student.<candidate_id lowercased>`
- Email: `<first>.<last>.<candidate sequence>@philsa.example.test`
- Role: `STUDENT`
- AccountProfile.lrn: candidate LRN
- AccountRoleAssignment.permission_mode: `INHERIT`

## Acceptance Criteria

- Running `seed_score_management --count N --reset` followed by `seed_score_candidate_profiles --count N --reset` creates N `CandidateScore` rows and N matching `StudentApplication` rows.
- Every seeded application has an `owner`.
- Every owner has an `AccountProfile` with role `STUDENT` and matching LRN.
- Every student profile has an inherited role assignment.
- Running the profile seed twice does not duplicate users, account profiles, role assignments, or applications.
- Score Candidate Detail profile lookup can resolve a seeded score candidate by LRN.
