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

/**
 * Fills in a deterministic `qrCode` for any record that doesn't already have one.
 *
 * `ProctorAttendance.tsx`'s roster is hydrated from a `localStorage` key shared with
 * `ProctorSchedule.tsx`, which has its own unsynchronized `StudentPC` type with no `qrCode`
 * field. Visiting Exam Schedule before Attendance leaves that room's persisted roster with
 * no `qrCode` on any record. Running this on every read (regardless of which page last wrote
 * the shared key) closes that gap without needing to touch `ProctorSchedule.tsx`.
 */
export function backfillQrCode<T extends { id: string; qrCode?: string }>(
  students: T[],
): (T & { qrCode: string })[] {
  return students.map((student) => ({
    ...student,
    qrCode: student.qrCode ?? `SAMPLE_QR_${student.id}`,
  }));
}

/**
 * Grace period (in minutes) after a schedule's start within which a scan still counts as
 * Present rather than Late. This is a client-side-only value for this preview — there is no
 * existing platform-wide attendance rule to reuse (see the design doc's "Grace-period rule"
 * section). Confirmed with the user at 30 minutes.
 */
export const DEFAULT_LATE_GRACE_MINUTES = 30;

/** Parses a mock schedule's `date` ('YYYY-MM-DD') + `time` ('hh:mm AM/PM') fields into a Date. */
export function resolveScheduledStart(schedule: { date: string; time: string }): Date {
  const [, hoursRaw, minutesRaw, meridiem] = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(schedule.time) ?? [];
  let hours = Number(hoursRaw) % 12;
  if (meridiem?.toUpperCase() === 'PM') hours += 12;

  const [year, month, day] = schedule.date.split('-').map(Number);
  return new Date(year, month - 1, day, hours, Number(minutesRaw));
}

/** A scan at or before `scheduledStart + graceMinutes` is Present; after that, Late. */
export function computeScanStatus(scheduledStart: Date, scannedAt: Date, graceMinutes: number): 'PRESENT' | 'LATE' {
  const graceDeadline = scheduledStart.getTime() + graceMinutes * 60_000;
  return scannedAt.getTime() <= graceDeadline ? 'PRESENT' : 'LATE';
}

/**
 * Formats how far past `graceDeadline` a Late scan landed, e.g. "1 hr 30 min late". Rolls up
 * into days once the gap exceeds 24 hours — the mock schedules are fixed dates that fall
 * further into the past every day, so an hours-only format on a live scan quickly turns into
 * an unreadable "1273 hr 18 min late".
 */
export function formatLateDuration(graceDeadline: Date, scannedAt: Date): string {
  const totalMinutes = Math.floor((scannedAt.getTime() - graceDeadline.getTime()) / 60_000);
  if (totalMinutes < 1) return 'just now';

  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const dayLabel = days === 1 ? '1 day' : `${days} days`;
    return hours === 0 ? `${dayLabel} late` : `${dayLabel} ${hours} hr late`;
  }

  if (totalHours === 0) return `${minutes} min late`;
  if (minutes === 0) return `${totalHours} hr late`;
  return `${totalHours} hr ${minutes} min late`;
}
