import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Camera,
  ChevronLeft,
  Fingerprint,
  MessageSquare,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Application } from '../../types';
import {
  backendApplicationService,
  mapBackendApplicationToFrontend,
  type BackendApplication,
} from '../../services/backendApplicationService';
import {
  getScoreManagementBatchResultPage,
  scoreReleaseStatusLabel,
  type ScoreManagementResult,
} from '../../services/scoreManagementService';

const STATUS_BADGES: Record<string, string> = {
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  FOR_CORRECTION: 'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED: 'bg-philsa-red/5 text-philsa-red border-philsa-red/20',
};

const PWD_FIELD_KEYS = new Set(['isPwd', 'pwdType', 'pwdCondition', 'pwdIdNumber', 'pwdIdFilename', 'pwdAccommodation']);

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

interface VerificationLog {
  id: string;
  type: 'LRN_VERIFICATION' | 'FACIAL_RECOGNITION' | 'SELFIE_VERIFICATION';
  status: 'FAILED';
  timestamp: string;
  code: string;
  details: string;
  ip: string;
  device: string;
  attemptsLeft: number;
}

interface AuditEventSpec {
  event: string;
  trigger: string;
  data: string;
}

export default function ScoreCandidateDetail() {
  const { batchId, candidateId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stateResult = (location.state as { result?: ScoreManagementResult } | null)?.result ?? null;
  const [result, setResult] = useState<ScoreManagementResult | null>(stateResult);
  const [isLoading, setIsLoading] = useState(!stateResult);
  const [errorMessage, setErrorMessage] = useState('');

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');

  const [logSearch, setLogSearch] = useState('');
  const [logFilterType, setLogFilterType] = useState<'ALL' | 'LRN_VERIFICATION' | 'FACIAL_RECOGNITION' | 'SELFIE_VERIFICATION'>('ALL');

  useEffect(() => {
    if (stateResult || !batchId || !candidateId) return;

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage('');

    getScoreManagementBatchResultPage(batchId, { search: candidateId, pageSize: 1 })
      .then((page) => {
        if (cancelled) return;
        const match = page.results.find((row) => row.candidateId === candidateId) ?? page.results[0] ?? null;
        if (!match) {
          setErrorMessage('No score record found for this candidate.');
        }
        setResult(match);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : 'Unable to load candidate score.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [batchId, candidateId, stateResult]);

  useEffect(() => {
    if (!result?.lrn) {
      setApplication(null);
      setReviewerNotes('');
      return;
    }

    let cancelled = false;
    setIsLoadingApplication(true);

    void backendApplicationService.getApplicationByLrn(result.lrn).then((response) => {
      if (cancelled) return;
      setIsLoadingApplication(false);
      if (response.ok === false) {
        setApplication(null);
        setReviewerNotes('');
        return;
      }
      const data: BackendApplication = response.data;
      const mapped = mapBackendApplicationToFrontend(data, data.id);
      setApplication(mapped);
      const reviewStep = data.reviewStep ?? {};
      setReviewerNotes(firstNonEmptyString(reviewStep.reviewerReason, reviewStep.reason, reviewStep.reviewNotes));
    });

    return () => {
      cancelled = true;
    };
  }, [result?.lrn]);

  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
  const [auditEventSpecs, setAuditEventSpecs] = useState<AuditEventSpec[]>([]);
  const [showSpecRules, setShowSpecRules] = useState(true);

  useEffect(() => {
    if (!application?.id) {
      setVerificationLogs([]);
      setAuditEventSpecs([]);
      return;
    }
    const saved = localStorage.getItem(`philsa_failed_verification_logs_${application.id}`);
    if (!saved) {
      setVerificationLogs([]);
    } else {
      try {
        setVerificationLogs(JSON.parse(saved));
      } catch {
        setVerificationLogs([]);
      }
    }

    const savedSpecs = localStorage.getItem(`philsa_audit_event_specs_${application.id}`);
    if (!savedSpecs) {
      setAuditEventSpecs([]);
    } else {
      try {
        setAuditEventSpecs(JSON.parse(savedSpecs));
      } catch {
        setAuditEventSpecs([]);
      }
    }
  }, [application?.id]);

  const filteredLogs = useMemo(() => {
    return verificationLogs.filter((log) => {
      const matchesType = logFilterType === 'ALL' || log.type === logFilterType;
      const matchesSearch = logSearch === '' ||
        log.code.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.device.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.ip.toLowerCase().includes(logSearch.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [verificationLogs, logFilterType, logSearch]);

  const displayId = result?.candidateId ?? candidateId ?? '';

  let percentileValue = 'N/A';
  if (result?.percentile !== null && result?.percentile !== undefined) {
    percentileValue = result.percentile.toFixed(2);
  }

  const registrationFields: Record<string, string> = application?.additionalHighPriorityFields ?? {};
  const additionalRegistrationFields = Object.entries(registrationFields).filter(
    (field): field is [string, string] => !PWD_FIELD_KEYS.has(field[0]) && Boolean(field[1]),
  );
  const pwdFieldCandidates: Array<[string, string | undefined]> = [
    ['PWD', registrationFields.isPwd],
    ['PWD Type', registrationFields.pwdType],
    ['Condition', registrationFields.pwdCondition],
    ['PWD ID Number', registrationFields.pwdIdNumber],
    ['PWD ID Attachment', registrationFields.pwdIdFilename],
    ['Accommodation Needed', registrationFields.pwdAccommodation],
  ];
  const pwdFields = pwdFieldCandidates.filter((field): field is [string, string] => Boolean(field[1]));

  return (
    <div className="space-y-8 font-sans">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-philsa-bg rounded-lg transition-colors border border-philsa-border shadow-sm text-philsa-red"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-philsa-navy tracking-tight uppercase">
          Candidate Result: {displayId}
        </h1>
      </div>

      <div className="inline-flex items-center gap-2 bg-white border border-philsa-border rounded-2xl px-5 py-3 shadow-sm w-fit">
        <User className="w-4 h-4 text-philsa-red" />
        <span className="text-sm font-bold text-philsa-navy">Student Profile & Application Details</span>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="card-philsa p-10 bg-white border border-philsa-border text-center text-xs italic text-slate-400">
          Loading candidate examination record...
        </div>
      )}

      {!isLoading && result && (
        <div className="card-philsa p-10 bg-white border border-philsa-border relative overflow-hidden space-y-10">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <User className="w-32 h-32 text-philsa-navy" />
          </div>

          <div className="space-y-4 relative z-10 text-philsa-navy">
            <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00563F]" /> Examination Result
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
              <DataRow label="Examination Set" value={result.examSetId || result.examName} />
              <DataRow label="Final Score" value={result.finalScoreDisplay} />
              <DataRow label="Percentile Rank" value={percentileValue} />
              <DataRow label="Overall Rank" value={result.rank === null ? 'N/A' : `#${result.rank}`} />
              <DataRow label="Result Status" value={scoreReleaseStatusLabel(result.releaseStatus)} />
            </div>
          </div>

          {isLoadingApplication && (
            <p className="text-[10px] font-black uppercase tracking-widest text-philsa-gray relative z-10">
              Loading registered candidate information...
            </p>
          )}

          {application && (
            <>
              <div className="space-y-4 relative z-10 text-philsa-navy">
                <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#00563F]" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                    <DataRow label="First Name" value={application.firstName} />
                    <DataRow label="Middle Name" value={application.middleName || 'None'} />
                    <DataRow label="Last Name" value={application.lastName} />
                    <DataRow label="Suffix" value={application.suffix || 'None'} />
                    <DataRow label="Date of Birth" value={application.dob} />
                    <DataRow label="Gender" value={application.gender || 'Unspecified'} />
                    <DataRow label="Place of Birth" value={application.birthPlace || 'Unspecified'} />
                    <DataRow label="Nationality" value={application.nationality || 'Filipino'} />
                    <DataRow label="Email Address" value={application.email} />
                    <DataRow label="Mobile Number" value={application.mobile} />
                  </div>

                  <div className="lg:col-span-1 rounded-xl border border-gray-100 bg-gray-50/50 p-6 flex flex-col items-center text-center">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white border-4 border-white mb-4 shadow-lg ring-1 ring-philsa-border flex items-center justify-center">
                      {application.photoUrl ? (
                        <img
                          src={application.photoUrl}
                          alt={`${application.firstName} ${application.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-14 h-14 text-slate-300" />
                      )}
                    </div>
                    <h2 className="text-sm font-black text-philsa-navy leading-tight">
                      {application.firstName} {application.lastName}
                    </h2>
                    <p className="text-philsa-red text-[10px] font-black uppercase tracking-widest mt-1 mb-3">
                      {application.candidateId}
                    </p>
                    <span className={cn(
                      'inline-flex items-center px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest',
                      STATUS_BADGES[application.status] ?? 'bg-slate-50 text-slate-600 border-slate-200',
                    )}>
                      {application.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10 text-philsa-navy">
                <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00563F]" /> Registry & Educational Background
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                  <DataRow label="Learner Reference Number (LRN)" value={application.lrn} />
                  <DataRow label="School ID" value={application.schoolId || 'Unspecified'} />
                  <DataRow label="High School Name" value={application.schoolName} />
                  <DataRow label="High School Address" value={application.schoolAddress} />
                  <DataRow label="Academic Track" value={application.academicTrack} />
                  <DataRow label="Grade Level" value={application.gradeLevel} />
                  <DataRow label="Enrollment Status" value={application.enrollmentStatus || 'Unspecified'} />
                  <DataRow label="School Year" value={application.schoolYear || 'Unspecified'} />
                  <DataRow label="GWA" value={String(application.gwa || 'Unspecified')} />
                  {additionalRegistrationFields.map(([field, value]) => (
                    <DataRow key={field} label={field} value={value} />
                  ))}
                </div>
              </div>

              <div className="space-y-4 relative z-10 text-philsa-navy">
                <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#00563F]" /> Person With Disability (PWD) Status & Accommodations
                </h3>
                {pwdFields.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                    {pwdFields.map(([field, value]) => (
                      <DataRow key={field} label={field} value={value} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-6 flex items-center gap-3">
                    <User className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs font-semibold text-amber-800 italic">
                      Student candidate declared no disability or special examination accommodations during registration.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 relative z-10 text-philsa-navy">
                <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-[#8A1538]/20">
                  <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-[#00563F]" /> Biometric & Identity Verification Logs
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSpecRules((current) => !current)}
                    className="text-[10px] font-bold text-slate-500 hover:text-philsa-navy underline underline-offset-2 shrink-0"
                  >
                    {showSpecRules ? 'Hide' : 'Show'} Specification Rules
                  </button>
                </div>
                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60 space-y-6">

                  {showSpecRules && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/60 overflow-hidden">
                      <div className="px-4 py-3 border-b border-amber-100 bg-amber-100/40">
                        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-800">
                          <ShieldAlert className="w-3.5 h-3.5" /> Audit Event Trigger & Data Capture Specifications
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-2 whitespace-nowrap">Audit Event</th>
                              <th className="px-4 py-2">Trigger</th>
                              <th className="px-4 py-2">Data to Capture</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100/70">
                            {auditEventSpecs.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-4 py-6 text-center text-amber-700/70 italic font-medium">
                                  No audit event specifications recorded for this application.
                                </td>
                              </tr>
                            ) : (
                              auditEventSpecs.map((spec) => (
                                <tr key={spec.event}>
                                  <td className="px-4 py-2.5 font-bold text-philsa-navy whitespace-nowrap align-top">{spec.event}</td>
                                  <td className="px-4 py-2.5 text-slate-600 align-top">{spec.trigger}</td>
                                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 align-top">{spec.data}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
                    <div className="flex flex-wrap gap-1.5">
                      {(['ALL', 'LRN_VERIFICATION', 'FACIAL_RECOGNITION', 'SELFIE_VERIFICATION'] as const).map((t) => {
                        const count = t === 'ALL' ? verificationLogs.length : verificationLogs.filter((l) => l.type === t).length;
                        const label = t === 'ALL' ? 'All Failures' : t.replace('_', ' ');
                        const isSelected = logFilterType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setLogFilterType(t)}
                            className={cn(
                              'px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer',
                              isSelected
                                ? 'bg-slate-800 text-white shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200',
                            )}
                          >
                            {label}
                            <span className={cn(
                              'px-1.5 py-0.2 rounded-full text-[8px] font-mono',
                              isSelected ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500',
                            )}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative max-w-xs w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter details or log code..."
                        value={logSearch}
                        onChange={(event) => setLogSearch(event.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-philsa-blue text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 bg-slate-50">Timestamp & ID</th>
                            <th className="px-4 py-3 bg-slate-50">Trace Type</th>
                            <th className="px-4 py-3 bg-slate-50">Error Code & Details</th>
                            <th className="px-4 py-3 bg-slate-50">Device & Client IP</th>
                            <th className="px-4 py-3 text-right bg-slate-50">Attempts Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                                No matched verification failures found for this candidate.
                              </td>
                            </tr>
                          ) : (
                            filteredLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-red-50/5 transition-colors">
                                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                                  <div className="font-bold text-slate-700">{log.timestamp}</div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">{log.id}</div>
                                </td>
                                <td className="px-4 py-3">
                                  {log.type === 'LRN_VERIFICATION' && (
                                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                      <BookOpen className="w-2.5 h-2.5" /> LRN Sync
                                    </span>
                                  )}
                                  {log.type === 'FACIAL_RECOGNITION' && (
                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                      <Fingerprint className="w-2.5 h-2.5" /> Facial Bio
                                    </span>
                                  )}
                                  {log.type === 'SELFIE_VERIFICATION' && (
                                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                      <Camera className="w-2.5 h-2.5" /> Selfie Match
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 max-w-xs md:max-w-md">
                                  <div className="font-mono font-black text-philsa-navy text-[10px] flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3 text-philsa-red" />
                                    {log.code}
                                  </div>
                                  <p className="text-[10px] text-slate-600 mt-1 font-medium leading-relaxed break-words">
                                    {log.details}
                                  </p>
                                </td>
                                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                                  <div className="font-bold text-slate-700 truncate max-w-[140px]" title={log.device}>{log.device}</div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">IP: {log.ip}</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                      <XCircle className="w-2.5 h-2.5" /> FAILED
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-bold">
                                      Attempts left: <span className="font-mono font-extrabold text-philsa-red">{log.attemptsLeft}</span>
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-philsa-border relative z-10">
                <h3 className="text-[10px] font-black text-philsa-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-philsa-red" /> Official Reviewer Directives
                </h3>
                <textarea
                  className="w-full bg-philsa-bg border-none rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-philsa-red/10 outline-none min-h-[160px] resize-none shadow-inner text-philsa-navy"
                  placeholder="Provide detailed compliance notes or remediation instructions..."
                  value={reviewerNotes}
                  onChange={(event) => setReviewerNotes(event.target.value)}
                />

                <div className="mt-10 p-8 bg-philsa-bg/30 rounded-3xl border border-philsa-border border-dashed">
                  <p className="flex items-center gap-2 text-xs font-bold italic text-philsa-navy">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> All personal data cross-referenced with PhilSys registry.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}

function DataRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-philsa-navy leading-snug">{value}</p>
    </div>
  );
}
