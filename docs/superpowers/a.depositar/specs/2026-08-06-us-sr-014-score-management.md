# US-SR-014 Score Management Specification

Date: 2026-08-06
Owner: A.Depositar
Status: Product-level specification; implementation is partial

## User Story

As a System Admin, I want to review, manage, and publish finalized examination results after they have been approved through the Exam Review module, so that official examination results are securely processed, ranked, and released to authorized recipients.

## Scope

Score Management is accessible only to the System Admin. It manages finalized examination results after approval through the Exam Review module.

The module must support:

- receiving approved examination records from Exam Review;
- locking approved score records against further modification;
- reviewing approved examination records;
- initiating score processing for a closed examination session;
- computing percentile rank and overall rank by configured ranking population;
- updating official examination result details for Score Management and Application Review display;
- searching, filtering, reviewing, exporting, and publishing finalized examination results;
- keeping examination scores read-only inside Score Management;
- recording processing, publication, export, synchronization, and distribution activity in the audit log.

## Current Implementation Status

Implemented in the current repository:

- System Admin-only Score Management backend endpoints.
- Score batch listing.
- Backend-owned score processing.
- Competition ranking using `1, 2, 2, 4` ranking behavior.
- Percentile calculation within each ranking population.
- Ranking populations for equivalent regular exam sets and separate PWD/demo populations.
- Read-only candidate score result listing.
- Search, release-status filter, sort, and pagination.
- Candidate detail lookup anchored to the selected score record.
- Batch release that marks processed approved scores as released.
- Student release availability email after Score Management release. The email does not contain score values and links students to the Student Portal results page.
- CSV export of processed approved score results.
- Synthetic Score Management seed data with at least three demo batches.

Partially implemented or future work:

- Partial: automatic transfer from Exam Review into Score Management is not complete. Current demo data is seed-backed, and Exam Review finalization does not yet create Score Management rows.
- Production rehearsal required: hard locking during a live processing job is simulated by synchronous processing rules; production queue/worker locking remains unverified.
- Post-demo implementation plan required: synchronization of official score results back into Application Review storage is not complete. Current candidate detail can display score-anchored application context, but it does not persist official score fields into Application Review records.
- Blocked by external contract: publication currently releases results inside Score Management, makes them exportable, and sends student availability emails when a matching application email exists. Student Portal result display and school/government distribution remain separate downstream work.
- Post-demo implementation plan required: full audit coverage for processing started, failed, export, synchronization, and distribution events is not complete.
- Production rehearsal required: the official University of the Philippines ranking methodology must be confirmed before production use.

## Preconditions

Before processing, the system verifies that:

- the examination session exists;
- the examination session is closed;
- approved examination scores are available from Exam Review or the approved score source;
- the session has not already been processed, unless reprocessing is explicitly allowed.

If any validation fails, processing is aborted and no ranking updates are committed.

## Module Logic

### Step 1 - Retrieve Approved Scores

When the System Admin selects an examination session and clicks **Process Scoring**, the system retrieves all approved examination records belonging to that session.

Example:

| Candidate ID | Candidate | Exam Set | Raw Score | Final Score |
| --- | --- | --- | --- | --- |
| PHL-001 | Juan Dela Cruz | ES-BP0001 | 190/200 | 92.3 |
| PHL-002 | Maria Santos | ES-BP0002 | 182/200 | 88.4 |

Rules:

- Only approved answer sheets are included.
- Rejected or pending records are ignored.
- Scores are treated as read-only.

### Step 2 - Lock Records

The system locks all retrieved candidate score records during processing.

During processing:

- candidate scores cannot be edited;
- no additional Exam Review approvals can be synchronized into the active processing batch;
- release status cannot be modified.

Purpose: prevent inconsistent rankings while calculations are running.

### Step 3 - Build Ranking Population

The system groups candidates into ranking populations.

Regular exam sets with equivalent difficulty belong to the same ranking population:

```text
Regular Exam
|-- Exam Set A
|-- Exam Set B
|-- Exam Set C
`-- Exam Set D

Total Candidates = 200,000
```

If a separate examination is administered with different content, such as a PWD-specific examination, it becomes a separate ranking population:

```text
Regular Examination
200,000 candidates

PWD Examination
3,200 candidates
```

Ranking and percentile are calculated independently for each population.

### Step 4 - Sort Scores

Within each ranking population, the system sorts candidates by final score in descending order.

Example:

| Candidate | Final Score |
| --- | --- |
| A | 98.2 |
| B | 96.5 |
| C | 96.5 |
| D | 95.9 |

### Step 5 - Compute Overall Rank

The system assigns overall rank after sorting.

Default rule: competition ranking, where tied scores receive the same rank and the next rank skips positions.

Example:

| Candidate | Score | Rank |
| --- | --- | --- |
| A | 98.2 | 1 |
| B | 96.5 | 2 |
| C | 96.5 | 2 |
| D | 95.9 | 4 |

The final production ranking methodology must be confirmed with the examination authority. Until confirmed, competition ranking is the working rule.

### Step 6 - Compute Percentile

The system computes each candidate's percentile within the same ranking population.

Working formula:

```text
Percentile = (Number of candidates scoring lower / Total candidates) * 100
```

Example:

| Candidate | Rank | Percentile |
| --- | --- | --- |
| A | 1 | 99.99 |
| B | 2 | 99.98 |
| C | 2 | 99.98 |
| D | 4 | 99.96 |

The final production percentile formula must be confirmed with the examination authority.

### Step 7 - Update Candidate Records

After processing, each candidate score record contains:

| Candidate ID | LRN ID | Candidate Name | Assigned Exam Set | Raw Score | Final Score | Percentile | Overall Rank | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PHL-2026-AF3VGA | 109326567778 | Juan Dela Cruz | ES-BP0001-2027A | 190/200 | 92.3 | 99.1 | 3 | Not released |

The system records:

- assigned exam set;
- raw score;
- final examination score;
- percentile rank;
- overall rank;
- processing timestamp;
- processed by;
- processing batch ID.

The records remain in **Not Released** status until the System Admin explicitly publishes the examination results.

### Step 8 - Publish Results

When the System Admin publishes finalized results, the system updates the examination result status to **Released** and records publication metadata.

Publication must record:

- publication status;
- publication date and time;
- publishing user;
- published candidate count;
- target recipients selected by the System Admin.

Recipient targets are:

- students;
- schools;
- government agencies.

Student, school, and government distribution contracts remain TBD until the Results Release and System Integration modules define their receiving endpoints and access rules.

## Process Flow

### System

1. Receive approved examination records from the Exam Review module.
2. Transfer approved examination records to Score Management.
3. Lock approved examination records against further modification.
4. Wait for the System Admin to initiate **Process Scoring**.
5. Validate the selected examination session and approved examination records.
6. Compute overall rankings and percentile rankings for eligible candidates.
7. Update Score Management and Application Review display data with official examination result details:
   - assigned exam set;
   - final examination score;
   - percentile rank;
   - overall ranking.
8. Wait for the System Admin to publish examination results.
9. Update examination result status to **Released** and record publication date and time.

### System Admin

1. Open the Score Management module.
2. View approved examination records.
3. Search and filter examination results.
4. Select an examination session.
5. Click **Process Scoring**.
6. Review computed examination scores, percentile rankings, and overall rankings.
7. Publish examination results and select recipient targets: students, schools, and/or government agencies.
8. Export examination results when required.

## Acceptance Criteria

| ID | Acceptance Criteria | Current Status |
| --- | --- | --- |
| AC-01 | Given examination scores have been approved in Exam Review, when the approved records are transferred to Score Management, then the system shall automatically lock the examination records against further modification. | Partial: score rows are read-only in Score Management; automatic Exam Review transfer requires a post-demo implementation plan and production lock behavior requires rehearsal. |
| AC-02 | Given approved examination records are available in Score Management, when the System Admin initiates ranking computation, then the system shall compute each candidate's percentile rank and overall ranking using the configured University of the Philippines methodology. | Production rehearsal required: backend computes rank and percentile with the working formula; official UP methodology confirmation remains required before production use. |
| AC-03 | Given students may take different examination sets within the same examination group, when ranking computation is performed, then the system shall calculate percentile rankings using the configured examination population. | Implemented for configured ranking populations. |
| AC-04 | Given ranking computation has been completed, when examination results are finalized, then the system shall update the candidate's Application Review record with assigned exam set, final score, percentile rank, and overall rank. | Post-demo implementation plan required: score-anchored application display exists; persistent Application Review synchronization storage and field mapping remain unapproved. |
| AC-05 | Given finalized examination results are available, when the System Admin opens Score Management, then the system shall display assigned exam set, final score, percentile rank, overall rank, and publication status for each candidate. | Implemented for Score Management result rows. |
| AC-06 | Given finalized examination results are available, when the System Admin searches or filters examination records, then the system shall display only matching records. | Implemented. |
| AC-07 | Given finalized examination results are ready for release, when the System Admin publishes results, then the system shall update publication status and make official results available to authorized recipients. | Blocked by external contract: Score Management release status and student availability notification are implemented; downstream recipient distribution remains outside this sprint. |
| AC-08 | Given examination results have been published, when the System Admin views examination records, then the system shall display publication status, publication date, publication time, and publishing user. | Partial: release status and audit row exist; publication metadata display requires UI/API confirmation. |
| AC-09 | Given an approved examination record exists in Score Management, when the System Admin attempts to modify the examination score in Exam Review, then the system shall prevent direct modification of the approved examination score. | Post-demo implementation plan required: Score Management is read-only; Exam Review-to-Score Management lock integration remains unapproved. |
| AC-10 | Given the System Admin requests an export of examination results, when export completes, then the system shall generate a downloadable report containing finalized examination results. | Implemented as CSV export for processed approved scores. |

## Business Rules

| ID | Business Rule | Current Status |
| --- | --- | --- |
| BR-01 | Only examination scores approved through Exam Review shall be forwarded to Score Management. | Partial: domain behavior supports approved scores; automatic forwarding requires a post-demo implementation plan. |
| BR-02 | Score Management shall be accessible only to authorized System Administrators. | Implemented. |
| BR-03 | Upon transfer to Score Management, the system shall automatically lock approved records against further modification. | Partial. |
| BR-04 | Percentile and overall rankings shall be computed only when initiated by the System Admin. | Implemented. |
| BR-05 | Percentile ranks shall be calculated using the configured percentile ranking methodology and applicable examination population. | Production rehearsal required: implemented with working formula; final authority confirmation remains required before production use. |
| BR-06 | Overall rankings shall be generated using the configured ranking methodology. | Production rehearsal required: implemented with competition ranking; final authority confirmation remains required before production use. |
| BR-07 | After ranking computation is completed, the system shall synchronize official examination results to the candidate's Application Review record. | Post-demo implementation plan required. |
| BR-08 | Examination scores, percentile rankings, and overall rankings shall be read-only within Score Management. | Implemented. |
| BR-09 | Only the System Admin may publish official examination results to students, schools, and government agencies. | Blocked by external contract: System Admin release exists; school and government distribution contracts remain undefined. |
| BR-10 | Published examination results shall include publication status, publication date, publication time, and publishing user. | Partial. |
| BR-11 | The System Admin may export finalized examination results for authorized reporting purposes. | Implemented. |
| BR-12 | Every ranking computation, synchronization to Application Review, publication, export, and distribution activity shall be recorded in the audit log. | Post-demo implementation plan required for expanded audit coverage. |

## Audit Log Events

| Audit Event | Trigger | Data to Capture | Current Status |
| --- | --- | --- | --- |
| Score Processing Started | System Admin clicks Process Scoring | Actor, Examination Session ID, Processing Batch ID, Total Candidate Count, Timestamp | Partial: processing batch stores processing metadata; explicit started audit event requires confirmation. |
| Score Processing Completed | System computes rankings and percentiles | Processing Batch ID, Processed Record Count, Duration, Timestamp | Partial: processing batch stores completed metadata. |
| Score Processing Failed | Processing terminates due to validation or system error | Processing Batch ID, Failure Reason, Failed Record Count if applicable, Timestamp | Post-demo implementation plan required. |
| Results Released | System Admin publishes examination results | Actor, Examination Session ID, Published Candidate Count, Timestamp | Implemented through release audit row. |
| Score Reprocessing Initiated | System Admin initiates reprocessing after approved correction | Actor, Examination Session ID, Previous Processing Batch ID, New Processing Batch ID, Reason, Timestamp | Partial: reprocessing can be allowed before release; reason/audit details remain TBD. |
| Results Exported | System Admin exports examination results | Actor, Examination Session ID, Export Format, Exported Record Count, Timestamp | Post-demo implementation plan required. |
| Results Distributed | System distributes published results to selected recipients | Actor/System, Examination Session ID, Recipient Type, Distributed Count, Failure Count, Timestamp | Blocked by external contract. |

## User-Facing Dialogs And Status Messages

| Action | Validation Title | Information | Buttons |
| --- | --- | --- | --- |
| Process Scoring | Process Examination Scores? | This will compute the overall rankings and percentile scores for all approved candidates in the selected examination session. During processing, candidate records will be locked and cannot be modified until processing is complete. Do you want to continue? | Cancel, Process Scoring |
| Release Results | Release Examination Results? | The examination results will become visible to selected eligible recipients. This action affects all candidates in the selected examination session. Do you want to continue? | Cancel, Release Results |
| Reprocess Scoring | Reprocess Examination Scores? | Reprocessing will recalculate rankings and percentile scores for all candidates in this examination session. Previously computed rankings will be replaced. Do you want to continue? | Cancel, Reprocess |

## Backend Roles And Permissions

Legend:

- R: Read
- W: Write/manage workflow action
- E: Export
- D: Delete
- A: Approve/publish
- RJ: Reject

| Role | R | W | E | D | A | RJ |
| --- | --- | --- | --- | --- | --- | --- |
| Student |  |  |  |  |  |  |
| Admission Reviewer |  |  |  |  |  |  |
| Proctor |  |  |  |  |  |  |
| Proctor Admin |  |  |  |  |  |  |
| University Admin |  |  |  |  |  |  |
| Testing Center Admin |  |  |  |  |  |  |
| Exam Admin |  |  |  |  |  |  |
| CHED Admin |  |  |  |  |  |  |
| DepEd Admin |  |  |  |  |  |  |
| TESDA Admin |  |  |  |  |  |  |
| Executive |  |  |  |  |  |  |
| System Admin | Yes | Yes | Yes |  | Yes |  |

## API Contract Reference

Current Score Management endpoints:

- `GET /api/v1/results/score-management/batches/`
- `POST /api/v1/results/score-management/batches/{sessionId}/process/`
- `GET /api/v1/results/score-management/batches/{sessionId}/results/`
- `GET /api/v1/results/score-management/batches/{sessionId}/results/{candidateId}/profile/`
- `POST /api/v1/results/score-management/batches/{sessionId}/release/`
- `GET /api/v1/results/score-management/batches/{sessionId}/export/`

## Open Decisions

- Confirm the official ranking methodology from the examination authority or University of the Philippines.
- Confirm the official percentile formula and rounding precision.
- Define the Exam Review-to-Score Management transfer contract.
- Define the exact locking behavior while processing is active.
- Define Application Review synchronization fields and storage location.
- Define student, school, and government recipient distribution contracts.
- Define whether publication can target only selected recipient groups or must always release to all eligible recipients.
- Define audit log storage for export, failed processing, synchronization, and distribution events.
- Define production async processing and retry behavior for large sessions.

