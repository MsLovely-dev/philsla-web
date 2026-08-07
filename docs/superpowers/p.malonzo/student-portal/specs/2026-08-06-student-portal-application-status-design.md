# Student Portal Sub-project A — Real Application Status/Documents — Design

**Date:** 2026-08-06
**Ticket:** [Student Portal Ticket 001](../student-portal.task.md#ticket-001--student-portal-real-backend-connections-decomposed)
**Status:** Awaiting user review

## Problem and context

`StudentDashboard.tsx` (rendered by `Dashboard.tsx` for every STUDENT-role user) shows the candidate's application status, admin remarks, required-correction chips, and a per-document upload/validation view. Today all of it comes from `useMockData().applications.find(a => a.userId === user?.id)` — an unscoped client-side search through a mock array of every application, not a real, server-authorized lookup of just the current user's own record.

Separately, `StudentApplication.tsx` — the registration/application-submission page — is **already** backend-connected through `backendApplicationService`, gated behind `import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend'`. `backend/apps/applications` is a real, working Django app with object-level authorization already proven (`ApplicationDetailView`, `ApplicationAdditionalAttachmentView`). The `Application` model's `owner` field, status choices, and `requiredCorrections` field already match what `StudentDashboard.tsx`'s mock UI expects — this is a data-source swap, not a new feature build.

## Goals

- `StudentDashboard.tsx` shows the real, current user's own application — fetched with server-side authorization, not client-side filtering.
- Document re-upload after a `FOR_CORRECTION` result goes through the real attachment endpoints already used elsewhere in the app.
- The existing mock-mode behavior (`VITE_AUTH_SERVICE_MODE` unset/not `'backend'`) is unchanged — this only adds the backend-mode path, matching how `StudentApplication.tsx` already does it.

## Non-goals

- No changes to `ResultsPage.tsx`, `ExamPermitPage.tsx`, or `ExamDelivery.tsx` — those are separate sub-projects (B, C, D), and C/D are explicitly out of scope for this whole ticket (see task log).
- No new authorization model — reuses `ObjectScopePermission`/`can_be_accessed_by` exactly as `ApplicationDetailView` already does.
- No redesign of `StudentDashboard.tsx`'s UI/UX — same layout, same states, different data source.
- No change to the registration/creation flow `StudentApplication.tsx` already owns.

## Architecture

**New backend endpoint:** `GET /api/v1/applications/me/` — a thin `APIView` in `backend/apps/applications/views.py`, `required_roles=[PortalRole.STUDENT]`. Returns the caller's own application via `request.user.student_applications.exclude(status=Application.Status.DRAFT).order_by('-updated_at').first()`, serialized with the same serializer `ApplicationDetailView` already uses. No new service-layer function — this is a scoped query, not a business rule, consistent with `AGENTS.md`'s "keep views/serializers thin" applied to something this simple.

- No application found for this user → `200` with a null/empty body (not a `404` treated as an error state) — a STUDENT account existing with no application yet is an edge case the frontend must render as an empty/prompt state, not a failure.

**Frontend service:** `backendApplicationService.getMyApplication(): Promise<ServiceResult<BackendApplication | null>>` added alongside the existing methods in `backendApplicationService.ts`, following that file's existing `ServiceResult` pattern.

**Frontend page:** `StudentDashboard.tsx`'s `myApp` lookup branches on `usesBackendServiceMode` (the same flag `StudentApplication.tsx` already reads), calling `getMyApplication()` in backend mode and keeping the existing `applications.find(...)` in mock mode, unchanged.

**Document actions:** the "Requirements Rejected → Browse Files" re-upload flow, in backend mode, calls the existing attachment upload/read endpoints (`ApplicationAdditionalAttachmentView` and whatever upload method `StudentApplication.tsx` already uses for post-submission attachments) instead of the current `setInterval`-simulated fake progress bar.

## Data flow

1. STUDENT logs in → `Dashboard.tsx` renders `StudentDashboard`.
2. Backend mode: `getMyApplication()` → `GET /api/v1/applications/me/` → object-level-authorized response containing only this user's own application (or empty).
3. Page maps `status`/`requiredCorrections` to the same UI states already built: `FOR_CORRECTION` → "Requirements Rejected" banner + correction chips; per-document validation states from the application's existing field-level data.
4. Re-upload action → existing attachment endpoint → on success, re-fetch `getMyApplication()` to reflect the new state (no separate optimistic-update logic invented).
5. Mock mode: entirely unchanged existing behavior.

## Error handling

- No application yet: empty/prompt state, not an error banner.
- Network/auth failure fetching the application: same error-state pattern `StudentApplication.tsx` already uses for its backend calls, reused rather than reinvented.
- Upload failure: existing upload-error UI states in `StudentDashboard.tsx` stay, just triggered by a real failure response instead of nothing (today's mock upload cannot fail).
- Wrong role or unauthenticated: existing route guards (`RouteGuards.tsx`) already prevent non-STUDENT/unauthenticated users from reaching this page; the endpoint itself also enforces `required_roles=[STUDENT]` as defense in depth, not as the only control.

## Security

- Server-side object-level scoping (`request.user.student_applications`) replaces client-side filtering of an all-applications array — a real authorization boundary where the mock had none.
- No new attachment storage or access path — reuses `ApplicationAdditionalAttachmentView`'s existing, already-reviewed access control.
- No secrets, PII beyond what the existing application-detail endpoint already legitimately returns to the application's own owner.

## Testing

- **Backend (Django test runner):** new endpoint test cases — own application returned; a different student's application never returned even if queried for; no-application case returns an empty/null body, not an error; unauthenticated request denied; non-STUDENT role denied.
- **Frontend (Vitest):** `backendApplicationService.test.ts` extended with `getMyApplication` success/empty/error cases, matching that file's existing test style. New `StudentDashboard.test.tsx` covering the backend-mode data path (mocked) for: application loaded and rendered, `FOR_CORRECTION` renders the rejection banner and chips, no-application renders the empty/prompt state, re-upload calls the real attachment path.
- Existing mock-mode behavior is not touched by this change, so no new test is required for it — only confirm existing tests (if any) still pass unmodified.

## Open items resolved during self-review

- Confirmed via direct model/view inspection (not assumption) that no new authorization model or business rule is needed — `owner`/`can_be_accessed_by` already exist and already match this use case.
- Confirmed the "no application yet" edge case explicitly rather than assuming every STUDENT account always has one — `docs/api/API-ENDPOINTS.md` describes accounts becoming usable only after admissions approval, which makes this rare but not impossible to leave unhandled.
