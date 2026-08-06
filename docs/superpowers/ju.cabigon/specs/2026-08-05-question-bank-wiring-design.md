# Question Bank Wiring Design

Date: 2026-08-05
Owner: Jude Cabigon

## Problem

`QuestionBank.tsx` still builds its working dataset from `blueprintMockData.ts` and local storage. The build-plan task for `ju.cabigon/question-bank` asks for a reviewed plan to wire the page to `backendQuestionBankService.ts`, using the same service boundary pattern already used by `ExamBlueprints.tsx`.

## Current State

- `frontend/src/pages/admin/hub/QuestionBank.tsx` imports `MOCK_CENTRAL_ITEM_BANK` and merges it with local mock questions.
- The page persists state in local storage instead of loading from the backend service.
- `frontend/src/services/backendQuestionBankService.ts` already exists and exposes list, create, update, transition, and delete operations.
- `frontend/src/pages/ExamBlueprints.tsx` already demonstrates the pattern we want: service-first load, local fallback, and UI state kept separate from transport mapping.

## Goals

- Load question-bank data through `backendQuestionBankService.ts`.
- Keep transport mapping isolated in the service layer.
- Preserve loading, empty, error, and transition states in the UI.
- Keep any mock content as a fallback or fixture source only, not the component's primary source of truth.
- Avoid direct backend calls from `QuestionBank.tsx`.
- Keep the change small and reviewable.

## Non-Goals

- No backend API redesign.
- No schema or contract expansion unless the page exposes a missing field that is already required by the UI.
- No redesign of the question editor or hub layout.
- No change to unrelated exam modules.

## Options

1. Service-first wiring with local fallback
- Load questions from `backendQuestionBankService.listQuestions()` on mount.
- If the backend returns data, use it and optionally cache it locally.
- If the backend is unavailable or empty, fall back to the existing mock/local cache behavior.
- This is the smallest change and matches the working blueprint pattern.
- Recommendation: yes.

2. Service-first wiring with mock data removed from the runtime path
- Load only from the backend service and show an empty state if nothing is returned.
- Keep mock data only for tests or development fixtures.
- This is cleaner long-term but riskier for demo continuity if the API is incomplete.

3. Full state management extraction
- Move question loading and mutations into a dedicated hook or store before wiring the page.
- This would make the page thinner, but it is broader than the current task and increases review surface.

## Recommended Design

Use option 1.

`QuestionBank.tsx` should become a service-driven page that:

- requests the question list from `backendQuestionBankService`
- normalizes service results into the page's display state
- keeps the existing mock data only as a fallback path
- leaves create/update/transition/delete actions routed through the service boundary
- preserves the current filters, modal flow, and persona switching logic

This keeps the page aligned with `ExamBlueprints.tsx` while minimizing churn.

## Data Flow

1. The page mounts and asks `backendQuestionBankService` for the question list.
2. If the service returns data, the page renders that data.
3. If the service fails or returns nothing usable, the page falls back to local cached or mock data for continuity.
4. Mutations go through the service so the UI does not become the source of truth for backend state.
5. The page keeps display-only state such as filters, selection, and dialog state locally.

## Security and Safety

- Treat backend validation as authoritative.
- Do not trust client-side status values for access control or workflow enforcement.
- Do not expose secrets, sensitive exam content, or real identity data in examples or fixtures.
- Keep any fallback data synthetic and limited to the demo use case.

## Validation Strategy

- Confirm the page still loads with service data when available.
- Confirm the fallback path still renders if the service is empty or unavailable.
- Confirm search, filters, and action dialogs still behave with the service-backed state.
- Compare the wiring style against `ExamBlueprints.tsx` to make sure the boundary stays consistent.

## Review Gate

This spec is intended for human review before the implementation plan is written.
No code changes should happen until the reviewed plan is approved.
