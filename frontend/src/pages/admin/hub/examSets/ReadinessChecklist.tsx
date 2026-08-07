import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ExamSetValidationResult } from '../../../../services/backendExamSetService';

interface ReadinessChecklistProps {
  results: ExamSetValidationResult[];
}

function rowClasses(result: string): string {
  if (result === 'PASSED') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (result === 'FAILED') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function RowIcon({ result }: { result: string }) {
  if (result === 'PASSED') return <CheckCircle className="h-4 w-4 shrink-0" />;
  if (result === 'FAILED') return <AlertTriangle className="h-4 w-4 shrink-0" />;
  return <Info className="h-4 w-4 shrink-0" />;
}

export function ReadinessChecklist({ results }: ReadinessChecklistProps) {
  if (results.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No validation results recorded yet.</p>;
  }

  const passedCount = results.filter((result) => result.result === 'PASSED').length;

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {passedCount} of {results.length} checks passed
      </p>
      <ul className="mt-2 space-y-2">
        {results.map((result) => (
          <li key={result.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${rowClasses(result.result)}`}>
            <RowIcon result={result.result} />
            <div>
              <p className="font-bold">{result.validationName}</p>
              <p className="mt-0.5">{result.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
