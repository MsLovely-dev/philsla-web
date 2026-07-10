import { ArrowLeft, Home, ShieldX } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface UnauthorizedLocationState {
  from?: string;
}

export default function UnauthorizedPage() {
  const location = useLocation();
  const state = location.state as UnauthorizedLocationState | null;

  return (
    <main className="min-h-screen bg-philsa-bg flex items-center justify-center p-6">
      <section className="card-philsa w-full max-w-lg text-center space-y-6" aria-labelledby="unauthorized-title">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-philsa-red flex items-center justify-center mx-auto">
          <ShieldX className="w-8 h-8" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-philsa-gray uppercase tracking-[0.2em]">Access denied</p>
          <h1 id="unauthorized-title" className="text-3xl font-extrabold text-philsa-navy">You cannot open this page</h1>
          <p className="text-sm text-philsa-gray">
            Your current prototype role does not have access
            {state?.from ? ` to ${state.from}` : ' to the requested module'}.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => window.history.back()} className="btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Go back
          </button>
          <Link to="/dashboard" className="btn-primary flex items-center justify-center gap-2">
            <Home className="w-4 h-4" aria-hidden="true" /> Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
