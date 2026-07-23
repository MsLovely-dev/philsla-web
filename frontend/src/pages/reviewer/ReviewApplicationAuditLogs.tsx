import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  Download,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { backendApplicationService, type BackendRegistrationSubmittedAuditLog } from '../../services/backendApplicationService';

type RegistrationAuditRow = {
  id: string;
  action: RegistrationAuditAction;
  auditEvent: string;
  details: string;
  trigger: string;
  capturedData: string[];
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

type RegistrationAuditAction = 'REGISTRATION_OTP_VERIFICATION_SUCCESSFUL' | 'REGISTRATION_ACCOUNT_CREDENTIALS_CREATED' | 'REGISTRATION_SUBMITTED';

const REGISTRATION_AUDIT_EVENTS: Record<RegistrationAuditAction, { label: string; details: string; trigger: string; status: string }> = {
  REGISTRATION_OTP_VERIFICATION_SUCCESSFUL: {
    label: 'OTP Verification Successful',
    details: 'Email verified successfully.',
    trigger: 'Applicant enters the correct OTP.',
    status: 'Verified',
  },
  REGISTRATION_ACCOUNT_CREDENTIALS_CREATED: {
    label: 'Account Credentials Created',
    details: 'Student Portal credentials created.',
    trigger: 'Applicant successfully creates their email and password after email verification.',
    status: 'Created',
  },
  REGISTRATION_SUBMITTED: {
    label: 'Registration Submitted',
    details: 'Registration submitted for admission review.',
    trigger: 'Applicant successfully submits the registration.',
    status: 'Submitted',
  },
};

function getCapturedDataForAction(action: RegistrationAuditAction, details: {
  timestamp: string;
  maskedEmailAddress?: string;
  accountId?: string;
  registrationId?: string;
  ipAddress?: string;
  deviceBrowser?: string;
}) {
  if (action === 'REGISTRATION_OTP_VERIFICATION_SUCCESSFUL') {
    return [
      `Masked Email Address: ${details.maskedEmailAddress || 'UNAVAILABLE'}`,
      `Timestamp: ${formatAuditTimestamp(details.timestamp)}`,
    ];
  }
  if (action === 'REGISTRATION_ACCOUNT_CREDENTIALS_CREATED') {
    return [
      `Account ID: ${details.accountId || 'UNAVAILABLE'}`,
      `Masked Email Address: ${details.maskedEmailAddress || 'UNAVAILABLE'}`,
      `Timestamp: ${formatAuditTimestamp(details.timestamp)}`,
    ];
  }
  return [
    `Registration ID: ${details.registrationId || 'UNAVAILABLE'}`,
    `Timestamp: ${formatAuditTimestamp(details.timestamp)}`,
    `IP Address: ${details.ipAddress || 'UNAVAILABLE'}`,
    `Device/Browser: ${details.deviceBrowser || 'UNAVAILABLE'}`,
  ];
}

function formatAuditTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'UNAVAILABLE';
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function formatAuditDateTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'UNAVAILABLE';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(',', '');
}

export default function ReviewApplicationAuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [backendAuditRows, setBackendAuditRows] = useState<RegistrationAuditRow[]>([]);
  const [isLoadingBackendAudit, setIsLoadingBackendAudit] = useState(true);

  useEffect(() => {
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
    return backendAuditRows
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [backendAuditRows]);

  const filteredRows = rows.filter((row) => {
    const query = searchTerm.toLowerCase();
    return (
      !query ||
      formatAuditDateTime(row.timestamp).toLowerCase().includes(query) ||
      row.auditEvent.toLowerCase().includes(query) ||
      row.details.toLowerCase().includes(query) ||
      row.capturedData.join(' ').toLowerCase().includes(query) ||
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
          <h1 className="text-4xl font-black text-philsa-navy mb-2 tracking-tight">Registration Audit Logs</h1>
          <p className="text-philsa-gray text-xs font-black uppercase tracking-[0.2em] opacity-60">OTP, account credential, and submitted registration events</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 w-fit">
          <Download className="w-4 h-4" /> Export Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'Captured Events', value: rows.length, icon: ShieldCheck, color: 'bg-emerald-500' },
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
              placeholder="Search date, activity, details, registration ID, session, or actor..."
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
                <th className="px-8 py-5">Date &amp; Time</th>
                <th className="px-8 py-5">Activity</th>
                <th className="px-8 py-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center text-sm font-semibold text-philsa-gray">
                    {isLoadingBackendAudit
                      ? 'Loading registration audit logs...'
                      : 'No registration audit logs have been captured.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-philsa-bg/40 transition-colors group align-top">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs font-black text-philsa-navy">
                        <Clock className="w-4 h-4 text-philsa-gray" />
                        {formatAuditDateTime(row.timestamp)}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-philsa-navy">{row.auditEvent}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="max-w-xl text-xs font-bold text-philsa-navy leading-relaxed">{row.details}</p>
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
  const action = 'REGISTRATION_SUBMITTED';
  return {
    id: String(log.id),
    action,
    auditEvent: REGISTRATION_AUDIT_EVENTS[action].label,
    details: REGISTRATION_AUDIT_EVENTS[action].details,
    trigger: REGISTRATION_AUDIT_EVENTS[action].trigger,
    capturedData: getCapturedDataForAction(action, {
      timestamp: log.timestamp,
      registrationId: log.registrationId,
      ipAddress: log.ipAddress,
      deviceBrowser: log.deviceBrowser,
    }),
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
