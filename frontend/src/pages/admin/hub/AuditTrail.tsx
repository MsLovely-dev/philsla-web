import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  Download,
  Filter,
  FileCheck2,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { backendApplicationService, type BackendRegistrationSubmittedAuditLog } from '../../../services/backendApplicationService';

type RegistrationAuditAction = 'REGISTRATION_ACCOUNT_CREDENTIALS_CREATED' | 'REGISTRATION_STUDENT_ACCOUNT_ACTIVATED' | 'REGISTRATION_SUBMITTED';

type StudentRegistrationAuditRow = {
  id: string;
  action: RegistrationAuditAction;
  timestamp: string;
  candidateId: string;
  activity: string;
  user: string;
  details: string;
  registrationId: string;
  sessionId: string;
  ipAddress: string;
  actor: string;
};

const REGISTRATION_AUDIT_EVENTS: Record<RegistrationAuditAction, { label: string; details: string }> = {
  REGISTRATION_ACCOUNT_CREDENTIALS_CREATED: {
    label: 'Account Credentials Created',
    details: 'Student Portal credentials created.',
  },
  REGISTRATION_STUDENT_ACCOUNT_ACTIVATED: {
    label: 'Student Account Activated',
    details: 'Student account activated after application approval.',
  },
  REGISTRATION_SUBMITTED: {
    label: 'Registration Submitted',
    details: 'Registration submitted for admission review.',
  },
};

export default function AuditTrail() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activityFilter, setActivityFilter] = useState<RegistrationAuditAction | 'ALL'>('ALL');
  const [candidateFilter, setCandidateFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [studentRegistrationAuditRows, setStudentRegistrationAuditRows] = useState<StudentRegistrationAuditRow[]>([]);
  const [isLoadingStudentRegistrationAudit, setIsLoadingStudentRegistrationAudit] = useState(true);

  useEffect(() => {
    let isMounted = true;
    void backendApplicationService.listRegistrationSubmittedAuditLogs()
      .then((result) => {
        if (!isMounted) return;
        if (result.ok === false) {
          setStudentRegistrationAuditRows([]);
          return;
        }
        setStudentRegistrationAuditRows(result.data.map(mapStudentRegistrationAuditLogToRow));
      })
      .finally(() => {
        if (isMounted) setIsLoadingStudentRegistrationAudit(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return studentRegistrationAuditRows
      .filter((row) => (
        !query ||
        formatAuditDateTime(row.timestamp).toLowerCase().includes(query) ||
        row.candidateId.toLowerCase().includes(query) ||
        row.activity.toLowerCase().includes(query) ||
        row.user.toLowerCase().includes(query) ||
        row.details.toLowerCase().includes(query) ||
        row.registrationId.toLowerCase().includes(query) ||
        row.sessionId.toLowerCase().includes(query) ||
        row.ipAddress.toLowerCase().includes(query) ||
        row.actor.toLowerCase().includes(query)
      ))
      .filter((row) => activityFilter === 'ALL' || row.action === activityFilter)
      .filter((row) => !candidateFilter || row.candidateId.toLowerCase().includes(candidateFilter.toLowerCase()))
      .filter((row) => !sessionFilter || row.sessionId.toLowerCase().includes(sessionFilter.toLowerCase()))
      .filter((row) => isWithinDateRange(row.timestamp, dateFromFilter, dateToFilter))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [
    activityFilter,
    candidateFilter,
    dateFromFilter,
    dateToFilter,
    searchQuery,
    sessionFilter,
    studentRegistrationAuditRows,
  ]);

  const hasActiveFilters = Boolean(
    activityFilter !== 'ALL' ||
    candidateFilter ||
    sessionFilter ||
    dateFromFilter ||
    dateToFilter,
  );

  const clearFilters = () => {
    setActivityFilter('ALL');
    setCandidateFilter('');
    setSessionFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const summaryCards = useMemo(() => {
    const countByAction = (action: RegistrationAuditAction) =>
      studentRegistrationAuditRows.filter((row) => row.action === action).length;
    const uniqueCandidateCount = new Set(
      studentRegistrationAuditRows
        .map((row) => row.candidateId)
        .filter((candidateId) => candidateId && candidateId !== 'UNAVAILABLE'),
    ).size;
    const uniqueSessionCount = new Set(
      studentRegistrationAuditRows
        .map((row) => row.sessionId)
        .filter((sessionId) => sessionId && sessionId !== 'UNAVAILABLE'),
    ).size;

    return [
      { label: 'Captured Events', value: studentRegistrationAuditRows.length, icon: ShieldCheck, color: 'bg-emerald-500' },
      { label: 'Registrations Submitted', value: countByAction('REGISTRATION_SUBMITTED'), icon: FileCheck2, color: 'bg-philsa-red' },
      { label: 'Accounts Activated', value: countByAction('REGISTRATION_STUDENT_ACCOUNT_ACTIVATED'), icon: UserCheck, color: 'bg-violet-600' },
      { label: 'Unique Candidates', value: uniqueCandidateCount, icon: Activity, color: 'bg-philsa-navy' },
      { label: 'Captured Sessions', value: uniqueSessionCount, icon: Clock, color: 'bg-slate-800' },
    ];
  }, [studentRegistrationAuditRows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">Audit Logs</h1>
          <p className="text-philsa-gray text-sm font-medium">Student Registration audit events recorded by the backend.</p>
        </div>
        <button className="btn-secondary py-2.5 px-6 text-sm flex items-center gap-2 w-fit">
          <Download className="w-4 h-4" /> Export Action Logs
        </button>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid grid-cols-5 gap-4 min-w-[1100px]">
          {summaryCards.map((stat) => (
            <div key={stat.label} className="card-philsa !p-5 flex items-center gap-4 bg-white border border-philsa-border min-h-[88px]">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1 leading-tight truncate">{stat.label}</p>
                <p className="text-2xl font-black text-philsa-navy tracking-tighter leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full space-y-4">
        <div className="flex border-b border-philsa-border/80 flex-wrap">
          <button className="py-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 border-philsa-red text-philsa-red bg-philsa-red/5 font-extrabold">
            <ShieldCheck className="w-4 h-4 text-inherit" />
            Student Registration
          </button>
        </div>

        <div className="card-philsa !p-0 overflow-hidden">
          <div className="p-6 border-b border-philsa-border">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="relative max-w-2xl flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search date, candidate ID, IP address, activity, user, details, registration ID, session, or actor..."
                  className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10 shadow-inner"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className={cn(
                  'btn-secondary py-3 px-5 text-sm flex items-center justify-center gap-2 w-fit',
                  hasActiveFilters && 'border-philsa-red text-philsa-red bg-philsa-red/5',
                )}
              >
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {showFilters && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">Activity</span>
                  <select
                    value={activityFilter}
                    onChange={(event) => setActivityFilter(event.target.value as RegistrationAuditAction | 'ALL')}
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-3 text-sm font-semibold text-philsa-navy focus:ring-2 focus:ring-philsa-red/10"
                  >
                    <option value="ALL">All Activities</option>
                    {Object.entries(REGISTRATION_AUDIT_EVENTS).map(([action, event]) => (
                      <option key={action} value={action}>{event.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">Candidate ID</span>
                  <input
                    type="text"
                    value={candidateFilter}
                    onChange={(event) => setCandidateFilter(event.target.value)}
                    placeholder="PS-2026..."
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-3 text-sm font-semibold text-philsa-navy focus:ring-2 focus:ring-philsa-red/10"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">Session ID</span>
                  <input
                    type="text"
                    value={sessionFilter}
                    onChange={(event) => setSessionFilter(event.target.value)}
                    placeholder="REG-SESSION..."
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-3 text-sm font-semibold text-philsa-navy focus:ring-2 focus:ring-philsa-red/10"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">From</span>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(event) => setDateFromFilter(event.target.value)}
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-3 text-sm font-semibold text-philsa-navy focus:ring-2 focus:ring-philsa-red/10"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">To</span>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(event) => setDateToFilter(event.target.value)}
                    className="w-full bg-philsa-bg border border-philsa-border rounded-xl px-4 py-3 text-sm font-semibold text-philsa-navy focus:ring-2 focus:ring-philsa-red/10"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="btn-secondary py-3 px-5 text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Date &amp; Time</th>
                  <th className="px-8 py-5">Candidate ID</th>
                  <th className="px-8 py-5">Session ID</th>
                  <th className="px-8 py-5">IP Address</th>
                  <th className="px-8 py-5">Activity</th>
                  <th className="px-8 py-5">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-philsa-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-sm font-semibold text-philsa-gray">
                      {isLoadingStudentRegistrationAudit
                        ? 'Loading student registration audit logs...'
                        : 'No student registration audit logs have been captured.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-philsa-bg/40 transition-colors group align-top">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-black text-philsa-navy">
                          <Clock className="w-4 h-4 text-philsa-gray" />
                          {formatAuditDateTime(row.timestamp)}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-xs font-black text-philsa-navy">{row.candidateId}</td>
                      <td className="px-8 py-6 text-xs font-black text-philsa-navy break-words">{row.sessionId}</td>
                      <td className="px-8 py-6 text-xs font-black text-philsa-navy">{row.ipAddress}</td>
                      <td className="px-8 py-6 text-xs font-black text-philsa-navy">{row.activity}</td>
                      <td className="px-8 py-6 text-xs font-black text-philsa-navy">{row.user}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapStudentRegistrationAuditLogToRow(log: BackendRegistrationSubmittedAuditLog): StudentRegistrationAuditRow {
  const action = log.action;
  return {
    id: String(log.id),
    action,
    timestamp: log.timestamp,
    candidateId: log.candidateId || log.applicantId || log.registrationId || 'UNAVAILABLE',
    activity: REGISTRATION_AUDIT_EVENTS[action].label,
    user: log.actorDisplay || formatActorRole(log.actorRole),
    details: REGISTRATION_AUDIT_EVENTS[action].details,
    registrationId: log.registrationId || 'UNAVAILABLE',
    sessionId: log.sessionId || log.correlation_id || 'UNAVAILABLE',
    ipAddress: log.ipAddress || 'UNAVAILABLE',
    actor: log.actor || 'ANONYMOUS',
  };
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

function isWithinDateRange(timestamp: string, dateFrom: string, dateTo: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;

  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00`);
    if (!Number.isNaN(from.getTime()) && date < from) return false;
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999`);
    if (!Number.isNaN(to.getTime()) && date > to) return false;
  }

  return true;
}

function formatActorRole(role: string) {
  if (!role) return 'Student';
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
