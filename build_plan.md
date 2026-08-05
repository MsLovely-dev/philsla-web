# PhilSLA Sprint — Full Day-by-Day Task Briefs (Wed → Thu → Fri)
**Goal:** presentation-ready demo path by Friday, not 100% completion. **Rule:** one sole owner per story — no partnering.
**Scope:** all 9 devs, every assigned story. Legend: 🟢 real build/fix work | 🟡 scoping/documentation | 🔴 demo-prep only, no backend to build against

---

## Full roster and track

| Responsible Dev | Story | Module | Status | Track |
|---|---|---|---|---|
| **Lovely Mae Chavez** | Student Registration | BRD-01 Registration | In progress | 🟢 |
| **Lovely Mae Chavez** | User Account Creation (RBAC) | BRD-01 Maintenance | In progress | 🟢 |
| **Lovely Mae Chavez** | Review Student Application | BRD-01 Admissions | In progress | 🟢 |
| **Maricon Landicho** | User Authentication (Login) | BRD-01 Login | In progress | 🟢 |
| **Maricon Landicho** | Maintenance Table – Student Registration | Maintenance & Config | Not started | 🟡 deferred |
| **Jude** | Exam Blueprint | BRD-02 Item Bank | In progress | 🟢 |
| **Jude** | Question Bank Management | BRD-02 Item Bank | In progress | 🟢 |
| **Ian Chris Sandoval** | Exam Sets | BRD-02 Item Bank | In progress | 🔴 no backend entity |
| **Ian Chris Sandoval** | Maintenance Table – Exam Blueprint | Maintenance & Config | Not started | 🟡 deferred |
| **bienvenido.mendoza** | Desktop Exam App (.NET Student) | BRD-04/04A Exam Delivery | Not started | 🔴 no Tauri app exists |
| **bienvenido.mendoza** | Desktop Exam App (Proctor) | BRD-04/04A Exam Delivery | Not started | 🔴 no Tauri app exists |
| **Prince Barachiel Malonzo** | Exam Review | BRD-05 Scoring & Results | In progress | 🔴 no backend entity |
| **Prince Barachiel Malonzo** | Exam Results Release & Analytics | BRD-05 Scoring & Results | Not started | 🔴 no backend entity |
| **Prince Barachiel Malonzo** | Student Portal | Student Portal | Not started | 🟡 out of scope this sprint |
| **Alvy Depositar** | Score Management | BRD-05 Scoring & Results | Not started | 🔴 no backend entity |
| **Alvy Depositar** | System Integration | System Admin & Compliance | Not started | 🟡 documentation |
| **JP Mayordo** | Maintenance Table – Universities and Courses | Maintenance & Config | In progress | 🟢 |
| **JP Mayordo** | Maintenance Table – List of DepEd SHS | Maintenance & Config | Not started | 🟡 stretch goal |
| **Joshua Ganapin** | QR Scanning | Testing Center Ops | Not started | 🔴 no backend (proctoring app empty) |

**Reality check up front:** 5 of these 9 devs are working with zero or partial backend to build against (Ian, bienvenido.mendoza, Prince, Alvy on Score Management, Joshua). Their Friday output is a **polished demo/prototype and an honest roadmap narrative**, not working software. That's not a staffing failure — it reflects how much of BRD-04/04A and BRD-05 is genuinely pre-implementation. Don't let anyone on those tracks burn Thursday trying to force a real backend into existence.

---

# WEDNESDAY (TODAY) — Planning & scope lock, no code execution tonight

### Lovely Mae Chavez 🟢
- Read all 3 briefs before choosing an order. **Recommended sequence: Registration → RBAC → Review Application** (RBAC is foundational, Review Application is the safest to slip to Friday AM).
- Open agent session for **Registration only**. Get the plan reviewed for the candidate ID prefix fix (`generate_candidate_id`, `backend/apps/applications/models.py`) — do not execute yet.
- **Deliverable:** confirmed 3-story order + one reviewed plan.

### Maricon Landicho 🟢 / 🟡
- Audit `backend/apps/accounts/` login flow against `docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md`; produce a concrete gap list (not fixes yet) against the four-step flow.
- Maintenance Table – Student Registration: confirm this is **deferred**, not attempted this sprint — Login is her only real deliverable.
- **Deliverable:** written gap list + reviewed plan for tomorrow; maintenance table explicitly parked.

### Jude 🟢
- Exam Blueprint: get a plan reviewed for transition tests in `backend/apps/exams/tests.py`, covering invalid transitions (e.g. `published → draft`).
- Question Bank Management: get a plan reviewed for wiring `QuestionBank.tsx` off `blueprintMockData.ts` onto `backendQuestionBankService.ts`, copying the working pattern in `ExamBlueprints.tsx`.
- **Deliverable:** two reviewed plans.

### Ian Chris Sandoval 🔴 / 🟡
- Confirm directly that Exam Sets has no backend entity (`backend/apps/exams` has no `/exam-sets/` endpoint). Agree scope: `ExamSets.tsx` stays on mock data with a visible "prototype" treatment, plus a one-slide explanation of the open Blueprint-vs-Exam-Set architecture question.
- Maintenance Table – Exam Blueprint: confirm this is **deferred** — full bandwidth goes to the Exam Sets narrative.
- **Deliverable:** scope agreement confirmed, not a code plan.

### bienvenido.mendoza 🔴
- Confirm directly: no Tauri/.NET desktop app exists anywhere in the repo — `ExamDelivery.tsx` is a React web page simulating the experience (fake SQLite log strings, no real IPC).
- Agree scope for **both** Desktop App stories: Friday deliverable is a polished walkthrough of the existing simulation plus a one-pager on the real architecture plan (encrypted local store, package unlock via `schedule_id`, device enrollment via cert/mTLS per ADR-011) — not working software.
- **Deliverable:** scope agreement confirmed for both stories.

### Prince Barachiel Malonzo 🔴 / 🟡
- Confirm `backend/apps/results` is an empty stub; `ExamReviewList.tsx` / `ExamReviewDetail.tsx` run entirely on mock data.
- Agree scope: Exam Review becomes a polished list → detail walkthrough; Results Release & Analytics becomes a roadmap narrative, not a build.
- Student Portal: confirm this stays **out of scope** for this sprint entirely — three stories solo is already a full load without adding a fourth.
- **Deliverable:** scope agreement confirmed for Exam Review + Results Release; Student Portal explicitly parked.

### Alvy Depositar 🔴 / 🟡
- Score Management: confirm no backend exists; agree scope: polish `ScoreManagement.tsx`'s recheck workflow (`GRADED → FINALIZED → UNDER_RECHECKING → RELEASED`) as a demo asset, plus prepare a talking point on the aggregation-formula blocking dependency BRD-05 itself already flags.
- System Integration: scope this as a **documentation task** — audit current integration adapters (LRN stub adapter, PhilSys not yet populated, DepEd/CHED/TESDA reporting) and confirm what's real vs. stubbed.
- **Deliverable:** both scopes agreed; list of integration points to document tomorrow.

### JP Mayordo 🟢 / 🟡
- Universities and Courses: identify which existing maintenance-table screen is furthest along to copy the pattern from (e.g. `StudentRegistrationMaintenance.tsx`), get a plan reviewed for wiring `UniversitiesListMaintenance.tsx` to real backend CRUD.
- DepEd SHS list: scope only today — confirm whether the same pattern applies cleanly; if yes, this becomes a Thursday-afternoon stretch goal, if no, it's deferred.
- **Deliverable:** reviewed plan for Universities and Courses; DepEd SHS scoped as stretch-or-defer.

### Joshua Ganapin 🔴
- Confirm `backend/apps/proctoring` is an empty stub with no QR validation logic anywhere.
- Agree scope: build a client-side QR-scan mockup (scan → attendance status change) as a demo asset, referencing the Present/Late/Absent grace-period model already designed in FR-009 as the narrative for what's built vs. designed.
- **Deliverable:** scope agreement confirmed.

### Standing items for everyone, today
- [ ] Confirm `AGENTS.md` (root, `backend/`, `frontend/`) is current before opening any agent session
- [ ] No commits to `main` without PR review — say it out loud at standup

---

# THURSDAY (TOMORROW) — Execution day

### Lovely Mae Chavez 🟢
- **AM:** Execute Registration plan. Run `backend/apps/applications/tests/` (65 tests). Confirm no `PS-` references remain.
- **Midday:** Get RBAC plan reviewed (verify role-assignment logic).
- **Early PM:** Execute RBAC, run relevant `backend/apps/accounts/tests/` role-assignment cases.
- **Late PM (if time):** Review Application — verify `Approve`/`Request Correction`/`Reject` flow in `services.py` against `ApplicationReviewerDecisionView`. **If it doesn't fit, this slips to Friday AM — acceptable; Registration/RBAC are not.**

### Maricon Landicho 🟢
- **AM:** Execute the gap-closing plan from yesterday's audit.
- **Midday:** Run `test_login_endpoints.py` in full. New edge cases get new tests, not silent fixes.
- **PM:** Manual smoke test of the full four-step login flow end to end.

### Jude 🟢
- **AM:** Execute Exam Blueprint transition-test plan — all 8 statuses covered, invalid transitions explicitly fail.
- **Midday:** Run `backend/apps/exams/tests.py` in full.
- **Early PM:** Execute Question Bank Management wiring — remove mock import, connect real service.
- **Late PM:** Manual smoke test of create/list/transition on both `/admin/hub/questions` and `/admin/questions`.

### Ian Chris Sandoval 🔴
- **All day:** No backend work. Add the "prototype" indicator to `ExamSets.tsx`. Build the Blueprint-vs-Exam-Set architecture talking point.

### bienvenido.mendoza 🔴
- **All day:** No backend work. Polish `ExamDelivery.tsx`'s flow (readiness check → webcam check → offline DB check → exam → submit) for a clean walkthrough. Draft the Tauri architecture one-pager for both the Student and Proctor variants.

### Prince Barachiel Malonzo 🔴
- **AM–Midday:** Fix broken mock-data references between `ExamReviewList.tsx` and `ExamReviewDetail.tsx`; polish the rubric/grading display (already the strongest asset in BRD-05).
- **PM:** Draft the Results Release & Analytics roadmap narrative (readiness gating, holds, government reporting interface — all currently unbuilt).

### Alvy Depositar 🔴 / 🟡
- **AM:** Polish `ScoreManagement.tsx`'s recheck modal flow for a clean demo.
- **PM:** Document the actual state of each integration point (LRN, PhilSys, DepEd/CHED/TESDA) for System Integration — what's real, what's stubbed, what's missing.

### JP Mayordo 🟢
- **AM–PM:** Execute Universities and Courses wiring — list/add/edit/remove CRUD against real backend. Manual test.
- **Late PM (only if finished early):** Attempt DepEd SHS list using the same pattern. If it doesn't fit, it stays deferred — no penalty.

### Joshua Ganapin 🔴
- **All day:** Build the QR-scan mockup (scan → attendance status change) as a self-contained demo flow. No backend integration attempt.

### Standing items for everyone, today
- [ ] Midday check-in (15 min, all owners): converging or wandering? Kill and re-scope anything drifted.
- [ ] Run tests after every change, not just at end of day.

---

# FRIDAY — Freeze and rehearse (not a build day)

### Lovely Mae Chavez 🟢
- **AM only, if Review Application slipped:** finish, test, get reviewed. Hard stop by midday.
- After midday: P0 fixes only, through PR review.

### Maricon Landicho 🟢
- AM: support full rehearsal, walk through login live.
- After midday: P0 fixes only.

### Jude 🟢
- AM: support rehearsal on Blueprint → Question Bank walkthrough.
- After midday: P0 fixes only.

### Ian Chris Sandoval 🔴
- AM: finalize Exam Sets talking point, dry run explaining it live. No code work.

### bienvenido.mendoza 🔴
- AM: finalize the Desktop App walkthrough + architecture one-pager, dry run the "what's built vs. what's next" story for both Student and Proctor variants. No code work.

### Prince Barachiel Malonzo 🔴
- AM: finalize Exam Review walkthrough + Results Release roadmap narrative, dry run. No code work.

### Alvy Depositar 🔴 / 🟡
- AM: finalize Score Management talking point + integration-status summary, dry run. No code work.

### JP Mayordo 🟢
- AM: support rehearsal on Universities/Courses maintenance screen if it's part of the demo path. If DepEd SHS didn't get built, note it as backlog — no scramble.

### Joshua Ganapin 🔴
- AM: finalize QR-scan mockup walkthrough, dry run the attendance narrative. No code work.

### Standing items for everyone, Friday
- [ ] Feature freeze by midday — P0 fixes only after that, through PR review
- [ ] Full run-through of the actual demo path, start to finish, on the real system
- [ ] Final rehearsal of "here's what's built, here's the architecture, here's what's next" for every 🔴/🟡 track

