import { AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExamHubTabs, type ExamHubTabKey } from '../../../components/ExamHubTabs';
import { useExamSets } from '../../../hooks/useExamSets';
import { statusLabel } from './examSets/examSetUi';

export default function ExamSetAudit() {
  const navigate = useNavigate();
  const { examSets, loadState, loadError, reload } = useExamSets();

  const entries = examSets
    .flatMap((record) => record.workflowHistory.map((entry) => ({ ...entry, examTitle: record.title, examCode: record.examCode })))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const handleHubTabChange = (tab: ExamHubTabKey) => {
    if (tab === 'blueprints') { navigate('/admin/hub/exam-sets'); return; }
    if (tab === 'setAssembly') { navigate('/admin/hub/exam-sets/assembly'); return; }
    if (tab === 'published') { navigate('/admin/hub/exam-sets/published'); }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5 text-philsa-navy">
      <ExamHubTabs activeTab="audit" onTabChange={handleHubTabChange} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-6 text-white sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Exam Sets workflow</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Audit Logs</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">Every recorded lifecycle and item change across all exam sets.</p>
        </div>

        {loadState === 'loading' && (
          <div role="status" aria-live="polite" className="flex min-h-56 items-center justify-center text-sm font-semibold text-slate-600">Loading audit history…</div>
        )}

        {loadState === 'error' && (
          <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
            <AlertCircle className="h-9 w-9 text-red-600" />
            <h2 className="text-lg font-black text-red-900">Audit history could not be loaded</h2>
            <p className="max-w-md text-sm text-red-700">{loadError?.message ?? 'The request could not be completed.'}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-black uppercase text-white"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {loadState !== 'loading' && loadState !== 'error' && entries.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
            <FileText className="h-9 w-9 text-slate-400" />
            <h2 className="text-lg font-black text-slate-900">No audit history yet</h2>
          </div>
        )}

        {loadState !== 'error' && entries.length > 0 && (
          <div className="overflow-x-auto p-5 sm:p-7">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Exam Set</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="py-2 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="py-2"><span className="font-bold text-slate-900">{entry.examTitle}</span> <span className="font-mono text-xs text-slate-500">{entry.examCode}</span></td>
                    <td className="py-2 text-slate-700">{entry.initiatedBy}</td>
                    <td className="py-2 text-slate-700">{entry.action}{entry.previousStatus && ` (${statusLabel(entry.previousStatus)} → ${statusLabel(entry.newStatus)})`}</td>
                    <td className="py-2 text-slate-500">{entry.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
