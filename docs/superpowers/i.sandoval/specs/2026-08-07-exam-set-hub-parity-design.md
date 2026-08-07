# Exam Set Hub Parity Design

**Owner:** Ian Chris Sandoval (I.Sandoval)
**Date:** 2026-08-07
**Status:** Approved for implementation planning
**Requested by:** Ian Sandoval, this session — "align exam-sets to the `philsla-07292026` prototype" (docs, data models, UI, backend/API wiring)

## Purpose

Rebuild the Exam Set hub (`/admin/hub/exam-sets/assembly`, `/published`, `/audit`) so its UI, data model, and API surface match the workflow demonstrated in the standalone prototype at `../../philsla-07292026` (`src/pages/admin/hub/ExamSets.tsx`), while staying on this app's already-implemented, tested, server-authoritative Exam Set backend (`apps/exams` — the 2026-08-05 API integration). The prototype is mockup-only (localStorage, `Math.random()` hashes, fabricated IP/device columns); this spec keeps everything the prototype only pretends to do genuinely backed by the database.

This is subsystem **A** of a three-part alignment effort scoped with the requester. The other two are explicitly deferred to their own specs:
- **B** — Exam Set → school/testing-center distribution (the prototype's "Upload to Schools" tab). No backend model exists yet (`apps/schools.School` exists but has no link to `ExamSet`).
- **C** — Exam Blueprint designer parity (`frontend/src/pages/ExamBlueprints.tsx` still has a `localStorage` fallback and silently-succeeds-locally-on-API-failure anti-pattern that the Exam Sets integration explicitly removed elsewhere).

## Current State

- Backend (`backend/apps/exams/models.py`, `services.py`, `views.py`) already implements `ExamBlueprint`/`BlueprintVersion`/`BlueprintSection` (+ per-section `BlueprintDifficultyDistribution`, `BlueprintQuestionTypeDistribution`, `BlueprintSectionTopic`) and `ExamSet`/`ExamSetQuestion` with a tested lifecycle (`DRAFT → ACADEMIC_REVIEW → {REVISION_REQUIRED, APPROVED} → PUBLISHED → ARCHIVED`), row-locked transitions, and three validation checks (`blueprint_status`, `item_count`, `approved_items`) recorded in `ExamSetValidationResult`.
- `ExamSetAssemblyRun`, `ExamSetAssemblyRunItem`, and `ExamSetQuestionReplacement` tables exist in the schema (migration `0003`) and are serialized (`serialize_exam_set_assembly_run`, `serialize_exam_set_assembly_run_item` already exist in `services.py:1241-1269`) but **nothing ever creates rows in them** — auto-assembly and replacement-tracking are schema-only today.
- `frontend/src/pages/admin/hub/ExamSets.tsx` (523 lines) is a working list+modal editor fully wired to the backend via `useExamSets`/`backendExamSetService` — no `localStorage`, good error/empty/loading states — but has none of the prototype's readiness checklist, subject-grouped builder, auto-assemble, or packages/audit views.
- `frontend/src/pages/admin/hub/ExamSetPublished.tsx` and `ExamSetAudit.tsx` are placeholder pages (static text, no data).
- Routing already exists for all three (`frontend/src/routing/routes.tsx:142-144`), gated to `EXAM_ADMINISTRATOR`/`SYSTEM_ADMIN` only (`EXAM_SET_MANAGEMENT`, `routes.tsx:110`) via a shared `ExamHubTabs` nav bar — this is a cleaner, more RESTful decomposition of the prototype's single-page/six-in-page-tabs structure and is being kept, not reverted.
- The prototype's `ExamAssemblyForm.status` mixes two naming eras (`DRAFT/VALIDATING/ACADEMIC_REVIEW/.../RETIRED` plus `In Set Approval/Approved Exam Set/Rejected Exam Set`), of which only 6 of 10 declared values are ever reachable from its own UI, and it has several fully-implemented-but-never-wired code paths (`handleDuplicateAssembly`, a dead legacy upload modal). None of that inconsistency is being ported — this app's real, tested 6-state `ExamSetStatus` enum is the single source of truth for status naming everywhere in the rebuilt UI.

## Scope

**In scope:**
- Auto-assembly: a real selection algorithm populating the existing-but-unused assembly-run tables, exposed via a new endpoint.
- An expanded, per-blueprint-section validation checklist (still using the existing `ExamSetValidationResult` table — no new model).
- A genuine, stored, SHA-256 publish-time integrity hash (`ExamSet.published_hash` — one new field, one migration).
- Item-level audit trail entries (add/remove/replace/reorder) via diffing on the existing item-replace path — no new audit model, no new endpoints.
- Rebuilding `ExamSets.tsx` (Dashboard), `ExamSetPublished.tsx` (Packages), and `ExamSetAudit.tsx` (Audit) to match the prototype's information and interactions, split into smaller component files rather than reproducing the prototype's 2,957-line monolith.
- A new `ExamSetAssemblyWorkspace` view (replacing today's modal for editing existing records) with the prototype's readiness-checklist + subject-grouped question builder UX.

**Out of scope** (deferred to future specs, per the three-way split above and prior design docs):
- Subsystem B (school/testing-center distribution) and subsystem C (Blueprint designer parity/localStorage cleanup).
- A `DifficultyLevel` maintenance table (still a hardcoded enum — explicitly deferred in `docs/superpowers/i.sandoval/specs/2026-08-06-exam-blueprint-maintenance-design.md`).
- Bulk CSV/XLSX import/export of Exam Sets.
- Real DOCX/PDF "exam booklet" export (the prototype's version is an `alert()` stub with no actual file generated).
- Regional/institutional scoping of the Exam Administrator role (still `TBD` per `task.md`; roles remain nationwide/global).
- A local "role persona" switcher. The prototype's is fake (local state, disconnected from the logged-in user). This app's route-level RBAC (`EXAM_ADMINISTRATOR`/`SYSTEM_ADMIN`) plus the existing `nextTransitions(status)` helper (shows only the buttons valid for the record's current status) is the real mechanism and needs no UI role-switcher at all.
- IP address / device columns in the audit trail. The prototype fabricates these per entry; this app does not capture that per-request today, and inventing values would be dishonest data. Left out.

**Scope gaps identified after implementation** (ratified as deferred to a future spec, per the final whole-branch review of `i.sandoval/exam-set-hub-parity`, 2026-08-07 — these were named in this spec's "In scope" list above but not carried through by the implementation plan, and no per-task review caught it since each task was only checked against its own brief, not this spec):
- The workspace's question list is a flat list sorted by `displayOrder`, not grouped by subject (this spec's own §"In scope" bullet named "subject-grouped question builder UX" explicitly).
- Only the row's "Edit" button opens the workspace; clicking the row itself does not.
- The "Create Exam Set" flow returns to the list on save instead of handing off into the workspace.
- The Packages view's cards don't show total marks and have no "View Details" link into the workspace (read-only).
- The Audit view's exam-set cell is plain text, not a link into the workspace.
- The publish-time hash payload doesn't include `total_marks` (low-risk: item points already capture the same information).

## Data model changes

One additive migration, no new models beyond activating the three that already exist unused:

| Change | Detail |
|---|---|
| `ExamSet.published_hash` | New nullable `CharField(max_length=64)`. Set exactly once, inside `transition_exam_set`, when transitioning to `PUBLISHED`. Computed as `sha256(json.dumps({exam_code, blueprint_version_id, items: [(question_id, points, display_order), ...], duration_minutes, total_marks}, sort_keys=True))`. Never recomputed afterward — `PUBLISHED` sets are not in `EXAM_SET_EDITABLE_STATUSES`, so the inputs can't change post-publish. |
| `ExamSetAssemblyRun` / `ExamSetAssemblyRunItem` | No schema change — these already exist (migration `0003`). This spec adds the first code path that ever writes to them. |
| `ExamSetQuestionReplacement` | Left unused. The audit-diffing approach (below) records replacements as `ExamSetWorkflowHistory` rows, which is sufficient for the Audit tab; a dedicated per-replacement table isn't needed for anything in this scope and stays available for subsystem B/C or a future need. |

No changes to `ExamBlueprint`, `BlueprintVersion`, `BlueprintSection`, or the maintenance lookup tables (`Subject`/`Topic`/`QuestionType`) — those remain owned by their respective prior specs.

## Backend services

### New module: `backend/apps/exams/assembly.py`

Keeps the new, more complex logic out of `services.py` (already 1,706 lines).

```python
def auto_assemble_exam_set(*, exam_set: ExamSet, actor_profile: AccountProfile) -> ExamSetAssemblyRun:
    ...
```

Algorithm, run once per call, only when `exam_set.status` is `DRAFT` or `REVISION_REQUIRED`:
1. For each `BlueprintSection` on `exam_set.blueprint_version` (ordered by `display_order`):
   - Candidate pool = `Question.objects.filter(subject=section.subject, status=QuestionStatus.APPROVED)`, excluding questions already selected earlier in this same run (across all sections).
   - For each `BlueprintDifficultyDistribution` row on the section (`difficulty`, `required_item_count`): take up to `required_item_count` candidates of that difficulty, ordered by `question_code` ascending for reproducibility (the candidate pool query needs its own explicit `order_by` here — `Question`'s model-level default is `-created_at`, which is not stable enough for a deterministic, testable selection algorithm), mark them selected.
   - If the section's selected count is still short of `section.item_count`, backfill from the remaining same-subject pool (any difficulty), in the same deterministic order.
   - Any shortfall that remains (pool exhausted) is *not* an error — it's recorded on the run (see below) and surfaces through the validation checklist as a `WARNING`, same as a manual builder falling short.
2. Persist the combined selection via the existing `_replace_exam_set_items` (imported from `services.py`), with `selection_method=SelectionMethod.AUTOMATIC` and each item's `blueprint_section` set to the section it was picked for.
3. Create one `ExamSetAssemblyRun` (`algorithm_version="v1"`, `status="completed"` or `"completed_with_shortfall"`, `selected_item_count`, `rejected_item_count` = total shortfall count across sections, `notes` = human-readable per-section shortfall summary) and one `ExamSetAssemblyRunItem` per **selected** question (`was_selected=True`). Rejected/unpicked candidates are not enumerated per-item — that would be O(bank size) noise for no behavioral benefit; the run's aggregate `rejected_item_count` and `notes` already communicate the shortfall.
4. Call `_record_exam_set_validation_results(exam_set)` and write one `ExamSetWorkflowHistory` row (`action="Auto-assembled N items"`).

### New endpoint

```
POST /api/v1/exams/exam-sets/{id}/auto-assemble/
```
Same permission class and role list as the existing transition/update endpoints (`EXAM_SET_MANAGEMENT_ROLES`), same editable-status gate (`409 ExamSetLifecycleConflict` if not `DRAFT`/`REVISION_REQUIRED`). Response: the updated serialized `ExamSet` (via existing `serialize_exam_set`) plus the new run via `serialize_exam_set_assembly_run` (already implemented, previously unused).

### Extended validation checklist

`_record_exam_set_validation_results` (`services.py:1359`) currently writes 3 rows (`blueprint_status`, `item_count`, `approved_items`). Add, per `BlueprintSection` on the exam set's blueprint version:
- `section_item_count_{section_id}` — actual items with `blueprint_section=section` vs. `section.item_count`. `PASSED` if equal, `WARNING` otherwise.
- `section_difficulty_{section_id}_{difficulty}` — one row per `BlueprintDifficultyDistribution` on the section, actual vs. `required_item_count`. `WARNING` if short.
- `section_question_type_{section_id}_{type_id}` — one row per `BlueprintQuestionTypeDistribution`, same pattern.
- `marks_compliance` — `sum(item.points)` vs. `sum(section.total_marks for section in sections)`. `WARNING` on mismatch.

A duplicate-question check (present in the prototype) is unnecessary: `_replace_exam_set_items` already raises a hard `ValidationError` on a duplicate question, so a duplicate can never be persisted in the first place.

These are additional rows in the same `ExamSetValidationResult` table — no schema change. `transition_exam_set` already blocks `APPROVED`/`PUBLISHED` on any non-`PASSED` result (`services.py:1488-1542`), so these new checks tighten (correctly) what "ready to approve/publish" means, consistent with the existing conservative posture.

### Audit trail — diffing on the existing item-replace path

`_replace_exam_set_items` currently deletes and recreates all `ExamSetQuestion` rows on every edit with no differential tracking. Change it to:
1. Capture the existing `{question_id: display_order}` mapping before deleting.
2. After resolving the new item list, compute `added = new_ids - old_ids`, `removed = old_ids - new_ids`.
3. Return this diff (plus whether any shared question's `display_order` changed) to the caller.

`create_or_update_exam_set` then writes, in addition to its existing single `"Updated exam set"` row:
- `len(added) == 1 and len(removed) == 1` → one row, `action="Replaced question {old_code} with {new_code}"`.
- Otherwise, one row per added question (`"Added question {code}"`) and one per removed question (`"Removed question {code}"`).
- If `added`/`removed` are both empty but any shared question's `display_order` changed → one row, `action="Reordered items"`.

All of this reuses the existing `ExamSetWorkflowHistory` table and the existing `PATCH /exam-sets/{id}/` endpoint — no new audit model, no new per-action endpoints.

## Frontend architecture

Routing is unchanged (`routes.tsx:142-144`): `/assembly` = Dashboard ⇄ Workspace (internal view state, not a route change), `/published` = Packages, `/audit` = Audit. `/admin/hub/exam-sets` (Blueprint designer) is untouched — subsystem C.

New files, splitting what the prototype crammed into one 2,957-line component:

| File | Responsibility |
|---|---|
| `frontend/src/pages/admin/hub/ExamSets.tsx` | **Dashboard.** Metric tiles (Drafts / Academic Review / Published / Validation Issues — computed client-side from the already-loaded list, no new requests) + search/status filter + table. Row click opens the workspace (replacing today's modal for edits; the modal remains only for the initial "Create" quick-start, which then hands off into the workspace). |
| `frontend/src/pages/admin/hub/examSets/ExamSetAssemblyWorkspace.tsx` | **Builder.** Blueprint info card, `ReadinessChecklist`, lifecycle buttons (reusing the existing `nextTransitions(status)`), "Run Auto-Selection" (calls the new endpoint; shown only when editable), question list grouped by subject with reorder/replace/remove, read-only rendering when status isn't editable. |
| `frontend/src/pages/admin/hub/examSets/ReadinessChecklist.tsx` | Renders `ExamSetValidationResult[]` as PASS (emerald) / WARNING (amber) / FAILED (red) rows, using this app's existing status-color conventions (`statusClasses` pattern already in `ExamSets.tsx`). |
| `frontend/src/pages/admin/hub/examSets/QuestionPickerDrawer.tsx` | Search-and-select over the Question Bank; add-mode appends, replace-mode swaps a target slot's question while keeping its `display_order`/`blueprint_section`. |
| `frontend/src/pages/admin/hub/ExamSetPublished.tsx` | **Packages.** Rebuilt (from stub) as read-only cards for `APPROVED`/`PUBLISHED` exam sets: `published_hash` (when `PUBLISHED`), item count, duration, total marks. "View Details" opens the workspace in read-only mode. No "package" API — a client-side filter over the same `useExamSets` list. Drops the prototype's fake "Schema" alert-dump button and its school-sync line (subsystem B). |
| `frontend/src/pages/admin/hub/ExamSetAudit.tsx` | **Audit.** Rebuilt (from stub) as a flattened `workflowHistory` table across every loaded exam set, newest first: timestamp, exam set (clickable → workspace), actor, action, previous→new status or diff description, remarks. No filters/pagination this cycle (matches the prototype's own flat list; flagged as a known scale limit). No IP/device columns (see Scope). |

`useExamSets` gains one method, `autoAssemble(id)`, alongside the existing `create/update/clone/transition/remove` — same `ServiceResult`-based success/failure handling, still zero `localStorage`.

### Status labels

Six real backend statuses everywhere, no prototype-only values: `DRAFT`, `ACADEMIC_REVIEW`, `REVISION_REQUIRED`, `APPROVED`, `PUBLISHED`, `ARCHIVED` — reusing the existing `statusLabel`/`statusClasses` helpers already in `ExamSets.tsx`.

## Testing

**Backend** (`apps/exams/tests.py`, following the existing `ExamSetApiTests` structure):
- `auto_assemble_exam_set`: fills sections by difficulty distribution, backfills shortfall from the same-subject pool, records `ExamSetAssemblyRun`/`ExamSetAssemblyRunItem` correctly, updates validation results.
- `POST .../auto-assemble/`: role-gated (403 for other roles), editable-status-gated (409 outside `DRAFT`/`REVISION_REQUIRED`), unauthenticated (401), and at least one real bearer-login test (per the P0 lesson from the original Exam Sets rehearsal).
- Extended validation results: per-section item-count/difficulty/question-type checks produce the right `PASSED`/`WARNING` rows; marks-compliance check.
- `published_hash`: deterministic given the same inputs, set only on `PUBLISHED` transition, stable across subsequent reads.
- Audit diffing: add/remove/replace/reorder each produce the expected `ExamSetWorkflowHistory` row(s); a same-content update (no item change) produces no extra rows beyond the existing `"Updated exam set"` entry.

**Frontend:**
- New `.test.tsx` for `ExamSetAssemblyWorkspace`, `ReadinessChecklist`, `QuestionPickerDrawer`.
- Updated tests for `ExamSets.tsx` (tiles compute correctly, row click opens workspace), `ExamSetPublished.tsx` (filters to `APPROVED`/`PUBLISHED` only, shows hash), `ExamSetAudit.tsx` (flattens/sorts correctly).
- Extend `frontend/e2e/exam-sets.spec.ts` with an auto-assemble → publish journey.

## Security

- No new sensitive data: `published_hash` is a content-integrity digest over already-visible exam set metadata, not a secret.
- Backend remains authoritative for validation, authorization, and lifecycle — the frontend continues to have no independent authority, matching the rest of `apps/exams`.
- The new auto-assemble endpoint follows the same role/permission/editable-status gates as existing mutation endpoints; no new permission class needed.
- No real exam content changes hands differently than today — auto-assembly selects from the same `APPROVED`-only question pool that manual selection already draws from.
