# Business Requirements Document (BRD)
## Module: QR Scan for Attendance — Testing Center Ops

**Date:** 2026-08-05
**Owner:** Joshua Ganapin (Jo.Ganapin)
**Parent doc:** [`docs/BRD.md`](../../../BRD.md) (platform-wide BRD, section 4.3 "Check-in: Use QR codes to mark who is present")
**Related:** [Ticket 001](../jo.ganapin.task.md#ticket-001--qr-scanning-testing-center-ops) · [Design spec](../specs/2026-08-05-qr-scanning-design.md) · [Phasing plan](../plans/2026-08-05-qr-scanning-plan.md)

---

### 1. Module Overview

Today, marking a candidate "Present" at a test center is entirely manual: a proctor looks at a roster on screen and clicks a button per student. This module replaces that manual step with a **QR scan**: the proctor points a camera at the candidate's exam permit, the code is read, and the matching candidate's status flips to Present automatically.

This BRD covers the QR check-in feature end to end, from the small in-browser demo already agreed for this sprint, up to the full backend-connected version the platform BRD promises. It exists as one document across both phases so nobody has to guess whether "QR scanning" means the same thing in different meetings.

### 2. Goals

- **Faster check-in**: One scan instead of a manual search-and-click per candidate, especially valuable when a room has to seat dozens of people quickly.
- **Fewer mistakes**: Removes the chance a proctor marks the wrong row Present by matching on the ID encoded in the candidate's own permit.
- **A real permit, not just a picture**: Every issued permit gets one unique, unguessable code (`qr_token`) tied to exactly one candidate, one exam date, one seat — the same code cannot be reused to check in twice from a fresh state.
- **An audit trail**: Every successful scan is a timestamped record of who scanned it and when, not just a status flag.
- **Ship a demo first, ship it right second**: Prove the scan-and-match interaction works in front of users this sprint, without waiting on backend integration to show something real.

### 3. People Using the Module

| Role | What they do here |
| :--- | :--- |
| **STUDENT / CANDIDATE** | Receives their exam permit (with QR code) ahead of test day; presents it at the door. |
| **PROCTOR** | Scans each candidate's permit at check-in; sees the match result and the roster update live. |
| **SYSTEM_ADMIN** | Same scan access as a Proctor (for support/override situations); manages permit issuance and can void/reissue a permit if one is lost or compromised. |

No other role can call the scan endpoint or open the scan screen — this is deliberately locked to the two roles above (see Section 6).

### 4. What the Module Does

#### 4.1. Phase 1 — Prototype demo (this sprint, approved scope)

- A "Scan QR" button on the proctor's existing attendance screen opens a camera modal.
- The camera reads a QR code and checks it against the candidates already listed for that room.
- A match flips that candidate's row to Present using the exact same update the manual "Mark Present" button already uses — no new, parallel status logic.
- If the code doesn't match anyone in the room, or the candidate is already marked Present, the proctor sees a plain inline message and nothing changes.
- Clearly labeled on screen as a **prototype, not wired to a real backend** — every match happens against sample data already in the browser, and nothing is sent to a server.
- If the camera can't be used (no permission, no hardware), a manual code-entry fallback exists so a live demo is never blocked by a device issue.

**What this phase deliberately does not do:** no backend call, no new database record, no change to the permit-issuing flow. It answers one question only — "does scan-and-match work as an interaction?" — as cheaply and safely as possible before anyone invests in the backend.

#### 4.2. Phase 2 — Backend-connected version (roadmap)

- Every approved candidate gets one **exam permit** record with a unique code embedded in their QR — generated when the permit is issued, not guessable, and not reused across candidates or exam dates.
- Scanning a permit calls a real check-in endpoint that:
  - Confirms the code belongs to a real, still-valid permit.
  - Records who scanned it and when.
  - Flips the permit to "checked in" so it cannot be used to check in a second time from a fresh device or session.
- A **second scan of the same permit is not treated as an error** — it's reported back as "already checked in," since a proctor accidentally re-scanning the same permit is a normal, harmless mistake, not a security event.
- A permit can be marked **void** (lost, reissued, candidate withdrawn) so a voided code can never check anyone in, even if someone still has the physical printout.
- This phase is what the platform-wide BRD (`docs/BRD.md`, section 4.3) refers to as "Check-in: Use QR codes to mark who is present" — Phase 1 is the rehearsal, Phase 2 is the real thing.

### 5. Business Rules

- Attendance status values produced by a scan must stay consistent with the platform's existing status codes (Present / Absent / Late / Disqualified) — a scan is just a faster way to reach the same "Present" outcome a proctor could always reach manually, not a new status.
- A successful scan is one candidate, one seat, one room, one exam date — no code is valid across multiple exam sessions.
- Re-scanning an already-checked-in permit must never look like a system error to the proctor; it's an expected, informative no-op.

### 6. Security & Compliance

- **Role lock:** only Proctor and System Admin accounts can reach the scan action, on either phase, matching the same restriction already used on other proctor-only tools.
- **No silent identity verification:** the module confirms "this code matches this permit," not "this person is who they claim to be." It must never be presented to candidates, staff, or auditors as identity verification.
- **Camera privacy (Phase 1):** video is processed in-memory only, on-device, never recorded, stored, or uploaded; the camera stream stops the instant the scan screen closes.
- **No real candidate data in the demo:** Phase 1 matches only against synthetic, clearly-fake sample records — never real candidate names, IDs, or permits.
- **Permit codes (Phase 2):** must be long enough and random enough that guessing a valid code by trial and error is impractical.

### 7. Current Status & Open Issue

- Phase 1 (client-side demo) is **designed but not yet approved to build** — the linked spec and plan are both awaiting sign-off, and no phase of that plan may start before that happens.
- A full Phase-2-shaped backend app (permit model, check-in endpoint, migrations) already exists uncommitted in this branch's working tree, ahead of any recorded approval for backend work under this ticket. This BRD treats that work as the intended Phase 2 described above, but **it has not gone through the same design-approval gate Phase 1 is waiting on** — flagging this here so scope and sequencing get reconciled deliberately rather than by accident.

### 8. Tools We Use

- **Phase 1:** `html5-qrcode` (camera decode) in the existing React/Vite frontend — decode only, no new backend dependency.
- **Phase 2:** Django app (`apps.attendance`) with its own models and migrations, exposed at `api/v1/attendance/`, reusing the platform's existing session/bearer authentication and role system.

### 9. What is Not Included (Yet)

- No printing or email delivery of permits from this module (permit generation/delivery is a separate, already-noted feature area — see the model's own note that "whoever builds the web-side permit generator/email feature" owns that part).
- No offline check-in (Phase 2 requires connectivity to reach the backend).
- No cross-device "undo" of a check-in from the scan screen itself — corrections go through the same correction flow already used for manual attendance changes.

### 10. Future Plans

- Tie a voided/reissued permit notification back to the candidate automatically.
- Explore batch/offline check-in for test centers with unreliable connectivity.
- Surface check-in analytics (on-time vs. late arrivals by center) to the reporting dashboards described in the platform-wide BRD.
