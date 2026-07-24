import { ArrowLeft, Home, ShieldX } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PageState } from '../components/ui';

interface UnauthorizedLocationState {
  from?: string;
}

export default function UnauthorizedPage() {
  const location = useLocation();
  const state = location.state as UnauthorizedLocationState | null;

  return (
    <PageState
      title="You cannot open this page"
      message={`Your current prototype role does not have access${state?.from ? ` to ${state.from}` : ' to the requested module'}.`}
      icon={ShieldX}
      role="alert"
      action={(
        <>
          <button type="button" onClick={() => window.history.back()} className="btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Go back
          </button>
          <Link to="/dashboard" className="btn-primary flex items-center justify-center gap-2">
            <Home className="w-4 h-4" aria-hidden="true" /> Dashboard
          </Link>
        </>
      )}
    />
  );
}
