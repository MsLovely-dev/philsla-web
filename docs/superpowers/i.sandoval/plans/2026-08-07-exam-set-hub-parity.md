# Exam Set Hub Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Exam Set hub (`/admin/hub/exam-sets/assembly`, `/published`, `/audit`) so it matches the `philsla-07292026` prototype's workflow — auto-assembly, a per-section readiness checklist, a publish-time integrity hash, and item-level audit history — fully backed by the existing Django/DRF Exam Set API, with the frontend split into focused components instead of one monolith.

**Architecture:** Backend additions live in `apps/exams`: one additive migration (`ExamSet.published_hash`), a new `assembly.py` module (kept separate from the already-1,700-line `services.py`) for the auto-assembly algorithm, and targeted extensions to the existing `_record_exam_set_validation_results` and `_replace_exam_set_items` functions. Frontend gets a shared `examSetUi.ts` helper module (extracted from `ExamSets.tsx`) plus three new components (`ReadinessChecklist`, `QuestionPickerDrawer`, `ExamSetAssemblyWorkspace`) that replace today's modal-based editor for existing records; `ExamSetPublished.tsx` and `ExamSetAudit.tsx` go from static placeholders to real filtered/aggregated views of the same `useExamSets` data.

**Tech Stack:** Django REST Framework (backend), React + TypeScript + Vitest + Playwright (frontend).

## Global Constraints

- No prototype-only status values (`VALIDATING`, `SUBMITTED`, `RETIRED`, or the Title-Case duplicates). Only the six real `ExamSetStatus` values (`DRAFT`, `ACADEMIC_REVIEW`, `REVISION_REQUIRED`, `APPROVED`, `PUBLISHED`, `ARCHIVED`) appear anywhere in the UI.
- No `localStorage` anywhere in the rebuilt frontend. All state flows through `useExamSets`/`backendExamSetService`.
- No fake "role persona" switcher. Route-level RBAC (`EXAM_ADMINISTRATOR`/`SYSTEM_ADMIN`) plus the existing `nextTransitions(status)` helper is the only role mechanism.
- No IP address / device columns in the audit trail — this app doesn't capture that per-request, and fabricating it would be dishonest data.
- Backend remains authoritative for validation, authorization, and lifecycle. The frontend never has independent authority.
- Every new backend mutation endpoint follows the existing `EXAM_SET_MANAGEMENT_ROLES` (`EXAM_ADMINISTRATOR`, `SYSTEM_ADMIN`) and `EXAM_SET_EDITABLE_STATUSES` (`DRAFT`, `REVISION_REQUIRED`) gates already used by `ExamSetDetailView`/`ExamSetTransitionView`.
- Out of scope (separate future specs): school/testing-center distribution, Exam Blueprint designer (`ExamBlueprints.tsx`) parity/localStorage cleanup, a `DifficultyLevel` maintenance table, bulk CSV import/export, real DOCX/PDF export, regional/institutional role scoping.
- Reference: `docs/superpowers/i.sandoval/specs/2026-08-07-exam-set-hub-parity-design.md` is the approved design this plan implements.

---

## Task 1: Publish-time integrity hash

**Files:**
- Modify: `backend/apps/exams/models.py` (add `published_hash` to `ExamSet`)
- Create: `backend/apps/exams/migrations/0004_examset_published_hash.py`
- Modify: `backend/apps/exams/services.py` (add `_compute_exam_set_hash`, wire into `transition_exam_set`, add to `serialize_exam_set`)
- Modify: `backend/apps/exams/serializers.py` (add `published_hash` to `ExamSetSerializer`)
- Modify: `backend/apps/exams/tests.py` (extend `ExamSetApiTests`)

**Interfaces:**
- Produces: `ExamSet.published_hash: str | None` (model field, nullable `CharField(max_length=64)`)
- Produces: `apps.exams.services._compute_exam_set_hash(exam_set: ExamSet) -> str`
- Consumed by: Task 4 (auto-assemble doesn't touch this directly, but shares `serialize_exam_set`)

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/exams/tests.py`, inside `ExamSetApiTests`, after `test_rejects_invalid_lifecycle_transitions_and_locked_updates`:

```python
    def test_publishing_sets_a_deterministic_content_hash(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        self.assertIsNone(created.data["published_hash"])
        transition_url = reverse("exams:exam_set_transition", kwargs={"exam_set_id": exam_set_id})

        self.client.post(transition_url, {"status": "ACADEMIC_REVIEW"}, format="json")
        approved = self.client.post(transition_url, {"status": "APPROVED"}, format="json")
        self.assertIsNone(approved.data["published_hash"])

        published = self.client.post(transition_url, {"status": "PUBLISHED"}, format="json")
        self.assertIsNotNone(published.data["published_hash"])
        self.assertEqual(len(published.data["published_hash"]), 64)

        refetched = self.client.get(reverse("exams:exam_set_detail", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(refetched.data["published_hash"], published.data["published_hash"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.ExamSetApiTests.test_publishing_sets_a_deterministic_content_hash --settings=config.settings.test -v 2`
Expected: FAIL — `KeyError: 'published_hash'` (the field doesn't exist on the serializer/model yet).

- [ ] **Step 3: Add the model field**

In `backend/apps/exams/models.py`, in the `ExamSet` class, add after `archived_at`:

```python
    published_hash = models.CharField(max_length=64, null=True, blank=True)
```

- [ ] **Step 4: Generate and verify the migration**

Run: `cd backend && .venv/Scripts/python.exe manage.py makemigrations exams --settings=config.settings.test -n examset_published_hash`
Expected: creates `backend/apps/exams/migrations/0004_examset_published_hash.py` with a single `AddField` operation for `ExamSet.published_hash`, depending on `0003_examset_examsetassemblyrun_examsetquestion_and_more`. Open the generated file and confirm it contains exactly one `migrations.AddField` for `published_hash` with `field=models.CharField(blank=True, max_length=64, null=True)` — if Django generated anything else (e.g. it picked up unrelated model drift), stop and investigate before continuing.

- [ ] **Step 5: Add the hash computation function**

In `backend/apps/exams/services.py`, add `import hashlib` and `import json` to the top-of-file imports (alongside the existing `from decimal import Decimal, InvalidOperation` line). Then add, immediately before `def transition_exam_set(`:

```python
def _compute_exam_set_hash(exam_set: ExamSet) -> str:
    payload = {
        "exam_code": exam_set.exam_code,
        "blueprint_version_id": exam_set.blueprint_version_id,
        "duration_minutes": exam_set.duration_minutes,
        "items": sorted(
            [item.question_id, str(item.points), item.display_order]
            for item in exam_set.items.all()
        ),
    }
    canonical = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
```

- [ ] **Step 6: Wire the hash into the PUBLISHED transition**

In `backend/apps/exams/services.py`, in `transition_exam_set`, find:

```python
    elif normalized_status == ExamSetStatus.PUBLISHED:
        exam_set.published_at = now
        exam_set.published_by = actor_profile
    elif normalized_status == ExamSetStatus.ARCHIVED:
        exam_set.archived_at = now
        exam_set.archived_by = actor_profile
    exam_set.save(update_fields=["status", "approved_at", "approved_by", "published_at", "published_by", "archived_at", "archived_by", "updated_at"])
```

Replace with:

```python
    elif normalized_status == ExamSetStatus.PUBLISHED:
        exam_set.published_at = now
        exam_set.published_by = actor_profile
        exam_set.published_hash = _compute_exam_set_hash(exam_set)
    elif normalized_status == ExamSetStatus.ARCHIVED:
        exam_set.archived_at = now
        exam_set.archived_by = actor_profile
    exam_set.save(update_fields=["status", "approved_at", "approved_by", "published_at", "published_by", "published_hash", "archived_at", "archived_by", "updated_at"])
```

- [ ] **Step 7: Expose it in `serialize_exam_set`**

In `backend/apps/exams/services.py`, in `serialize_exam_set`, add after `"published_at": ...,`:

```python
        "published_hash": exam_set.published_hash,
```

- [ ] **Step 8: Expose it in the serializer**

In `backend/apps/exams/serializers.py`, in `ExamSetSerializer`, add after `published_at = serializers.DateTimeField(read_only=True, allow_null=True)` (find the line — it's grouped with the other `*_at`/`*_by` read-only fields):

```python
    published_hash = serializers.CharField(read_only=True, allow_null=True)
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.ExamSetApiTests.test_publishing_sets_a_deterministic_content_hash --settings=config.settings.test -v 2`
Expected: PASS.

- [ ] **Step 10: Run the full exams suite to check for regressions**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests --settings=config.settings.test`
Expected: PASS — all prior tests plus the new one.

- [ ] **Step 11: Add the frontend field mapping**

In `frontend/src/services/backendExamSetService.ts`, add to the `ExamSetRecord` interface, after `archivedAt: string | null;`:

```typescript
  publishedHash: string | null;
```

Add to the `ApiExamSet` interface, after `archived_at: string | null;`:

```typescript
  published_hash: string | null;
```

In `fromApi`, add after `archivedAt: record.archived_at,`:

```typescript
      publishedHash: record.published_hash,
```

- [ ] **Step 12: Write the failing frontend test**

Add to `frontend/src/services/backendExamSetService.test.ts`, adding `published_hash: null,` to the existing `apiExamSet` fixture object (after `archived_at: null,`), and add a new test:

```typescript
it('maps published_hash through to publishedHash', async () => {
  const fetcher = vi.fn().mockResolvedValue(jsonResponse({ ...apiExamSet, published_hash: 'a'.repeat(64) }, 200));
  const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
  const service = new BackendExamSetService(client);

  const result = await service.listExamSets();

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data[0].publishedHash).toBe('a'.repeat(64));
  }
});
```

Note: verify `ApiClient`'s constructor signature and how the existing tests in this file instantiate it (look at the test immediately above this one) before finalizing this snippet — match whatever pattern the file already uses for building a client with a mocked fetcher.

- [ ] **Step 13: Run frontend test to verify it fails, then passes**

Run: `cd frontend && npm test -- backendExamSetService.test.ts`
Expected: FAILs first (field is `undefined`, not the hash) if `published_hash` isn't yet in the fixture defaults, then PASS once Step 11 is in place — since Step 11 was already done, this should PASS immediately. If it fails, re-check Step 11's edits.

- [ ] **Step 14: Commit**

```bash
cd backend
git add apps/exams/models.py apps/exams/migrations/0004_examset_published_hash.py apps/exams/services.py apps/exams/serializers.py apps/exams/tests.py
cd ../frontend
git add src/services/backendExamSetService.ts src/services/backendExamSetService.test.ts
cd ..
git commit -m "feat(exam-set-hub-parity): add publish-time integrity hash"
```

---

## Task 2: Expanded per-section validation checklist

**Files:**
- Modify: `backend/apps/exams/services.py` (extend `_record_exam_set_validation_results`)
- Modify: `backend/apps/exams/tests.py` (add a test)

**Interfaces:**
- Consumes: `BlueprintSection`, `BlueprintDifficultyDistribution`, `BlueprintQuestionTypeDistribution` (existing models, already imported in `services.py`)
- Produces: additional `ExamSetValidationResult` rows with `validation_code` patterns `section_item_count_{id}`, `section_difficulty_{id}_{difficulty}`, `section_question_type_{id}_{type_id}`, `marks_compliance` — consumed by Task 6's `ReadinessChecklist` component (any `ExamSetValidationResult`, no new frontend type needed).

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/exams/tests.py`, inside `ExamSetApiTests`, and add `BlueprintDifficultyDistribution` to the existing `from .models import (...)` line at the top of the file:

```python
    def test_validation_checklist_covers_section_difficulty_and_marks_compliance(self) -> None:
        section = BlueprintSection.objects.create(
            blueprint_version=self.blueprint_version,
            section_number=1,
            section_name="Science",
            subject=self.subject,
            item_count=2,
            total_marks="10.00",
            passing_score="5.00",
            time_limit_minutes=30,
            display_order=1,
        )
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="easy", required_item_count=1)
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="moderate", required_item_count=1)

        created = self.client.post(reverse("exams:exam_set_list"), {
            **self.payload,
            "items": [{"question_id": self.question.id, "blueprint_section_id": section.id, "display_order": 1, "points": 5}],
        }, format="json")

        codes = {result["validation_code"]: result for result in created.data["validation_results"]}
        self.assertEqual(codes[f"section_item_count_{section.id}"]["result"], "warning")
        self.assertEqual(codes[f"section_difficulty_{section.id}_easy"]["result"], "passed")
        self.assertEqual(codes[f"section_difficulty_{section.id}_moderate"]["result"], "warning")
        self.assertEqual(codes["marks_compliance"]["result"], "warning")
```

(`self.question.difficulty` is `"easy"`, set in `ExamSetApiTests.setUp`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.ExamSetApiTests.test_validation_checklist_covers_section_difficulty_and_marks_compliance --settings=config.settings.test -v 2`
Expected: FAIL — `KeyError` on one of the `section_*`/`marks_compliance` codes (they don't exist yet).

- [ ] **Step 3: Extend the validation function**

In `backend/apps/exams/services.py`, `_record_exam_set_validation_results` currently ends after the `approved_items` check. Replace the whole function body (keep the existing 3 checks unchanged) by adding this block immediately before the function's final `)` / end, i.e. append after the existing `approved_items` `ExamSetValidationResult.objects.create(...)` call and before the function ends:

```python
    sections = list(
        exam_set.blueprint_version.sections.prefetch_related("difficulty_requirements")
    )
    total_target_marks = Decimal("0")
    for section in sections:
        total_target_marks += section.total_marks
        section_items = [item for item in items if item.blueprint_section_id == section.pk]

        ExamSetValidationResult.objects.create(
            exam_set=exam_set,
            validation_code=f"section_item_count_{section.pk}",
            validation_name=f"{section.section_name}: item count",
            result=ValidationResult.PASSED if len(section_items) == section.item_count else ValidationResult.WARNING,
            expected_value=str(section.item_count),
            actual_value=str(len(section_items)),
            message=(
                f"{section.section_name} has the required {section.item_count} items."
                if len(section_items) == section.item_count
                else f"{section.section_name} has {len(section_items)} items; expects {section.item_count}."
            ),
        )

        for distribution in section.difficulty_requirements.all():
            actual = sum(1 for item in section_items if item.question.difficulty == distribution.difficulty)
            ExamSetValidationResult.objects.create(
                exam_set=exam_set,
                validation_code=f"section_difficulty_{section.pk}_{distribution.difficulty}",
                validation_name=f"{section.section_name}: {distribution.difficulty} items",
                result=ValidationResult.PASSED if actual >= distribution.required_item_count else ValidationResult.WARNING,
                expected_value=str(distribution.required_item_count),
                actual_value=str(actual),
                message=(
                    f"{section.section_name} has enough {distribution.difficulty} items."
                    if actual >= distribution.required_item_count
                    else f"{section.section_name} needs {distribution.required_item_count} {distribution.difficulty} items; has {actual}."
                ),
            )

        for type_distribution in section.question_type_requirements.select_related("question_type").all():
            actual = sum(1 for item in section_items if item.question.question_type_id == type_distribution.question_type_id)
            ExamSetValidationResult.objects.create(
                exam_set=exam_set,
                validation_code=f"section_question_type_{section.pk}_{type_distribution.question_type_id}",
                validation_name=f"{section.section_name}: {type_distribution.question_type.name} items",
                result=ValidationResult.PASSED if actual >= type_distribution.required_item_count else ValidationResult.WARNING,
                expected_value=str(type_distribution.required_item_count),
                actual_value=str(actual),
                message=(
                    f"{section.section_name} has enough {type_distribution.question_type.name} items."
                    if actual >= type_distribution.required_item_count
                    else f"{section.section_name} needs {type_distribution.required_item_count} {type_distribution.question_type.name} items; has {actual}."
                ),
            )

    if sections:
        actual_marks = sum(item.points for item in items)
        ExamSetValidationResult.objects.create(
            exam_set=exam_set,
            validation_code="marks_compliance",
            validation_name="Marks compliance",
            result=ValidationResult.PASSED if actual_marks == total_target_marks else ValidationResult.WARNING,
            expected_value=str(total_target_marks),
            actual_value=str(actual_marks),
            message=(
                "Total item marks match the blueprint target."
                if actual_marks == total_target_marks
                else f"Total item marks are {actual_marks}; blueprint target is {total_target_marks}."
            ),
        )
```

Also change the existing `items = list(exam_set.items.all().select_related("question"))` line at the top of the function to:

```python
    items = list(exam_set.items.all().select_related("question", "blueprint_section"))
```

(needed so `item.blueprint_section_id` filtering above doesn't trigger extra queries).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.ExamSetApiTests.test_validation_checklist_covers_section_difficulty_and_marks_compliance --settings=config.settings.test -v 2`
Expected: PASS.

- [ ] **Step 5: Run the full exams suite to check for regressions**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests --settings=config.settings.test`
Expected: PASS. Pay particular attention to `test_create_list_clone_and_transition_exam_sets` and `test_rejects_invalid_lifecycle_transitions_and_locked_updates` — both use `self.payload`, which has no `blueprint_section_id` on its item, so `sections` will be an empty list for those tests (no `BlueprintSection` created in the shared `setUp`) and none of the new checks should fire (`if sections:` guards `marks_compliance`, and the per-section loop iterates zero times).

- [ ] **Step 6: Commit**

```bash
cd backend
git add apps/exams/services.py apps/exams/tests.py
git commit -m "feat(exam-set-hub-parity): expand validation checklist with per-section checks"
```

---

## Task 3: Item-level audit trail via diffing

**Files:**
- Modify: `backend/apps/exams/services.py` (`_replace_exam_set_items` returns a diff; `create_or_update_exam_set` writes extra history rows)
- Modify: `backend/apps/exams/tests.py` (add a test)

**Interfaces:**
- Produces: `apps.exams.services.ExamSetItemsDiff` (dataclass: `added_question_codes: list[str]`, `removed_question_codes: list[str]`, `order_changed: bool`, properties `is_replacement`/`changed`)
- Changes: `_replace_exam_set_items(exam_set, items, actor_profile) -> ExamSetItemsDiff` (was `-> None`) — **consumed by Task 4**, which calls this same function and must account for the new return value.

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/exams/tests.py`, inside `ExamSetApiTests`:

```python
    def test_updating_items_records_add_remove_and_replace_audit_entries(self) -> None:
        second_question = Question.objects.create(
            question_code="Q-SCI-002", question_type=self.question_type, subject=self.subject, topic=self.topic,
            competency=self.competency, difficulty="moderate", question_text="Second question.", points="5.00",
            status=QuestionStatus.APPROVED, created_by=self.profile, approved_by=self.profile,
        )
        third_question = Question.objects.create(
            question_code="Q-SCI-003", question_type=self.question_type, subject=self.subject, topic=self.topic,
            competency=self.competency, difficulty="difficult", question_text="Third question.", points="5.00",
            status=QuestionStatus.APPROVED, created_by=self.profile, approved_by=self.profile,
        )
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        detail_url = reverse("exams:exam_set_detail", kwargs={"exam_set_id": exam_set_id})

        added = self.client.put(detail_url, {
            **self.payload,
            "items": [
                {"question_id": self.question.id, "display_order": 1, "points": 5},
                {"question_id": second_question.id, "display_order": 2, "points": 5},
            ],
        }, format="json")
        self.assertEqual(added.status_code, 200)
        self.assertIn("Added question Q-SCI-002", [entry["action"] for entry in added.data["workflow_history"]])

        replaced = self.client.put(detail_url, {
            **self.payload,
            "items": [
                {"question_id": self.question.id, "display_order": 1, "points": 5},
                {"question_id": third_question.id, "display_order": 2, "points": 5},
            ],
        }, format="json")
        self.assertEqual(replaced.status_code, 200)
        self.assertIn("Replaced question Q-SCI-002 with Q-SCI-003", [entry["action"] for entry in replaced.data["workflow_history"]])

        removed = self.client.put(detail_url, {
            **self.payload,
            "items": [{"question_id": self.question.id, "display_order": 1, "points": 5}],
        }, format="json")
        self.assertEqual(removed.status_code, 200)
        self.assertIn("Removed question Q-SCI-003", [entry["action"] for entry in removed.data["workflow_history"]])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.ExamSetApiTests.test_updating_items_records_add_remove_and_replace_audit_entries --settings=config.settings.test -v 2`
Expected: FAIL — the `"Added question Q-SCI-002"` action string is not found in `workflow_history` (only the generic `"Updated exam set"` row exists today).

- [ ] **Step 3: Add the diff dataclass and update `_replace_exam_set_items`**

In `backend/apps/exams/services.py`, add `from dataclasses import dataclass, field` to the top-of-file imports. Add, immediately before `def _replace_exam_set_items(`:

```python
@dataclass
class ExamSetItemsDiff:
    added_question_codes: list[str] = field(default_factory=list)
    removed_question_codes: list[str] = field(default_factory=list)
    order_changed: bool = False

    @property
    def is_replacement(self) -> bool:
        return len(self.added_question_codes) == 1 and len(self.removed_question_codes) == 1

    @property
    def changed(self) -> bool:
        return bool(self.added_question_codes or self.removed_question_codes or self.order_changed)
```

Then change `_replace_exam_set_items`'s signature and body. Find:

```python
def _replace_exam_set_items(exam_set: ExamSet, items: list[dict[str, Any]], actor_profile: AccountProfile) -> None:
    resolved_items: list[tuple[Question, BlueprintSection | None, int, Decimal, str]] = []
    seen_question_ids: set[int] = set()
```

Replace with:

```python
def _replace_exam_set_items(exam_set: ExamSet, items: list[dict[str, Any]], actor_profile: AccountProfile) -> ExamSetItemsDiff:
    existing_by_question_id = {item.question_id: item.display_order for item in exam_set.items.all()}
    resolved_items: list[tuple[Question, BlueprintSection | None, int, Decimal, str]] = []
    seen_question_ids: set[int] = set()
```

Leave the resolution loop (the `for index, item_payload in enumerate(items, start=1):` block) untouched. Find the end of the function:

```python
    exam_set.items.all().delete()
    for question, blueprint_section, display_order, points, selection_method in resolved_items:
        ExamSetQuestion.objects.create(
            exam_set=exam_set,
            question=question,
            blueprint_section=blueprint_section,
            display_order=display_order,
            points=points,
            selection_method=selection_method,
            selected_by=actor_profile,
        )
```

Replace with:

```python
    new_by_question_id = {question.pk: display_order for question, _section, display_order, _points, _method in resolved_items}
    old_ids = set(existing_by_question_id)
    new_ids = set(new_by_question_id)
    added_ids = new_ids - old_ids
    removed_ids = old_ids - new_ids
    shared_ids = old_ids & new_ids
    order_changed = any(existing_by_question_id[qid] != new_by_question_id[qid] for qid in shared_ids)

    question_codes = dict(Question.objects.filter(pk__in=added_ids | removed_ids).values_list("pk", "question_code"))
    diff = ExamSetItemsDiff(
        added_question_codes=[question_codes[qid] for qid in added_ids],
        removed_question_codes=[question_codes[qid] for qid in removed_ids],
        order_changed=order_changed and not (added_ids or removed_ids),
    )

    exam_set.items.all().delete()
    for question, blueprint_section, display_order, points, selection_method in resolved_items:
        ExamSetQuestion.objects.create(
            exam_set=exam_set,
            question=question,
            blueprint_section=blueprint_section,
            display_order=display_order,
            points=points,
            selection_method=selection_method,
            selected_by=actor_profile,
        )
    return diff
```

- [ ] **Step 4: Write the extra history rows in `create_or_update_exam_set`**

In `backend/apps/exams/services.py`, find in `create_or_update_exam_set`:

```python
    if "items" in payload or "questions" in payload:
        items_payload = list(_payload_value(payload, "items", default=_payload_value(payload, "questions", default=[])) or [])
        _replace_exam_set_items(exam_set, items_payload, actor_profile)

    _record_exam_set_validation_results(exam_set)
    ExamSetWorkflowHistory.objects.create(
        exam_set=exam_set,
        previous_status=previous_status,
        new_status=exam_set.status,
        action=action,
        remarks=str(_payload_value(payload, "remarks", default="") or ""),
        initiated_by=actor_profile,
    )
    return exam_set
```

Replace with:

```python
    items_diff: ExamSetItemsDiff | None = None
    if "items" in payload or "questions" in payload:
        items_payload = list(_payload_value(payload, "items", default=_payload_value(payload, "questions", default=[])) or [])
        items_diff = _replace_exam_set_items(exam_set, items_payload, actor_profile)

    _record_exam_set_validation_results(exam_set)
    ExamSetWorkflowHistory.objects.create(
        exam_set=exam_set,
        previous_status=previous_status,
        new_status=exam_set.status,
        action=action,
        remarks=str(_payload_value(payload, "remarks", default="") or ""),
        initiated_by=actor_profile,
    )
    if items_diff and items_diff.changed:
        if items_diff.is_replacement:
            ExamSetWorkflowHistory.objects.create(
                exam_set=exam_set,
                previous_status=exam_set.status,
                new_status=exam_set.status,
                action=f"Replaced question {items_diff.removed_question_codes[0]} with {items_diff.added_question_codes[0]}",
                initiated_by=actor_profile,
            )
        else:
            for code in items_diff.added_question_codes:
                ExamSetWorkflowHistory.objects.create(
                    exam_set=exam_set, previous_status=exam_set.status, new_status=exam_set.status,
                    action=f"Added question {code}", initiated_by=actor_profile,
                )
            for code in items_diff.removed_question_codes:
                ExamSetWorkflowHistory.objects.create(
                    exam_set=exam_set, previous_status=exam_set.status, new_status=exam_set.status,
                    action=f"Removed question {code}", initiated_by=actor_profile,
                )
            if items_diff.order_changed:
                ExamSetWorkflowHistory.objects.create(
                    exam_set=exam_set, previous_status=exam_set.status, new_status=exam_set.status,
                    action="Reordered items", initiated_by=actor_profile,
                )
    return exam_set
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.ExamSetApiTests.test_updating_items_records_add_remove_and_replace_audit_entries --settings=config.settings.test -v 2`
Expected: PASS.

- [ ] **Step 6: Run the full exams suite to check for regressions**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests --settings=config.settings.test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd backend
git add apps/exams/services.py apps/exams/tests.py
git commit -m "feat(exam-set-hub-parity): add item-level audit trail via diffing"
```

---

## Task 4: Auto-assembly service and endpoint

**Files:**
- Create: `backend/apps/exams/assembly.py`
- Modify: `backend/apps/exams/views.py` (add `ExamSetAutoAssembleView`)
- Modify: `backend/apps/exams/urls.py` (add the route)
- Modify: `backend/apps/exams/tests.py` (add tests)

**Interfaces:**
- Consumes: `ExamSetLifecycleConflict`, `EXAM_SET_EDITABLE_STATUSES`, `_replace_exam_set_items` (now returning `ExamSetItemsDiff` per Task 3, ignored here), `_record_exam_set_validation_results` — all imported from `.services`
- Produces: `apps.exams.assembly.auto_assemble_exam_set(*, exam_set: ExamSet, actor_profile: AccountProfile) -> ExamSetAssemblyRun`
- Produces: URL name `exams:exam_set_auto_assemble`

- [ ] **Step 1: Write the failing tests**

Add to `backend/apps/exams/tests.py`, inside `ExamSetApiTests`, and add `BlueprintDifficultyDistribution` to the top-level `from .models import (...)` line if Task 2 didn't already add it:

```python
    def test_auto_assemble_selects_items_per_section_and_records_assembly_run(self) -> None:
        section = BlueprintSection.objects.create(
            blueprint_version=self.blueprint_version, section_number=1, section_name="Science",
            subject=self.subject, item_count=2, total_marks="10.00", passing_score="5.00",
            time_limit_minutes=30, display_order=1,
        )
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="easy", required_item_count=1)
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="moderate", required_item_count=1)

        second_question = Question.objects.create(
            question_code="Q-SCI-002", question_type=self.question_type, subject=self.subject, topic=self.topic,
            competency=self.competency, difficulty="moderate", question_text="Second question.", points="5.00",
            status=QuestionStatus.APPROVED, created_by=self.profile, approved_by=self.profile,
        )

        created = self.client.post(reverse("exams:exam_set_list"), {**self.payload, "items": []}, format="json")
        exam_set_id = created.data["id"]

        response = self.client.post(reverse("exams:exam_set_auto_assemble", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 2)
        self.assertEqual(
            {item["question"]["id"] for item in response.data["items"]},
            {str(self.question.id), str(second_question.id)},
        )
        self.assertEqual(len(response.data["assembly_runs"]), 1)
        self.assertEqual(response.data["assembly_runs"][0]["selected_item_count"], 2)
        self.assertEqual(response.data["assembly_runs"][0]["status"], "completed")
        self.assertIn("Auto-assembled 2 items", [entry["action"] for entry in response.data["workflow_history"]])

    def test_auto_assemble_records_shortfall_when_pool_is_insufficient(self) -> None:
        section = BlueprintSection.objects.create(
            blueprint_version=self.blueprint_version, section_number=1, section_name="Science",
            subject=self.subject, item_count=5, total_marks="25.00", passing_score="10.00",
            time_limit_minutes=30, display_order=1,
        )
        BlueprintDifficultyDistribution.objects.create(blueprint_section=section, difficulty="easy", required_item_count=1)

        created = self.client.post(reverse("exams:exam_set_list"), {**self.payload, "items": []}, format="json")
        exam_set_id = created.data["id"]

        response = self.client.post(reverse("exams:exam_set_auto_assemble", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["assembly_runs"][0]["status"], "completed_with_shortfall")
        self.assertEqual(response.data["assembly_runs"][0]["rejected_item_count"], 4)

    def test_auto_assemble_rejects_non_editable_exam_sets(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        transition_url = reverse("exams:exam_set_transition", kwargs={"exam_set_id": exam_set_id})
        self.client.post(transition_url, {"status": "ACADEMIC_REVIEW"}, format="json")

        response = self.client.post(reverse("exams:exam_set_auto_assemble", kwargs={"exam_set_id": exam_set_id}))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "EXAM_SET_LIFECYCLE_CONFLICT")

    def test_auto_assemble_denies_unauthenticated_and_unapproved_roles(self) -> None:
        created = self.client.post(reverse("exams:exam_set_list"), self.payload, format="json")
        exam_set_id = created.data["id"]
        auto_assemble_url = reverse("exams:exam_set_auto_assemble", kwargs={"exam_set_id": exam_set_id})

        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(auto_assemble_url).status_code, 401)

        User = get_user_model()
        university_user = User.objects.create_user(
            username="auto_assemble_denied_user", email="auto.assemble.denied@example.test", password="Password1!",
        )
        AccountProfile.objects.create(user=university_user, role=PortalRole.UNIVERSITY_ADMIN.value)
        self.client.force_authenticate(university_user)
        self.assertEqual(self.client.post(auto_assemble_url).status_code, 403)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.ExamSetApiTests.test_auto_assemble_selects_items_per_section_and_records_assembly_run --settings=config.settings.test -v 2`
Expected: FAIL — `NoReverseMatch: Reverse for 'exam_set_auto_assemble' not found`.

- [ ] **Step 3: Create `assembly.py`**

Create `backend/apps/exams/assembly.py`:

```python
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AccountProfile

from .models import (
    ExamSet,
    ExamSetAssemblyRun,
    ExamSetAssemblyRunItem,
    ExamSetWorkflowHistory,
    Question,
    QuestionStatus,
    SelectionMethod,
)
from .services import (
    EXAM_SET_EDITABLE_STATUSES,
    ExamSetLifecycleConflict,
    _record_exam_set_validation_results,
    _replace_exam_set_items,
)

# `_record_exam_set_validation_results` and `_replace_exam_set_items` are private
# helpers in services.py, imported here deliberately: this module exists purely to
# keep the auto-assembly algorithm out of the already-large services.py, not to
# duplicate the item-persistence or validation logic it already provides.


@transaction.atomic
def auto_assemble_exam_set(*, exam_set: ExamSet, actor_profile: AccountProfile) -> ExamSetAssemblyRun:
    exam_set = ExamSet.objects.select_for_update().get(pk=exam_set.pk)
    if exam_set.status not in EXAM_SET_EDITABLE_STATUSES:
        raise ExamSetLifecycleConflict("Only draft or revision-required Exam Sets can be auto-assembled.")

    sections = list(
        exam_set.blueprint_version.sections.select_related("subject")
        .prefetch_related("difficulty_requirements")
        .order_by("display_order")
    )

    selected: list[tuple[Question, object]] = []
    selected_ids: set[int] = set()
    shortfall_count = 0
    shortfalls: list[str] = []

    for section in sections:
        section_selected: list[Question] = []
        for distribution in section.difficulty_requirements.all():
            required = distribution.required_item_count
            if required <= 0:
                continue
            pool = list(
                Question.objects.filter(
                    subject_id=section.subject_id,
                    status=QuestionStatus.APPROVED,
                    difficulty=distribution.difficulty,
                )
                .exclude(pk__in=selected_ids)
                .order_by("question_code")[:required]
            )
            section_selected.extend(pool)
            selected_ids.update(question.pk for question in pool)

        if len(section_selected) < section.item_count:
            needed = section.item_count - len(section_selected)
            backfill = list(
                Question.objects.filter(subject_id=section.subject_id, status=QuestionStatus.APPROVED)
                .exclude(pk__in=selected_ids)
                .order_by("question_code")[:needed]
            )
            section_selected.extend(backfill)
            selected_ids.update(question.pk for question in backfill)

        if len(section_selected) < section.item_count:
            missing = section.item_count - len(section_selected)
            shortfall_count += missing
            shortfalls.append(f"{section.section_name}: needed {section.item_count}, selected {len(section_selected)}.")

        for question in section_selected:
            selected.append((question, section))

    items_payload = [
        {
            "question_id": question.pk,
            "blueprint_section_id": section.pk,
            "display_order": index + 1,
            "points": str(question.points),
            "selection_method": SelectionMethod.AUTOMATIC,
        }
        for index, (question, section) in enumerate(selected)
    ]
    _replace_exam_set_items(exam_set, items_payload, actor_profile)

    run = ExamSetAssemblyRun.objects.create(
        exam_set=exam_set,
        algorithm_version="v1",
        status="completed" if not shortfalls else "completed_with_shortfall",
        selected_item_count=len(selected),
        rejected_item_count=shortfall_count,
        initiated_by=actor_profile,
        completed_at=timezone.now(),
        notes="; ".join(shortfalls) if shortfalls else "All sections filled to specification.",
    )
    ExamSetAssemblyRunItem.objects.bulk_create([
        ExamSetAssemblyRunItem(assembly_run=run, question=question, was_selected=True)
        for question, _section in selected
    ])

    _record_exam_set_validation_results(exam_set)
    ExamSetWorkflowHistory.objects.create(
        exam_set=exam_set,
        previous_status=exam_set.status,
        new_status=exam_set.status,
        action=f"Auto-assembled {len(selected)} items",
        remarks=run.notes,
        initiated_by=actor_profile,
    )
    return run
```

- [ ] **Step 4: Add the view**

In `backend/apps/exams/views.py`, add `from .assembly import auto_assemble_exam_set` as a new import line (after the `.audit` import). Add, immediately after `class ExamSetTransitionView`:

```python
class ExamSetAutoAssembleView(APIView):
    permission_classes = [RoleRequiredPermission]
    required_roles = EXAM_SET_MANAGEMENT_ROLES

    def post(self, request, exam_set_id: int) -> Response:
        exam_set = get_object_or_404(exam_set_queryset(), pk=exam_set_id)
        auto_assemble_exam_set(exam_set=exam_set, actor_profile=_actor_profile(request))
        return Response(ExamSetSerializer(exam_set_queryset().get(pk=exam_set.pk)).data)
```

- [ ] **Step 5: Add the URL**

In `backend/apps/exams/urls.py`, add `ExamSetAutoAssembleView` to the `from .views import (...)` block, and add after the `exam-sets/<int:exam_set_id>/transition/` line:

```python
    path("exam-sets/<int:exam_set_id>/auto-assemble/", ExamSetAutoAssembleView.as_view(), name="exam_set_auto_assemble"),
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && .venv/Scripts/python.exe manage.py test apps.exams.tests.ExamSetApiTests --settings=config.settings.test -v 2`
Expected: PASS — all `ExamSetApiTests` methods, including the 4 new ones.

- [ ] **Step 7: Run the full backend suite to check for regressions**

Run: `cd backend && .venv/Scripts/python.exe manage.py test --settings=config.settings.test`
Expected: PASS except any pre-existing, out-of-scope failures already documented in `docs/superpowers/i.sandoval/i.sandoval.task.md` (Universities maintenance import bug, QrScanModal test, universities seed-idempotency test) — none of those are touched by this plan.

- [ ] **Step 8: Commit**

```bash
cd backend
git add apps/exams/assembly.py apps/exams/views.py apps/exams/urls.py apps/exams/tests.py
git commit -m "feat(exam-set-hub-parity): add auto-assembly service and endpoint"
```

---

## Task 5: Frontend service/hook layer + shared UI helpers

**Files:**
- Create: `frontend/src/pages/admin/hub/examSets/examSetUi.ts`
- Create: `frontend/src/pages/admin/hub/examSets/examSetUi.test.ts`
- Modify: `frontend/src/services/backendExamSetService.ts` (add `autoAssembleExamSet`)
- Modify: `frontend/src/services/backendExamSetService.test.ts` (add a test)
- Modify: `frontend/src/hooks/useExamSets.ts` (add `autoAssemble`)
- Modify: `frontend/src/hooks/useExamSets.test.tsx` (add a test)
- Modify: `frontend/src/pages/admin/hub/ExamSets.tsx` (import shared helpers instead of defining them locally — behavior-preserving refactor, no functional change yet)

**Interfaces:**
- Produces: `examSetUi.ts` exports `STATUSES`, `ACTION_BUTTON`, `FIELD_LABEL`, `FIELD_INPUT`, `statusLabel(status)`, `statusClasses(status)`, `nextTransitions(status)`, `recordToDraft(record: ExamSetRecord): ExamSetDraft` — consumed by Tasks 6, 8, 9, 10, 11.
- Produces: `BackendExamSetService.autoAssembleExamSet(id: string): Promise<ServiceResult<ExamSetRecord>>`
- Produces: `useExamSets().autoAssemble(id: string): Promise<ServiceResult<ExamSetRecord>>` — consumed by Task 9 (`ExamSetAssemblyWorkspace`).

- [ ] **Step 1: Write the failing test for `examSetUi.ts`**

Create `frontend/src/pages/admin/hub/examSets/examSetUi.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type { ExamSetRecord } from '../../../../services/backendExamSetService';
import { nextTransitions, recordToDraft, statusLabel } from './examSetUi';

describe('examSetUi', () => {
  it('formats status labels with spaces', () => {
    expect(statusLabel('ACADEMIC_REVIEW')).toBe('ACADEMIC REVIEW');
  });

  it('returns the approve/request-revision pair for ACADEMIC_REVIEW', () => {
    const transitions = nextTransitions('ACADEMIC_REVIEW');
    expect(transitions.map((t) => t.status)).toEqual(['APPROVED', 'REVISION_REQUIRED']);
  });

  it('converts a record into a draft with re-numbered display order', () => {
    const record = {
      title: 'Synthetic Set',
      blueprintVersion: { id: '42' },
      academicYear: '2026-2027',
      durationMinutes: 60,
      examinationPeriod: 'Batch 1',
      examType: 'Admission',
      instructions: 'Answer all questions.',
      items: [
        { displayOrder: 5, points: 5, selectionMethod: 'MANUAL', blueprintSectionId: null, question: { id: '101' } },
        { displayOrder: 2, points: 3, selectionMethod: 'MANUAL', blueprintSectionId: '9', question: { id: '102' } },
      ],
    } as unknown as ExamSetRecord;

    const draft = recordToDraft(record);

    expect(draft.blueprintVersionId).toBe('42');
    expect(draft.items).toEqual([
      { questionId: '102', displayOrder: 1, points: 3, blueprintSectionId: '9', selectionMethod: 'MANUAL' },
      { questionId: '101', displayOrder: 2, points: 5, selectionMethod: 'MANUAL' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- examSetUi.test.ts`
Expected: FAIL — `Cannot find module './examSetUi'`.

- [ ] **Step 3: Create `examSetUi.ts`**

Create `frontend/src/pages/admin/hub/examSets/examSetUi.ts`:

```typescript
import type { ExamSetDraft, ExamSetRecord, ExamSetStatus } from '../../../../services/backendExamSetService';

export const STATUSES: ExamSetStatus[] = ['DRAFT', 'ACADEMIC_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'PUBLISHED', 'ARCHIVED'];

export const ACTION_BUTTON = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
export const FIELD_LABEL = 'flex flex-col gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600';
export const FIELD_INPUT = 'min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white';

export function statusLabel(status: ExamSetStatus): string {
  return status.replaceAll('_', ' ');
}

export function statusClasses(status: ExamSetStatus): string {
  if (status === 'PUBLISHED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'APPROVED') return 'border-teal-200 bg-teal-50 text-teal-700';
  if (status === 'ACADEMIC_REVIEW') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'REVISION_REQUIRED') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'ARCHIVED') return 'border-slate-300 bg-slate-100 text-slate-600';
  return 'border-violet-200 bg-violet-50 text-violet-700';
}

export function nextTransitions(status: ExamSetStatus): Array<{ label: string; status: ExamSetStatus; remarks: string }> {
  if (status === 'DRAFT' || status === 'REVISION_REQUIRED') {
    return [{ label: 'Submit for Review', status: 'ACADEMIC_REVIEW', remarks: 'Submitted for academic review.' }];
  }
  if (status === 'ACADEMIC_REVIEW') {
    return [
      { label: 'Approve', status: 'APPROVED', remarks: 'Approved after academic review.' },
      { label: 'Request Revision', status: 'REVISION_REQUIRED', remarks: 'Revision requested during academic review.' },
    ];
  }
  if (status === 'APPROVED') {
    return [{ label: 'Publish', status: 'PUBLISHED', remarks: 'Published for authorized use.' }];
  }
  if (status === 'PUBLISHED') {
    return [{ label: 'Archive', status: 'ARCHIVED', remarks: 'Archived after publication.' }];
  }
  return [];
}

export function recordToDraft(record: ExamSetRecord): ExamSetDraft {
  return {
    title: record.title,
    blueprintVersionId: record.blueprintVersion.id,
    academicYear: record.academicYear,
    durationMinutes: record.durationMinutes,
    examinationPeriod: record.examinationPeriod,
    examType: record.examType,
    instructions: record.instructions,
    items: record.items
      .slice()
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((item, index) => ({
        questionId: item.question.id,
        displayOrder: index + 1,
        points: item.points,
        ...(item.blueprintSectionId ? { blueprintSectionId: item.blueprintSectionId } : {}),
        ...(item.selectionMethod ? { selectionMethod: item.selectionMethod } : {}),
      })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- examSetUi.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Refactor `ExamSets.tsx` to import instead of define**

In `frontend/src/pages/admin/hub/ExamSets.tsx`, delete the local definitions of `STATUSES`, `ACTION_BUTTON`, `FIELD_LABEL`, `FIELD_INPUT`, `statusLabel`, `statusClasses`, `nextTransitions` (lines 30-106 in the current file — the constants and the three functions before `toEditor`). Add an import at the top of the file:

```typescript
import { ACTION_BUTTON, FIELD_INPUT, FIELD_LABEL, nextTransitions, STATUSES, statusClasses, statusLabel } from './examSets/examSetUi';
```

Leave `EditorState`, `emptyEditor`, `toEditor`, and the rest of the component untouched — this step is a pure refactor with no behavior change.

- [ ] **Step 6: Run the existing ExamSets frontend test to confirm no regression**

Run: `cd frontend && npm test -- ExamSets.test.tsx`
Expected: PASS — unchanged behavior.

- [ ] **Step 7: Write the failing test for `autoAssembleExamSet`**

In `frontend/src/services/backendExamSetService.test.ts`, add (following the existing `jsonResponse` helper and `apiExamSet` fixture already in the file):

```typescript
it('posts to the auto-assemble endpoint and maps the response', async () => {
  const fetcher = vi.fn().mockResolvedValue(jsonResponse(apiExamSet, 200));
  const client = new ApiClient({ baseUrl: 'http://backend.test', fetcher });
  const service = new BackendExamSetService(client);

  const result = await service.autoAssembleExamSet('7');

  expect(result.ok).toBe(true);
  const [url, requestInit] = fetcher.mock.calls[0];
  expect(String(url)).toContain('/api/v1/exams/exam-sets/7/auto-assemble/');
  expect(requestInit?.method).toBe('POST');
});
```

Note: check the exact call signature the existing tests in this file use for `fetcher.mock.calls[0]` (some `ApiClient` implementations pass a `Request` object, others pass `(url, init)`) and adjust the assertion shape to match — the pattern used two tests above this one in the same file is authoritative.

- [ ] **Step 8: Run test to verify it fails**

Run: `cd frontend && npm test -- backendExamSetService.test.ts`
Expected: FAIL — `service.autoAssembleExamSet is not a function`.

- [ ] **Step 9: Add the service method**

In `frontend/src/services/backendExamSetService.ts`, add after `deleteExamSet`:

```typescript
  async autoAssembleExamSet(id: string): Promise<ServiceResult<ExamSetRecord>> {
    return this.mapItem(await this.apiClient.request<ApiExamSet>(`/api/v1/exams/exam-sets/${id}/auto-assemble/`, {
      method: 'POST',
    }));
  }
```

- [ ] **Step 10: Run test to verify it passes**

Run: `cd frontend && npm test -- backendExamSetService.test.ts`
Expected: PASS.

- [ ] **Step 11: Write the failing test for the hook**

In `frontend/src/hooks/useExamSets.test.tsx`, add `autoAssembleExamSet: vi.fn().mockResolvedValue(serviceSuccess(examSet({ items: [{ id: '901', displayOrder: 1, points: 5, selectionMethod: 'AUTOMATIC', selectedBy: 'System', selectedAt: '2026-08-05T00:00:00Z', blueprintSectionId: null, question: { id: '101', questionCode: 'Q-SYNTHETIC', questionType: '', questionTypeCode: '', subject: '', topic: '', difficulty: '', status: '', points: 5 } }] }))),` to the `services()` helper's `examSetService` object (alongside `deleteExamSet`). Then add a test, in the existing `describe('useExamSets', ...)` block:

```typescript
it('runs auto-assembly and merges the returned exam set', async () => {
  const testServices = services();
  const { result } = renderHook(() => useExamSets(testServices));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));

  await act(async () => {
    await result.current.autoAssemble('7');
  });

  expect(testServices.examSetService.autoAssembleExamSet).toHaveBeenCalledWith('7');
  expect(result.current.examSets[0].items).toHaveLength(1);
});
```

- [ ] **Step 12: Run test to verify it fails**

Run: `cd frontend && npm test -- useExamSets.test.tsx`
Expected: FAIL — `result.current.autoAssemble is not a function`.

- [ ] **Step 13: Add the hook method**

In `frontend/src/hooks/useExamSets.ts`, add `'autoAssembleExamSet'` to the `Pick<BackendExamSetService, ...>` union in `UseExamSetsServices.examSetService`. Add, after the `transition` callback definition:

```typescript
  const autoAssemble = useCallback(
    (id: string) => applyMutation(() => services.examSetService.autoAssembleExamSet(id)),
    [applyMutation, services.examSetService],
  );
```

Add `autoAssemble` to the object returned at the end of the hook (alongside `transition`).

- [ ] **Step 14: Run test to verify it passes**

Run: `cd frontend && npm test -- useExamSets.test.tsx`
Expected: PASS.

- [ ] **Step 15: Run the full frontend unit suite to check for regressions**

Run: `cd frontend && npm test`
Expected: PASS.

- [ ] **Step 16: Commit**

```bash
cd frontend
git add src/pages/admin/hub/examSets/examSetUi.ts src/pages/admin/hub/examSets/examSetUi.test.ts src/pages/admin/hub/ExamSets.tsx src/services/backendExamSetService.ts src/services/backendExamSetService.test.ts src/hooks/useExamSets.ts src/hooks/useExamSets.test.tsx
git commit -m "feat(exam-set-hub-parity): add auto-assemble wiring and extract shared exam-set UI helpers"
```

---

## Task 6: `ReadinessChecklist` component

**Files:**
- Create: `frontend/src/pages/admin/hub/examSets/ReadinessChecklist.tsx`
- Create: `frontend/src/pages/admin/hub/examSets/ReadinessChecklist.test.tsx`

**Interfaces:**
- Consumes: `ExamSetValidationResult` type from `../../../../services/backendExamSetService`
- Produces: `ReadinessChecklist({ results }: { results: ExamSetValidationResult[] })` — a React component, consumed by Task 9.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/admin/hub/examSets/ReadinessChecklist.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ExamSetValidationResult } from '../../../../services/backendExamSetService';
import { ReadinessChecklist } from './ReadinessChecklist';

function result(overrides: Partial<ExamSetValidationResult>): ExamSetValidationResult {
  return {
    id: '1',
    validationCode: 'item_count',
    validationName: 'Item count',
    result: 'PASSED',
    expectedValue: '1',
    actualValue: '1',
    message: 'Exam set contains items.',
    validatedAt: '2026-08-07T00:00:00Z',
    ...overrides,
  };
}

describe('ReadinessChecklist', () => {
  it('shows a pass-count header and renders each row with its message', () => {
    render(<ReadinessChecklist results={[
      result({ id: '1', result: 'PASSED' }),
      result({ id: '2', result: 'WARNING', validationName: 'Marks compliance', message: 'Total marks are 5; blueprint target is 10.' }),
      result({ id: '3', result: 'FAILED', validationName: 'Item count', message: 'Exam set has no items.' }),
    ]} />);

    expect(screen.getByText('1 of 3 checks passed')).toBeInTheDocument();
    expect(screen.getByText('Total marks are 5; blueprint target is 10.')).toBeInTheDocument();
    expect(screen.getByText('Exam set has no items.')).toBeInTheDocument();
  });

  it('renders an empty state when there are no results yet', () => {
    render(<ReadinessChecklist results={[]} />);
    expect(screen.getByText(/no validation results/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- ReadinessChecklist.test.tsx`
Expected: FAIL — `Cannot find module './ReadinessChecklist'`.

- [ ] **Step 3: Write the component**

Create `frontend/src/pages/admin/hub/examSets/ReadinessChecklist.tsx`:

```tsx
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ExamSetValidationResult } from '../../../../services/backendExamSetService';

interface ReadinessChecklistProps {
  results: ExamSetValidationResult[];
}

function rowClasses(result: string): string {
  if (result === 'PASSED') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (result === 'FAILED') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function RowIcon({ result }: { result: string }) {
  if (result === 'PASSED') return <CheckCircle className="h-4 w-4 shrink-0" />;
  if (result === 'FAILED') return <AlertTriangle className="h-4 w-4 shrink-0" />;
  return <Info className="h-4 w-4 shrink-0" />;
}

export function ReadinessChecklist({ results }: ReadinessChecklistProps) {
  if (results.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No validation results recorded yet.</p>;
  }

  const passedCount = results.filter((result) => result.result === 'PASSED').length;

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {passedCount} of {results.length} checks passed
      </p>
      <ul className="mt-2 space-y-2">
        {results.map((result) => (
          <li key={result.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${rowClasses(result.result)}`}>
            <RowIcon result={result.result} />
            <div>
              <p className="font-bold">{result.validationName}</p>
              <p className="mt-0.5">{result.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- ReadinessChecklist.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/pages/admin/hub/examSets/ReadinessChecklist.tsx src/pages/admin/hub/examSets/ReadinessChecklist.test.tsx
git commit -m "feat(exam-set-hub-parity): add ReadinessChecklist component"
```

---

## Task 7: `QuestionPickerDrawer` component

**Files:**
- Create: `frontend/src/pages/admin/hub/examSets/QuestionPickerDrawer.tsx`
- Create: `frontend/src/pages/admin/hub/examSets/QuestionPickerDrawer.test.tsx`

**Interfaces:**
- Consumes: `QuestionBankItem` from `../../../../services/backendQuestionBankService`
- Produces: `QuestionPickerDrawer({ open, questions, excludeQuestionIds, onSelect, onClose }: QuestionPickerDrawerProps)` — consumed by Task 9. `onSelect(question: QuestionBankItem)` fires once per pick; the caller decides add-vs-replace semantics (Task 9's responsibility), this component only searches and reports a pick.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/admin/hub/examSets/QuestionPickerDrawer.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QuestionBankItem } from '../../../../services/backendQuestionBankService';
import { QuestionPickerDrawer } from './QuestionPickerDrawer';

function question(overrides: Partial<QuestionBankItem>): QuestionBankItem {
  return {
    id: '101', questionCode: 'Q-SCI-001', questionType: 'Multiple Choice', questionTypeCode: 'MCQ',
    subject: 'Science', subjectCode: 'SCI', topic: 'Orbital Mechanics', topicCode: 'ORBIT',
    competency: '', competencyCode: '', difficulty: 'EASY', questionText: 'Which orbit stays fixed overhead?',
    explanation: '', points: 5, status: 'APPROVED', createdBy: '', reviewedBy: '', approvedBy: '',
    reviewedAt: null, approvedAt: null, retiredAt: null, archivedAt: null, choices: [], answers: [],
    rubrics: [], tags: [], attachments: [], workflowHistory: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('QuestionPickerDrawer', () => {
  it('filters by search text and reports the picked question', () => {
    const onSelect = vi.fn();
    render(
      <QuestionPickerDrawer
        open
        questions={[question({ id: '101', questionCode: 'Q-SCI-001' }), question({ id: '102', questionCode: 'Q-MATH-001', subject: 'Mathematics' })]}
        excludeQuestionIds={[]}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Q-SCI-001')).toBeInTheDocument();
    expect(screen.getByText('Q-MATH-001')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Math' } });
    expect(screen.queryByText('Q-SCI-001')).not.toBeInTheDocument();
    expect(screen.getByText('Q-MATH-001')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Q-MATH-001'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '102' }));
  });

  it('excludes already-included questions', () => {
    render(
      <QuestionPickerDrawer
        open
        questions={[question({ id: '101', questionCode: 'Q-SCI-001' })]}
        excludeQuestionIds={['101']}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText('Q-SCI-001')).not.toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<QuestionPickerDrawer open={false} questions={[]} excludeQuestionIds={[]} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- QuestionPickerDrawer.test.tsx`
Expected: FAIL — `Cannot find module './QuestionPickerDrawer'`.

- [ ] **Step 3: Write the component**

Create `frontend/src/pages/admin/hub/examSets/QuestionPickerDrawer.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { QuestionBankItem } from '../../../../services/backendQuestionBankService';

interface QuestionPickerDrawerProps {
  open: boolean;
  questions: QuestionBankItem[];
  excludeQuestionIds: string[];
  onSelect: (question: QuestionBankItem) => void;
  onClose: () => void;
}

export function QuestionPickerDrawer({ open, questions, excludeQuestionIds, onSelect, onClose }: QuestionPickerDrawerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const excluded = new Set(excludeQuestionIds);
    const normalized = search.trim().toLowerCase();
    return questions.filter((question) => {
      if (excluded.has(question.id)) return false;
      if (!normalized) return true;
      return [question.questionCode, question.subject, question.topic, question.questionText]
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [questions, excludeQuestionIds, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" role="dialog" aria-modal="true" aria-label="Select a question">
      <button type="button" aria-label="Close question picker" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Select a Question</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <label className="relative m-4">
          <span className="sr-only">Search questions</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code, subject, topic, or text"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No matching questions.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((question) => (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(question)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm hover:border-sky-300 hover:bg-sky-50"
                  >
                    <span className="font-mono text-xs font-bold text-slate-700">{question.questionCode}</span>
                    <span className="ml-2 text-xs text-slate-500">{question.subject} · {question.difficulty} · {question.points} pt</span>
                    <p className="mt-1 line-clamp-2 text-slate-800">{question.questionText}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- QuestionPickerDrawer.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/pages/admin/hub/examSets/QuestionPickerDrawer.tsx src/pages/admin/hub/examSets/QuestionPickerDrawer.test.tsx
git commit -m "feat(exam-set-hub-parity): add QuestionPickerDrawer component"
```

---

## Task 8: `ExamSetAssemblyWorkspace` component

**Files:**
- Create: `frontend/src/pages/admin/hub/examSets/ExamSetAssemblyWorkspace.tsx`
- Create: `frontend/src/pages/admin/hub/examSets/ExamSetAssemblyWorkspace.test.tsx`

**Interfaces:**
- Consumes: `ReadinessChecklist` (Task 6), `QuestionPickerDrawer` (Task 7), `ACTION_BUTTON`/`statusLabel`/`statusClasses`/`nextTransitions`/`recordToDraft` (Task 5's `examSetUi.ts`)
- Produces: `ExamSetAssemblyWorkspace(props: ExamSetAssemblyWorkspaceProps)` — a fully controlled component (no direct API calls), consumed by Task 9 (`ExamSets.tsx`).

```typescript
interface ExamSetAssemblyWorkspaceProps {
  record: ExamSetRecord;
  questions: QuestionBankItem[];
  pending: boolean;
  onUpdateItems: (items: ExamSetDraftItem[]) => void;
  onAutoAssemble: () => void;
  onTransition: (target: { status: ExamSetStatus; remarks: string; label: string }) => void;
  onDelete: () => void;
  onBack: () => void;
}
```

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/admin/hub/examSets/ExamSetAssemblyWorkspace.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExamSetRecord } from '../../../../services/backendExamSetService';
import type { QuestionBankItem } from '../../../../services/backendQuestionBankService';
import { ExamSetAssemblyWorkspace } from './ExamSetAssemblyWorkspace';

function record(overrides: Partial<ExamSetRecord> = {}): ExamSetRecord {
  return {
    id: '7', examCode: 'EXAM-SYNTHETIC', title: 'Synthetic Set', examinationPeriod: '', examType: 'Admission',
    instructions: '', durationMinutes: 60, status: 'DRAFT',
    blueprintVersion: { id: '42', specCode: 'BP-SYNTHETIC', name: 'Synthetic Blueprint', versionNumber: '1.0', status: 'APPROVED' },
    academicYear: '2026-2027', clonedFromExamSetId: null, createdBy: '', approvedBy: '', publishedBy: '', archivedBy: '',
    approvedAt: null, publishedAt: null, archivedAt: null, publishedHash: null,
    items: [{
      id: '70', displayOrder: 1, points: 5, selectionMethod: 'MANUAL', selectedBy: '', selectedAt: '',
      blueprintSectionId: null,
      question: { id: '101', questionCode: 'Q-SCI-001', questionType: 'MCQ', questionTypeCode: 'MCQ', subject: 'Science', topic: 'Orbits', difficulty: 'EASY', status: 'APPROVED', points: 5 },
    }],
    validationResults: [], assemblyRuns: [], workflowHistory: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('ExamSetAssemblyWorkspace', () => {
  it('removes an item and reports the remaining items', () => {
    const onUpdateItems = vi.fn();
    render(
      <ExamSetAssemblyWorkspace
        record={record()}
        questions={[]}
        pending={false}
        onUpdateItems={onUpdateItems}
        onAutoAssemble={() => {}}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onUpdateItems).toHaveBeenCalledWith([]);
  });

  it('hides mutation controls when the record is not editable', () => {
    render(
      <ExamSetAssemblyWorkspace
        record={record({ status: 'PUBLISHED' })}
        questions={[]}
        pending={false}
        onUpdateItems={() => {}}
        onAutoAssemble={() => {}}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run auto-selection/i })).not.toBeInTheDocument();
  });

  it('calls onAutoAssemble from the auto-selection button when editable', () => {
    const onAutoAssemble = vi.fn();
    render(
      <ExamSetAssemblyWorkspace
        record={record()}
        questions={[]}
        pending={false}
        onUpdateItems={() => {}}
        onAutoAssemble={onAutoAssemble}
        onTransition={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /run auto-selection/i }));
    expect(onAutoAssemble).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- ExamSetAssemblyWorkspace.test.tsx`
Expected: FAIL — `Cannot find module './ExamSetAssemblyWorkspace'`.

- [ ] **Step 3: Write the component**

Create `frontend/src/pages/admin/hub/examSets/ExamSetAssemblyWorkspace.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import type { ExamSetDraftItem, ExamSetRecord, ExamSetStatus } from '../../../../services/backendExamSetService';
import type { QuestionBankItem } from '../../../../services/backendQuestionBankService';
import { ACTION_BUTTON, nextTransitions, statusClasses, statusLabel } from './examSetUi';
import { QuestionPickerDrawer } from './QuestionPickerDrawer';
import { ReadinessChecklist } from './ReadinessChecklist';

const EDITABLE_STATUSES: ExamSetStatus[] = ['DRAFT', 'REVISION_REQUIRED'];

interface ExamSetAssemblyWorkspaceProps {
  record: ExamSetRecord;
  questions: QuestionBankItem[];
  pending: boolean;
  onUpdateItems: (items: ExamSetDraftItem[]) => void;
  onAutoAssemble: () => void;
  onTransition: (target: { status: ExamSetStatus; remarks: string; label: string }) => void;
  onDelete: () => void;
  onBack: () => void;
}

function toDraftItems(record: ExamSetRecord): ExamSetDraftItem[] {
  return record.items
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((item, index) => ({
      questionId: item.question.id,
      displayOrder: index + 1,
      points: item.points,
      ...(item.blueprintSectionId ? { blueprintSectionId: item.blueprintSectionId } : {}),
      ...(item.selectionMethod ? { selectionMethod: item.selectionMethod } : {}),
    }));
}

function renumber(items: ExamSetDraftItem[]): ExamSetDraftItem[] {
  return items.map((item, index) => ({ ...item, displayOrder: index + 1 }));
}

export function ExamSetAssemblyWorkspace({ record, questions, pending, onUpdateItems, onAutoAssemble, onTransition, onDelete, onBack }: ExamSetAssemblyWorkspaceProps) {
  const editable = EDITABLE_STATUSES.includes(record.status);
  const transitions = nextTransitions(record.status);
  const [pickerTarget, setPickerTarget] = useState<{ mode: 'add' | 'replace'; index: number | null } | null>(null);

  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const totalPoints = record.items.reduce((sum, item) => sum + item.points, 0);
  const excludeIds = record.items.map((item) => item.question.id);

  const handleRemove = (index: number) => {
    const items = toDraftItems(record).filter((_item, itemIndex) => itemIndex !== index);
    onUpdateItems(renumber(items));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const items = toDraftItems(record);
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    [items[index], items[destination]] = [items[destination], items[index]];
    onUpdateItems(renumber(items));
  };

  const handlePick = (question: QuestionBankItem) => {
    const items = toDraftItems(record);
    if (pickerTarget?.mode === 'replace' && pickerTarget.index !== null) {
      items[pickerTarget.index] = { ...items[pickerTarget.index], questionId: question.id, points: question.points };
    } else {
      items.push({ questionId: question.id, displayOrder: items.length + 1, points: question.points });
    }
    onUpdateItems(renumber(items));
    setPickerTarget(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className={ACTION_BUTTON}><ArrowLeft className="h-3.5 w-3.5" /> Back to Exam Sets</button>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-950">{record.title}</h2>
              <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wider ${statusClasses(record.status)}`}>{statusLabel(record.status)}</span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500">{record.examCode}</p>
            <p className="mt-2 text-sm text-slate-600">{record.blueprintVersion.specCode} v{record.blueprintVersion.versionNumber}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Readiness Check</h3>
            <div className="mt-3">
              <ReadinessChecklist results={record.validationResults} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Lifecycle</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {editable && (
                <button type="button" disabled={pending} onClick={onAutoAssemble} className={ACTION_BUTTON}>
                  <RefreshCw className="h-3.5 w-3.5" /> Run Auto-Selection
                </button>
              )}
              {transitions.map((target) => (
                <button key={target.status} type="button" disabled={pending} onClick={() => onTransition(target)} className={ACTION_BUTTON}>
                  <Send className="h-3.5 w-3.5" /> {target.label}
                </button>
              ))}
              {record.status === 'DRAFT' && (
                <button type="button" disabled={pending} onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-[10px] font-black uppercase text-red-700 hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">Form total: {totalPoints} Points</span>
            {editable && (
              <button type="button" onClick={() => setPickerTarget({ mode: 'add', index: null })} className={ACTION_BUTTON}>
                <Plus className="h-3.5 w-3.5" /> Add Question Item
              </button>
            )}
          </div>

          {record.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No questions yet. Add a question or run auto-selection.</p>
          ) : (
            <ul className="space-y-2">
              {record.items
                .slice()
                .sort((left, right) => left.displayOrder - right.displayOrder)
                .map((item, index) => {
                  const bankQuestion = questionById.get(item.question.id);
                  return (
                    <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-slate-700">{item.question.questionCode}</p>
                          <p className="text-xs text-slate-500">{item.question.subject} · {item.question.difficulty} · {item.points} pt</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-800">{bankQuestion?.questionText ?? item.question.questionCode}</p>
                        </div>
                        {editable && (
                          <div className="flex shrink-0 gap-1">
                            <button type="button" aria-label={`Move ${item.question.questionCode} up`} disabled={index === 0} onClick={() => handleMove(index, -1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" aria-label={`Move ${item.question.questionCode} down`} disabled={index === record.items.length - 1} onClick={() => handleMove(index, 1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => setPickerTarget({ mode: 'replace', index })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-black uppercase">Replace</button>
                            <button type="button" aria-label={`Remove ${item.question.questionCode}`} onClick={() => handleRemove(index)} className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[10px] font-black uppercase text-red-700">Remove</button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      <QuestionPickerDrawer
        open={pickerTarget !== null}
        questions={questions}
        excludeQuestionIds={excludeIds}
        onSelect={handlePick}
        onClose={() => setPickerTarget(null)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- ExamSetAssemblyWorkspace.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/pages/admin/hub/examSets/ExamSetAssemblyWorkspace.tsx src/pages/admin/hub/examSets/ExamSetAssemblyWorkspace.test.tsx
git commit -m "feat(exam-set-hub-parity): add ExamSetAssemblyWorkspace component"
```

---

## Task 9: Wire the workspace into the Dashboard (`ExamSets.tsx`)

**Files:**
- Modify: `frontend/src/pages/admin/hub/ExamSets.tsx`
- Modify: `frontend/src/pages/admin/hub/ExamSets.test.tsx`

**Interfaces:**
- Consumes: `ExamSetAssemblyWorkspace` (Task 8), `recordToDraft` (Task 5), `useExamSets().autoAssemble` (Task 5)
- Produces: metric tiles + row-click-opens-workspace behavior on the existing Dashboard, replacing the modal for edits of existing records (the "Create" modal is unchanged).

- [ ] **Step 1: Write the failing test**

First open `frontend/src/pages/admin/hub/ExamSets.test.tsx` and check exactly how it currently mocks `useExamSets` (module-level `vi.mock('../../../hooks/useExamSets')` vs. dependency injection) and what shape of fixture object it builds. If it already has a `vi.mock('../../../hooks/useExamSets')` at the top of the file with a shared record-builder helper, add the two tests below into the existing `describe` block using that same helper instead of the self-contained one here. If no such mock exists yet in this file, add it exactly as shown:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as useExamSetsModule from '../../../hooks/useExamSets';
import ExamSets from './ExamSets';

vi.mock('../../../hooks/useExamSets');

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: '7', examCode: 'EXAM-1', title: 'Synthetic Set', examinationPeriod: '', examType: 'Admission',
    instructions: '', durationMinutes: 60, status: 'DRAFT',
    blueprintVersion: { id: '42', specCode: 'BP-1', name: 'Blueprint', versionNumber: '1.0', status: 'APPROVED' },
    academicYear: '2026-2027', clonedFromExamSetId: null, createdBy: '', approvedBy: '', publishedBy: '',
    archivedBy: '', approvedAt: null, publishedAt: null, archivedAt: null, publishedHash: null,
    items: [], validationResults: [], assemblyRuns: [], workflowHistory: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

function mockHook(examSets: ReturnType<typeof record>[]) {
  vi.mocked(useExamSetsModule.useExamSets).mockReturnValue({
    examSets, blueprints: [], questions: [], loadState: 'ready', loadError: null,
    mutationState: 'idle', mutationError: null, reload: vi.fn(), create: vi.fn(),
    update: vi.fn(), clone: vi.fn(), transition: vi.fn(), remove: vi.fn(), autoAssemble: vi.fn(),
  } as unknown as ReturnType<typeof useExamSetsModule.useExamSets>);
}

describe('ExamSets dashboard + workspace', () => {
  it('opens the assembly workspace when Edit is clicked, instead of the edit modal', () => {
    mockHook([record()]);
    render(<MemoryRouter><ExamSets /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(screen.getByRole('button', { name: /back to exam sets/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /edit exam set/i })).not.toBeInTheDocument();
  });

  it('shows metric tiles computed from the loaded exam sets', () => {
    mockHook([record({ id: '1', status: 'DRAFT' }), record({ id: '2', status: 'PUBLISHED' })]);
    render(<MemoryRouter><ExamSets /></MemoryRouter>);

    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });
});
```

If `ExamSets.test.tsx` already has other tests using a different mocking approach (e.g. passing a `services` object into `useExamSets` directly, matching `useExamSets.test.tsx`'s pattern instead of module-mocking), mirror that approach instead so the file stays internally consistent — don't mix two different mocking strategies in the same file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- ExamSets.test.tsx`
Expected: FAIL — no "Back to Exam Sets" button exists yet; clicking "Edit" still opens the modal.

- [ ] **Step 3: Rewrite `ExamSets.tsx`'s component body**

In `frontend/src/pages/admin/hub/ExamSets.tsx`:

1. Add imports: `ExamSetAssemblyWorkspace` from `./examSets/ExamSetAssemblyWorkspace`, `recordToDraft` from `./examSets/examSetUi` (add to the existing import line from Task 5).
2. Add `autoAssemble` to the destructured result of `useExamSets()`.
3. Replace the `expandedId`/row-click-to-expand-details behavior with a `selectedRecordId` state: add `const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);` and remove `expandedId`/`setExpandedId`.
4. Change the "Edit" button's `onClick` from `() => setEditor(toEditor(record, eligibleBlueprints))` to `() => setSelectedRecordId(record.id)`.
5. Remove the "Details" expand/collapse button, its associated `{expanded && (...)}` block, and the `const expanded = expandedId === record.id;` line inside the row `.map()` entirely (the workspace now shows this via `ReadinessChecklist`, and `workflowHistory` is covered by Task 11's Audit view instead). After removing these, `ChevronDown`, `ChevronUp`, and `FileCheck2` become unused imports — remove them from the `lucide-react` import line too (leave `ChevronUp`/`ChevronDown` alone if this project's lint config doesn't fail on unused imports, but check `frontend/eslint.config.*` for `no-unused-vars`/`noUnusedLocals` first — this codebase's `tsconfig` may enforce it at build time).
6. Add metric tiles above the search/filter row, inside the `loadState === 'ready'` branch, before the existing `<div className="mb-5 flex flex-col gap-3 sm:flex-row">`:

```tsx
<div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
  {([
    { label: 'Drafts', count: examSets.filter((r) => r.status === 'DRAFT').length },
    { label: 'Academic Review', count: examSets.filter((r) => r.status === 'ACADEMIC_REVIEW').length },
    { label: 'Published', count: examSets.filter((r) => r.status === 'PUBLISHED').length },
    { label: 'Validation Issues', count: examSets.filter((r) => r.validationResults.some((v) => v.result !== 'PASSED')).length },
  ] as const).map((tile) => (
    <div key={tile.label} className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{tile.label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{tile.count}</p>
    </div>
  ))}
</div>
```

7. Immediately after the closing `</section>` of the Dashboard's main card, and before the `{editor && (...)}` block, add the workspace render:

```tsx
{selectedRecordId && (() => {
  const selected = examSets.find((record) => record.id === selectedRecordId);
  if (!selected) return null;
  return (
    <ExamSetAssemblyWorkspace
      record={selected}
      questions={questions}
      pending={pending}
      onUpdateItems={(items) => void update(selected.id, { ...recordToDraft(selected), items })}
      onAutoAssemble={() => void autoAssemble(selected.id)}
      onTransition={(target) => void handleTransition(selected, target)}
      onDelete={() => void handleDelete(selected)}
      onBack={() => setSelectedRecordId(null)}
    />
  );
})()}
```

8. `handleDelete` currently does `setEditor`/no navigation on success — after a successful delete from the workspace, it should also clear `selectedRecordId`. In `handleDelete`, after `setNotice({ type: 'success', message: ... })`, add: `setSelectedRecordId((current) => current === record.id ? null : current);`.
9. The Dashboard's list should hide itself while the workspace is open, matching the prototype's list⇄workspace swap: wrap the existing `<section>...</section>` (the whole Dashboard card, tiles/search/table) so it only renders `{!selectedRecordId && (<section>...</section>)}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- ExamSets.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full frontend suite to check for regressions**

Run: `cd frontend && npm test`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run the dev server (check `frontend/package.json`'s `dev` script) and navigate to `/admin/hub/exam-sets/assembly` as a `SYSTEM_ADMIN` or `EXAM_ADMINISTRATOR` user; confirm: metric tiles render, clicking an existing Exam Set's "Edit" opens the workspace (list disappears), the readiness checklist shows real validation rows, "Run Auto-Selection" works on a DRAFT set bound to a Blueprint with sections, and "Back to Exam Sets" returns to the list.

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/pages/admin/hub/ExamSets.tsx src/pages/admin/hub/ExamSets.test.tsx
git commit -m "feat(exam-set-hub-parity): wire ExamSetAssemblyWorkspace into the Dashboard"
```

---

## Task 10: Rebuild `ExamSetPublished.tsx` (Packages view)

**Files:**
- Modify: `frontend/src/pages/admin/hub/ExamSetPublished.tsx`
- Create: `frontend/src/pages/admin/hub/ExamSetPublished.test.tsx`

**Interfaces:**
- Consumes: `useExamSets`, `statusLabel`/`statusClasses` from `./examSets/examSetUi`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/admin/hub/ExamSetPublished.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as useExamSetsModule from '../../../hooks/useExamSets';
import ExamSetPublished from './ExamSetPublished';

vi.mock('../../../hooks/useExamSets');

function baseRecord(overrides: Record<string, unknown>) {
  return {
    id: '7', examCode: 'EXAM-1', title: 'Approved Set', examinationPeriod: '', examType: 'Admission',
    instructions: '', durationMinutes: 60, status: 'DRAFT',
    blueprintVersion: { id: '42', specCode: 'BP-1', name: 'Blueprint', versionNumber: '1.0', status: 'APPROVED' },
    academicYear: '2026-2027', clonedFromExamSetId: null, createdBy: '', approvedBy: '', publishedBy: '',
    archivedBy: '', approvedAt: null, publishedAt: null, archivedAt: null, publishedHash: null,
    items: [], validationResults: [], assemblyRuns: [], workflowHistory: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('ExamSetPublished', () => {
  it('shows only APPROVED and PUBLISHED exam sets, with the hash for published ones', () => {
    vi.mocked(useExamSetsModule.useExamSets).mockReturnValue({
      examSets: [
        baseRecord({ id: '1', title: 'Draft Set', status: 'DRAFT' }),
        baseRecord({ id: '2', title: 'Approved Set', status: 'APPROVED' }),
        baseRecord({ id: '3', title: 'Published Set', status: 'PUBLISHED', publishedHash: 'a'.repeat(64) }),
      ],
      loadState: 'ready',
    } as ReturnType<typeof useExamSetsModule.useExamSets>);

    render(<MemoryRouter><ExamSetPublished /></MemoryRouter>);

    expect(screen.queryByText('Draft Set')).not.toBeInTheDocument();
    expect(screen.getByText('Approved Set')).toBeInTheDocument();
    expect(screen.getByText('Published Set')).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64), { exact: false })).toBeInTheDocument();
  });
});
```

Note: check how `useExamSets` is invoked/mocked in `ExamSets.test.tsx` first (module path, whether it's mocked via `vi.mock` with a factory or dependency-injected via props) and match that exact approach here — `ExamSets.test.tsx` was found earlier to mock the hook module directly, so this should be consistent, but confirm the exact mock shape (does it need every field the hook returns, or does the component only destructure a subset?).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- ExamSetPublished.test.tsx`
Expected: FAIL — the current placeholder page renders none of "Approved Set"/"Published Set".

- [ ] **Step 3: Rewrite the component**

Replace `frontend/src/pages/admin/hub/ExamSetPublished.tsx` entirely:

```tsx
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExamHubTabs, type ExamHubTabKey } from '../../../components/ExamHubTabs';
import { useExamSets } from '../../../hooks/useExamSets';
import { statusClasses, statusLabel } from './examSets/examSetUi';

export default function ExamSetPublished() {
  const navigate = useNavigate();
  const { examSets, loadState } = useExamSets();

  const packages = examSets.filter((record) => record.status === 'APPROVED' || record.status === 'PUBLISHED');

  const handleHubTabChange = (tab: ExamHubTabKey) => {
    if (tab === 'blueprints') { navigate('/admin/hub/exam-sets'); return; }
    if (tab === 'setAssembly') { navigate('/admin/hub/exam-sets/assembly'); return; }
    if (tab === 'audit') { navigate('/admin/hub/exam-sets/audit'); }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5 text-philsa-navy">
      <ExamHubTabs activeTab="published" onTabChange={handleHubTabChange} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-6 text-white sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Exam Sets workflow</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Published Exams</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">Approved and published exam set packages, read-only.</p>
        </div>

        {loadState === 'loading' && (
          <div role="status" aria-live="polite" className="flex min-h-56 items-center justify-center text-sm font-semibold text-slate-600">Loading packages…</div>
        )}

        {loadState !== 'loading' && packages.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
            <Shield className="h-9 w-9 text-slate-400" />
            <h2 className="text-lg font-black text-slate-900">No approved or published exam sets yet</h2>
            <p className="max-w-md text-sm text-slate-500">Approve or publish an Exam Set from Assembly to see it here.</p>
          </div>
        )}

        {packages.length > 0 && (
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
            {packages.map((record) => (
              <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wider ${statusClasses(record.status)}`}>{statusLabel(record.status)}</span>
                  <h2 className="truncate text-sm font-black text-slate-950">{record.title}</h2>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{record.examCode}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 font-mono text-xs">
                  <div><dt className="text-slate-400">Items</dt><dd className="font-bold text-slate-900">{record.items.length}</dd></div>
                  <div><dt className="text-slate-400">Duration</dt><dd className="font-bold text-slate-900">{record.durationMinutes}m</dd></div>
                  {record.publishedHash && (
                    <div className="col-span-2"><dt className="text-slate-400">Secured Hash</dt><dd className="break-all font-bold text-slate-900">{record.publishedHash}</dd></div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- ExamSetPublished.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/pages/admin/hub/ExamSetPublished.tsx src/pages/admin/hub/ExamSetPublished.test.tsx
git commit -m "feat(exam-set-hub-parity): rebuild ExamSetPublished as a real Packages view"
```

---

## Task 11: Rebuild `ExamSetAudit.tsx` (Audit view)

**Files:**
- Modify: `frontend/src/pages/admin/hub/ExamSetAudit.tsx`
- Create: `frontend/src/pages/admin/hub/ExamSetAudit.test.tsx`

**Interfaces:**
- Consumes: `useExamSets`, `statusLabel` from `./examSets/examSetUi`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/admin/hub/ExamSetAudit.test.tsx`, following the same `vi.mock('../../../hooks/useExamSets')` pattern confirmed in Task 10:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as useExamSetsModule from '../../../hooks/useExamSets';
import ExamSetAudit from './ExamSetAudit';

vi.mock('../../../hooks/useExamSets');

describe('ExamSetAudit', () => {
  it('flattens workflow history across exam sets, newest first', () => {
    vi.mocked(useExamSetsModule.useExamSets).mockReturnValue({
      examSets: [
        {
          id: '1', title: 'Set One', examCode: 'EXAM-1',
          workflowHistory: [
            { id: 'h1', previousStatus: null, newStatus: 'DRAFT', action: 'Created exam set', remarks: '', initiatedBy: 'Admin', createdAt: '2026-08-01T00:00:00Z' },
          ],
        },
        {
          id: '2', title: 'Set Two', examCode: 'EXAM-2',
          workflowHistory: [
            { id: 'h2', previousStatus: 'DRAFT', newStatus: 'ACADEMIC_REVIEW', action: 'Transitioned to Academic Review', remarks: 'Ready', initiatedBy: 'Admin', createdAt: '2026-08-02T00:00:00Z' },
          ],
        },
      ],
      loadState: 'ready',
    } as unknown as ReturnType<typeof useExamSetsModule.useExamSets>);

    render(<MemoryRouter><ExamSetAudit /></MemoryRouter>);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Set Two');
    expect(rows[2]).toHaveTextContent('Set One');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- ExamSetAudit.test.tsx`
Expected: FAIL — the placeholder page has no `role="row"` elements.

- [ ] **Step 3: Rewrite the component**

Replace `frontend/src/pages/admin/hub/ExamSetAudit.tsx` entirely:

```tsx
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExamHubTabs, type ExamHubTabKey } from '../../../components/ExamHubTabs';
import { useExamSets } from '../../../hooks/useExamSets';
import { statusLabel } from './examSets/examSetUi';

export default function ExamSetAudit() {
  const navigate = useNavigate();
  const { examSets, loadState } = useExamSets();

  const entries = examSets
    .flatMap((record) => record.workflowHistory.map((entry) => ({ ...entry, examTitle: record.title, examCode: record.examCode })))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const handleHubTabChange = (tab: ExamHubTabKey) => {
    if (tab === 'blueprints') { navigate('/admin/hub/exam-sets'); return; }
    if (tab === 'setAssembly') { navigate('/admin/hub/exam-sets/assembly'); return; }
    if (tab === 'published') { navigate('/admin/hub/exam-sets/published'); }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5 text-philsa-navy">
      <ExamHubTabs activeTab="audit" onTabChange={handleHubTabChange} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-6 text-white sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Exam Sets workflow</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Audit Logs</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">Every recorded lifecycle and item change across all exam sets.</p>
        </div>

        {loadState === 'loading' && (
          <div role="status" aria-live="polite" className="flex min-h-56 items-center justify-center text-sm font-semibold text-slate-600">Loading audit history…</div>
        )}

        {loadState !== 'loading' && entries.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
            <FileText className="h-9 w-9 text-slate-400" />
            <h2 className="text-lg font-black text-slate-900">No audit history yet</h2>
          </div>
        )}

        {entries.length > 0 && (
          <div className="overflow-x-auto p-5 sm:p-7">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Exam Set</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="py-2 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="py-2"><span className="font-bold text-slate-900">{entry.examTitle}</span> <span className="font-mono text-xs text-slate-500">{entry.examCode}</span></td>
                    <td className="py-2 text-slate-700">{entry.initiatedBy}</td>
                    <td className="py-2 text-slate-700">{entry.action}{entry.previousStatus && ` (${statusLabel(entry.previousStatus)} → ${statusLabel(entry.newStatus)})`}</td>
                    <td className="py-2 text-slate-500">{entry.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- ExamSetAudit.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full frontend suite to check for regressions**

Run: `cd frontend && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/pages/admin/hub/ExamSetAudit.tsx src/pages/admin/hub/ExamSetAudit.test.tsx
git commit -m "feat(exam-set-hub-parity): rebuild ExamSetAudit as a real flattened audit trail"
```

---

## Task 12: Extend the e2e journey with auto-assemble and publish

**Files:**
- Modify: `frontend/e2e/exam-sets.spec.ts`

**Interfaces:**
- Consumes: existing fixture helpers (`examSet`, `blueprint`, `question`, `useSystemAdminSession`) already in this file.

- [ ] **Step 1: Extend the existing fixtures with a Blueprint section and a second question**

In `frontend/e2e/exam-sets.spec.ts`, add `sections: [{ id: '9', name: 'Science', subject: 'Synthetic Subject', item_count: 1, ... }]` is not needed at the API-fixture level since this e2e test intercepts routes with synthetic JSON, not a real backend — instead, add a route handler for the new auto-assemble endpoint and a `published_hash` field to the `examSet()` fixture builder:

In the `examSet()` function, add `published_hash: status === 'PUBLISHED' ? 'f'.repeat(64) : null,` after `workflow_history: [],`.

- [ ] **Step 2: Add the new test**

Add, after the existing `test('lists, creates, and submits an authoritative Exam Set', ...)` block:

```typescript
test('auto-assembles and publishes an Exam Set', async ({ page }) => {
  const examSets = [examSet('7', 'Remote Synthetic Set', 'APPROVED')];
  let autoAssembleCalled = false;
  let publishPayload: Record<string, unknown> | null = null;

  await useSystemAdminSession(page);
  await page.route('**/api/v1/exams/blueprints/', (route) => route.fulfill({ json: [blueprint] }));
  await page.route('**/api/v1/exams/questions/', (route) => route.fulfill({ json: [question] }));
  await page.route('**/api/v1/exams/exam-sets/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/v1/exams/exam-sets/' && request.method() === 'GET') {
      await route.fulfill({ json: examSets });
      return;
    }
    if (pathname === '/api/v1/exams/exam-sets/7/auto-assemble/' && request.method() === 'POST') {
      autoAssembleCalled = true;
      examSets[0] = { ...examSets[0], assembly_runs: [{ id: '1', algorithm_version: 'v1', status: 'completed', selected_item_count: 1, rejected_item_count: 0, initiated_by: 'Synthetic Administrator', started_at: '2026-08-07T00:00:00Z', completed_at: '2026-08-07T00:00:00Z', notes: '', items: [] }] };
      await route.fulfill({ json: examSets[0] });
      return;
    }
    if (pathname === '/api/v1/exams/exam-sets/7/transition/' && request.method() === 'POST') {
      publishPayload = request.postDataJSON() as Record<string, unknown>;
      examSets[0] = { ...examSets[0], status: 'PUBLISHED', published_hash: 'f'.repeat(64) };
      await route.fulfill({ json: examSets[0] });
      return;
    }
    await route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'Synthetic route not found.' } } });
  });

  await page.goto('/admin/hub/exam-sets/assembly');
  await page.getByText('Remote Synthetic Set').click();
  await expect(page.getByRole('button', { name: 'Back to Exam Sets' })).toBeVisible();

  await page.getByRole('button', { name: 'Run Auto-Selection' }).click();
  expect(autoAssembleCalled).toBe(true);

  await page.getByRole('button', { name: 'Publish' }).click();
  expect(publishPayload).toMatchObject({ status: 'PUBLISHED' });
  await expect(page.getByText('PUBLISHED')).toBeVisible();
});
```

- [ ] **Step 3: Run the e2e test**

Run: `cd frontend && npx playwright test exam-sets.spec.ts`
Expected: PASS — both tests in the file. If the dev server isn't already configured to start automatically for Playwright, check `frontend/playwright.config.ts` for the `webServer` setting before running.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add e2e/exam-sets.spec.ts
git commit -m "test(exam-set-hub-parity): extend e2e journey with auto-assemble and publish"
```

---

## Final verification

- [ ] **Step 1: Run the full backend suite**

Run: `cd backend && .venv/Scripts/python.exe manage.py test --settings=config.settings.test`
Expected: PASS except the pre-existing, out-of-scope failures already documented in `docs/superpowers/i.sandoval/i.sandoval.task.md`.

- [ ] **Step 2: Run the full frontend unit suite**

Run: `cd frontend && npm test`
Expected: PASS.

- [ ] **Step 3: Run the full e2e suite**

Run: `cd frontend && npx playwright test`
Expected: PASS.

- [ ] **Step 4: Manual walkthrough**

As a `SYSTEM_ADMIN` or `EXAM_ADMINISTRATOR`: create an Exam Set against a Blueprint with sections; open its workspace; run auto-selection; confirm the readiness checklist updates; submit for review, approve, and publish; confirm the Packages view shows it with a real hash; confirm the Audit view shows every step (create, auto-assemble, submit, approve, publish) newest-first.
