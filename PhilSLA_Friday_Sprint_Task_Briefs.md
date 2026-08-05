# PhilSLA Friday Sprint — Task Briefs
**Sprint window:** Wed (remainder) → Thu → Fri | **Goal:** presentation-ready demo path, not 100% completion
**Format:** one brief per in-progress story. Hand the relevant brief to each primary + 2nd Responsible pair at standup. Paste the "Task" line directly into the agent session.

---

## Before anyone starts

- [ ] Confirm `AGENTS.md` (root, `backend/`, `frontend/`) reflects current repo state
- [ ] No direct commits to `main` — agent output goes through PR review, same as human code
- [ ] Run the existing test suite before AND after every agent-assisted change
- [ ] If a task starts touching files outside "Do not touch," stop and re-scope — don't let it run

---

## US-SR-001 — Student Registration
**Module:** BRD-01 Registration | **Dev:** Primary + Maricon Landicho | **Status:** In progress

**Task:** Fix the candidate ID generator in `backend/apps/applications/models.py` (`generate_candidate_id`) to stop using the `PS-` prefix, following the naming convention already used for Exam Blueprint codes (`BP-` in `backend/apps/exams/services.py`) — i.e., a prefix that identifies the entity type, not system name.

**Do not touch:** `StudentApplication` status flow, Step 1/2/3 endpoints, selfie validation logic.

**Done when:** New candidate IDs use the corrected prefix; existing 65 tests in `backend/apps/applications/tests/` still pass; no hardcoded `PS-` references remain (`grep -r "PS-" backend/apps/applications`).

---

## US-SR-002 — User Authentication (Login)
**Module:** BRD-01 Login | **Dev:** Primary + Maricon Landicho | **Status:** In progress

**Task:** Audit `backend/apps/accounts/` login flow against `docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md` and close any gaps in error handling for the four-step flow (identifier → password → OTP → selfie), following the existing pattern in `backend/apps/accounts/tests/test_login_endpoints.py` for what "correct" looks like.

**Do not touch:** The decision to use email OTP instead of TOTP — that's a locked architecture call, not something to silently "fix" today.

**Done when:** All 109 existing tests in `backend/apps/accounts/tests/` pass; any new edge case found gets a matching test, not just a fix.

---

## US-SR-003 — Review Student Application
**Module:** BRD-01 Admissions | **Dev:** Primary + Maricon Landicho | **Status:** In progress

**Task:** Verify the reviewer decision flow (`Approve` / `Request Correction` / `Reject`) in `backend/apps/applications/services.py` fully matches `ApplicationReviewerDecisionView` in `views.py`, following the existing test pattern in `test_application_endpoints.py`.

**Do not touch:** `StudentApplication` model fields, Step 1/2/3 candidate-facing flow.

**Done when:** Reviewer decision path has explicit test coverage for all three outcomes; audit log entries confirmed for each.

---

## US-SR-008 — Exam Blueprint
**Module:** BRD-02 Item Bank | **Dev:** Primary + Maricon Landicho | **Status:** In progress

**Task:** Add test coverage for `ExamBlueprint`/`BlueprintVersion` status transitions in `backend/apps/exams/tests.py`, following the existing pattern in `test_transition_and_delete_draft_blueprint`, covering the invalid-transition cases (e.g. `published → draft`) not currently tested.

**Do not touch:** Blueprint status values, section/topic/difficulty distribution models.

**Done when:** Each of the 8 blueprint statuses has at least one transition test; invalid transitions are explicitly asserted to fail.

---

## US-SR-009 — Question Bank Management
**Module:** BRD-02 Item Bank | **Dev:** Primary + JP Mayordo | **Status:** In progress

**Task:** Wire `frontend/src/pages/admin/hub/QuestionBank.tsx` to the real backend, replacing the `MOCK_CENTRAL_ITEM_BANK` import from `blueprintMockData.ts` with `backendQuestionBankService.ts` — following the exact pattern already used in `frontend/src/pages/ExamBlueprints.tsx` with `backendExamBlueprintService.ts`.

**Do not touch:** `backend/apps/exams` question model/API — this is a frontend wiring task only, no backend changes.

**Done when:** `QuestionBank.tsx` at `/admin/hub/questions` and `/admin/questions` shows real data from the API; mock import is fully removed; manual smoke test of create/list/transition works end to end.

**Note:** This is the same pattern as US-SR-010 below — if time allows, write it once as a reusable step and apply to both.

---

## US-SR-010 — Exam Sets
**Module:** BRD-02 Item Bank | **Dev:** Primary + *(unassigned — flag at standup)* | **Status:** In progress

**⚠ Reposition this one.** Unlike Question Bank above, there is no real backend `ExamSet` entity to wire to — `backend/apps/exams` has no `/exam-sets/` endpoint at all. "Wire X to Y" doesn't apply here because Y doesn't exist yet.

**Revised task for Friday:** Do not attempt a full backend build. Instead, clean up `frontend/src/pages/admin/hub/ExamSets.tsx` as a **presentation mockup** — keep it on `blueprintMockData.ts`, but make the demo narrative honest: add a visible "prototype" indicator, or prepare a one-slide explanation of the Blueprint-Version-vs-Exam-Set architecture question for the presentation.

**Done when:** Demo walkthrough of this screen doesn't imply it's live/backend-connected; a fallback talking point is ready if asked about it live.

---

## US-SR-013 — Exam Review
**Module:** BRD-05 Scoring & Results | **Dev:** Primary + Ian Chris Sandoval | **Status:** In progress

**⚠ Same repositioning as US-SR-010.** `backend/apps/results` is an empty stub — `ExamReviewList.tsx` and `ExamReviewDetail.tsx` run entirely on `useMockData()` with no backend counterpart to wire to.

**Revised task for Friday:** Polish `ExamReviewDetail.tsx` as the strongest existing presentation asset for this module — it already has well-designed rubric display and grading UI. Focus on making the walkthrough coherent (consistent mock data across the linked list → detail flow) rather than backend integration.

**Done when:** List → detail navigation is smooth with no broken mock references; ready to narrate as "here's the grading experience we've designed" rather than "here's the live system."

---

## Summary for standup

| Story | Real backend work possible by Friday? | Action |
|---|---|---|
| US-SR-001, 002, 003 (BRD-01) | ✅ Yes — hardening existing code | Bug fixes + tests |
| US-SR-008, 009 (BRD-02) | ✅ Yes — pattern exists to copy | Test coverage + frontend rewiring |
| US-SR-010 (Exam Sets) | ❌ No backend entity exists | Reposition to demo polish |
| US-SR-013 (Exam Review) | ❌ No backend exists | Reposition to demo polish |

**Standup ask:** get an owner assigned to Exam Sets today — currently no 2nd Responsible dev listed in Notion for this story.
