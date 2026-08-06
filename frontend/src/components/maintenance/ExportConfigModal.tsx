import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { ModalShell } from '../ui/ModalShell';

export interface ExportColumnOption {
  key: string;
  label: string;
  /** Personally-identifiable; unchecked by default so PII is excluded unless opted in. */
  sensitive?: boolean;
}

export interface ExportScopeOption {
  value: string;
  label: string;
}

export interface ExportSelection {
  columns: string[];
  scope: string;
}

interface ExportConfigModalProps {
  isOpen: boolean;
  title?: string;
  columns: ExportColumnOption[];
  scopeOptions?: ExportScopeOption[];
  onCancel: () => void;
  onExport: (selection: ExportSelection) => void;
}

/**
 * Lets the user choose which columns (and which rows) to export before a CSV is
 * generated, instead of silently dumping whatever happens to be filtered on
 * screen. PII columns are excluded by default and must be opted into.
 */
export function ExportConfigModal({
  isOpen,
  title = 'Configure export',
  columns,
  scopeOptions,
  onCancel,
  onExport,
}: ExportConfigModalProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [scope, setScope] = useState<string>('');

  // Reset selections whenever the modal opens; sensitive columns default off.
  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, boolean> = {};
    for (const col of columns) initial[col.key] = !col.sensitive;
    setSelected(initial);
    setScope(scopeOptions?.[0]?.value ?? 'all');
  }, [isOpen, columns, scopeOptions]);

  const chosen = columns.filter((c) => selected[c.key]).map((c) => c.key);

  return (
    <ModalShell isOpen={isOpen} className="max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-philsa-navy flex items-center gap-2">
            <Download className="w-5 h-5 text-philsa-navy" /> {title}
          </h3>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Close export options"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {scopeOptions && scopeOptions.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Rows to export</div>
            <div className="flex flex-col gap-1.5">
              {scopeOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="export-scope"
                    checked={scope === opt.value}
                    onChange={() => setScope(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-philsa-gray">Columns</div>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
            {columns.map((col) => (
              <label key={col.key} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(selected[col.key])}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [col.key]: e.target.checked }))}
                />
                <span>
                  {col.label}
                  {col.sensitive && <span className="ml-1 text-[9px] font-bold uppercase text-amber-600">PII</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => onExport({ columns: chosen, scope })}
            disabled={chosen.length === 0}
            className="px-5 py-2 rounded-xl bg-philsa-navy hover:bg-philsa-navy/90 text-white font-bold transition-all cursor-pointer shadow-lg shadow-philsa-navy/10 flex items-center gap-1.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>
    </ModalShell>
  );
}
