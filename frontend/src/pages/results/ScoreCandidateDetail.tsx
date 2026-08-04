import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Fingerprint,
  MapPin,
  MessageSquare,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import type { Application } from '../../types';
import { usePhilSA } from '../../PhilSAContext';
import SuccessModal from '../../components/SuccessModal';
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

const REASSIGNMENT_CENTERS = [
  'PUP ICT Center — 142 Seats Avail (Operational)',
  'UP Manila CMS — 12 Seats Avail (Near Full)',
];

export default function ScoreCandidateDetail() {
  const { batchId, candidateId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addAuditLog } = usePhilSA();

  const stateResult = (location.state as { result?: ScoreManagementResult } | null)?.result ?? null;
  const [result, setResult] = useState<ScoreManagementResult | null>(stateResult);
  const [isLoading, setIsLoading] = useState(!stateResult);
  const [errorMessage, setErrorMessage] = useState('');

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);

  const [remarks, setRemarks] = useState('');
  const [decisionStatus, setDecisionStatus] = useState<Application['status']>('PENDING');
  const [reviewActionTaken, setReviewActionTaken] = useState<'APPROVE' | 'REJECT' | 'CORRECTION' | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(REASSIGNMENT_CENTERS[0]);
  const [toastMessage, setToastMessage] = useState('');
  const [successConfig, setSuccessConfig] = useState<{
    isOpen: boolean;
    type: 'ACCEPTED' | 'REJECTED' | 'FOR_CORRECTION';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'ACCEPTED', title: '', message: '' });

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
      setRemarks('');
      return;
    }

    let cancelled = false;
    setIsLoadingApplication(true);

    void backendApplicationService.getApplicationByLrn(result.lrn).then((response) => {
      if (cancelled) return;
      setIsLoadingApplication(false);
      if (response.ok === false) {
        setApplication(null);
        setRemarks('');
        return;
      }
      const data: BackendApplication = response.data;
      const mapped = mapBackendApplicationToFrontend(data, data.id);
      setApplication(mapped);
      setDecisionStatus(mapped.status);
      setReviewActionTaken(null);
      const reviewStep = data.reviewStep ?? {};
      setRemarks(firstNonEmptyString(reviewStep.reviewerReason, reviewStep.reason, reviewStep.reviewNotes));
    });

    return () => {
      cancelled = true;
    };
  }, [result?.lrn]);

  const isDecisionFinal = reviewActionTaken !== null;

  const handleDecision = (action: 'APPROVE' | 'REJECT') => {
    if (isDecisionFinal || !application) return;
    const newStatus = action === 'APPROVE' ? 'ACCEPTED' : 'REJECTED';
    setDecisionStatus(newStatus);
    setReviewActionTaken(action);
    addAuditLog('SCORE_MANAGEMENT_CANDIDATE_REVIEW', JSON.stringify({
      candidateId: application.candidateId,
      applicationId: application.id,
      status: newStatus,
      remarks: remarks.trim(),
      timestamp: new Date().toISOString(),
    }));
    setSuccessConfig({
      isOpen: true,
      type: newStatus,
      title: `Application ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      message: `${application.firstName} ${application.lastName}'s application has been marked ${action === 'APPROVE' ? 'ACCEPTED' : 'REJECTED'} and logged in the audit trail.`,
    });
  };

  const submitCorrection = () => {
    if (!application) return;
    setIsCorrectionModalOpen(false);
    setDecisionStatus('FOR_CORRECTION');
    setReviewActionTaken('CORRECTION');
    addAuditLog('SCORE_MANAGEMENT_CANDIDATE_REVIEW', JSON.stringify({
      candidateId: application.candidateId,
      applicationId: application.id,
      status: 'FOR_CORRECTION',
      remarks: correctionReason.trim(),
      timestamp: new Date().toISOString(),
    }));
    setSuccessConfig({
      isOpen: true,
      type: 'FOR_CORRECTION',
      title: 'Sent for Correction',
      message: 'The student has been notified to revise their application based on your feedback.',
    });
    setCorrectionReason('');
  };

  const confirmReassignment = () => {
    setIsReassignModalOpen(false);
    setToastMessage(`Candidate reassigned to ${selectedCenter.split(' — ')[0]}.`);
    window.setTimeout(() => setToastMessage(''), 3500);
  };

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
                  className={cn(
                    'w-full bg-philsa-bg border-none rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-philsa-red/10 outline-none min-h-[160px] resize-none shadow-inner',
                    isDecisionFinal && 'cursor-not-allowed text-philsa-gray',
                  )}
                  placeholder={isDecisionFinal ? 'Application decision is final. Reviewer directives are read-only.' : 'Provide detailed compliance notes or remediation instructions...'}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  readOnly={isDecisionFinal}
                  aria-readonly={isDecisionFinal}
                />

                <div className="mt-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-8 bg-philsa-bg/30 rounded-3xl border border-philsa-border border-dashed">
                  <p className="flex items-center gap-2 text-xs font-bold italic text-philsa-navy">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> All personal data cross-referenced with PhilSys registry.
                  </p>
                  {!isDecisionFinal && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setIsReassignModalOpen(true)}
                        className="bg-white border border-philsa-border text-philsa-navy font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-bg active:scale-[0.98] shadow-sm transition-all flex items-center gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Reassign Center
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCorrectionModalOpen(true)}
                        className="bg-amber-50 border border-amber-200 text-amber-700 font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-amber-100 active:scale-[0.98] shadow-sm transition-all flex items-center gap-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Correction
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision('REJECT')}
                        className="bg-white border border-philsa-red/20 text-philsa-red font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-red hover:text-white active:scale-[0.98] shadow-sm transition-all flex items-center gap-2"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision('APPROVE')}
                        className="bg-philsa-red text-white font-black py-3 px-7 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-red/90 active:scale-[0.98] shadow-lg shadow-philsa-red/20 transition-all flex items-center gap-2"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    </div>
                  )}
                  {decisionStatus === 'REJECTED' && (
                    <div className="w-full rounded-2xl border border-philsa-red/20 bg-philsa-red/5 px-5 py-4 text-left">
                      <p className="text-[9px] font-black uppercase tracking-widest text-philsa-red mb-1">Rejection Reason</p>
                      <p className="text-xs font-bold text-philsa-navy leading-relaxed">{remarks.trim() || 'No rejection reason recorded.'}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {isCorrectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-philsa-border bg-philsa-bg/30">
                <h3 className="text-xl font-black text-philsa-navy uppercase tracking-tight">Return for <span className="text-philsa-red">Correction</span></h3>
                <p className="text-[10px] text-philsa-gray font-black mt-1 uppercase tracking-widest">Flagging application for student revisions</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-philsa-red uppercase tracking-widest px-1">Specific Correction Directives *</label>
                  <textarea
                    rows={6}
                    value={correctionReason}
                    onChange={(event) => setCorrectionReason(event.target.value)}
                    placeholder="Please specify exactly what the student needs to update (e.g., Blurred Birth Certificate, Invalid LRN, Missing Transcripts)..."
                    className="w-full bg-philsa-bg border border-philsa-border rounded-3xl p-6 text-xs font-bold text-philsa-navy focus:ring-4 focus:ring-philsa-red/5 outline-none shadow-inner"
                  />
                  <p className="text-[9px] text-philsa-gray font-medium italic">* This message will be sent directly to the student via email and portal dashboard.</p>
                </div>
              </div>

              <div className="p-8 bg-philsa-bg/30 border-t border-philsa-border flex gap-3">
                <button type="button" onClick={() => setIsCorrectionModalOpen(false)} className="flex-1 py-4 bg-white border border-philsa-border text-philsa-navy text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-philsa-bg transition-all">Cancel</button>
                <button
                  type="button"
                  onClick={submitCorrection}
                  disabled={!correctionReason.trim()}
                  className="flex-[2] py-4 bg-philsa-red text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-philsa-red/20 hover:bg-philsa-red/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Send Resolution Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReassignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-philsa-border bg-philsa-bg/30">
                <h3 className="text-xl font-black text-philsa-navy uppercase tracking-tight">Relocation Protocol — <span className="text-philsa-red">Reassign Center</span></h3>
                <p className="text-[10px] text-philsa-gray font-black mt-1 uppercase tracking-widest">Redistribute candidate to a different testing facility</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-philsa-gray px-1">System-Targeted Centers</label>
                  <div className="relative">
                    <select
                      value={selectedCenter}
                      onChange={(event) => setSelectedCenter(event.target.value)}
                      className="w-full bg-philsa-bg border border-philsa-border rounded-2xl pl-4 pr-10 py-4 text-xs font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-philsa-navy/5 appearance-none"
                    >
                      {REASSIGNMENT_CENTERS.map((center) => (
                        <option key={center} value={center}>{center}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
                  </div>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight text-amber-900 mb-1">Institutional Redistribution Triggered</p>
                    <p className="text-xs font-medium text-amber-800 leading-relaxed">
                      Reassigning this candidate will automatically invalidate their current physical permit and trigger an immediate notification dispatch.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-philsa-bg/30 border-t border-philsa-border flex gap-3">
                <button type="button" onClick={() => setIsReassignModalOpen(false)} className="flex-1 py-4 bg-white border border-philsa-border text-philsa-navy text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-philsa-bg transition-all">Cancel</button>
                <button
                  type="button"
                  onClick={confirmReassignment}
                  className="flex-[2] py-4 bg-philsa-navy text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-philsa-navy/90 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" /> Confirm Reassignment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-[#00563F]/10 bg-[#00563F] px-6 py-4 text-xs font-bold text-white shadow-2xl"
          >
            <CheckCircle className="h-5 w-5 shrink-0 text-white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <SuccessModal
        isOpen={successConfig.isOpen}
        onClose={() => setSuccessConfig((prev) => ({ ...prev, isOpen: false }))}
        type={successConfig.type}
        title={successConfig.title}
        message={successConfig.message}
        actionLabel="Okay"
      />
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
