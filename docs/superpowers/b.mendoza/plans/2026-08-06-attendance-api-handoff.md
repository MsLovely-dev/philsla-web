# Attendance Web API and Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the PhilSA web app the only supported attendance client using the reviewed session attendance schema, then retire the legacy raw-token scan path safely.

**Architecture:** Thin DRF serializers/views call transactional attendance application services. Every roster read and write requires the authenticated `PROCTOR` user to have a non-revoked `RoomSessionProctorAssignment`; current state updates and append-only events commit atomically with optimistic version checks. The React page consumes typed service adapters and never treats browser state as authoritative.

**Tech Stack:** Django 5.2, Django REST Framework 3.16, Django transactions, React 19, TypeScript 5.8, Vitest/Testing Library, Playwright.

## Global Constraints

- Consume `attendance.0002_session_attendance_schema` without silently adding or changing fields.
- Return for schema review if implementation proves a field or constraint is missing.
- Support online web attendance only; do not add PWA queues, service workers, offline batches, or device provisioning.
- Preserve optional client event identifiers for idempotent browser retries and future PWA compatibility.
- Permit only authenticated `PROCTOR` users actively assigned to the target room session.
- Use server receipt time for online QR `PRESENT`/`LATE` classification.
- Require expected state version on every attendance write.
- Never store, log, or return raw permit tokens after issuance.
- Do not automatically authorize or start an exam from attendance endpoints.
- Use synthetic data in tests and documentation.

---

### Task 1: Add transactional assignment and permit services

**Files:**

- Modify: `backend/apps/attendance/services.py`
- Create: `backend/apps/attendance/tests/test_assignment_services.py`

**Interfaces:**

- Produces: `create_candidate_assignment(...) -> CandidateSessionAssignment`
- Produces: `issue_permit_credential(...) -> tuple[PermitCredential, str]`
- Produces: `revoke_permit_credential(...) -> PermitCredential`

- [ ] Write failing service tests for approved candidate assignment, initial `UNMARKED` state creation, duplicate candidate/seat rejection, digest-only permit persistence, token rotation, expiry, and revocation.
- [ ] Implement `create_candidate_assignment` using `transaction.atomic()` so `CandidateSessionAssignment` and `AttendanceState(status=UNMARKED, version=0)` are created together.
- [ ] Implement permit issuance with `secrets.token_urlsafe(32)` and `hashlib.sha256(raw.encode("utf-8")).hexdigest()`. Return the raw token only from the issuance call; persist only the digest.
- [ ] Lock active credentials during rotation/revocation and update `is_active=False` plus `revoked_at=timezone.now()` before issuing a replacement.
- [ ] Run `python manage.py test apps.attendance.tests.test_assignment_services --settings=config.settings.test` and confirm all focused tests pass.

---

### Task 2: Add authorization and roster query services

**Files:**

- Modify: `backend/apps/attendance/services.py`
- Modify: `backend/apps/accounts/permissions.py` only if the existing role permission cannot express the required active assignment check
- Create: `backend/apps/attendance/tests/test_roster_services.py`

**Interfaces:**

- Produces: `require_assigned_proctor(*, user, room_session_id) -> RoomSession`
- Produces: `get_room_session_roster(*, user, room_session_id) -> QuerySet[CandidateSessionAssignment]`

- [ ] Write failing tests for unauthenticated-equivalent users, non-`PROCTOR` roles, unassigned proctors, revoked assignments, inactive room sessions, valid assignment, and roster isolation between rooms.
- [ ] Implement deny-by-default authorization using `get_user_role(user) == PortalRole.PROCTOR.value` and a non-revoked `RoomSessionProctorAssignment` for the target session.
- [ ] Return only candidate ID, display name required for check-in, seat label, current status, recorded time/source, and state version. Exclude LRN, email, raw application payloads, and permit digest.
- [ ] Use `select_related` for candidate, room session, room, and attendance state to avoid per-row queries.
- [ ] Run `python manage.py test apps.attendance.tests.test_roster_services --settings=config.settings.test`.

---

### Task 3: Add the concurrency-safe attendance command service

**Files:**

- Modify: `backend/apps/attendance/services.py`
- Create: `backend/apps/attendance/tests/test_attendance_commands.py`

**Interfaces:**

- Produces:

```python
record_attendance(
    *,
    user,
    room_session_id,
    assignment_id,
    requested_status,
    source,
    event_type,
    expected_version,
    client_instance_id="",
    client_event_id=None,
    client_recorded_at=None,
    correction_reason="",
) -> AttendanceCommandResult
```

- Produces `scan_permit(*, user, room_session_id, raw_token, expected_version, client_instance_id="", client_event_id=None) -> AttendanceCommandResult`.

- [ ] Write failing tests for initial marking, correction reason enforcement, stale version conflict, repeated client event idempotency, session-end rejection, room mismatch, absent state preservation, and atomic event/state version changes.
- [ ] In one `transaction.atomic()` block, authorize the proctor, check idempotency first, lock `AttendanceState` with `select_for_update()`, compare `expected_version`, enforce `timezone.now() <= room_session.ends_at`, append the event, then update state and increment version.
- [ ] On stale version, append one `CONFLICT` event without modifying current state and return the current state/version. A retry with the same client identifiers returns that same event and result without appending another row.
- [ ] On a closed session, append one `SESSION_CLOSED` event without modifying state.
- [ ] Require a concise nonblank correction reason when current status is not `UNMARKED` and requested status differs.
- [ ] For QR scans, hash the raw token immediately, fetch an active/unrevoked/unexpired `PermitCredential`, verify its assignment belongs to the target room session, and classify by server time: `now <= late_after_at` is `PRESENT`; otherwise `LATE`.
- [ ] Never mutate attendance from a raw candidate ID or client-submitted room/status claim.
- [ ] Run `python manage.py test apps.attendance.tests.test_attendance_commands --settings=config.settings.test`.

---

### Task 4: Expose the authenticated DRF contract

**Files:**

- Modify: `backend/apps/attendance/serializers.py`
- Modify: `backend/apps/attendance/views.py`
- Modify: `backend/apps/attendance/urls.py`
- Create: `backend/apps/attendance/tests/test_api.py`
- Modify: `docs/api/API-ENDPOINTS.md`

**Interfaces:**

- `GET /api/v1/attendance/room-sessions/{roomSessionId}/roster/`
- `POST /api/v1/attendance/room-sessions/{roomSessionId}/records/`
- `POST /api/v1/attendance/room-sessions/{roomSessionId}/qr-records/`

Manual request:

```json
{
  "assignmentId": "uuid",
  "status": "PRESENT",
  "expectedVersion": 0,
  "clientInstanceId": "browser-installation-id",
  "clientEventId": "uuid",
  "clientRecordedAt": "2026-08-06T03:00:00Z",
  "correctionReason": ""
}
```

QR request:

```json
{
  "qrToken": "one-time-raw-scanned-value",
  "expectedVersion": 0,
  "clientInstanceId": "browser-installation-id",
  "clientEventId": "uuid"
}
```

Success response:

```json
{
  "result": "accepted",
  "assignmentId": "uuid",
  "status": "PRESENT",
  "recordedAt": "2026-08-06T03:00:01Z",
  "source": "QR_SCAN",
  "version": 1,
  "eventId": "uuid"
}
```

Conflict response uses HTTP `409` and includes `code: "ATTENDANCE_VERSION_CONFLICT"`, `result: "conflict"`, current status, current recorded time/source, and current version. Closed sessions use HTTP `409`, `code: "ATTENDANCE_SESSION_CLOSED"`, and `result: "session-closed"`. Duplicate retries return HTTP `200`, `result: "duplicate"`, and the prior accepted/conflict/closed event result.

- [ ] Write API tests covering 401, role-based 403, unassigned/revoked 403, 404, validation 400, success 200, duplicate 200, conflict 409, session closed 409, QR mismatch 400/404 without revealing token existence, and safe error envelopes.
- [ ] Keep serializers limited to transport validation and camelCase mapping; call services for authorization and state transitions.
- [ ] Preserve `PendingAwareBearerAuthentication` and `ApiSessionAuthentication` conventions.
- [ ] Document exact request/response/error/privacy behavior in `API-ENDPOINTS.md`.
- [ ] Run `python manage.py test apps.attendance.tests.test_api --settings=config.settings.test`.

---

### Task 5: Integrate the web attendance page

**Files:**

- Modify: `frontend/src/services/qrAttendanceService.ts`
- Modify: `frontend/src/pages/proctor/ProctorAttendance.tsx`
- Modify/Create: focused service and page tests beside the existing files
- Modify/Create: Playwright coverage for the critical proctor attendance journey

**Interfaces:**

- Consume the three API endpoints from Task 4 through a typed service adapter.
- Keep camera decoding inside `QrScanModal`; send only the decoded token to the backend over the authenticated request.

- [ ] Write failing service tests for roster mapping, manual record requests, QR requests, duplicate results, conflicts, and session-closed errors.
- [ ] Replace mock/local-storage attendance authority with server roster/state while preserving loading, empty, error, permission-denied, responsive, keyboard, and camera-fallback states.
- [ ] Require the current server version in every write and replace the row from the returned server state after success or conflict.
- [ ] Remove claims that the page is an unconnected desktop/mobile preview once the backend integration is deployed.
- [ ] Add Playwright coverage for assigned roster access, QR/manual marking, stale conflict reconciliation, and session-closed rejection.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and the focused Playwright journey.

---

### Task 6: Retire the legacy raw-token path safely

**Files:**

- Modify: `backend/apps/attendance/urls.py`
- Modify: `backend/apps/attendance/views.py`
- Modify: `backend/apps/attendance/services.py`
- Create: a separately reviewed cleanup migration only after production data assessment
- Modify: attendance API tests and `docs/api/API-ENDPOINTS.md`

- [ ] Confirm no deployed client calls `/api/v1/attendance/scan/` and inventory legacy `ExamPermit`/`AttendanceRecord` row counts without logging tokens or personal data.
- [ ] Define an explicit mapping/export/disposal decision for legacy rows; do not infer new assignments from copied room/seat strings.
- [ ] Remove the legacy route and raw-token service only after the web endpoints are deployed and monitored.
- [ ] Generate a separate reversible cleanup migration; never fold destructive cleanup into `0002_session_attendance_schema`.
- [ ] Verify safe rollback and document whether raw-token columns were removed, irreversibly digested, or retained under restricted access based on the approved data decision.

---

## Future PWA option

A future PWA project may add a browser queue and batch transport around `record_attendance`, reusing `client_instance_id`, `client_event_id`, and `sync_batch_id`. It requires a separate design for clock trust, queue encryption, retention, logout cleanup, batch limits, and per-item reconciliation. It must not default to trusting `client_recorded_at` for `PRESENT`/`LATE` classification or authorization.

## Verification gate

Before handoff completion, run the relevant focused tests plus the full backend suite, frontend test/lint/build, and critical Playwright journey. Report exact commands and results, including the two currently known stale Results boundary failures unless they have been corrected independently with reviewed scope.
