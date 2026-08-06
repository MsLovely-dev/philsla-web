/**
 * Pure QR-scan matching logic for the proctor attendance prototype.
 *
 * Deliberate design decision (see `.superpowers/sdd/2026-08-05-qr-scanning-plan/global-constraints.md`):
 * matches are a direct lookup against `StudentPC.qrCode` for the current room's roster only.
 * There is no cross-table join against any other mock dataset (e.g. `ExamPermitPage.tsx`'s
 * `permits` array) — do not add one.
 */

/**
 * Minimal shape this service needs from `StudentPC` (defined locally in
 * `frontend/src/pages/proctor/ProctorAttendance.tsx`, which does not export it).
 * Any object with at least these fields — including a full `StudentPC` — is assignable here.
 */
export interface ScannableStudent {
  id: string;
  name: string;
  attendance: 'Present' | 'Absent' | 'Late' | 'Pending' | 'Technical Issue';
  qrCode: string;
}

/**
 * Matches a scanned QR value against a room's student roster.
 *
 * - Case-sensitive exact match against `qrCode` only; no normalization.
 * - Returns the matching student object, or `null` if no student in `students` has a
 *   matching `qrCode` (including when `students` is empty).
 * - Does NOT check `attendance` — callers are responsible for deciding what to do when the
 *   matched student is already `'Present'`.
 */
export function matchScannedCodeToStudent<T extends ScannableStudent>(
  qrValue: string,
  students: T[],
): T | null {
  const match = students.find((student) => student.qrCode === qrValue);
  return match ?? null;
}
