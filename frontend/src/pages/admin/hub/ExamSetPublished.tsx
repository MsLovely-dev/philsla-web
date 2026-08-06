import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExamHubTabs, type ExamHubTabKey } from '../../../components/ExamHubTabs';

export default function ExamSetPublished() {
  const navigate = useNavigate();

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
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            This route now exists as a dedicated destination for published exam packages.
          </p>
        </div>

        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <Shield className="h-10 w-10 text-slate-400" />
          <h2 className="text-lg font-black text-slate-900">Published exam routing is now separated</h2>
          <p className="max-w-xl text-sm text-slate-500">
            The page is split off from the blueprint screen so each hub section can have its own route.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/hub/exam-sets/assembly')}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-philsa-red px-4 py-2.5 text-xs font-black uppercase text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assembly
          </button>
        </div>
      </section>
    </div>
  );
}
