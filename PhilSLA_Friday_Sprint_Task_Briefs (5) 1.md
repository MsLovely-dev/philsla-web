# PhilSLA Sprint — Full Day-by-Day Task Briefs (Wed → Thu → Fri)
**Goal:** presentation-ready demo path by Friday, not 100% completion. **Rule:** one sole owner per story — no partnering.
**Scope:** all 9 devs, every assigned story. Legend: 🟢 real build/fix work | 🟡 scoping/documentation | 🔴 demo-prep only, no backend to build against

---

## Environment, agent, and naming conventions

**Agent:** Claude Code with the **Superpowers** plugin, for every dev, every story. Superpowers enforces a plan → test → implement → review loop on top of Claude Code's normal agentic behavior — nobody's agent session should go straight from prompt to code. This matters more than usual this sprint because the whole plan depends on narrow, bounded diffs; Superpowers' discipline is what keeps a "wire X to Y" task from turning into an unreviewed 1,000-line rewrite the night before a presentation.

**Folder structure — one git worktree per developer, named after the developer:**
```
worktrees/
├── lovely-mae-chavez/
├── maricon-landicho/
├── jude-cabigon/
├── ian-chris-sandoval/
├── bienvenido-mendoza/
├── prince-barachiel-malonzo/
├── alvy-depositar/
├── jp-mayordo/
└── joshua-ganapin/
```
Each dev works exclusively inside their own worktree. This is what makes "no partnering" mechanically enforceable — nobody's Claude Code session ever touches another dev's checkout, so there's no accidental overlap even when two devs are in the same module (e.g. Jude and Ian both in BRD-02).

**Branch naming — `<dev-folder>/<story-slug>`:**
Devs with more than one story (Lovely, Prince, Alvy, JP) get one branch per story inside their own worktree, worked sequentially per the day-by-day order below — never two branches active in parallel for the same person.

---

## Full roster, track, and workspace

| Responsible Dev | Story | Module | Status | Track | Worktree | Branch |
|---|---|---|---|---|---|---|
| **Lovely Mae Chavez** | Student Registration | BRD-01 Registration | In progress | 🟢 | `worktrees/lovely-mae-chavez/` | `lovely-mae-chavez/student-registration` |
| **Lovely Mae Chavez** | User Account Creation (RBAC) | BRD-01 Maintenance | In progress | 🟢 | `worktrees/lovely-mae-chavez/` | `lovely-mae-chavez/rbac` |
| **Lovely Mae Chavez** | Review Student Application | BRD-01 Admissions | In progress | 🟢 | `worktrees/lovely-mae-chavez/` | `lovely-mae-chavez/review-application` |
| **Maricon Landicho** | User Authentication (Login) | BRD-01 Login | In progress | 🟢 | `worktrees/maricon-landicho/` | `maricon-landicho/login` |
| **Maricon Landicho** | Maintenance Table – Student Registration | Maintenance & Config | Not started | 🟡 deferred | `worktrees/maricon-landicho/` | *(parked — no branch yet)* |
| **Jude Cabigon** | Exam Blueprint | BRD-02 Item Bank | In progress | 🟢 | `worktrees/jude/` | `jude/exam-blueprint` |
| **Jude Cabigon** | Question Bank Management | BRD-02 Item Bank | In progress | 🟢 | `worktrees/jude/` | `jude/question-bank` |
| **Ian Chris Sandoval** | Exam Sets | BRD-02 Item Bank | In progress | 🔴 no backend entity | `worktrees/ian-chris-sandoval/` | `ian-chris-sandoval/exam-sets` |
| **Ian Chris Sandoval** | Maintenance Table – Exam Blueprint | Maintenance & Config | Not started | 🟡 deferred | `worktrees/ian-chris-sandoval/` | *(parked — no branch yet)* |
| **Bienvenido Mendoza** | Desktop Exam App (.NET Student) | BRD-04/04A Exam Delivery | Not started | 🔴 no Tauri app exists | `worktrees/bienvenido-mendoza/` | `bienvenido-mendoza/desktop-app-student` |
| **Bienvenido Mendoza** | Desktop Exam App (Proctor) | BRD-04/04A Exam Delivery | Not started | 🔴 no Tauri app exists | `worktrees/bienvenido-mendoza/` | `bienvenido-mendoza/desktop-app-proctor` |
| **Prince Barachiel Malonzo** | Exam Review | BRD-05 Scoring & Results | In progress | 🔴 no backend entity | `worktrees/prince-barachiel-malonzo/` | `prince-barachiel-malonzo/exam-review` |
| **Prince Barachiel Malonzo** | Exam Results Release & Analytics | BRD-05 Scoring & Results | Not started | 🔴 no backend entity | `worktrees/prince-barachiel-malonzo/` | `prince-barachiel-malonzo/results-release` |
| **Prince Barachiel Malonzo** | Student Portal | Student Portal | Not started | 🟡 out of scope this sprint | `worktrees/prince-barachiel-malonzo/` | *(parked — no branch yet)* |
| **Alvy Depositar** | Score Management | BRD-05 Scoring & Results | Not started | 🔴 no backend entity | `worktrees/alvy-depositar/` | `alvy-depositar/score-management` |
| **Alvy Depositar** | System Integration | System Admin & Compliance | Not started | 🟡 documentation | `worktrees/alvy-depositar/` | `alvy-depositar/system-integration` |
| **JP Mayordo** | Maintenance Table – Universities and Courses | Maintenance & Config | In progress | 🟢 | `worktrees/jp-mayordo/` | `jp-mayordo/universities-courses` |
| **JP Mayordo** | Maintenance Table – List of DepEd SHS | Maintenance & Config | Not started | 🟡 stretch goal | `worktrees/jp-mayordo/` | `jp-mayordo/deped-shs` |
| **Joshua Ganapin** | QR Scanning | Testing Center Ops | Not started | 🔴 no backend (proctoring app empty) | `worktrees/joshua-ganapin/` | `joshua-ganapin/qr-scanning` |

**Reality check up front:** 5 of these 9 devs are working with zero or partial backend to build against (Ian, bienvenido.mendoza, Prince, Alvy on Score Management, Joshua). Their Friday output is a **polished demo/prototype and an honest roadmap narrative**, not working software. That's not a staffing failure — it reflects how much of BRD-04/04A and BRD-05 is genuinely pre-implementation. Don't let anyone on those tracks burn Thursday trying to force a real backend into existence.

---

# WEDNESDAY (TODAY) — Planning & scope lock, no code execution tonight

Every dev opens **Claude Code with Superpowers in their own worktree** today and gets no further than the plan step — Superpowers' brainstorm/spec phase, reviewed and approved by a human, before any implementation branch gets touched.

### Lovely Mae Chavez 🟢 — `worktrees/lovely-mae-chavez/`
- Read all 3 briefs before choosing an order. **Recommended sequence: Registration → RBAC → Review Application** (RBAC is foundational, Review Application is the safest to slip to Friday AM).
- On branch `lovely-mae-chavez/student-registration`: open Claude Code (Superpowers), get the plan reviewed for the candidate ID prefix fix (`generate_candidate_id`, `backend/apps/applications/models.py`) — do not execute yet.
- **Deliverable:** confirmed 3-story order + one reviewed plan.

### Maricon Landicho 🟢 / 🟡 — `worktrees/maricon-landicho/`
- On branch `maricon-landicho/login`: audit `backend/apps/accounts/` login flow against `docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md`; produce a concrete gap list (not fixes yet) against the four-step flow.
- Maintenance Table – Student Registration: confirm this is **deferred**, no branch cut this sprint — Login is her only real deliverable.
- **Deliverable:** written gap list + reviewed plan for tomorrow; maintenance table explicitly parked.

### Jude Cabigon 🟢 — `worktrees/jude/`
- On branch `jude/exam-blueprint`: get a plan reviewed for transition tests in `backend/apps/exams/tests.py`, covering invalid transitions (e.g. `published → draft`).
- On branch `jude/question-bank`: get a plan reviewed for wiring `QuestionBank.tsx` off `blueprintMockData.ts` onto `backendQuestionBankService.ts`, copying the working pattern in `ExamBlueprints.tsx`.
- **Deliverable:** two reviewed plans, one per branch.

### Ian Chris Sandoval 🔴 / 🟡 — `worktrees/ian-chris-sandoval/`
- On branch `ian-chris-sandoval/exam-sets`: confirm directly that Exam Sets has no backend entity (`backend/apps/exams` has no `/exam-sets/` endpoint). Agree scope: `ExamSets.tsx` stays on mock data with a visible "prototype" treatment, plus a one-slide explanation of the open Blueprint-vs-Exam-Set architecture question.
- Maintenance Table – Exam Blueprint: confirm this is **deferred**, no branch cut — full bandwidth goes to the Exam Sets narrative.
- **Deliverable:** scope agreement confirmed, not a code plan.

### Bienvenido Mendoza 🔴 — `worktrees/bienvenido-mendoza/`
- Confirm directly: no Tauri/.NET desktop app exists anywhere in the repo — `ExamDelivery.tsx` is a React web page simulating the experience (fake SQLite log strings, no real IPC).
- On branches `bienvenido-mendoza/desktop-app-student` and `bienvenido-mendoza/desktop-app-proctor`: agree scope for both — Friday deliverable is a polished walkthrough of the existing simulation plus a one-pager on the real architecture plan (encrypted local store, package unlock via `schedule_id`, device enrollment via cert/mTLS per ADR-011) — not working software.
- **Deliverable:** scope agreement confirmed for both stories.

### Prince Barachiel Malonzo 🔴 / 🟡 — `worktrees/prince-barachiel-malonzo/`
- Confirm `backend/apps/results` is an empty stub; `ExamReviewList.tsx` / `ExamReviewDetail.tsx` run entirely on mock data.
- On branch `prince-barachiel-malonzo/exam-review` and `prince-barachiel-malonzo/results-release`: agree scope — Exam Review becomes a polished list → detail walkthrough; Results Release & Analytics becomes a roadmap narrative, not a build.
- Student Portal: confirm this stays **out of scope** for this sprint entirely, no branch cut — three stories solo is already a full load.
- **Deliverable:** scope agreement confirmed for both active branches; Student Portal explicitly parked.

### Alvy Depositar 🔴 / 🟡 — `worktrees/alvy-depositar/`
- On branch `alvy-depositar/score-management`: confirm no backend exists; agree scope — polish `ScoreManagement.tsx`'s recheck workflow (`GRADED → FINALIZED → UNDER_RECHECKING → RELEASED`) as a demo asset, plus prepare a talking point on the aggregation-formula blocking dependency BRD-05 itself already flags.
- On branch `alvy-depositar/system-integration`: scope this as a **documentation task** — audit current integration adapters (LRN stub adapter, PhilSys not yet populated, DepEd/CHED/TESDA reporting) and confirm what's real vs. stubbed.
- **Deliverable:** both scopes agreed; list of integration points to document tomorrow.

### JP Mayordo 🟢 / 🟡 — `worktrees/jp-mayordo/`
- On branch `jp-mayordo/universities-courses`: identify which existing maintenance-table screen is furthest along to copy the pattern from (e.g. `StudentRegistrationMaintenance.tsx`), get a plan reviewed for wiring `UniversitiesListMaintenance.tsx` to real backend CRUD.
- On branch `jp-mayordo/deped-shs`: scope only today — confirm whether the same pattern applies cleanly; if yes, this becomes a Thursday-afternoon stretch goal, if no, it stays deferred.
- **Deliverable:** reviewed plan for Universities and Courses; DepEd SHS scoped as stretch-or-defer.

### Joshua Ganapin 🔴 — `worktrees/joshua-ganapin/`
- On branch `joshua-ganapin/qr-scanning`: confirm `backend/apps/proctoring` is an empty stub with no QR validation logic anywhere.
- Agree scope: build a client-side QR-scan mockup (scan → attendance status change) as a demo asset, referencing the Present/Late/Absent grace-period model already designed in FR-009 as the narrative for what's built vs. designed.
- **Deliverable:** scope agreement confirmed.

### Standing items for everyone, today
- [ ] Confirm `AGENTS.md` (root, `backend/`, `frontend/`) is current before opening any Claude Code + Superpowers session
- [ ] Confirm your worktree exists and is on the right branch(es) before starting
- [ ] No commits to `main` without PR review — say it out loud at standup

---

# THURSDAY (TOMORROW) — Execution day

### Lovely Mae Chavez 🟢
- **AM:** On `lovely-mae-chavez/student-registration` — execute the approved plan. Run `backend/apps/applications/tests/` (65 tests). Confirm no `PS-` references remain.
- **Midday:** Switch to `lovely-mae-chavez/rbac` — get plan reviewed (verify role-assignment logic).
- **Early PM:** Execute RBAC, run relevant `backend/apps/accounts/tests/` role-assignment cases.
- **Late PM (if time):** Switch to `lovely-mae-chavez/review-application` — verify `Approve`/`Request Correction`/`Reject` flow. **If it doesn't fit, this slips to Friday AM — acceptable; Registration/RBAC are not.**

### Maricon Landicho 🟢
- **AM:** On `maricon-landicho/login` — execute the gap-closing plan from yesterday's audit.
- **Midday:** Run `test_login_endpoints.py` in full. New edge cases get new tests, not silent fixes.
- **PM:** Manual smoke test of the full four-step login flow end to end.

### Jude Cabigon 🟢
- **AM:** On `jude/exam-blueprint` — execute transition-test plan, all 8 statuses covered.
- **Midday:** Run `backend/apps/exams/tests.py` in full.
- **Early PM:** Switch to `jude/question-bank` — execute the wiring plan, remove mock import, connect real service.
- **Late PM:** Manual smoke test of create/list/transition on both `/admin/hub/questions` and `/admin/questions`.

### Ian Chris Sandoval 🔴
- **All day, on `ian-chris-sandoval/exam-sets`:** No backend work. Add the "prototype" indicator to `ExamSets.tsx`. Build the Blueprint-vs-Exam-Set architecture talking point.

### Bienvenido Mendoza 🔴
- **All day, on `desktop-app-student` then `desktop-app-proctor`:** No backend work. Polish `ExamDelivery.tsx`'s flow (readiness check → webcam check → offline DB check → exam → submit) for a clean walkthrough. Draft the Tauri architecture one-pager for both variants.

### Prince Barachiel Malonzo 🔴
- **AM–Midday, on `exam-review`:** Fix broken mock-data references between `ExamReviewList.tsx` and `ExamReviewDetail.tsx`; polish the rubric/grading display.
- **PM, on `results-release`:** Draft the Results Release & Analytics roadmap narrative (readiness gating, holds, government reporting interface — all currently unbuilt).

### Alvy Depositar 🔴 / 🟡
- **AM, on `score-management`:** Polish `ScoreManagement.tsx`'s recheck modal flow for a clean demo.
- **PM, on `system-integration`:** Document the actual state of each integration point (LRN, PhilSys, DepEd/CHED/TESDA) — what's real, what's stubbed, what's missing.

### JP Mayordo 🟢
- **AM–PM, on `universities-courses`:** Execute wiring — list/add/edit/remove CRUD against real backend. Manual test.
- **Late PM (only if finished early), on `deped-shs`:** Attempt using the same pattern. If it doesn't fit, it stays deferred — no penalty.

### Joshua Ganapin 🔴
- **All day, on `qr-scanning`:** Build the QR-scan mockup (scan → attendance status change) as a self-contained demo flow. No backend integration attempt.

### Standing items for everyone, today
- [ ] Midday check-in (15 min, all owners): converging or wandering? Kill and re-scope anything drifted.
- [ ] Run tests after every change, not just at end of day.

---

# FRIDAY — Freeze and rehearse (not a build day)

### Lovely Mae Chavez 🟢
- **AM only, if `review-application` slipped:** finish, test, get reviewed. Hard stop by midday.
- After midday: P0 fixes only, through PR review.

### Maricon Landicho 🟢
- AM: support full rehearsal, walk through login live.
- After midday: P0 fixes only.

### Jude Cabigon 🟢
- AM: support rehearsal on Blueprint → Question Bank walkthrough.
- After midday: P0 fixes only.

### Ian Chris Sandoval 🔴
- AM: finalize Exam Sets talking point, dry run explaining it live. No code work.

### Bienvenido Mendoza 🔴
- AM: finalize the Desktop App walkthrough + architecture one-pager, dry run the "what's built vs. what's next" story for both variants. No code work.

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

