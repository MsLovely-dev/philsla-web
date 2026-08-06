# Exam Sets API Integration Design

**Owner:** Ian Chris Sandoval (I.Sandoval)
**Date:** 2026-08-05
**Status:** Approved for implementation planning

## Purpose

Replace the browser-local Exam Sets assembly state with the existing Django/DRF Exam Sets API while preserving the current React administration workflow. The implementation covers only authoritative Exam Set list, create, edit, clone, lifecycle-transition, and delete operations.

## Current State

- The backend exposes `/api/v1/exams/exam-sets/` list and create routes plus detail, clone, and transition routes.
- `ExamSet` records reference `BlueprintVersion`, not an Exam Blueprint directly.
- `ExamSets.tsx` currently stores assemblies and related question selections in browser `localStorage` and uses mock data.
- The Blueprint API does not currently expose the current Blueprint Version identifier required by the Exam Sets create/update contract.

## Approved Design

### API contract prerequisite

Extend the existing Blueprint response with `current_version_id`. This is a narrow prerequisite for the Exam Sets form: it lets an operator select a Blueprint and submit its authoritative version ID as `blueprint_version_id`. It does not create a maintenance catalog, change Blueprint lifecycle behavior, or introduce a new endpoint.

### Frontend boundary

Create a typed Exam Sets service that is the only frontend module allowed to call `/api/v1/exams/exam-sets/`. The service maps API snake_case responses and requests to a focused TypeScript Exam Set model and exposes list, create, update, clone, transition, and delete methods.

A focused React hook owns remote loading, mutation, and service-result state. `ExamSets.tsx` consumes that hook and remains responsible only for presentation, form state, and local UI state. Components must not call `fetch` or API endpoints directly.

### Data flow

1. On entry, load Exam Sets, Blueprint options, and Question Bank items from their documented services.
2. Build the Blueprint selector from server-provided Blueprints and use `current_version_id` for create/update payloads.
3. Use real Question Bank identifiers in Exam Set item payloads.
4. On every successful mutation, replace the affected in-memory record with the server response.
5. Do not read, write, or fall back to `localStorage` for Exam Set assemblies or their selected items.

### Lifecycle and authorization

The UI must render backend-supported Exam Set states only: `DRAFT`, `ACADEMIC_REVIEW`, `REVISION_REQUIRED`, `APPROVED`, `PUBLISHED`, and `ARCHIVED`. Client-side role selection is not an authorization control. Backend validation, role checks, object-level authorization, conflict handling, and audit behavior remain authoritative.

### Error behavior

The hook exposes loading, empty, validation, authorization/permission, conflict, not-found, and network/server-error states through the established `ServiceResult` model. Failed mutations do not change the in-memory authoritative record. The user can retry a failed initial load.

## Out of Scope

- Exam Blueprint maintenance tables and their catalogs, lifecycle, or permissions.
- New Exam Set backend entities, migrations, endpoints, or dependencies, except exposing `current_version_id` in the existing Blueprint response.
- Package delivery, testing-center synchronization, uploads, device management, real cryptography, or treatment of mock hashes/signatures as security controls.
- Browser persistence of authoritative Exam Set content.

## Verification

- Django test coverage verifies the Blueprint response includes `current_version_id` and preserves its existing behavior.
- Frontend service tests verify typed request/response mapping and all agreed endpoint operations.
- Hook/component tests verify loading, empty, error, validation, authorization/permission, conflict, successful mutation, and no assembly persistence to `localStorage`.
- A Playwright journey with synthetic data verifies list, create, and lifecycle transition behavior.

## Approval

The user approved this design in the current session after confirming the scope, the server-authoritative approach, the API prerequisite, data/error behavior, and verification approach.
