import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Search, Sparkles } from 'lucide-react';
import { ConfirmationDialog } from '../../../components/ui';
import { resultsReleaseService, type ResultsReleaseListFilters, type ResultsReleaseStatus, type ResultsReleaseSummary } from '../../../services/resultsReleaseService';

type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; sessions: ResultsReleaseSummary[]; count: number; page: number; pageSize: number }
  | { kind: 'empty' }
  | { kind: 'forbidden'; message: string }
  | { kind: 'error'; message: string };

type PendingAction = { session: ResultsReleaseSummary; kind: 'process' | 'release' } | null;

const STATUS_LABELS: Record<ResultsReleaseStatus, string> = {
  READY_FOR_PROCESSING: 'Ready for processing',
  SCORING_PROCESSED: 'Scoring processed',
  RESULTS_RELEASED: 'Results released',
};

function formatDate(value: string | null) {
  if (!value) return 'Not yet recorded';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ResultsRelease() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ResultsReleaseStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageState, setPageState] = useState<PageState>({ kind: 'loading' });
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const currentFiltersRef = useRef<ResultsReleaseListFilters>({ page: 1, search: '' });
  const requestGenerationRef = useRef(0);

  currentFiltersRef.current = { page, status: status || undefined, search };

  const load = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current;
    const filters = currentFiltersRef.current;
    setPageState({ kind: 'loading' });
    const result = await resultsReleaseService.list(filters);
    if (requestGeneration !== requestGenerationRef.current) return;
    if ('error' in result) {
      setPageState(result.error.kind === 'AUTHORIZATION'
        ? { kind: 'forbidden', message: result.error.message }
        : { kind: 'error', message: result.error.message });
      return;
    }
    setPageState(result.data.results.length === 0
      ? { kind: 'empty' }
      : { kind: 'ready', sessions: result.data.results, count: result.data.count, page: result.data.page, pageSize: result.data.pageSize });
  }, []);

  useEffect(() => { void load(); }, [load, page, search, status]);

  const updateFilters = (nextSearch: string, nextStatus: ResultsReleaseStatus | '') => {
    setSuccessMessage(null);
    setPage(1);
    setSearch(nextSearch);
    setStatus(nextStatus);
  };

  const openAction = (session: ResultsReleaseSummary, kind: PendingAction['kind']) => {
    setActionError(null);
    setPendingAction({ session, kind });
  };

  const confirmAction = async () => {
    if (!pendingAction || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    const { session, kind } = pendingAction;
    if (kind === 'process') {
      const result = await resultsReleaseService.process(session.id);
      setIsSubmitting(false);
      if ('error' in result) {
        if (result.error.kind === 'NETWORK') {
          setPendingAction(null);
          await load();
          return;
        }
        setActionError(result.error.message);
        return;
      }
      const processed = result.data.processedCount;
      setSuccessMessage(`Processed ${processed} approved score${processed === 1 ? '' : 's'}.`);
    } else {
      const result = await resultsReleaseService.release(session.id);
      setIsSubmitting(false);
      if ('error' in result) {
        if (result.error.kind === 'NETWORK') {
          setPendingAction(null);
          await load();
          return;
        }
        setActionError(result.error.message);
        return;
      }
      const released = result.data.releasedCount;
      setSuccessMessage(`Released ${released} result${released === 1 ? '' : 's'}.`);
    }
    setPendingAction(null);
    await load();
  };

  const totalPages = pageState.kind === 'ready' ? Math.max(1, Math.ceil(pageState.count / pageState.pageSize)) : 1;
  const actionSession = pendingAction?.session;
  const actionKind = pendingAction?.kind;

  return (
    <div className="space-y-6 font-sans">
      <header>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full border border-philsa-red/10 bg-philsa-red/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-philsa-red">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Exam Hub Operations
          </span>
        </div>
        <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-philsa-navy">Results Release</h1>
        <p className="text-sm font-medium text-philsa-gray">Process approved scores and release finalized examination results.</p>
      </header>

      {successMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{successMessage}</p>}

      <section className="card-philsa !p-0 overflow-hidden" aria-label="Release session summaries">
        <div className="flex flex-col gap-4 border-b border-philsa-border bg-philsa-bg/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-philsa-gray" aria-hidden="true" />
            <input aria-label="Search examination sessions" value={search} onChange={(event) => updateFilters(event.target.value, status)} placeholder="Search examination sessions..." className="w-full rounded-xl border border-philsa-border bg-white py-2.5 pl-11 pr-4 text-xs font-bold text-philsa-navy shadow-sm outline-none placeholder:text-philsa-gray/40 focus:border-philsa-red" />
          </div>
          <label className="text-xs font-bold text-philsa-navy">
            <span className="sr-only">Release status</span>
            <select aria-label="Release status" value={status} onChange={(event) => updateFilters(search, event.target.value as ResultsReleaseStatus | '')} className="rounded-xl border border-philsa-border bg-white px-3 py-2.5">
              <option value="">All statuses</option>
              <option value="READY_FOR_PROCESSING">Ready for processing</option>
              <option value="SCORING_PROCESSED">Scoring processed</option>
              <option value="RESULTS_RELEASED">Results released</option>
            </select>
          </label>
        </div>

        {pageState.kind === 'loading' && <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-philsa-gray" role="status"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Loading release summaries…</div>}
        {pageState.kind === 'empty' && <p className="p-10 text-center text-sm font-semibold text-philsa-gray">No examination sessions are available for results release.</p>}
        {pageState.kind === 'forbidden' && <p role="alert" className="p-8 text-center text-sm font-semibold text-philsa-red">{pageState.message}</p>}
        {pageState.kind === 'error' && <div className="space-y-3 p-8 text-center"><p role="alert" className="text-sm font-semibold text-philsa-red">{pageState.message}</p><button type="button" onClick={() => void load()} className="btn-secondary">Retry</button></div>}

        {pageState.kind === 'ready' && <>
          <div className="grid grid-cols-2 gap-px border-b border-philsa-border bg-philsa-border sm:grid-cols-4">
            {[
              ['Sessions', pageState.count],
              ['Candidates', pageState.sessions.reduce((total, session) => total + session.totalCandidates, 0)],
              ['Approved', pageState.sessions.reduce((total, session) => total + session.approvedScores, 0)],
              ['Released', pageState.sessions.reduce((total, session) => total + session.releasedScores, 0)],
            ].map(([label, value]) => <div key={String(label)} className="bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-philsa-gray">{label}</p><p className="mt-1 text-xl font-black text-philsa-navy">{value}</p></div>)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-philsa-border bg-philsa-bg text-[10px] font-black uppercase tracking-[0.16em] text-philsa-gray"><tr><th className="px-6 py-4">Examination session</th><th className="px-6 py-4">Candidates</th><th className="px-6 py-4">Processing</th><th className="px-6 py-4">Release</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-philsa-border">
                {pageState.sessions.map((session) => <tr key={session.id} className="hover:bg-slate-50/55">
                  <td className="px-6 py-4"><p className="text-sm font-black text-philsa-navy">{session.name}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-philsa-gray">{session.id}</p></td>
                  <td className="px-6 py-4 text-sm font-bold text-philsa-navy"><span className="sr-only">Total candidates: </span>{session.totalCandidates}<p className="text-[10px] text-philsa-gray">{session.approvedScores} approved · {session.excludedScores} excluded</p></td>
                  <td className="px-6 py-4 text-xs font-semibold text-philsa-gray">{session.processedScores} processed<p className="text-[10px]">{formatDate(session.processedAt)}</p></td>
                  <td className="px-6 py-4 text-xs font-semibold text-philsa-gray">{session.releasedScores} released<p className="text-[10px]">{formatDate(session.releasedAt)}</p></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-philsa-navy"><CheckCircle2 className="h-3 w-3" aria-hidden="true" />{STATUS_LABELS[session.status]}</span></td>
                  <td className="px-6 py-4 text-right">{session.processingReady && <button type="button" disabled={isSubmitting} onClick={() => openAction(session, 'process')} className="btn-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60">Process approved scores</button>}{session.releaseReady && <button type="button" disabled={isSubmitting} onClick={() => openAction(session, 'release')} className="btn-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60">Release results</button>}{session.status === 'RESULTS_RELEASED' && <span className="text-xs font-bold text-emerald-700">Released</span>}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between border-t border-philsa-border p-4 text-xs font-semibold text-philsa-gray"><span>Page {pageState.page} of {totalPages}</span><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}
        </>}
      </section>

      <ConfirmationDialog isOpen={pendingAction !== null} title={actionKind === 'process' ? 'Process approved scores?' : 'Release results?'} message={actionError ?? (actionKind === 'process' ? 'This will process the approved scores for this examination session.' : 'This will release the processed results for this examination session.')} details={actionSession ? `${actionSession.name} — ${actionSession.approvedScores} approved, ${actionSession.excludedScores} excluded` : undefined} confirmLabel={actionKind === 'process' ? 'Confirm processing' : 'Confirm release'} isConfirming={isSubmitting} onConfirm={() => void confirmAction()} onCancel={() => { if (!isSubmitting) { setPendingAction(null); setActionError(null); } }} />
    </div>
  );
}
