# PhilSLA Sprint — Full Day-by-Day Task Briefs (Wed → Thu → Fri)
**Goal:** presentation-ready demo path by Friday, not 100% completion. **Rule:** one sole owner per story — no partnering.
**Scope:** all 9 devs, every assigned story. Legend: 🟢 real build/fix work | 🟡 scoping/documentation | 🔴 demo-prep only, no backend to build against

---

## Environment, agent, and naming conventions

**Agent:** Claude Code with the **Superpowers** plugin, for every dev, every story. Superpowers enforces a plan → test → implement → review loop on top of Claude Code's normal agentic behavior — nobody's agent session should go straight from prompt to code. This matters more than usual this sprint because the whole plan depends on narrow, bounded diffs; Superpowers' discipline is what keeps a "wire X to Y" task from turning into an unreviewed 1,000-line rewrite the night before a presentation.

**Folder structure — one git worktree per developer, named after the developer:**
```
worktrees/
├── l.chavez/
├── m.landicho/
├── ju.cabigon/
├── i.sandoval/
├── b.mendoza/
├── p.malonzo/
├── a.depositar/
├── jp.mayordo/
└── jo.ganapin/
```
Each dev works exclusively inside their own worktree. This is what makes "no partnering" mechanically enforceable — nobody's Claude Code session ever touches another dev's checkout, so there's no accidental overlap even when two devs are in the same module (e.g. Jude and Ian both in BRD-02).

**Branch naming — `<dev-folder>/<story-slug>`:**
Devs with more than one story (Lovely, Prince, Alvy, JP) get one branch per story inside their own worktree, worked sequentially per the day-by-day order below — never two branches active in parallel for the same person.

**Developer short codes — `<Initial(s)>.<Lastname>`:**
One-letter initials by default; extended to two letters only where a collision would otherwise occur. Three devs share the initial "J" (Jude Cabigon, JP Mayordo, Joshua Ganapin) — using a single "J." for all three would defeat the purpose of per-developer isolation, so those three are disambiguated:

| Dev | Short code | Lowercase form (folders/branches/files) |
|---|---|---|
| Lovely Mae Chavez | L.Chavez | `l.chavez` |
| Maricon Landicho | M.Landicho | `m.landicho` |
| Jude Cabigon | Ju.Cabigon | `ju.cabigon` |
| Ian Chris Sandoval | I.Sandoval | `i.sandoval` |
| bienvenido.mendoza | B.Mendoza | `b.mendoza` |
| Prince Barachiel Malonzo | P.Malonzo | `p.malonzo` |
| Alvy Depositar | A.Depositar | `a.depositar` |
| JP Mayordo | JP.Mayordo | `jp.mayordo` |
| Joshua Ganapin | Jo.Ganapin | `jo.ganapin` |

Capitalized form (`L.Chavez`) for tables, headers, and anything a human reads. Lowercase (`l.chavez`) for every actual folder, branch, and filename below — git worktrees *and* the Superpowers docs structure.

**Superpowers documentation structure — one folder per developer, named after their short code:**
```
docs/superpowers/
├── l.chavez/
│   ├── l.chavez.task.md
│   ├── plans/
│   ├── specs/
│   └── implement/
│       └── l.chavez.implement.md
├── m.landicho/
│   ├── m.landicho.task.md
│   ├── plans/
│   ├── specs/
│   └── implement/
│       └── m.landicho.implement.md
├── ju.cabigon/
│   ├── ju.cabigon.task.md
│   ├── plans/
│   ├── specs/
│   └── implement/
│       └── ju.cabigon.implement.md
├── i.sandoval/
│   ├── i.sandoval.task.md
│   ├── plans/
│   ├── specs/
│   └── implement/
│       └── i.sandoval.implement.md
├── b.mendoza/
│   ├── b.mendoza.task.md
│   ├── plans/
│   ├── specs/
│   └── implement/
│       └── b.mendoza.implement.md
├── p.malonzo/
│   ├── p.malonzo.task.md
│   ├── plans/
│   ├── specs/
│   └── implement/
│       └── p.malonzo.implement.md
├── a.depositar/
│   ├── a.depositar.task.md
│   ├── plans/
│   ├── specs/
│   └── implement/
│       └── a.depositar.implement.md
├── jp.mayordo/
│   ├── jp.mayordo.task.md
│   ├── plans/
│   ├── specs/
│   └── implement/
│       └── jp.mayordo.implement.md
└── jo.ganapin/
    ├── jo.ganapin.task.md
    ├── plans/
    ├── specs/
    └── implement/
        └── jo.ganapin.implement.md
```

**What goes where, and when:**
- **`<code>.task.md`** — the master brief for that dev: their story/stories, scope, and the Wed/Thu/Fri plan from this document, copied into their own folder as their working reference. Created Wednesday, updated at the end of each day if scope shifts.
- **`specs/`** — Superpowers' brainstorm/spec-phase output: the "what exactly are we building and why" artifact, produced Wednesday before any plan is written.
- **`plans/`** — Superpowers' reviewed implementation plan, produced Wednesday, approved by a human before Thursday's execution starts. This is the artifact that gets reviewed in the "get the plan reviewed" step throughout this document.
- **`implement/<code>.implement.md`** — the implementation log: what was actually built Thursday, against which plan, with test results. This is the paper trail if Friday's rehearsal turns up a question about why something works the way it does.

`docs/superpowers/` sits alongside the existing `docs/` structure defined in `AGENTS.md` (business, architecture, API, decision, security, development documentation) — this is the development-process documentation for AI-assisted work specifically, not a replacement for `docs/decisions/` ADRs or the BRDs.

---

## Full roster, track, and workspace

| Responsible Dev | Story | Module | Status | Track | Worktree | Branch | Task.md |
|---|---|---|---|---|---|---|---|
| **Lovely Mae Chavez (L.Chavez)** | Student Registration | BRD-01 Registration | In progress | 🟢 | `worktrees/l.chavez/` | `l.chavez/student-registration` | `docs/superpowers/l.chavez/l.chavez.task.md` |
| **Lovely Mae Chavez (L.Chavez)** | User Account Creation (RBAC) | BRD-01 Maintenance | In progress | 🟢 | `worktrees/l.chavez/` | `l.chavez/rbac` | `docs/superpowers/l.chavez/l.chavez.task.md` |
| **Lovely Mae Chavez (L.Chavez)** | Review Student Application | BRD-01 Admissions | In progress | 🟢 | `worktrees/l.chavez/` | `l.chavez/review-application` | `docs/superpowers/l.chavez/l.chavez.task.md` |
| **Maricon Landicho (M.Landicho)** | User Authentication (Login) | BRD-01 Login | In progress | 🟢 | `worktrees/m.landicho/` | `m.landicho/login` | `docs/superpowers/m.landicho/m.landicho.task.md` |
| **Maricon Landicho (M.Landicho)** | Maintenance Table – Student Registration | Maintenance & Config | Merged (PR #99); DepEd Admin hub-nav access fix pushed, PR pending | 🟢 | `worktrees/m.landicho/` | `m.landicho/maintenance-student-registration` (merged); `m.landicho/maintenance-hub-deped-admin-access` (pending PR) | `docs/superpowers/m.landicho/m.landicho.task.md` |
| **Jude Cabigon (Ju.Cabigon)** | Exam Blueprint | BRD-02 Item Bank | In progress | 🟢 | `worktrees/ju.cabigon/` | `ju.cabigon/exam-blueprint` | `docs/superpowers/ju.cabigon/ju.cabigon.task.md` |
| **Jude Cabigon (Ju.Cabigon)** | Question Bank Management | BRD-02 Item Bank | In progress | 🟢 | `worktrees/ju.cabigon/` | `ju.cabigon/question-bank` | `docs/superpowers/ju.cabigon/ju.cabigon.task.md` |
| **Ian Chris Sandoval (I.Sandoval)** | Exam Sets | BRD-02 Item Bank | Implemented; release verification open | 🟠 API-integrated; baseline failures and migration rehearsal remain | `worktrees/i.sandoval/` | `i.sandoval/exam-sets` | `docs/superpowers/i.sandoval/i.sandoval.task.md` |
| **Ian Chris Sandoval (I.Sandoval)** | Maintenance Table – Exam Blueprint | Maintenance & Config | Not started | 🟡 deferred | `worktrees/i.sandoval/` | *(parked — no branch yet)* | `docs/superpowers/i.sandoval/i.sandoval.task.md` |
| **bienvenido.mendoza (B.Mendoza)** | Desktop Exam App (.NET Student) | BRD-04/04A Exam Delivery | Not started | 🔴 no Tauri app exists | `worktrees/b.mendoza/` | `b.mendoza/desktop-app-student` | `docs/superpowers/b.mendoza/b.mendoza.task.md` |
| **bienvenido.mendoza (B.Mendoza)** | Desktop Exam App (Proctor) | BRD-04/04A Exam Delivery | Not started | 🔴 no Tauri app exists | `worktrees/b.mendoza/` | `b.mendoza/desktop-app-proctor` | `docs/superpowers/b.mendoza/b.mendoza.task.md` |
| **Prince Barachiel Malonzo (P.Malonzo)** | Exam Review | BRD-05 Scoring & Results | Scoped demo path complete; locally verified, PostgreSQL concurrency rehearsal pending | 🟢 real backend/API grading, item scoring, answer-sheet upload, and atomic Score Management handoff | `worktrees/p.malonzo/` | `p.malonzo/exam-review` | `docs/superpowers/p.malonzo/p.malonzo.task.md` |
| **Prince Barachiel Malonzo (P.Malonzo)** | Exam Results Release & Analytics | BRD-05 Scoring & Results | Not started | 🔴 no backend entity | `worktrees/p.malonzo/` | `p.malonzo/results-release` | `docs/superpowers/p.malonzo/p.malonzo.task.md` |
| **Prince Barachiel Malonzo (P.Malonzo)** | Student Portal | Student Portal | Not started | 🟡 out of scope this sprint | `worktrees/p.malonzo/` | *(parked — no branch yet)* | `docs/superpowers/p.malonzo/p.malonzo.task.md` |
| **Alvy Depositar (A.Depositar)** | Score Management | BRD-05 Scoring & Results | ~80% complete overall; 85-90% excluding integration/distribution | 🟢 real backend/API/demo seed path now exists | `worktrees/a.depositar/` | `a.depositar/score-management` | `docs/superpowers/a.depositar/a.depositar.task.md` |
| **Alvy Depositar (A.Depositar)** | System Integration | System Admin & Compliance | Deprioritized | 🟡 documentation only if time allows | `worktrees/a.depositar/` | `a.depositar/system-integration` | `docs/superpowers/a.depositar/a.depositar.task.md` |
| **JP Mayordo (JP.Mayordo)** | Maintenance Table – Universities and Courses | Maintenance & Config | In progress | 🟢 | `worktrees/jp.mayordo/` | `jp.mayordo/universities-courses` | `docs/superpowers/jp.mayordo/jp.mayordo.task.md` |
| **JP Mayordo (JP.Mayordo)** | Maintenance Table – List of DepEd SHS | Maintenance & Config | Not started | 🟡 stretch goal | `worktrees/jp.mayordo/` | `jp.mayordo/deped-shs` | `docs/superpowers/jp.mayordo/jp.mayordo.task.md` |
| **Joshua Ganapin (Jo.Ganapin)** | QR Scanning | Testing Center Ops | Not started | 🔴 no backend (proctoring app empty) | `worktrees/jo.ganapin/` | `jo.ganapin/qr-scanning` | `docs/superpowers/jo.ganapin/jo.ganapin.task.md` |

**Reality check up front:** Four of these 9 devs are working with zero or partial backend to build against (bienvenido.mendoza, Prince on Results Release/Analytics, and Joshua). Ian's separately reviewed Exam Sets integration uses the merged API rather than mock/browser-local state as authoritative storage, but release readiness remains gated by frontend baseline acceptance and a PostgreSQL-compatible migration rehearsal. A.Depositar's Score Management scope now has a working backend/API/demo-seed path; production-scale processing, complete audit coverage, Application Review synchronization, and downstream distribution remain. The Friday target is a **presentation-ready demo path**, not 100% production completion.

---

# WEDNESDAY (TODAY) — Planning & scope lock, no code execution tonight

Every dev opens **Claude Code with Superpowers in their own worktree** today and gets no further than the plan step — Superpowers' brainstorm/spec phase, reviewed and approved by a human, before any implementation branch gets touched.

### Lovely Mae Chavez (L.Chavez) 🟢 — `worktrees/l.chavez/`
- Read all 3 briefs before choosing an order. **Recommended sequence: Registration → RBAC → Review Application** (RBAC is foundational, Review Application is the safest to slip to Friday AM).
- On branch `l.chavez/student-registration`: open Claude Code (Superpowers), get the plan reviewed for the candidate ID prefix fix (`generate_candidate_id`, `backend/apps/applications/models.py`) — do not execute yet.
- **Deliverable:** confirmed 3-story order + one reviewed plan.

### Maricon Landicho (M.Landicho) 🟢 / 🟡 — `worktrees/m.landicho/`
- On branch `m.landicho/login`: audit `backend/apps/accounts/` login flow against `docs/decisions/ADR-011-USER-AUTHENTICATION-FLOW.md`; produce a concrete gap list (not fixes yet) against the four-step flow.
- Maintenance Table – Student Registration: confirm this is **deferred**, no branch cut this sprint — Login is her only real deliverable.
- **Deliverable:** written gap list + reviewed plan for tomorrow; maintenance table explicitly parked.

### Jude Cabigon (Ju.Cabigon) 🟢 — `worktrees/ju.cabigon/`
- On branch `ju.cabigon/exam-blueprint`: get a plan reviewed for transition tests in `backend/apps/exams/tests.py`, covering invalid transitions (e.g. `published → draft`).
- On branch `ju.cabigon/question-bank`: get a plan reviewed for wiring `QuestionBank.tsx` off `blueprintMockData.ts` onto `backendQuestionBankService.ts`, copying the working pattern in `ExamBlueprints.tsx`.
- **Deliverable:** two reviewed plans, one per branch.

### Ian Chris Sandoval (I.Sandoval) 🔴 / 🟡 — `worktrees/i.sandoval/`
- On branch `i.sandoval/exam-sets`: the separately approved Exam Sets plan has connected `ExamSets.tsx` to the versioned API, aligned lifecycle and role enforcement, and removed authoritative mock/browser-local persistence. Preserve the verification evidence and the remaining PostgreSQL migration-rehearsal caveat in the implementation log.
- Maintenance Table – Exam Blueprint: keep this **deferred**, with no maintenance branch cut; the Exam Sets integration was authorized by its own reviewed plan.
- **Deliverable:** API-backed Exam Sets workflow, verification log, and explicit open release gates.

### bienvenido.mendoza (B.Mendoza) 🔴 — `worktrees/b.mendoza/`
- Confirm directly: no Tauri/.NET desktop app exists anywhere in the repo — `ExamDelivery.tsx` is a React web page simulating the experience (fake SQLite log strings, no real IPC).
- On branches `b.mendoza/desktop-app-student` and `b.mendoza/desktop-app-proctor`: agree scope for both — Friday deliverable is a polished walkthrough of the existing simulation plus a one-pager on the real architecture plan (encrypted local store, package unlock via `schedule_id`, device enrollment via cert/mTLS per ADR-011) — not working software.
- **Deliverable:** scope agreement confirmed for both stories.

### Prince Barachiel Malonzo (P.Malonzo) 🟢 / 🟡 — `worktrees/p.malonzo/`
- Confirmed `backend/apps/exam_reviews` owns the real Exam Review models, API views, grading states, item scoring, answer-sheet upload, and finalization flow; `apps.results` owns the atomic CandidateScore intake used by release, and `ExamReviewList.tsx` / `ExamReviewDetail.tsx` consume the API through the frontend service.
- On branch `p.malonzo/exam-review`: grading-readiness hardening and the real Exam Review → Score Management score handoff are implemented. Results Release & Analytics remains a separate roadmap narrative, not a build.
- Student Portal: confirm this stays **out of scope** for this sprint entirely, no branch cut — three stories solo is already a full load.
- **Deliverable:** scope agreement confirmed for both active branches; Student Portal explicitly parked.

### Alvy Depositar (A.Depositar) 🟢 / 🟡 — `worktrees/a.depositar/`
- On branch `a.depositar/score-management`: update scope from prototype-only to working demo path. Score Management now has backend-owned processing, persistence, APIs, frontend wiring, local score seed data, candidate profile lookup, and linked student account seed data.
- On branch `a.depositar/system-integration`: deprioritize system integration unless time remains. Keep it as documentation-only follow-up because Score Management is the priority.
- **Deliverable:** current Score Management completion documented at 80% overall, with remaining production-scale gaps clearly listed.

### JP Mayordo (JP.Mayordo) 🟢 / 🟡 — `worktrees/jp.mayordo/`
- On branch `jp.mayordo/universities-courses`: identify which existing maintenance-table screen is furthest along to copy the pattern from (e.g. `StudentRegistrationMaintenance.tsx`), get a plan reviewed for wiring `UniversitiesListMaintenance.tsx` to real backend CRUD.
- On branch `jp.mayordo/deped-shs`: scope only today — confirm whether the same pattern applies cleanly; if yes, this becomes a Thursday-afternoon stretch goal, if no, it stays deferred.
- **Deliverable:** reviewed plan for Universities and Courses; DepEd SHS scoped as stretch-or-defer.

### Joshua Ganapin (Jo.Ganapin) 🔴 — `worktrees/jo.ganapin/`
- On branch `jo.ganapin/qr-scanning`: confirm `backend/apps/proctoring` is an empty stub with no QR validation logic anywhere.
- Agree scope: build a client-side QR-scan mockup (scan → attendance status change) as a demo asset, referencing the Present/Late/Absent grace-period model already designed in FR-009 as the narrative for what's built vs. designed.
- **Deliverable:** scope agreement confirmed.

### Standing items for everyone, today
- [ ] Confirm `AGENTS.md` (root, `backend/`, `frontend/`) is current before opening any Claude Code + Superpowers session
- [ ] Confirm your worktree exists and is on the right branch(es) before starting
- [ ] Create/update your `docs/superpowers/<code>/<code>.task.md` with your confirmed scope for the sprint
- [ ] Save today's Superpowers spec output to `docs/superpowers/<code>/specs/` and the reviewed plan to `docs/superpowers/<code>/plans/`
- [ ] No commits to `main` without PR review — say it out loud at standup

---

# THURSDAY (TOMORROW) — Execution day

### Lovely Mae Chavez (L.Chavez) 🟢
- **AM:** On `l.chavez/student-registration` — execute the approved plan. Run `backend/apps/applications/tests/` (65 tests). Confirm no `PS-` references remain.
- **Midday:** Switch to `l.chavez/rbac` — get plan reviewed (verify role-assignment logic).
- **Early PM:** Execute RBAC, run relevant `backend/apps/accounts/tests/` role-assignment cases.
- **Late PM (if time):** Switch to `l.chavez/review-application` — verify `Approve`/`Request Correction`/`Reject` flow. **If it doesn't fit, this slips to Friday AM — acceptable; Registration/RBAC are not.**

### Maricon Landicho (M.Landicho) 🟢
- **AM:** On `m.landicho/login` — execute the gap-closing plan from yesterday's audit.
- **Midday:** Run `test_login_endpoints.py` in full. New edge cases get new tests, not silent fixes.
- **PM:** Manual smoke test of the full four-step login flow end to end.

### Jude Cabigon (Ju.Cabigon) 🟢
- **AM:** On `ju.cabigon/exam-blueprint` — execute transition-test plan, all 8 statuses covered.
- **Midday:** Run `backend/apps/exams/tests.py` in full.
- **Early PM:** Switch to `ju.cabigon/question-bank` — execute the wiring plan, remove mock import, connect real service.
- **Late PM:** Manual smoke test of create/list/transition on both `/admin/hub/questions` and `/admin/questions`.

### Ian Chris Sandoval (I.Sandoval) 🔴
- **Completed under the separately reviewed Exam Sets plan, on `i.sandoval/exam-sets`:** Align the merged backend, connect the typed frontend service and workflow, and add backend, component, and browser coverage. Keep release claims gated by the recorded full-suite and migration evidence.

### bienvenido.mendoza (B.Mendoza) 🔴
- **All day, on `desktop-app-student` then `desktop-app-proctor`:** No backend work. Polish `ExamDelivery.tsx`'s flow (readiness check → webcam check → offline DB check → exam → submit) for a clean walkthrough. Draft the Tauri architecture one-pager for both variants.

### Prince Barachiel Malonzo (P.Malonzo) 🟢 / 🟡
- **AM–Midday, on `exam-review`:** Complete backend and frontend grading-readiness guards, verify list → detail scoring and release, and polish the missing-rubric display.
- **PM, on `results-release`:** Draft the Results Release & Analytics roadmap narrative (readiness gating, holds, government reporting interface — all currently unbuilt).

### Alvy Depositar (A.Depositar) 🟢 / 🟡
- **AM, on `score-management`:** Verify the working demo path: seed score data, seed linked candidate accounts/profiles, provision staff demo accounts, process scores, view results, open candidate profile, release, and export CSV.
- **PM, on `score-management`:** Close demo blockers first. Treat system integration as optional documentation only after Score Management demo data and page flow are stable.

### JP Mayordo (JP.Mayordo) 🟢
- **AM–PM, on `universities-courses`:** Execute wiring — list/add/edit/remove CRUD against real backend. Manual test.
- **Late PM (only if finished early), on `deped-shs`:** Attempt using the same pattern. If it doesn't fit, it stays deferred — no penalty.

### Joshua Ganapin (Jo.Ganapin) 🔴
- **All day, on `qr-scanning`:** Build the QR-scan mockup (scan → attendance status change) as a self-contained demo flow. No backend integration attempt.

### Standing items for everyone, today
- [ ] Midday check-in (15 min, all owners): converging or wandering? Kill and re-scope anything drifted.
- [ ] Run tests after every change, not just at end of day.
- [ ] Log what you built and tested today in `docs/superpowers/<code>/implement/<code>.implement.md`, referencing which plan in `plans/` it came from

---

# FRIDAY — Freeze and rehearse (not a build day)

### Lovely Mae Chavez (L.Chavez) 🟢
- **AM only, if `review-application` slipped:** finish, test, get reviewed. Hard stop by midday.
- After midday: P0 fixes only, through PR review.

### Maricon Landicho (M.Landicho) 🟢
- AM: support full rehearsal, walk through login live.
- After midday: P0 fixes only.

### Jude Cabigon (Ju.Cabigon) 🟢
- AM: support rehearsal on Blueprint → Question Bank walkthrough.
- After midday: P0 fixes only.

### Ian Chris Sandoval (I.Sandoval) 🔴
- AM: present the implemented Exam Sets API workflow and its verification evidence; explicitly disclose unresolved baseline checks and the PostgreSQL migration-rehearsal requirement.

### bienvenido.mendoza (B.Mendoza) 🔴
- AM: finalize the Desktop App walkthrough + architecture one-pager, dry run the "what's built vs. what's next" story for both variants. No code work.

### Prince Barachiel Malonzo (P.Malonzo) 🔴
- AM: finalize Exam Review walkthrough + Results Release roadmap narrative, dry run. No code work.

### Alvy Depositar (A.Depositar) 🟢 / 🟡
- AM: rehearse the Score Management demo path and explain current completion honestly: 80% overall, or 85-90% if system integration and downstream distribution are excluded. Call out remaining async processing, full audit trail, Application Review sync, and recipient distribution as post-demo work.

### JP Mayordo (JP.Mayordo) 🟢
- AM: support rehearsal on Universities/Courses maintenance screen if it's part of the demo path. If DepEd SHS didn't get built, note it as backlog — no scramble.

### Joshua Ganapin (Jo.Ganapin) 🔴
- AM: finalize QR-scan mockup walkthrough, dry run the attendance narrative. No code work.

### Standing items for everyone, Friday
- [ ] Feature freeze by midday — P0 fixes only after that, through PR review
- [ ] Full run-through of the actual demo path, start to finish, on the real system
- [ ] Final rehearsal of "here's what's built, here's the architecture, here's what's next" for every 🔴/🟡 track
- [ ] Any P0 fix made today gets appended to `docs/superpowers/<code>/implement/<code>.implement.md` — the implement log should be complete before the presentation, not left mid-day

