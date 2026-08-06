# Frontend Exams Context

Date: 2026-08-05

## Purpose
This note captures the frontend exam-related pages and service boundaries that matter to Jude Cabigon's exam module work.

## Core Files
- `frontend/src/pages/ExamBlueprints.tsx`
- `frontend/src/pages/admin/hub/QuestionBank.tsx`
- `frontend/src/services/backendExamBlueprintService.ts`
- `frontend/src/services/backendQuestionBankService.ts`
- `frontend/src/pages/admin/hub/blueprintMockData.ts`

## Current Shape
- `ExamBlueprints.tsx` already calls `backendExamBlueprintService` for list, create, update, clone, and delete operations.
- The same page still falls back to `localStorage` when the backend does not return data.
- `QuestionBank.tsx` is still heavily mock-driven and merges mock question data with the central mock item bank.
- `QuestionBank.tsx` also uses `localStorage` for persistence and simulates add/edit/status workflows locally.

## Service Boundaries
- `backendExamBlueprintService.ts` is the main transport adapter for blueprint CRUD and transition calls.
- `backendQuestionBankService.ts` is the transport adapter for question CRUD and transition calls.
- Frontend pages should keep transport details inside these service modules instead of calling endpoints directly.

## Practical Notes
- For blueprint work, the frontend already has a real service path to compare against backend behavior.
- For question bank work, the current UI still behaves more like a prototype and may need a staged wiring approach.
- If a page is still mock-driven, note that clearly in the task log so implementation expectations stay realistic.
