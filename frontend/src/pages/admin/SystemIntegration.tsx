import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  Shield,
  Zap,
} from 'lucide-react';
import { usePhilSA } from '../../PhilSAContext';
import {
  backendApplicationService,
  type RegistrationIntegrationMethod,
  type RegistrationIntegrationStatus,
} from '../../services/backendApplicationService';

type ConnectionState = 'idle' | 'checking' | 'connected' | 'failed';

const FALLBACK_STATUS: RegistrationIntegrationStatus = {
  backend: { status: 'connected' },
  methods: [
    {
      id: 'manual',
      label: 'Manual Registration',
      status: 'available',
      active: true,
      message: 'Manual Registration is available.',
    },
    {
      id: 'lrn',
      label: 'LRN Verification',
      status: 'unavailable',
      active: false,
      message: 'LRN verification is not connected to a live provider.',
    },
    {
      id: 'philsys',
      label: 'PhilSys National ID',
      status: 'locked',
      active: false,
      message: 'PhilSys National ID integration is locked until official API requirements are approved.',
    },
  ],
};

function statusLabel(status: RegistrationIntegrationMethod['status']) {
  switch (status) {
    case 'available':
      return 'Available';
    case 'mock':
      return 'Synthetic';
    case 'placeholder':
      return 'Prepared';
    case 'locked':
      return 'Locked';
    default:
      return 'Unavailable';
  }
}

function statusTone(status: RegistrationIntegrationMethod['status']) {
  if (status === 'available') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'placeholder' || status === 'mock') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'locked') return 'border-slate-200 bg-slate-50 text-slate-600';
  return 'border-red-200 bg-red-50 text-red-700';
}

function methodIcon(id: RegistrationIntegrationMethod['id']) {
  if (id === 'manual') return <Shield className="h-5 w-5" aria-hidden="true" />;
  if (id === 'lrn') return <Database className="h-5 w-5" aria-hidden="true" />;
  return <Activity className="h-5 w-5" aria-hidden="true" />;
}

function connectionCopy(state: ConnectionState) {
  switch (state) {
    case 'checking':
      return {
        label: 'Verifying',
        message: 'Checking PhilSLA backend registration integration status.',
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    case 'connected':
      return {
        label: 'Connected',
        message: 'Connection verified. Registration-provider status was loaded from the PhilSLA backend.',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'failed':
      return {
        label: 'Failed',
        message: 'Connection check failed. Manual Registration remains available.',
        tone: 'border-red-200 bg-red-50 text-red-700',
      };
    default:
      return {
        label: 'Not verified yet',
        message: 'Click Verify Connection to check the PhilSLA backend API.',
        tone: 'border-slate-200 bg-slate-50 text-slate-600',
      };
  }
}

export default function SystemIntegration() {
  const { addAuditLog } = usePhilSA();
  const [status, setStatus] = useState<RegistrationIntegrationStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [lastCheckedAt, setLastCheckedAt] = useState('');
  const methods = status?.methods ?? FALLBACK_STATUS.methods;
  const connectionStatus = connectionCopy(connectionState);

  const loadStatus = async () => {
    setConnectionState('checking');
    const result = await backendApplicationService.getRegistrationIntegrationStatus();
    if (result.ok === true) {
      setStatus(result.data);
      setStatusError('');
      setConnectionState('connected');
      setLastCheckedAt(new Date().toLocaleString());
      addAuditLog?.('SYSTEM_INTEGRATION_STATUS_CHECKED', 'System Integration frontend checked PhilSLA backend registration-provider readiness.');
    } else {
      setStatus(null);
      setStatusError(result.error.message || 'PhilSLA backend integration status could not be loaded.');
      setConnectionState('failed');
      setLastCheckedAt(new Date().toLocaleString());
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-philsa-red/10 bg-philsa-red/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-philsa-red">
              <Zap className="h-3 w-3" aria-hidden="true" />
              System Admin Operations
            </span>
          </div>
          <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-philsa-navy">System Integrations</h1>
          <p className="max-w-3xl text-sm font-medium text-philsa-gray">
            Monitor PhilSLA backend connectivity and registration-provider readiness. External registry APIs are not called from the browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={connectionState === 'checking'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-philsa-navy px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${connectionState === 'checking' ? 'animate-spin' : ''}`} aria-hidden="true" />
          Verify Connection
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <Server className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Backend Connectivity</p>
              <h2 className="mt-1 text-lg font-black text-philsa-navy">PhilSLA Backend API</h2>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {connectionStatus.message}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" aria-live="polite">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Connection Status</p>
            <span className={`mt-2 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${connectionStatus.tone}`}>
              {connectionState === 'connected' ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <RefreshCw className={`h-4 w-4 ${connectionState === 'checking' ? 'animate-spin' : ''}`} aria-hidden="true" />
              )}
              {connectionStatus.label}
            </span>
            {lastCheckedAt && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Last checked {lastCheckedAt}
              </p>
            )}
          </div>
        </div>
        {statusError && (
          <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{statusError} Manual Registration remains available.</p>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {methods.map((method) => (
          <article key={method.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl border p-2.5 ${statusTone(method.status)}`}>
                  {methodIcon(method.id)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-philsa-navy">{method.label}</h3>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Registration Method
                  </p>
                </div>
              </div>
              <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(method.status)}`}>
                {statusLabel(method.status)}
              </span>
            </div>
            <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-600">{method.message}</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Frontend Action</p>
              <p className="mt-1 text-xs font-bold text-philsa-navy">
                {method.id === 'manual'
                  ? 'Applicants can continue through Manual Registration.'
                  : 'Applicants must use PhilSLA registration endpoints; no browser-to-provider connection is allowed.'}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Implementation Boundary</p>
        <div className="mt-3 grid gap-3 text-xs font-bold text-slate-700 md:grid-cols-4">
          {['Frontend', 'PhilSLA API', 'Registration Service', 'Provider Adapter'].map((step) => (
            <div key={step} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
              {step}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600">
          The frontend checks PhilSLA backend readiness only. DepEd LRN and PhilSys credentials, payload mapping,
          retries, throttling, and safe error handling remain backend-owned.
        </p>
      </section>
    </div>
  );
}
