# Attendance Session Schema Design

**Date:** 2026-08-06

**Owner:** Bienvenido Mendoza (`B.Mendoza`)

**Status:** Implemented — awaiting code review
**Scope:** Django models, additive migration, schema safeguards, model/migration tests, and admin protection only

## Intent

Replace the current permit-level scan persistence with a session-scoped attendance schema that can support the PhilSA web app as the authoritative attendance client. The schema must preserve current state, immutable event history, proctor assignment, secure permit lookup, seat uniqueness, and optimistic concurrency without implementing the API or frontend in this change.

The initial web workflow is online-only. The event schema retains optional client idempotency metadata so a separately reviewed PWA/offline transport can reuse the same persistence model later. This change does not implement a PWA, service worker, browser queue, offline batch endpoint, or device provisioning.

## Existing entities reused

- `applications.StudentApplication` is the candidate identity source. `candidate_id` remains the public candidate identifier; the new assignment stores a foreign key to the application rather than copying identity fields.
- `results.ExaminationSession` remains the overall examination/scoring session. It is not expanded with room or attendance fields.
- Django's configured user model remains the actor/proctor identity. Role and room-session authorization are application-service concerns because database constraints cannot inspect `accounts.AccountProfile.role` safely across tables.
- `attendance.ExamPermit` and `attendance.AttendanceRecord` remain unchanged as deprecated legacy structures. Their existing rows do not contain reliable foreign keys to a candidate application or scheduled room session and cannot be converted safely.

## Ownership boundary

`attendance.RoomSession` is the scheduled physical sitting: one room, one start, one late cutoff, and one end. It links to the broader `results.ExaminationSession`. One overall examination session may therefore have many physical room sessions.

All new room, proctor assignment, candidate assignment, permit credential, attendance state, and attendance event models belong to `apps.attendance`. This is the smallest coherent change and avoids coupling exam-day operations to score processing.

## Entity relationship diagram

```mermaid
erDiagram
    RESULTS_EXAMINATION_SESSION ||--o{ ROOM_SESSION : "groups physical sittings"
    EXAM_ROOM ||--o{ ROOM_SESSION : "hosts"
    AUTH_USER ||--o{ ROOM_SESSION_PROCTOR_ASSIGNMENT : "is assigned"
    ROOM_SESSION ||--o{ ROOM_SESSION_PROCTOR_ASSIGNMENT : "has proctors"
    STUDENT_APPLICATION ||--o{ CANDIDATE_SESSION_ASSIGNMENT : "identifies candidate"
    ROOM_SESSION ||--o{ CANDIDATE_SESSION_ASSIGNMENT : "has roster"
    CANDIDATE_SESSION_ASSIGNMENT ||--o{ PERMIT_CREDENTIAL : "has revocable credentials"
    CANDIDATE_SESSION_ASSIGNMENT ||--|| ATTENDANCE_STATE : "has current state"
    ROOM_SESSION ||--o{ ATTENDANCE_STATE : "supports indexed status lookup"
    CANDIDATE_SESSION_ASSIGNMENT ||--o{ ATTENDANCE_EVENT : "has immutable history"
    AUTH_USER ||--o{ ATTENDANCE_STATE : "last recorded by"
    AUTH_USER ||--o{ ATTENDANCE_EVENT : "acted"

    EXAM_ROOM {
        uuid id PK
        string test_center
        string code
        string name
        string location
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    ROOM_SESSION {
        uuid id PK
        string examination_session_id FK
        uuid room_id FK
        datetime starts_at
        datetime late_after_at
        datetime ends_at
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    ROOM_SESSION_PROCTOR_ASSIGNMENT {
        uuid id PK
        uuid room_session_id FK
        bigint proctor_id FK
        datetime assigned_at
        datetime revoked_at
    }

    CANDIDATE_SESSION_ASSIGNMENT {
        uuid id PK
        uuid candidate_id FK
        uuid room_session_id FK
        string seat_label
        boolean is_active
        datetime revoked_at
        datetime created_at
        datetime updated_at
    }

    PERMIT_CREDENTIAL {
        uuid id PK
        uuid assignment_id FK
        string token_digest UK
        boolean is_active
        datetime issued_at
        datetime expires_at
        datetime revoked_at
    }

    ATTENDANCE_STATE {
        uuid assignment_id PK_FK
        uuid room_session_id FK
        enum status
        datetime recorded_at
        enum source
        bigint recorded_by_id FK
        string last_client_instance_id
        uuid last_client_event_id
        integer version
        datetime created_at
        datetime updated_at
    }

    ATTENDANCE_EVENT {
        uuid id PK
        uuid assignment_id FK
        enum requested_status
        enum previous_status
        enum resulting_status
        enum event_type
        enum source
        enum outcome
        bigint actor_id FK
        string client_instance_id
        uuid client_event_id
        uuid sync_batch_id
        datetime client_recorded_at
        datetime server_received_at
        string correction_reason
        integer resulting_version
    }
```

`AttendanceState.room_session` deliberately duplicates the room-session relationship reachable through its assignment. This denormalization supports the required composite index on room session plus current status. The future write service must populate it from `assignment.room_session` and reject mismatches; ordinary clients must never set it directly.

## Model definitions and invariants

### `ExamRoom`

Stores physical room metadata until a canonical testing-center model exists. `test_center` is a nonblank bounded string, not a new testing-center identity. `code` and `name` are nonblank. A functional unique constraint on lowercase `test_center` plus lowercase `code` prevents duplicate room codes within the same center. `location` is optional display metadata. Deactivation preserves history.

### `RoomSession`

Links one `ExamRoom` to one `results.ExaminationSession`. `starts_at`, `late_after_at`, and `ends_at` are timezone-aware Django datetimes stored in UTC under the repository's existing `USE_TZ=True` setting. Database checks enforce:

- `starts_at < ends_at`
- `starts_at <= late_after_at`
- `late_after_at <= ends_at`

The server will eventually classify an online QR event received at or before `late_after_at` as `PRESENT`, and one received afterward as `LATE`. No hard-coded grace period is introduced.

### `RoomSessionProctorAssignment`

Links the configured Django user model to a room session. A conditional unique constraint allows at most one non-revoked assignment for the same proctor and room session while preserving revoked history. The database does not assert that the user currently has the `PROCTOR` role; the future authorization service must deny by default unless both role and active room-session assignment are valid.

### `CandidateSessionAssignment`

Links a `StudentApplication` to the physical `RoomSession` and stores the preassigned seat label. The foreign key uses `PROTECT` so candidate/session history cannot be cascaded away. Constraints enforce:

- one active assignment per candidate and physical room session;
- nonblank seat labels through a database check equivalent to `Length(Trim(seat_label)) > 0`;
- case-insensitive unique active seat labels within the room session.

An additional consistency check prevents a row marked active from also carrying a revocation timestamp.

Inactive/revoked rows remain for history. Candidate eligibility and approved-application status remain future service checks because cross-table status rules cannot be represented as portable database checks.

### `PermitCredential`

Stores a unique fixed-length SHA-256 digest of a cryptographically random, high-entropy permit token. The raw QR payload is never stored by this model. A conditional unique constraint permits only one active credential per assignment; rotation and revocation preserve older credential rows. `expires_at` and `revoked_at` are nullable, while `issued_at` is server-generated.

A consistency check prevents a credential marked active from also carrying a revocation timestamp.

Hashing a random 256-bit token is sufficient for lookup without making a predictable candidate/session identifier reusable. Token creation and one-time raw-token delivery are outside this schema-only change.

### `AttendanceState`

Uses the candidate assignment as its one-to-one primary key. Status choices are `UNMARKED`, `PRESENT`, `LATE`, and `ABSENT`; the default is `UNMARKED`. `recorded_at`, `source`, and `recorded_by` are nullable for an unmarked state. Source choices are `MANUAL`, `QR_SCAN`, and `SYNC`.

`version` starts at `0` and has a nonnegative check. A future transactional write service will lock this row, compare the expected version, append an event, and increment the state version atomically. The schema does not create state rows automatically when assignments are inserted; the future assignment workflow must create the assignment and initial state in one transaction.

The composite `(room_session, status)` index supports room-session status counts and filtering.

### `AttendanceEvent`

Uses a server-generated UUID primary key and records the attempted transition independently of the mutable state. It stores requested, previous, and resulting status separately so accepted transitions and detected conflicts are both representable. Event type choices are `MANUAL`, `QR_SCAN`, `SYNC`, and `CORRECTION`; outcome choices are `ACCEPTED`, `CONFLICT`, and `SESSION_CLOSED`. A duplicate retry returns the previously stored event and does not append a second event.

Optional client metadata consists of `client_instance_id`, `client_event_id`, `sync_batch_id`, and `client_recorded_at`. A conditional unique constraint on nonblank client instance plus client event ID supplies idempotency without requiring offline support now. `server_received_at` is server-generated and indexed with assignment for chronological audit reads. `correction_reason` is optional and bounded; the future service will require it for corrections.

Model `save()` will check Django's internal adding state and reject updates after the initial insertion; `delete()` will always reject deletion. Django admin will expose events as read-only and deny add, change, and delete actions. This protects normal ORM/admin use; database-superuser writes and bulk SQL remain an operational database-permission concern.

## Indexes and constraints

The migration will add named constraints and indexes for:

- lowercase testing center plus room code uniqueness;
- valid room-session time ordering;
- active room-session/proctor uniqueness;
- active candidate/room-session uniqueness;
- active candidate-assignment/revocation consistency;
- lowercase active seat uniqueness within a room session;
- roster lookup by `(room_session, seat_label)`;
- unique permit token digest and one active credential per assignment;
- active permit/revocation consistency;
- current attendance lookup by `(room_session, status)`;
- audit history by `(assignment, server_received_at)`;
- idempotency by `(client_instance_id, client_event_id)` when both values are supplied;
- nonnegative current and resulting state versions.

Constraint and index names will use the repository's existing concise, app-prefixed Django naming style and remain within backend identifier limits.

## Migration and legacy-data treatment

The new migration depends on `attendance.0001_initial` plus the current application and results migration leaves required by its foreign keys. It only creates new tables, constraints, and indexes. It does not drop, rename, rewrite, or backfill existing tables.

There are no existing candidate-session assignment rows to backfill as `UNMARKED`. New assignment creation must explicitly create its matching `AttendanceState(status=UNMARKED, version=0)` in the later application service.

Legacy `ExamPermit` rows contain copied candidate/room/seat strings and raw QR tokens but no authoritative application/session foreign keys. Legacy `AttendanceRecord` rows represent successful scans rather than a complete state history. Guessing relationships from those strings could attach attendance to the wrong candidate or session, so the migration leaves both tables unchanged and excludes them from the new schema.

The existing `/api/v1/attendance/scan/` path also remains unchanged in this schema-only delivery. Its deprecation, shutdown, secure raw-token disposal, and any explicitly reviewed legacy mapping belong to the downstream API migration. Until that follow-up lands, the new schema must not be described as replacing the active legacy endpoint.

## Testing and verification

Focused Django tests will prove:

- valid model metadata, relationships, choices, indexes, and defaults;
- rejection of invalid room-session time ordering;
- active candidate/session and active proctor/session uniqueness;
- case-insensitive active seat uniqueness and rejection of blank/whitespace-only seats;
- permit digest uniqueness and one-active-credential behavior;
- `UNMARKED`/version `0` current-state defaults and nonnegative versions;
- client idempotency uniqueness only when both client identifiers exist;
- attendance event update/delete rejection and admin read-only behavior;
- migration applies forward on a database containing legacy permit/scan rows without changing those rows;
- migration reverses by removing only the new tables and preserving the legacy tables and data.

Verification commands, from `backend/`, are:

```powershell
python manage.py makemigrations --check --dry-run --settings=config.settings.local
python manage.py check --settings=config.settings.local
python manage.py test apps.attendance --settings=config.settings.test
python manage.py migrate attendance 0001 --settings=config.settings.test
python manage.py migrate attendance --settings=config.settings.test
```

The exact commands actually run and their observed results will be reported. PostgreSQL-specific verification will not be claimed unless a PostgreSQL-compatible test database is available.

## Rollout and rollback

Rollout is additive:

1. Review and merge the schema migration.
2. Apply the migration using the deployment runbook's manual post-deploy migration step.
3. Deploy downstream assignment/permit issuance and attendance services only after their contract and authorization review.
4. Integrate the web attendance page after the backend contract is deployed.
5. Assess legacy data and remove the legacy endpoint/tables only through a separate reviewed migration.

Rollback before downstream services write new rows is a normal reverse migration to `attendance.0001_initial`. After new attendance data exists, rollback requires exporting or otherwise preserving those new rows before reversing because reversing the additive migration drops the seven new tables. The legacy permit and scan tables are unaffected in either direction.

## Explicit non-goals

- Attendance serializers, API views, URLs, authorization, and transactional write services.
- Frontend or browser QR integration.
- PWA installation, service workers, offline queues, offline timestamp trust, or batch synchronization.
- Candidate rescheduling.
- Permit QR generation or delivery.
- Testing-center normalization.
- Legacy attendance conversion or deletion.
- Exam-start authorization.

## Downstream handoff

After this schema is implemented and verified, a separate plan will describe authenticated proctor-only roster, manual attendance, and QR attendance services; active room-session assignment authorization; token digest validation; expected-version conflicts; session-end rejection; audit event creation; idempotent retries; legacy endpoint retirement; and later web-page integration. That plan will consume the model names and invariants defined here without expanding the schema silently.

## Implementation result

The generated migration is `attendance.0002_session_attendance_schema`. Its dependencies are:

- `applications.0014_bulk_upload_application_metadata`
- `attendance.0001_initial`
- `results.0007_scorereleasenotification`
- the configured Django user-model migration dependency

The migration contains only seven model creations plus their approved constraints and indexes. Local migration state remains at `attendance.0001_initial`; the new migration file was generated and tested but was not applied to the developer database, staging, or production.

Focused attendance verification passed 25 tests. The complete backend suite ran 436 tests with 434 passing and two unrelated, pre-existing Results boundary failures: the assertions still expect a Results model set without `ScoreReleaseNotification` and a `results.0003` migration leaf even though the repository currently implements `ScoreReleaseNotification` and `results.0007`.
