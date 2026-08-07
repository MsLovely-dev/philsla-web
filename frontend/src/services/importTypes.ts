import type { ServiceFailure, ServiceResult } from './serviceResult';

/** A single parsed CSV row: field key -> cell value (empty cells omitted). */
export type ImportRow = Record<string, string>;

/** One failed row from an atomic bulk import. `row` is the 0-based data-row index. */
export interface ImportRowError {
  row: number;
  fields: Record<string, string[]>;
}

/** Successful bulk-import outcome: how many rows were created. */
export interface ImportSummary {
  created: number;
}

/**
 * Pull the per-row error report the backend attaches under `error.meta.rows`
 * (see `apps.core.imports.ImportValidationError`) off a failed `ServiceResult`.
 * Returns an empty array for success or for a non-validation failure that has no
 * row report (e.g. a network error) — callers show `error.message` in that case.
 */
export function importErrorsFromResult(result: ServiceResult<unknown>): ImportRowError[] {
  if (result.ok) return [];
  const rows = ((result as ServiceFailure).error.meta as { rows?: unknown } | undefined)?.rows;
  if (!Array.isArray(rows)) return [];
  return rows.map((entry) => {
    const record = entry as { row?: unknown; fields?: unknown };
    return {
      row: typeof record.row === 'number' ? record.row : 0,
      fields: normalizeFields(record.fields),
    };
  });
}

function normalizeFields(fields: unknown): Record<string, string[]> {
  if (!fields || typeof fields !== 'object') return {};
  return Object.fromEntries(
    Object.entries(fields as Record<string, unknown>).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(String) : [String(value)],
    ]),
  );
}
