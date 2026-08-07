import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload, X } from 'lucide-react';
import { ModalShell } from '../ui/ModalShell';
import { downloadCsv, parseCsv, toCsv } from '../../services/csvExportService';
import type { ImportRow, ImportRowError } from '../../services/importTypes';

export type { ImportRow };

export interface ImportColumnOption {
  key: string;
  label: string;
  /** Required columns must be present in the file, or import is blocked. */
  required?: boolean;
}

/** Outcome the caller returns from `onImport`, rendered as the result screen. */
export interface ImportOutcome {
  ok: boolean;
  /** Rows created (success). */
  created?: number;
  /** Failure summary message. */
  message?: string;
  /** Per-row validation errors (atomic failure). */
  errors?: ImportRowError[];
}

interface ImportConfigModalProps {
  isOpen: boolean;
  title?: string;
  columns: ImportColumnOption[];
  /** Filename for the downloadable blank template. */
  templateFilename: string;
  isImporting?: boolean;
  onCancel: () => void;
  onImport: (rows: ImportRow[]) => Promise<ImportOutcome>;
}

interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: string[][];
}

const PREVIEW_ROWS = 5;

/**
 * Configures and previews a CSV bulk import before it runs: download a blank
 * template, pick/drop a file, see a parsed preview with missing-required-column
 * and unknown-column warnings, then hand the mapped rows to the caller's
 * `onImport`. Client-side parsing is usability only — the backend re-validates
 * every row and is the authority (mirrors `ExportConfigModal`'s caller-owned
 * `onExport`).
 */
export function ImportConfigModal({
  isOpen,
  title = 'Import from CSV',
  columns,
  templateFilename,
  isImporting = false,
  onCancel,
  onImport,
}: ImportConfigModalProps) {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset everything each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setParsed(null);
    setParseError(null);
    setOutcome(null);
  }, [isOpen]);

  // Match file headers to columns case-insensitively by label.
  const analysis = useMemo(() => {
    if (!parsed) return null;
    const headerIndex = new Map<string, number>();
    parsed.headers.forEach((header, i) => headerIndex.set(header.trim().toLowerCase(), i));

    const matched = columns
      .map((col) => ({ col, index: headerIndex.get(col.label.toLowerCase()) }))
      .filter((entry): entry is { col: ImportColumnOption; index: number } => entry.index !== undefined);

    const knownLabels = new Set(columns.map((c) => c.label.toLowerCase()));
    const unknownHeaders = parsed.headers.filter((h) => h.trim() !== '' && !knownLabels.has(h.trim().toLowerCase()));
    const missingRequired = columns.filter(
      (c) => c.required && !headerIndex.has(c.label.toLowerCase()),
    );

    // Build one object per data row, keyed by column.key. Empty cells are
    // omitted so optional fields fall back to backend defaults and required
    // fields surface a clear "required" error from the serializer.
    const rows: ImportRow[] = parsed.rows.map((cells) => {
      const row: ImportRow = {};
      for (const { col, index } of matched) {
        const value = (cells[index] ?? '').trim();
        if (value !== '') row[col.key] = value;
      }
      return row;
    });

    return { matched, unknownHeaders, missingRequired, rows };
  }, [parsed, columns]);

  const handleDownloadTemplate = () => {
    downloadCsv(templateFilename, toCsv(columns.map((c) => c.label), []));
  };

  const handleFile = (file: File) => {
    setOutcome(null);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { headers, rows } = parseCsv(String(reader.result ?? ''));
        if (headers.length === 0 || rows.length === 0) {
          setParsed(null);
          setParseError('That file has no data rows. Add rows under the header line and try again.');
          return;
        }
        setParsed({ fileName: file.name, headers, rows });
      } catch {
        setParsed(null);
        setParseError('Could not read that file as CSV. Export a template and match its columns.');
      }
    };
    reader.onerror = () => setParseError('Could not read that file.');
    reader.readAsText(file);
  };

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = ''; // allow re-selecting the same file after a fix
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const canImport =
    analysis !== null && analysis.rows.length > 0 && analysis.missingRequired.length === 0 && !isImporting;

  const handleImport = async () => {
    if (!analysis || !canImport) return;
    setOutcome(await onImport(analysis.rows));
  };

  const handleDownloadErrors = () => {
    if (!outcome || outcome.ok) return;
    const headers = ['Row', 'Field', 'Error'];
    const rows = (outcome.errors ?? []).flatMap((rowError) =>
      Object.entries(rowError.fields).flatMap(([field, messages]) =>
        messages.map((message) => [rowError.row + 2, field, message]),
      ),
    );
    downloadCsv(`import_errors_${templateFilename}`, toCsv(headers, rows));
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onCancel} className="max-w-lg p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-lg font-black text-philsa-navy flex items-center gap-2">
          <Upload className="w-5 h-5 text-philsa-navy" /> {title}
        </h3>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
          aria-label="Close import"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Result screen after an import attempt. */}
      {outcome ? (
        outcome.ok ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <p className="text-sm font-bold">
                Imported {(outcome.created ?? 0).toLocaleString()} row{(outcome.created ?? 0) === 1 ? '' : 's'} successfully.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onCancel}
                className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold transition-all cursor-pointer text-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div className="text-xs font-semibold space-y-1">
                <p>{outcome.message}</p>
                <p className="font-bold">Nothing was imported. Fix the file and try again.</p>
              </div>
            </div>
            {(outcome.errors ?? []).length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {(outcome.errors ?? []).map((rowError) => (
                  <div key={rowError.row} className="p-3 text-xs">
                    {/* +2: 1 for 0-based index, 1 for the header line, to match the spreadsheet row. */}
                    <div className="font-black text-philsa-navy">Row {rowError.row + 2}</div>
                    <ul className="mt-1 space-y-0.5 text-rose-700 font-medium">
                      {Object.entries(rowError.fields).flatMap(([field, messages]) =>
                        messages.map((message, i) => (
                          <li key={`${field}-${i}`}>
                            <span className="font-mono text-[11px] text-slate-500">{field}:</span> {message}
                          </li>
                        )),
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              {(outcome.errors ?? []).length > 0 ? (
                <button
                  onClick={handleDownloadErrors}
                  className="text-xs font-bold text-philsa-navy hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download error report
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => setOutcome(null)}
                className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold transition-all cursor-pointer text-xs"
              >
                Choose another file
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-philsa-gray">
              Upload a CSV with one row per record. Not sure of the format? Start from the template.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="shrink-0 ml-3 text-xs font-bold text-philsa-navy hover:underline cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Template
            </button>
          </div>

          {/* Drop zone / file picker */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-philsa-navy/40 hover:bg-slate-50 transition-all"
          >
            <Upload className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="mt-2 text-xs font-bold text-slate-600">
              {parsed ? parsed.fileName : 'Drop a CSV here or click to browse'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFileInputChange}
              className="hidden"
            />
          </div>

          {parseError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl">
              {parseError}
            </div>
          )}

          {analysis && (
            <div className="space-y-3">
              {analysis.missingRequired.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl">
                  Missing required column{analysis.missingRequired.length === 1 ? '' : 's'}:{' '}
                  {analysis.missingRequired.map((c) => c.label).join(', ')}.
                </div>
              )}
              {analysis.unknownHeaders.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold p-3 rounded-xl">
                  Ignored unrecognized column{analysis.unknownHeaders.length === 1 ? '' : 's'}:{' '}
                  {analysis.unknownHeaders.join(', ')}.
                </div>
              )}

              {/* Preview table (first few rows of matched columns). */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-philsa-navy font-black uppercase tracking-wider">
                      {analysis.matched.map(({ col }) => (
                        <th key={col.key} className="py-2 px-3 whitespace-nowrap">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                      <tr key={i}>
                        {analysis.matched.map(({ col }) => (
                          <td key={col.key} className="py-2 px-3 whitespace-nowrap text-slate-700">
                            {row[col.key] ?? <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-philsa-gray">
              {analysis ? `${analysis.rows.length.toLocaleString()} row${analysis.rows.length === 1 ? '' : 's'} ready` : ''}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!canImport}
                className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-1.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isImporting
                  ? 'Importing…'
                  : `Import${analysis ? ` ${analysis.rows.length.toLocaleString()} row${analysis.rows.length === 1 ? '' : 's'}` : ''}`}
              </button>
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}
