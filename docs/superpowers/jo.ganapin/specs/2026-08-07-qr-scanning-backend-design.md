# QR Scanning — Real Backend Feedback — Design

**Date:** 2026-08-07
**Owner:** Joshua Ganapin (Jo.Ganapin)
**Ticket:** [Ticket 001](../jo.ganapin.task.md#ticket-001--qr-scanning-desktop-proctor-app-preview)
**Builds on:** [`2026-08-06-qr-scanning-design.md`](2026-08-06-qr-scanning-design.md) (the client-side-only preview, now shipped)
**Status:** Approved (2026-08-07) — Approach A (env-gated single source), Django error envelope fixed at the source

## Problem and context

The shipped QR scanning preview on `ProctorAttendance.tsx` runs entirely client-side: it matches a scanned value against a mock `qrCode` field on a hardcoded roster, and computes Present/Late itself. No backend is called, by design (`D-QR-01` — the real production home for QR scanning is the not-yet-built desktop Proctor app).

This design adds **real backend feedback for the scan step only**, without turning the whole page into a production feature. It was prompted by a direct question during a build-plan status review: "I want QR scanning to have backend feedback."

### What already exists on the backend (verified directly against files)

`backend/apps/attendance` is not a stub — it's a real, migrated Django app with a working, authenticated endpoint:

- `POST /api/v1/attendance/scan/` (`ScanAttendanceView` in `views.py`) — accepts `{ "qrToken": "<value>" }`, restricted to `PROCTOR`/`SYSTEM_ADMIN` roles via `IsProctorOrSystemAdmin`.
- `mark_attendance(qr_token, proctor)` in `services.py` looks up `ExamPermit` by `qr_token`. Idempotent: re-scanning an already-`USED` permit returns `alreadyMarked: true` instead of erroring. Raises `AttendanceError` (`NOT_FOUND` / `VOID` / `EXPIRED`) otherwise. On first successful scan, flips `permit.status` to `USED` and creates a permanent `AttendanceRecord`.
- Built for a **future mobile scanner app** (per its own docstring), not this page — it has zero view-level test coverage today (`tests/` only covers `test_admin.py`, `test_migrations.py`, `test_models.py`).
- A second, richer, **entirely unused** schema also lives in this app (`RoomSession`, `CandidateSessionAssignment`, `AttendanceState`, `AttendanceEvent`, with offline-sync fields and a `late_after_at` field) — not wired to any view. Not used by this design; noted here so a future ticket doesn't rediscover it from scratch.
- **Known defect, found during this design:** `ScanAttendanceView` returns errors as `{"code": ..., "detail": ...}`, but every other backend service in this codebase (`apiClient.ts`'s `ApiErrorEnvelope`) expects `{"error": {"code": ..., "message": ...}}`. As-is, a real `NOT_FOUND`/`VOID`/`EXPIRED` response would surface as a generic "request could not be processed" instead of its specific message.

### What already exists on the frontend

- `frontend/src/services/apiClient.ts` — `sharedApiClient`, used by every `backendXService.ts`. Handles bearer-token attachment, 401 refresh, and maps the standard error envelope to `ServiceResult`.
- `frontend/src/services/authService.ts` + `VITE_AUTH_SERVICE_MODE` (`'prototype'` | `'backend'`) — the existing app-wide switch every other backend integration (`backendSchoolService.ts`, `backendUniversityService.ts`, etc.) uses to pick between a `Mock*Service` and a `Backend*Service`. Proctor login already flows through this when in `'backend'` mode.
- `ProctorAttendance.tsx`'s mock roster (`getInitialStudentPCs`) with `id: 'ST-001'` style IDs and `qrCode: 'SAMPLE_QR_ST-001'` style values, matched today by `matchScannedCodeToStudent` in `qrAttendanceService.ts`.

## Goals

- A proctor's scan on `ProctorAttendance.tsx`, when `VITE_AUTH_SERVICE_MODE=backend`, is validated against a real `ExamPermit` row via the real endpoint — not client-side string matching — and a real `AttendanceRecord` is written.
- Present/Late is still decided by the existing client-side `computeScanStatus`/`resolveScheduledStart` logic against the mock schedule; the backend is the source of truth for "is this a real, unused permit," not for the schedule or grace period.
- In `'prototype'` mode, behavior is **unchanged** from the shipped preview — pure local matching, no backend call.
- The Django error envelope bug is fixed at the source so real error feedback (not recognized / already used / void / expired) reads correctly in the UI.

## Non-goals

- The roster, schedule, and rooms shown on the page remain mock data. No new "list permits for this room" endpoint, no replacement of `getInitialStudentPCs`.
- No fallback from backend to local matching on network failure (Approach A, rejected: silent-fallback Approach B) — in `'backend'` mode, a scan either gets a real backend answer or a real error.
- No use of the unused `RoomSession`/`AttendanceState`/`AttendanceEvent` schema — out of scope for this ticket, left as a note for whoever eventually builds the real desktop-app-connected flow.
- No change to the desktop-app-preview framing or labeling — this is still explicitly not a production identity-verification control.

## Architecture

New `frontend/src/services/backendQrScanService.ts`, following the existing `BackendXService` / `MockXService` / `createXService()` pattern (see `backendSchoolService.ts`) rather than inventing a new convention:

```ts
export interface QrScanResult {
  alreadyMarked: boolean;
  candidateId: string;
  scannedAt: string; // ISO
}

export interface QrScanService {
  scan(qrToken: string): Promise<ServiceResult<QrScanResult>>;
}

export class BackendQrScanService implements QrScanService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}
  async scan(qrToken: string): Promise<ServiceResult<QrScanResult>> {
    return this.apiClient.request<ApiScanResponse>('/api/v1/attendance/scan/', {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    }).then(/* map ApiScanResponse -> QrScanResult, camelCase already matches */);
  }
}

export class MockQrScanService implements QrScanService {
  // Wraps today's matchScannedCodeToStudent unchanged — this is what runs in 'prototype' mode.
}

export function createQrScanService(): QrScanService {
  return import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend'
    ? new BackendQrScanService()
    : new MockQrScanService();
}
```

`ProctorAttendance.tsx`'s `handleQrScan` calls `qrScanService.scan(value)` instead of calling `matchScannedCodeToStudent` directly. The mock path's behavior (including the debounce, the "no-op if already marked," and the dedupe-by-code History fix from Phase 4j) does not change — it's now reached through the same interface the backend path uses.

## Data reconciliation

To keep the roster mock while making the scan real, seed data must line up with what's already hardcoded on the frontend:

- Extend `backend/apps/attendance/management/commands/seed_sample_permits.py` (or add a sibling command, e.g. `seed_proctor_preview_permits`) to create `ExamPermit` rows with `candidate_id` and `qr_token` matching today's mock IDs exactly: `candidate_id='ST-001'`, `qr_token='SAMPLE_QR_ST-001'`, etc., for every ID currently hardcoded in `getInitialStudentPCs`.
- This means the already-published QR test-codes page (from the prior ticket's manual device testing) keeps working unchanged against real permits once seeded — no new codes need to be generated.
- On a successful (non-already-marked) scan, the frontend matches the response's `candidateId` back to the existing local `StudentPC` by `id` — no change to the roster's shape, only to how a match is confirmed.

## Backend fix

`ScanAttendanceView.post` currently returns `Response({"code": exc.code, "detail": exc.detail}, status=status_code)` on error. Change to the app's standard envelope:

```python
return Response(
    {"error": {"code": exc.code, "message": exc.detail}},
    status=status_code,
)
```

This is the only Django code change in this design — everything else in `backend/apps/attendance` is reused as-is.

## Data flow (`'backend'` mode)

1. Proctor scans → `handleQrScan(value)` → `qrScanService.scan(value)` → `BackendQrScanService`.
2. **Not found:** 404, `NOT_FOUND` → inline "This QR code does not match any issued permit." No state change, no audit entry — same UX contract as today's local no-match path.
3. **Void:** 409, `VOID` → inline "This permit has been voided and cannot be used for entry."
4. **Expired:** 409, `EXPIRED` → inline "This permit has expired and can no longer be used for entry."
5. **Already marked:** 200, `alreadyMarked: true` → inline "Already marked" — no state change, no audit entry (same as today's local already-marked path).
6. **First valid scan:** 200, `alreadyMarked: false`, real `candidateId` + `scannedAt` → backend flips the real `ExamPermit` to `USED` and writes a real `AttendanceRecord` → frontend finds the local roster row by `id === candidateId`, computes status via the existing `computeScanStatus(resolveScheduledStart(schedule), new Date(scannedAt), DEFAULT_LATE_GRACE_MINUTES)`, then calls the existing `updateStatus`/`addAuditLog` — identical downstream effect to today's local-match path.
7. **Network failure** (Django unreachable): surfaced as a real error via `sharedApiClient`'s existing `networkError` handling. No fallback to local matching (Approach A).

## Error handling

- All error cases above map through the existing `ServiceResult`/`ApiErrorEnvelope` machinery once the Django fix lands — no new error-handling code needed on the frontend beyond what `apiClient.ts` already does.
- Camera-lifecycle behavior (defects 1–3 from the prior design) and the debounce/dedupe behavior (Phase 4j) are unchanged — this design only changes what happens *after* a value is decoded and handed to the match step.
- Role/auth failures (401/403, e.g. a non-Proctor/SystemAdmin session) surface through the same envelope as any other protected endpoint in this app — no special-case handling needed.

## Testing

- **`backendQrScanService.test.ts`** (new, Vitest): mocked `ApiClient`, covering not-found, void, expired, already-marked, first-valid-scan, and network-failure — mirrors the pattern in `backendSchoolService`'s sibling tests.
- **`ScanAttendanceView` (new, Django, `tests/test_views.py`):** currently zero view-level coverage. Add: happy path (200, permit flips to `USED`, `AttendanceRecord` created), already-used (200, `alreadyMarked: true`, no duplicate record), void (409), expired (409), unknown token (404), wrong role (403), unauthenticated (401) — and assert the new `{error: {code, message}}` shape.
- **`ProctorAttendance.test.tsx`:** existing scan tests continue to run against `MockQrScanService` unchanged (`'prototype'` mode is the test default) — confirms no regression to the shipped preview behavior. No new page-level backend-mode tests planned; `BackendQrScanService`'s own unit tests plus the Django view tests are the coverage for the real path, consistent with how other `backendXService` integrations in this codebase are tested (unit-level, not through the page).

## Security

- Endpoint already restricted to `PROCTOR`/`SYSTEM_ADMIN` via `IsProctorOrSystemAdmin` — unchanged.
- Real writes are explicitly approved for this design (unlike the pure-preview predecessor): a scan in `'backend'` mode creates a permanent `AttendanceRecord` and flips a real `ExamPermit` to `USED`. Seeded permits use the same synthetic `ST-00x` identifiers already used throughout the mock roster — no real candidate PII introduced.
- Camera video handling, in-memory-only processing, and the "Desktop App Preview — not connected to a backend" label are all unchanged from the shipped design — note that the label's wording becomes slightly inaccurate in `'backend'` mode (it *is* now connected to a backend for the scan step). Revisit the label copy for `'backend'` mode during implementation planning rather than leaving it silently wrong.

## Open items flagged for the implementation plan

- Label copy ("not connected to a backend") needs a `'backend'`-mode variant so it stays accurate rather than becoming a false claim.
- Whether `seed_sample_permits` should be extended in place or a new command added — implementation-plan-level call, not a design fork.
