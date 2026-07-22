import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { usePhilSA } from '../../PhilSAContext';
import { cn } from '../../lib/utils';
import { backendApplicationService, type BackendRegistrationSubmittedAuditLog } from '../../services/backendApplicationService';

type RegistrationSubmittedAuditDetails = {
  auditEvent?: string;
  sessionId?: string;
  timestamp?: string;
  ipAddress?: string;
  deviceBrowser?: string;
  applicationId?: string;
  registrationId?: string;
  applicantId?: string;
  candidateId?: string;
  accountId?: string;
};

type RegistrationAuditRow = {
  id: string;
  timestamp: string;
  sessionId: string;
  actor: string;
  applicationId: string;
  registrationId: string;
  applicantId: string;
  candidateId: string;
  accountId: string;
  ipAddress: string;
  deviceBrowser: string;
};

function parseRegistrationAuditDetails(details: string): RegistrationSubmittedAuditDetails {
  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function ReviewApplicationAuditLogs() {
  const { auditLogs } = usePhilSA();
  const [searchTerm, setSearchTerm] = useState('');
  const [backendAuditRows, setBackendAuditRows] = useState<RegistrationAuditRow[]>([]);
  const [isLoadingBackendAudit, setIsLoadingBackendAudit] = useState(import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend');

  useEffect(() => {
    if (import.meta.env.VITE_AUTH_SERVICE_MODE !== 'backend') return undefined;

    let isMounted = true;
    void backendApplicationService.listRegistrationSubmittedAuditLogs()
      .then((result) => {
        if (!isMounted) return;
        if (result.ok === false) {
          setBackendAuditRows([]);
          return;
        }
        setBackendAuditRows(result.data.map(mapBackendAuditLogToRow));
      })
      .finally(() => {
        if (isMounted) setIsLoadingBackendAudit(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend') {
      return backendAuditRows;
    }

    return auditLogs
      .filter((log) => log.action === 'REGISTRATION_SUBMITTED')
      .map((log) => {
        const details = parseRegistrationAuditDetails(log.details);
        return {
          id: log.id,
          timestamp: details.timestamp || log.timestamp,
          sessionId: details.sessionId || 'UNAVAILABLE',
          actor: log.userId,
          applicationId: details.applicationId || 'UNAVAILABLE',
          registrationId: details.registrationId || 'UNAVAILABLE',
          applicantId: details.applicantId || 'UNAVAILABLE',
          candidateId: details.candidateId || details.applicantId || details.registrationId || 'UNAVAILABLE',
          accountId: details.accountId || 'UNAVAILABLE',
          ipAddress: details.ipAddress || 'TBD_BACKEND_CAPTURE',
          deviceBrowser: details.deviceBrowser || 'UNAVAILABLE',
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, backendAuditRows]);

  const filteredRows = rows.filter((row) => {
    const query = searchTerm.toLowerCase();
    return (
      !query ||
      row.candidateId.toLowerCase().includes(query) ||
      row.applicationId.toLowerCase().includes(query) ||
      row.registrationId.toLowerCase().includes(query) ||
      row.applicantId.toLowerCase().includes(query) ||
      row.accountId.toLowerCase().includes(query) ||
      row.sessionId.toLowerCase().includes(query) ||
      row.actor.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy mb-2 tracking-tight">Successful Registration Audit Logs</h1>
          <p className="text-philsa-gray text-xs font-black uppercase tracking-[0.2em] opacity-60">Submitted review application registrations only</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 w-fit">
          <Download className="w-4 h-4" /> Export Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'Successful Registrations', value: rows.length, icon: CheckCircle2, color: 'bg-emerald-500' },
          { label: 'Captured Sessions', value: new Set(rows.map(row => row.sessionId)).size, icon: Activity, color: 'bg-philsa-navy' },
        ].map((stat) => (
          <div key={stat.label} className="card-philsa !p-6 flex items-center gap-5 bg-white border border-philsa-border">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1 leading-none">{stat.label}</p>
              <p className="text-2xl font-black text-philsa-navy tracking-tighter leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-philsa !p-0 overflow-hidden">
        <div className="p-6 border-b border-philsa-border">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <input
              type="text"
              placeholder="Search candidate ID, registration ID, account ID, session, or actor..."
              className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10 transition-all font-medium"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Timestamp</th>
                <th className="px-8 py-5">Registration</th>
                <th className="px-8 py-5">Account</th>
                <th className="px-8 py-5">Session</th>
                <th className="px-8 py-5">Device / Browser</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-sm font-semibold text-philsa-gray">
                    {isLoadingBackendAudit
                      ? 'Loading successful registration audit logs...'
                      : 'No successful registration audit logs have been captured.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-philsa-bg/40 transition-colors group align-top">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs font-black text-philsa-navy">
                        <Clock className="w-4 h-4 text-philsa-gray" />
                        {new Date(row.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                      </div>
                      <p className="text-[9px] text-philsa-gray font-bold mt-1 tracking-widest uppercase">IP: {row.ipAddress}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-philsa-navy">{row.candidateId}</p>
                      <p className="text-[10px] text-philsa-gray font-bold mt-1">Application: {row.applicationId}</p>
                      <p className="text-[10px] text-philsa-gray font-bold mt-1">Applicant: {row.applicantId}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-philsa-navy">{row.accountId}</p>
                      <p className="text-[10px] text-philsa-gray font-bold mt-1">Actor: {row.actor}</p>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-philsa-navy">{row.sessionId}</td>
                    <td className="px-8 py-6">
                      <p className="max-w-sm text-[11px] font-bold text-philsa-navy break-words">{row.deviceBrowser}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full tracking-widest border shadow-sm uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        Submitted
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function mapBackendAuditLogToRow(log: BackendRegistrationSubmittedAuditLog): RegistrationAuditRow {
  return {
    id: String(log.id),
    timestamp: log.timestamp,
    sessionId: log.sessionId || log.correlation_id || 'UNAVAILABLE',
    actor: log.actor || 'ANONYMOUS',
    applicationId: log.applicationId || 'UNAVAILABLE',
    registrationId: log.registrationId || 'UNAVAILABLE',
    applicantId: log.applicantId || 'UNAVAILABLE',
    candidateId: log.candidateId || log.applicantId || log.registrationId || 'UNAVAILABLE',
    accountId: log.accountId || 'UNAVAILABLE',
    ipAddress: log.ipAddress || 'UNAVAILABLE',
    deviceBrowser: log.deviceBrowser || 'UNAVAILABLE',
  };
}
