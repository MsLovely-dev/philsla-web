import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { QuestionBankItem } from '../../../../services/backendQuestionBankService';

interface QuestionPickerDrawerProps {
  open: boolean;
  questions: QuestionBankItem[];
  excludeQuestionIds: string[];
  onSelect: (question: QuestionBankItem) => void;
  onClose: () => void;
}

export function QuestionPickerDrawer({ open, questions, excludeQuestionIds, onSelect, onClose }: QuestionPickerDrawerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const excluded = new Set(excludeQuestionIds);
    const normalized = search.trim().toLowerCase();
    return questions.filter((question) => {
      if (excluded.has(question.id)) return false;
      if (!normalized) return true;
      return [question.questionCode, question.subject, question.topic, question.questionText]
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [questions, excludeQuestionIds, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" role="dialog" aria-modal="true" aria-label="Select a question">
      <button type="button" aria-label="Close question picker" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Select a Question</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <label className="relative m-4">
          <span className="sr-only">Search questions</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code, subject, topic, or text"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No matching questions.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((question) => (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(question)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm hover:border-sky-300 hover:bg-sky-50"
                  >
                    <span className="font-mono text-xs font-bold text-slate-700">{question.questionCode}</span>
                    <span className="ml-2 text-xs text-slate-500">{question.subject} · {question.difficulty} · {question.points} pt</span>
                    <p className="mt-1 line-clamp-2 text-slate-800">{question.questionText}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
