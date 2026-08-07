import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExamHubTabs, type ExamHubTabKey } from '../../../components/ExamHubTabs';
import { useExamSets } from '../../../hooks/useExamSets';
import type { Blueprint } from './blueprintMockData';
import type { QuestionBankItem } from '../../../services/backendQuestionBankService';
import type { ExamSetDraft, ExamSetRecord, ExamSetStatus } from '../../../services/backendExamSetService';
import { ACTION_BUTTON, FIELD_INPUT, FIELD_LABEL, nextTransitions, recordToDraft, STATUSES, statusClasses, statusLabel } from './examSets/examSetUi';
import { ExamSetAssemblyWorkspace } from './examSets/ExamSetAssemblyWorkspace';

interface EditorState {
  title: string;
  blueprintId: string;
  blueprintVersionId: string;
  academicYear: string;
  examinationPeriod: string;
  examType: string;
  instructions: string;
  durationMinutes: number;
  questionIds: string[];
}

function emptyEditor(blueprint?: Blueprint): EditorState {
  return {
    title: '',
    blueprintId: blueprint?.id ?? '',
    blueprintVersionId: blueprint?.currentVersionId ?? '',
    academicYear: blueprint?.academicYear ?? '',
    examinationPeriod: '',
    examType: blueprint?.examType ?? '',
    instructions: '',
    durationMinutes: blueprint?.rules?.totalTimeLimit || 60,
    questionIds: [],
  };
}

export default function ExamSets() {
  const navigate = useNavigate();
  const {
    examSets,
    blueprints,
    questions,
    loadState,
    loadError,
    mutationState,
    mutationError,
    reload,
    create,
    update,
    clone,
    transition,
    autoAssemble,
    remove,
  } = useExamSets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExamSetStatus>('ALL');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const pending = mutationState === 'pending';

  const eligibleBlueprints = useMemo(
    () => blueprints.filter(
      (blueprint) => blueprint.currentVersionId && (blueprint.status === 'APPROVED' || blueprint.status === 'PUBLISHED'),
    ),
    [blueprints],
  );
  const filteredExamSets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return examSets.filter((record) => {
      const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;
      const matchesSearch = !normalizedSearch || [record.title, record.examCode, record.academicYear]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [examSets, search, statusFilter]);

  const handleHubTabChange = (tab: ExamHubTabKey) => {
    if (tab === 'blueprints') {
      navigate('/admin/blueprints');
      return;
    }
    if (tab === 'published') {
      navigate('/admin/hub/exam-sets/published');
      return;
    }
    if (tab === 'audit') {
      navigate('/admin/hub/exam-sets/audit');
      return;
    }
    navigate('/admin/hub/exam-sets/assembly');
  };

  const openCreate = () => {
    setNotice(null);
    setEditor(emptyEditor(eligibleBlueprints[0]));
  };

  const chooseBlueprint = (blueprintId: string) => {
    const blueprint = eligibleBlueprints.find((item) => item.id === blueprintId);
    setEditor((current) => current ? {
      ...current,
      blueprintId,
      blueprintVersionId: blueprint?.currentVersionId ?? current.blueprintVersionId,
      academicYear: blueprint?.academicYear ?? current.academicYear,
      examType: blueprint?.examType ?? current.examType,
      durationMinutes: blueprint?.rules?.totalTimeLimit || current.durationMinutes,
    } : current);
  };

  const toggleQuestion = (questionId: string) => {
    setEditor((current) => {
      if (!current) return current;
      const selected = current.questionIds.includes(questionId);
      return {
        ...current,
        questionIds: selected
          ? current.questionIds.filter((id) => id !== questionId)
          : [...current.questionIds, questionId],
      };
    });
  };

  const moveQuestion = (questionId: string, direction: -1 | 1) => {
    setEditor((current) => {
      if (!current) return current;
      const index = current.questionIds.indexOf(questionId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.questionIds.length) return current;
      const questionIds = [...current.questionIds];
      [questionIds[index], questionIds[destination]] = [questionIds[destination], questionIds[index]];
      return { ...current, questionIds };
    });
  };

  const submitEditor = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    const blueprint = eligibleBlueprints.find((item) => item.id === editor.blueprintId);
    const blueprintVersionId = blueprint?.currentVersionId ?? editor.blueprintVersionId;
    if (!blueprintVersionId) {
      setNotice({ type: 'error', message: 'Select a Blueprint with a current version.' });
      return;
    }

    const questionById = new Map(questions.map((question) => [question.id, question]));
    const draft: ExamSetDraft = {
      title: editor.title.trim(),
      blueprintVersionId,
      academicYear: editor.academicYear.trim(),
      durationMinutes: editor.durationMinutes,
      examinationPeriod: editor.examinationPeriod.trim(),
      examType: editor.examType.trim(),
      instructions: editor.instructions.trim(),
      items: editor.questionIds.map((questionId, index) => ({
        questionId,
        displayOrder: index + 1,
        points: questionById.get(questionId)?.points ?? 1,
      })),
    };
    const result = await create(draft);
    if (result.ok === false) {
      setNotice({ type: 'error', message: result.error.message });
      return;
    }
    setNotice({ type: 'success', message: 'Exam Set created.' });
    setEditor(null);
  };

  const handleClone = async (record: ExamSetRecord) => {
    setNotice(null);
    const result = await clone(record.id);
    if (result.ok === false) {
      setNotice({ type: 'error', message: result.error.message });
      return;
    }
    setNotice({ type: 'success', message: `${record.title} cloned.` });
  };

  const handleDelete = async (record: ExamSetRecord) => {
    if (!window.confirm(`Delete ${record.title}? This action cannot be undone.`)) return;
    setNotice(null);
    const result = await remove(record.id);
    if (result.ok === false) {
      setNotice({ type: 'error', message: result.error.message });
      return;
    }
    setNotice({ type: 'success', message: `${record.title} deleted.` });
    setSelectedRecordId((current) => current === record.id ? null : current);
  };

  const handleTransition = async (record: ExamSetRecord, target: ReturnType<typeof nextTransitions>[number]) => {
    setNotice(null);
    const result = await transition(record.id, { status: target.status, remarks: target.remarks });
    if (result.ok === false) {
      setNotice({ type: 'error', message: result.error.message });
      return;
    }
    setNotice({ type: 'success', message: `${record.title} moved to ${statusLabel(target.status)}.` });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5 text-philsa-navy">
      <ExamHubTabs activeTab="setAssembly" onTabChange={handleHubTabChange} />

      {notice && (
        <div role={notice.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      {mutationError && !notice && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {mutationError.message}
        </div>
      )}

      {!selectedRecordId && (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Authoritative assessment workflow</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">Exam Set Assembly</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Build ordered sets from approved Blueprint versions and persisted Question Bank items.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={loadState === 'loading' || pending || eligibleBlueprints.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-philsa-red px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-950/20 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Create Exam Set
          </button>
        </div>

        {loadState === 'loading' && (
          <div role="status" aria-live="polite" className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading exam sets…
          </div>
        )}

        {loadState === 'error' && (
          <div role="alert" className="m-5 flex min-h-56 flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 p-8 text-center sm:m-7">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="mt-3 text-lg font-black text-red-900">Exam Sets could not be loaded</h2>
            <p className="mt-1 max-w-xl text-sm text-red-700">{loadError?.message ?? 'The request could not be completed.'}</p>
            <button type="button" onClick={() => void reload()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-black uppercase text-white">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {loadState === 'empty' && (
          <div className="m-5 flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:m-7">
            <Layers3 className="h-9 w-9 text-slate-400" />
            <h2 className="mt-3 text-lg font-black text-slate-900">No exam sets yet</h2>
            <p className="mt-1 max-w-lg text-sm text-slate-500">Create the first set from an approved Blueprint and real Question Bank records.</p>
            <button type="button" onClick={openCreate} disabled={eligibleBlueprints.length === 0} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-philsa-red px-4 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50">
              <Plus className="h-4 w-4" /> Create Exam Set
            </button>
          </div>
        )}

        {loadState === 'ready' && (
          <div className="p-5 sm:p-7">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                { label: 'Drafts', count: examSets.filter((r) => r.status === 'DRAFT').length },
                { label: 'Academic Review', count: examSets.filter((r) => r.status === 'ACADEMIC_REVIEW').length },
                { label: 'Published', count: examSets.filter((r) => r.status === 'PUBLISHED').length },
                { label: 'Validation Issues', count: examSets.filter((r) => r.validationResults.some((v) => v.result.toUpperCase() !== 'PASSED')).length },
              ] as const).map((tile) => (
                <div key={tile.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{tile.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{tile.count}</p>
                </div>
              ))}
            </div>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Search Exam Sets</span>
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, code, or academic year" className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-slate-500" />
              </label>
              <label>
                <span className="sr-only">Filter by status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ExamSetStatus)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold">
                  <option value="ALL">All statuses</option>
                  {STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
              </label>
            </div>

            {filteredExamSets.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No Exam Sets match these filters.</p>
            ) : (
              <div className="space-y-4">
                {filteredExamSets.map((record) => {
                  const transitions = nextTransitions(record.status);
                  return (
                    <article key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(12rem,.7fr)_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-black text-slate-950">{record.title}</h2>
                            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wider ${statusClasses(record.status)}`}>{statusLabel(record.status)}</span>
                          </div>
                          <p className="mt-1 font-mono text-xs text-slate-500">{record.examCode}</p>
                          <p className="mt-2 text-sm text-slate-600">{record.blueprintVersion.specCode} v{record.blueprintVersion.versionNumber} · {record.academicYear}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Items</p><p className="mt-1 font-black text-slate-900">{record.items.length}</p></div>
                          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Duration</p><p className="mt-1 flex items-center gap-1 font-black text-slate-900"><Clock3 className="h-3.5 w-3.5" /> {record.durationMinutes}m</p></div>
                        </div>
                        <div className="flex flex-wrap justify-start gap-2 lg:max-w-sm lg:justify-end">
                          <button type="button" disabled={pending} onClick={() => setSelectedRecordId(record.id)} className={ACTION_BUTTON}><Edit3 className="h-3.5 w-3.5" /> Edit</button>
                          <button type="button" disabled={pending} onClick={() => void handleClone(record)} className={ACTION_BUTTON}><Copy className="h-3.5 w-3.5" /> Clone</button>
                          {transitions.map((target) => (
                            <button key={target.status} type="button" disabled={pending} onClick={() => void handleTransition(record, target)} className={ACTION_BUTTON}>
                              {target.status === 'ARCHIVED' ? <Archive className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />} {target.label}
                            </button>
                          ))}
                          <button type="button" disabled={pending} onClick={() => void handleDelete(record)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-[10px] font-black uppercase text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
      )}

      {selectedRecordId && (() => {
        const selected = examSets.find((record) => record.id === selectedRecordId);
        if (!selected) return null;
        return (
          <ExamSetAssemblyWorkspace
            record={selected}
            questions={questions}
            pending={pending}
            onUpdateItems={(items) => void update(selected.id, { ...recordToDraft(selected), items })}
            onAutoAssemble={() => void autoAssemble(selected.id)}
            onTransition={(target) => void handleTransition(selected, target)}
            onDelete={() => void handleDelete(selected)}
            onBack={() => setSelectedRecordId(null)}
          />
        );
      })()}

      {editor && (
        <ExamSetEditor
          editor={editor}
          setEditor={setEditor}
          blueprints={eligibleBlueprints}
          questions={questions}
          pending={pending}
          chooseBlueprint={chooseBlueprint}
          toggleQuestion={toggleQuestion}
          moveQuestion={moveQuestion}
          onSubmit={submitEditor}
        />
      )}
    </div>
  );
}

interface ExamSetEditorProps {
  editor: EditorState;
  setEditor: Dispatch<SetStateAction<EditorState | null>>;
  blueprints: Blueprint[];
  questions: QuestionBankItem[];
  pending: boolean;
  chooseBlueprint: (id: string) => void;
  toggleQuestion: (id: string) => void;
  moveQuestion: (id: string, direction: -1 | 1) => void;
  onSubmit: (event: FormEvent) => void;
}

function ExamSetEditor({ editor, setEditor, blueprints, questions, pending, chooseBlueprint, toggleQuestion, moveQuestion, onSubmit }: ExamSetEditorProps) {
  const selectedIndex = new Map(editor.questionIds.map((id, index) => [id, index]));
  const usesHistoricalBlueprintVersion = editor.blueprintId.startsWith('version:');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="exam-set-editor-title">
      <button type="button" aria-label="Close editor" className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={() => setEditor(null)} />
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div><h2 id="exam-set-editor-title" className="text-xl font-black text-slate-950">Create Exam Set</h2><p className="mt-1 text-sm text-slate-500">The backend validates all fields, selected items, and lifecycle rules.</p></div>
          <button type="button" aria-label="Close dialog" onClick={() => setEditor(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6 p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={`${FIELD_LABEL} sm:col-span-2`}>Title<input required value={editor.title} onChange={(event) => setEditor((current) => current ? { ...current, title: event.target.value } : current)} className={FIELD_INPUT} /></label>
            <label className={FIELD_LABEL}>Blueprint<select required value={editor.blueprintId} onChange={(event) => chooseBlueprint(event.target.value)} className={FIELD_INPUT}><option value="">Select Blueprint</option>{usesHistoricalBlueprintVersion && <option value={editor.blueprintId}>Existing Blueprint version {editor.blueprintVersionId}</option>}{blueprints.map((blueprint) => <option key={blueprint.id} value={blueprint.id}>{blueprint.code} — {blueprint.name}</option>)}</select></label>
            <label className={FIELD_LABEL}>Academic Year<input required value={editor.academicYear} onChange={(event) => setEditor((current) => current ? { ...current, academicYear: event.target.value } : current)} className={FIELD_INPUT} /></label>
            <label className={FIELD_LABEL}>Examination Period<input value={editor.examinationPeriod} onChange={(event) => setEditor((current) => current ? { ...current, examinationPeriod: event.target.value } : current)} className={FIELD_INPUT} /></label>
            <label className={FIELD_LABEL}>Exam Type<input value={editor.examType} onChange={(event) => setEditor((current) => current ? { ...current, examType: event.target.value } : current)} className={FIELD_INPUT} /></label>
            <label className={FIELD_LABEL}>Duration (minutes)<input required min={1} type="number" value={editor.durationMinutes} onChange={(event) => setEditor((current) => current ? { ...current, durationMinutes: Number(event.target.value) } : current)} className={FIELD_INPUT} /></label>
            <label className={`${FIELD_LABEL} sm:col-span-2`}>Instructions<textarea rows={3} value={editor.instructions} onChange={(event) => setEditor((current) => current ? { ...current, instructions: event.target.value } : current)} className={`${FIELD_INPUT} py-3`} /></label>
          </div>

          <fieldset>
            <legend className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">Question Bank items</legend>
            <p className="mt-1 text-sm text-slate-500">Select persisted questions, then use the arrows to control display order.</p>
            {questions.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No Question Bank items are available.</p> : (
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2">
                {questions.map((question) => {
                  const index = selectedIndex.get(question.id);
                  const selected = index !== undefined;
                  return (
                    <div key={question.id} className={`flex items-start gap-3 rounded-xl border p-3 ${selected ? 'border-sky-300 bg-sky-50' : 'border-transparent bg-slate-50'}`}>
                      <input id={`question-${question.id}`} type="checkbox" checked={selected} onChange={() => toggleQuestion(question.id)} className="mt-1 h-4 w-4" />
                      <label htmlFor={`question-${question.id}`} className="min-w-0 flex-1 cursor-pointer"><span className="font-mono text-xs font-bold text-slate-700">{question.questionCode}</span><span className="ml-2 text-xs text-slate-500">{question.subject} · {question.difficulty} · {question.points} pt</span><p className="mt-1 line-clamp-2 text-sm text-slate-800">{question.questionText}</p></label>
                      {selected && <div className="flex gap-1"><button type="button" aria-label={`Move ${question.questionCode} up`} disabled={index === 0} onClick={() => moveQuestion(question.id, -1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Move ${question.questionCode} down`} disabled={index === editor.questionIds.length - 1} onClick={() => moveQuestion(question.id, 1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setEditor(null)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-black uppercase text-slate-700">Cancel</button>
            <button type="submit" disabled={pending || !editor.title.trim() || !editor.blueprintId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-philsa-red px-5 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />} Save Exam Set</button>
          </div>
        </form>
      </div>
    </div>
  );
}
