# Exam Sets API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Exam Sets administration workflow use the existing Django/DRF API for authoritative list, create, edit, clone, lifecycle transition, and delete operations.

**Architecture:** Add the current Blueprint Version ID to the existing Blueprint representation, then expose a typed Exam Sets frontend service. A focused hook loads Exam Sets, Blueprint options, and Question Bank items and owns remote mutation state. `ExamSets.tsx` becomes a presentation and form-state client of that hook; it no longer persists Exam Set assemblies or selected questions in browser storage.

**Tech Stack:** Django 5.2 and Django REST Framework 3.16; React 19, TypeScript 5.8, Vite 6; Vitest, React Testing Library, and Playwright.

## Global Constraints

- Keep all changes within the Exam Sets integration scope; do not modify Exam Blueprint maintenance catalogs or their permissions.
- Do not add dependencies, data-model migrations, or Exam Sets routes.
- The existing `/api/v1/exams/exam-sets/` API remains authoritative for validation, authorization, lifecycle, audit, and conflict decisions.
- Add only `current_version_id` to the existing Blueprint response to satisfy the Exam Sets create/update contract.
- Do not read, write, or use `localStorage` as a fallback for authoritative Exam Set assemblies or their selected items.
- Use only synthetic test data. Do not log or add real assessment content, answer keys, credentials, or personal data.
- Package delivery, testing-center sync, uploads, and mock hash/signature behavior remain out of scope and must not be represented as security controls.

---

### Task 1: Expose the current Blueprint Version ID

**Files:**
- Modify: `backend/apps/exams/services.py:392-442`
- Modify: `backend/apps/exams/tests.py:87-112`
- Modify: `docs/api/API-ENDPOINTS.md:977-994`

**Interfaces:**
- Produces: Blueprint list/detail responses with `current_version_id: string | null`.
- Consumed by: `BackendExamBlueprintService` and the Exam Sets Blueprint selector.

- [ ] **Step 1: Add the failing backend response-contract assertion**

```python
response = self.client.post(reverse("exams:blueprint_list"), self.payload, format="json")

self.assertEqual(response.status_code, 201)
self.assertEqual(response.data["current_version_id"], str(BlueprintVersion.objects.get(blueprint_id=response.data["id"]).pk))

list_response = self.client.get(reverse("exams:blueprint_list"))
self.assertEqual(list_response.status_code, 200)
self.assertEqual(list_response.data[0]["current_version_id"], response.data["current_version_id"])
```

- [ ] **Step 2: Run the focused backend test and confirm the red failure**

Run: `python manage.py test apps.exams.tests.ExamBlueprintApiTests --settings=config.settings.test`

Expected: FAIL because `current_version_id` is absent from the serialized Blueprint response.

- [ ] **Step 3: Add the minimal serialized field**

In `serialize_blueprint`, return `"current_version_id": None` when no version exists. In the version-present response return `"current_version_id": str(version.pk)`. Do not expose additional BlueprintVersion fields or change response keys.

- [ ] **Step 4: Document the additive contract**

Add an `Exam management` subsection to `docs/api/API-ENDPOINTS.md` before `Candidate endpoint groups`. Document that `GET` and successful create/update responses for `/api/v1/exams/blueprints/` include `current_version_id`; it is `null` when no current version exists and is the value required for Exam Set `blueprint_version_id`. State the existing authentication and role boundary is unchanged.

- [ ] **Step 5: Run the focused backend test and confirm it passes**

Run: `python manage.py test apps.exams.tests.ExamBlueprintApiTests --settings=config.settings.test`

Expected: PASS.

- [ ] **Step 6: Commit the backend contract change**

```text
git add backend/apps/exams/services.py backend/apps/exams/tests.py docs/api/API-ENDPOINTS.md
git commit -m "feat: expose current blueprint version id"
```

### Task 2: Map the Blueprint prerequisite and Exam Sets transport contract

**Files:**
- Modify: `frontend/src/pages/admin/hub/blueprintMockData.ts`
- Modify: `frontend/src/services/backendExamBlueprintService.ts`
- Create: `frontend/src/services/backendExamBlueprintService.test.ts`
- Create: `frontend/src/services/backendExamSetService.ts`
- Create: `frontend/src/services/backendExamSetService.test.ts`

**Interfaces:**
- Produces: `Blueprint.currentVersionId?: string`, `ExamSetRecord`, `ExamSetDraft`, `ExamSetTransitionInput`, and `BackendExamSetService`.
- Consumed by: `useExamSets` and `ExamSets.tsx`.

- [ ] **Step 1: Write failing Blueprint-service mapping coverage**

```ts
expect(result.ok && result.data[0]).toMatchObject({
  id: '17',
  currentVersionId: '42',
});
```

Use an API fixture containing `current_version_id: '42'` and assert `BackendExamBlueprintService.listBlueprints()` maps it without changing existing Blueprint fields.

- [ ] **Step 2: Write failing Exam Sets service contract tests**

Use `ApiClient({ baseUrl: 'http://backend.test', fetcher })`. Cover:

```ts
await service.listExamSets();
await service.createExamSet({ title: 'Synthetic Set', blueprintVersionId: '42', academicYear: '2026-2027', durationMinutes: 60, items: [{ questionId: '101', displayOrder: 1, points: 1 }] });
await service.updateExamSet('7', draft);
await service.cloneExamSet('7');
await service.transitionExamSet('7', { status: 'ACADEMIC_REVIEW', remarks: 'Synthetic review' });
await service.deleteExamSet('7');
```

Assert the exact paths, HTTP methods, snake_case request body, status normalization, response mapping, and propagation of a `409` conflict `ServiceResult`.

- [ ] **Step 3: Run the two service test files and confirm the red failure**

Run: `npm test -- backendExamBlueprintService.test.ts backendExamSetService.test.ts`

Expected: FAIL because the Blueprint model has no `currentVersionId` mapping and the Exam Sets service does not exist.

- [ ] **Step 4: Implement minimal typed service adapters**

Extend the Blueprint type with optional `currentVersionId` and map `current_version_id` in `BackendExamBlueprintService`.

Create `BackendExamSetService` with these methods:

```ts
listExamSets(): Promise<ServiceResult<ExamSetRecord[]>>
createExamSet(draft: ExamSetDraft): Promise<ServiceResult<ExamSetRecord>>
updateExamSet(id: string, draft: ExamSetDraft): Promise<ServiceResult<ExamSetRecord>>
cloneExamSet(id: string): Promise<ServiceResult<ExamSetRecord>>
transitionExamSet(id: string, input: ExamSetTransitionInput): Promise<ServiceResult<ExamSetRecord>>
deleteExamSet(id: string): Promise<ServiceResult<null>>
```

Map API `items`, `validation_results`, and `workflow_history` into typed camelCase values. Serialize all update fields, including ordered question items, with server-valid question IDs. Limit lifecycle values to `DRAFT`, `ACADEMIC_REVIEW`, `REVISION_REQUIRED`, `APPROVED`, `PUBLISHED`, and `ARCHIVED`.

- [ ] **Step 5: Run the service tests and confirm they pass**

Run: `npm test -- backendExamBlueprintService.test.ts backendExamSetService.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the transport adapters**

```text
git add frontend/src/pages/admin/hub/blueprintMockData.ts frontend/src/services/backendExamBlueprintService.ts frontend/src/services/backendExamBlueprintService.test.ts frontend/src/services/backendExamSetService.ts frontend/src/services/backendExamSetService.test.ts
git commit -m "feat: add exam sets api service"
```

### Task 3: Add a remote Exam Sets state hook

**Files:**
- Create: `frontend/src/hooks/useExamSets.ts`
- Create: `frontend/src/hooks/useExamSets.test.tsx`

**Interfaces:**
- Consumes: `BackendExamSetService`, `BackendExamBlueprintService`, and `BackendQuestionBankService`.
- Produces: `examSets`, `blueprints`, `questions`, `loadState`, `reload`, `create`, `update`, `clone`, `transition`, and `remove`.

- [ ] **Step 1: Write failing hook behavior tests**

Use `renderHook` with injected fake services. Verify:

```ts
expect(result.current.loadState).toBe('loading');
await waitFor(() => expect(result.current.loadState).toBe('ready'));
expect(result.current.examSets).toHaveLength(1);

await act(() => result.current.create(syntheticDraft));
expect(result.current.examSets[0].id).toBe('7');
expect(window.localStorage.getItem('philsa_exam_assemblies')).toBeNull();
```

Add separate tests for an empty list, retry after a failed load, validation failure, authorization failure, and conflict failure. Each failed mutation must leave the existing record unchanged.

- [ ] **Step 2: Run the hook test and confirm the red failure**

Run: `npm test -- useExamSets.test.tsx`

Expected: FAIL because `useExamSets` does not exist.

- [ ] **Step 3: Implement the minimal hook**

Load Exam Sets, Blueprints, and Questions with cancellation protection. Return a discriminated load state (`loading`, `ready`, `empty`, `error`) and the original `ServiceFailure` for UI messages. Accept injected service instances for tests while defaulting to shared services. For successful mutation responses, upsert/replace the server record; for delete, remove only after a successful `204` response. Never call `localStorage`.

- [ ] **Step 4: Run the hook test and confirm it passes**

Run: `npm test -- useExamSets.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the hook**

```text
git add frontend/src/hooks/useExamSets.ts frontend/src/hooks/useExamSets.test.tsx
git commit -m "feat: manage remote exam sets state"
```

### Task 4: Connect the Exam Sets UI to the authoritative workflow

**Files:**
- Modify: `frontend/src/pages/admin/hub/ExamSets.tsx`
- Create: `frontend/src/pages/admin/hub/ExamSets.test.tsx`

**Interfaces:**
- Consumes: `useExamSets`, `ExamSetRecord`, real Blueprint `currentVersionId`, and real Question Bank items.
- Produces: server-backed list, create, edit, clone, lifecycle-transition, and delete UI behavior.

- [ ] **Step 1: Write failing component behavior tests**

Mock `useExamSets` and assert the page renders a loading state, a retryable error state, an empty state, and a server-provided Exam Set. Simulate a create submit and assert the hook receives a draft with `blueprintVersionId: '42'` and a real `questionId: '101'`. Simulate a conflict failure and assert the original server-backed row remains visible with the returned message.

- [ ] **Step 2: Run the component test and confirm the red failure**

Run: `npm test -- ExamSets.test.tsx`

Expected: FAIL because the current page initializes and persists `INITIAL_ASSEMBLIES` instead of using the hook.

- [ ] **Step 3: Replace local assembly behavior with the hook**

Remove `INITIAL_ASSEMBLIES` as the assembly-state default and remove the `philsa_exam_assemblies` read/write effect. Replace `INITIAL_BLUEPRINTS` and the local Question Bank storage mapping with the hook's server-backed options. Convert each local assembly action to the matching hook method:

```ts
create -> create(draft)
edit/add/remove/replace/reorder items -> update(id, draft)
duplicate -> clone(id)
status change -> transition(id, { status, remarks })
delete -> remove(id)
```

Render only server lifecycle values; remove `VALIDATING` and `RETIRED` filters/actions. Display server validation results and workflow history instead of creating browser-only audit entries. Preserve keyboard-accessible form labels, confirmation for delete, and current responsive layout. Keep package-delivery and testing-center simulation out of the authoritative assembly data path.

- [ ] **Step 4: Add complete user states**

Render an accessible loading announcement while the initial request is pending, an empty-state panel with the create action, and an error panel containing the service message and `Retry` button. Disable mutation controls while their request is pending. Show validation, authorization, conflict, not-found, network, and unknown failures through the existing toast/error presentation without exposing request payloads.

- [ ] **Step 5: Run the component test and confirm it passes**

Run: `npm test -- ExamSets.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the UI integration**

```text
git add frontend/src/pages/admin/hub/ExamSets.tsx frontend/src/pages/admin/hub/ExamSets.test.tsx
git commit -m "feat: connect exam sets ui to api"
```

### Task 5: Verify the browser journey and update the implementation log

**Files:**
- Create: `frontend/e2e/exam-sets.spec.ts`
- Modify: `docs/superpowers/i.sandoval/implement/i.sandoval.implement.md`

**Interfaces:**
- Consumes: the API contract and Exam Sets UI from Tasks 1-4.
- Produces: a synthetic browser regression for list, create, and transition plus a verification record.

- [ ] **Step 1: Write the Playwright journey using synthetic API responses**

Use `page.route` to return synthetic authenticated responses for Blueprint, Question Bank, and Exam Sets endpoints. Seed the system-admin browser session with the existing test helper pattern. Verify that the Exam Sets page lists the remote set, creates a set using Blueprint Version `42`, and sends a transition request with `ACADEMIC_REVIEW`. Do not store or assert real assessment content.

- [ ] **Step 2: Run the journey and confirm the red failure**

Run: `npm run test:e2e -- exam-sets.spec.ts`

Expected: FAIL until the page calls the API-backed hook and emits the expected create/transition requests.

- [ ] **Step 3: Run the journey and confirm it passes after Tasks 1-4**

Run: `npm run test:e2e -- exam-sets.spec.ts`

Expected: PASS.

- [ ] **Step 4: Run required checks and record observed results**

Run from `frontend/`:

```text
npm test
npm run lint
npm run build
npm run test:e2e
```

Run from `backend/`:

```text
python manage.py check --settings=config.settings.local
python manage.py test apps.exams.tests --settings=config.settings.test
python manage.py test --settings=config.settings.test
```

Record every command, pass, failure, skip, and environmental blocker in `docs/superpowers/i.sandoval/implement/i.sandoval.implement.md`.

- [ ] **Step 5: Inspect the final diff and commit verification artifacts**

Run: `git diff --check` and `git status --short`.

```text
git add frontend/e2e/exam-sets.spec.ts docs/superpowers/i.sandoval/implement/i.sandoval.implement.md
git commit -m "test: cover exam sets api journey"
```
