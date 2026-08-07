import { AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExamHubTabs, type ExamHubTabKey } from '../../../components/ExamHubTabs';
import { useExamSets } from '../../../hooks/useExamSets';
import { statusClasses, statusLabel } from './examSets/examSetUi';

export default function ExamSetPublished() {
  const navigate = useNavigate();
  const { examSets, loadState, loadError, reload } = useExamSets();

  const packages = examSets.filter((record) => record.status === 'APPROVED' || record.status === 'PUBLISHED');

  const handleHubTabChange = (tab: ExamHubTabKey) => {
    if (tab === 'blueprints') {
      navigate('/admin/hub/exam-sets');
      return;
    }
    if (tab === 'setAssembly') {
      navigate('/admin/hub/exam-sets/assembly');
      return;
    }
    if (tab === 'audit') {
      navigate('/admin/hub/exam-sets/audit');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5 text-philsa-navy">
      <ExamHubTabs activeTab="published" onTabChange={handleHubTabChange} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-6 text-white sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Exam Sets workflow</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Published Exams</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">Approved and published exam set packages, read-only.</p>
        </div>

        {loadState === 'loading' && (
          <div role="status" aria-live="polite" className="flex min-h-56 items-center justify-center text-sm font-semibold text-slate-600">
            Loading packages…
          </div>
        )}

        {loadState === 'error' && (
          <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
            <AlertCircle className="h-9 w-9 text-red-600" />
            <h2 className="text-lg font-black text-red-900">Published Exams could not be loaded</h2>
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

        {loadState !== 'loading' && loadState !== 'error' && packages.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
            <Shield className="h-9 w-9 text-slate-400" />
            <h2 className="text-lg font-black text-slate-900">No approved or published exam sets yet</h2>
            <p className="max-w-md text-sm text-slate-500">Approve or publish an Exam Set from Assembly to see it here.</p>
          </div>
        )}

        {loadState !== 'error' && packages.length > 0 && (
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
            {packages.map((record) => (
              <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wider ${statusClasses(record.status)}`}>
                    {statusLabel(record.status)}
                  </span>
                  <h2 className="truncate text-sm font-black text-slate-950">{record.title}</h2>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{record.examCode}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 font-mono text-xs">
                  <div>
                    <dt className="text-slate-400">Items</dt>
                    <dd className="font-bold text-slate-900">{record.items.length}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Duration</dt>
                    <dd className="font-bold text-slate-900">{record.durationMinutes}m</dd>
                  </div>
                  {record.publishedHash && (
                    <div className="col-span-2">
                      <dt className="text-slate-400">Secured Hash</dt>
                      <dd className="break-all font-bold text-slate-900">{record.publishedHash}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
