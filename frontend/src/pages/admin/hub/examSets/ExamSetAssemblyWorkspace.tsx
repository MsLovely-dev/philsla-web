import { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import type { ExamSetDraftItem, ExamSetRecord, ExamSetStatus } from '../../../../services/backendExamSetService';
import type { QuestionBankItem } from '../../../../services/backendQuestionBankService';
import { ACTION_BUTTON, nextTransitions, statusClasses, statusLabel } from './examSetUi';
import { QuestionPickerDrawer } from './QuestionPickerDrawer';
import { ReadinessChecklist } from './ReadinessChecklist';

const EDITABLE_STATUSES: ExamSetStatus[] = ['DRAFT', 'REVISION_REQUIRED'];

interface ExamSetAssemblyWorkspaceProps {
  record: ExamSetRecord;
  questions: QuestionBankItem[];
  pending: boolean;
  onUpdateItems: (items: ExamSetDraftItem[]) => void;
  onAutoAssemble: () => void;
  onTransition: (target: { status: ExamSetStatus; remarks: string; label: string }) => void;
  onDelete: () => void;
  onBack: () => void;
}

function toDraftItems(record: ExamSetRecord): ExamSetDraftItem[] {
  return record.items
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((item, index) => ({
      questionId: item.question.id,
      displayOrder: index + 1,
      points: item.points,
      ...(item.blueprintSectionId ? { blueprintSectionId: item.blueprintSectionId } : {}),
      ...(item.selectionMethod ? { selectionMethod: item.selectionMethod } : {}),
    }));
}

function renumber(items: ExamSetDraftItem[]): ExamSetDraftItem[] {
  return items.map((item, index) => ({ ...item, displayOrder: index + 1 }));
}

export function ExamSetAssemblyWorkspace({ record, questions, pending, onUpdateItems, onAutoAssemble, onTransition, onDelete, onBack }: ExamSetAssemblyWorkspaceProps) {
  const editable = EDITABLE_STATUSES.includes(record.status);
  const transitions = nextTransitions(record.status);
  const [pickerTarget, setPickerTarget] = useState<{ mode: 'add' | 'replace'; index: number | null } | null>(null);

  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const totalPoints = record.items.reduce((sum, item) => sum + item.points, 0);
  const excludeIds = record.items.map((item) => item.question.id);

  const handleRemove = (index: number) => {
    const items = toDraftItems(record).filter((_item, itemIndex) => itemIndex !== index);
    onUpdateItems(renumber(items));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const items = toDraftItems(record);
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    [items[index], items[destination]] = [items[destination], items[index]];
    onUpdateItems(renumber(items));
  };

  const handlePick = (question: QuestionBankItem) => {
    const items = toDraftItems(record);
    if (pickerTarget?.mode === 'replace' && pickerTarget.index !== null) {
      items[pickerTarget.index] = { ...items[pickerTarget.index], questionId: question.id, points: question.points };
    } else {
      items.push({ questionId: question.id, displayOrder: items.length + 1, points: question.points });
    }
    onUpdateItems(renumber(items));
    setPickerTarget(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className={ACTION_BUTTON}><ArrowLeft className="h-3.5 w-3.5" /> Back to Exam Sets</button>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-950">{record.title}</h2>
              <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wider ${statusClasses(record.status)}`}>{statusLabel(record.status)}</span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500">{record.examCode}</p>
            <p className="mt-2 text-sm text-slate-600">{record.blueprintVersion.specCode} v{record.blueprintVersion.versionNumber}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Readiness Check</h3>
            <div className="mt-3">
              <ReadinessChecklist results={record.validationResults} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Lifecycle</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {editable && (
                <button type="button" disabled={pending} onClick={onAutoAssemble} className={ACTION_BUTTON}>
                  <RefreshCw className="h-3.5 w-3.5" /> Run Auto-Selection
                </button>
              )}
              {transitions.map((target) => (
                <button key={target.status} type="button" disabled={pending} onClick={() => onTransition(target)} className={ACTION_BUTTON}>
                  <Send className="h-3.5 w-3.5" /> {target.label}
                </button>
              ))}
              {record.status === 'DRAFT' && (
                <button type="button" disabled={pending} onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-[10px] font-black uppercase text-red-700 hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">Form total: {totalPoints} Points</span>
            {editable && (
              <button type="button" onClick={() => setPickerTarget({ mode: 'add', index: null })} className={ACTION_BUTTON}>
                <Plus className="h-3.5 w-3.5" /> Add Question Item
              </button>
            )}
          </div>

          {record.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No questions yet. Add a question or run auto-selection.</p>
          ) : (
            <ul className="space-y-2">
              {record.items
                .slice()
                .sort((left, right) => left.displayOrder - right.displayOrder)
                .map((item, index) => {
                  const bankQuestion = questionById.get(item.question.id);
                  return (
                    <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-slate-700">{item.question.questionCode}</p>
                          <p className="text-xs text-slate-500">{item.question.subject} · {item.question.difficulty} · {item.points} pt</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-800">{bankQuestion?.questionText ?? item.question.questionCode}</p>
                        </div>
                        {editable && (
                          <div className="flex shrink-0 gap-1">
                            <button type="button" aria-label={`Move ${item.question.questionCode} up`} disabled={index === 0} onClick={() => handleMove(index, -1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" aria-label={`Move ${item.question.questionCode} down`} disabled={index === record.items.length - 1} onClick={() => handleMove(index, 1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => setPickerTarget({ mode: 'replace', index })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-black uppercase">Replace</button>
                            <button type="button" aria-label={`Remove ${item.question.questionCode}`} onClick={() => handleRemove(index)} className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[10px] font-black uppercase text-red-700">Remove</button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      <QuestionPickerDrawer
        open={pickerTarget !== null}
        questions={questions}
        excludeQuestionIds={excludeIds}
        onSelect={handlePick}
        onClose={() => setPickerTarget(null)}
      />
    </div>
  );
}
