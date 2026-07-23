import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Check, 
  X, 
  XCircle,
  CheckCircle,
  BookOpen,
  User,
  MessageSquare,
  ChevronLeft,
  Fingerprint,
  Camera,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePhilSA } from '../../PhilSAContext';
import SuccessModal from '../../components/SuccessModal';
import { cn } from '../../lib/utils';
import type { Application } from '../../types';
import { backendApplicationService, mapBackendApplicationsToReviewRows } from '../../services/backendApplicationService';

type ReviewApplicationRecord = Application & {
  center: string;
  risk: string;
  duplicateScore: number;
  duplicateStatus: string;
  reviewerReason?: string;
  history: Array<{ status: string; date: string; actor: string; notes?: string }>;
};

const EMPTY_REVIEW_APPLICATION: ReviewApplicationRecord = {
  id: '',
  userId: '',
  status: 'PENDING',
  submittedAt: undefined,
  firstName: '',
  middleName: '',
  noMiddleName: false,
  lastName: '',
  suffix: '',
  dob: '',
  birthPlace: '',
  nationality: '',
  gender: '',
  email: '',
  mobile: '',
  nationalId: '',
  region: '',
  province: '',
  city: '',
  barangay: '',
  street: '',
  zipCode: '',
  lrn: '',
  schoolId: '',
  schoolName: '',
  schoolAddress: '',
  academicTrack: '',
  gradeLevel: '',
  enrollmentStatus: '',
  schoolYear: '',
  gwa: 0,
  universities: [],
  courses: [],
  examScheduleId: '',
  center: '',
  risk: '',
  duplicateScore: 0,
  duplicateStatus: '',
  reviewerReason: '',
  photoUrl: '',
  history: [],
  additionalHighPriorityFields: {},
};

const STATUS_BADGES = {
  'PENDING': 'bg-amber-100 text-amber-700 border-amber-200',
  'ASSIGNED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'REJECTED': 'bg-philsa-red/10 text-philsa-red border-philsa-red/20',
};

export default function ReviewerApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, addAuditLog } = usePhilSA();
  const [application, setApplication] = useState<ReviewApplicationRecord | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [applicationError, setApplicationError] = useState('');

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'BIOMETRICS'>('DETAILS');
  const [status, setStatus] = useState<string>(EMPTY_REVIEW_APPLICATION.status);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [remarks, setRemarks] = useState('');

  React.useEffect(() => {
    if (import.meta.env.VITE_AUTH_SERVICE_MODE !== 'backend' || !id) return;

    let cancelled = false;
    setIsLoadingApplication(true);
    setApplicationError('');

    void backendApplicationService.getApplication(id).then((result) => {
      if (cancelled) return;
      setIsLoadingApplication(false);

      if (result.ok === false) {
        setApplicationError(result.error.message);
        return;
      }

      const [mapped] = mapBackendApplicationsToReviewRows([result.data]);
      const reviewerReason = String(
        result.data.reviewStep?.reviewerReason ??
        result.data.reviewStep?.reason ??
        result.data.reviewStep?.reviewNotes ??
        ''
      ).trim();
      setApplication({ ...mapped, reviewerReason });
      setStatus(mapped.status);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Failed biometric/identity verification logs
  const [verificationLogs] = useState<Array<{
    id: string;
    type: 'LRN_VERIFICATION' | 'FACIAL_RECOGNITION' | 'SELFIE_VERIFICATION';
    status: 'FAILED';
    timestamp: string;
    code: string;
    details: string;
    ip: string;
    device: string;
    attemptsLeft: number;
  }>>(() => {
    const saved = localStorage.getItem(`philsa_failed_verification_logs_${id || 'unassigned'}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [logSearch, setLogSearch] = useState('');
  const [logFilterType, setLogFilterType] = useState<'ALL' | 'LRN_VERIFICATION' | 'FACIAL_RECOGNITION' | 'SELFIE_VERIFICATION'>('ALL');

  const [successConfig, setSuccessConfig] = useState<{
    isOpen: boolean;
    type: 'ACCEPTED' | 'REJECTED' | 'FOR_CORRECTION';
    title: string;
    message: string;
    actionLabel?: string;
  }>({
    isOpen: false,
    type: 'ACCEPTED',
    title: '',
    message: ''
  });

  const currentApp = application ?? EMPTY_REVIEW_APPLICATION;
  const displayId = currentApp.candidateId || id || currentApp.id;
  const fullName = `${currentApp.firstName} ${currentApp.lastName}`.trim();
  const photoUrl = currentApp.photoUrl?.trim() ?? '';
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const isDecisionFinal = ['ACCEPTED', 'APPROVED', 'REJECTED'].includes(status);
  const rejectionReason = status === 'REJECTED'
    ? (currentApp.reviewerReason || remarks.trim() || 'No rejection reason recorded.')
    : '';
  const reviewerName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : '';
  const submittedDate = currentApp.history?.[0]?.date ?? ('submittedAt' in currentApp ? currentApp.submittedAt : undefined) ?? 'Pending timestamp';
  const registrationFields: Record<string, string> = currentApp.additionalHighPriorityFields ?? {};
  const additionalRegistrationFields: Array<[string, string]> = Object.entries(registrationFields)
    .filter((field): field is [string, string] => {
      const [key, value] = field;
      return !['isPwd', 'pwdType', 'pwdCondition', 'pwdIdNumber', 'pwdIdFilename', 'pwdAccommodation'].includes(key) && Boolean(value);
    });
  const pwdRegistrationFieldCandidates: Array<[string, string | undefined]> = [
    ['PWD', registrationFields.isPwd],
    ['PWD Type', registrationFields.pwdType],
    ['Condition', registrationFields.pwdCondition],
    ['PWD ID Number', registrationFields.pwdIdNumber],
    ['PWD ID Attachment', registrationFields.pwdIdFilename],
    ['Accommodation Needed', registrationFields.pwdAccommodation],
  ];
  const pwdRegistrationFields: Array<[string, string]> = pwdRegistrationFieldCandidates.filter((field): field is [string, string] => Boolean(field[1]));

  React.useEffect(() => {
    setPhotoLoadFailed(false);
  }, [photoUrl]);

  const filteredLogs = React.useMemo(() => {
    return verificationLogs.filter(log => {
      const matchesType = logFilterType === 'ALL' || log.type === logFilterType;
      const matchesSearch = logSearch === '' || 
        log.code.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.device.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.ip.toLowerCase().includes(logSearch.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [verificationLogs, logFilterType, logSearch]);

  const handleAction = (action: string) => {
    if (isDecisionFinal) return;

    if (action === 'CORRECTION') {
      setIsCorrectionModalOpen(true);
      return;
    }

    const newStatus = action === 'APPROVE' ? 'ACCEPTED' : 'REJECTED';
    const decisionRemarks = remarks.trim();
    setStatus(newStatus);
    setApplication(prev => prev ? {
      ...prev,
      status: newStatus,
      reviewerReason: action === 'REJECT' ? decisionRemarks : prev.reviewerReason,
    } : prev);
    const statusLabel = action === 'APPROVE' ? 'Approved' : 'Rejected';

    addAuditLog('REVIEWER_APPLICATION_REVIEW', JSON.stringify({
      reviewer: reviewerName,
      reviewerId: user?.id,
      applicationId: id,
      status: newStatus,
      statusLabel: statusLabel,
      remarks: decisionRemarks,
      timestamp: new Date().toISOString(),
      action: `Reviewer Account Application ${id} marked as ${statusLabel}`
    }));

    setSuccessConfig({
      isOpen: true,
      type: newStatus as any,
      title: `Application ${statusLabel}`,
      message: `The application for ${currentApp.firstName} ${currentApp.lastName} has been successfully updated to ${statusLabel.toUpperCase()} status and logged in the audit trail.`,
      actionLabel: "Okay"
    });
  };

  const submitCorrection = () => {
    setIsCorrectionModalOpen(false);
    setSuccessConfig({
      isOpen: true,
      type: 'FOR_CORRECTION',
      title: 'Sent for Correction',
      message: 'The student has been notified to revise their application based on your feedback.',
      actionLabel: 'Okay'
    });
    setCorrectionReason('');
  };

  return (
    <div className="space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-philsa-bg rounded-lg transition-colors border border-philsa-border shadow-sm text-philsa-red"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-philsa-navy tracking-tight uppercase">Student Applicant: {displayId}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Action buttons moved to bottom to prevent redundancy */}
        </div>
      </div>
      {applicationError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
          {applicationError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Stats/Brief */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card-philsa p-8 bg-white border-2 border-philsa-red/10">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-philsa-bg border-4 border-white mb-6 shadow-xl relative group ring-1 ring-philsa-border">
               {photoUrl && !photoLoadFailed ? (
                 <img
                   referrerPolicy="no-referrer"
                   src={photoUrl}
                   alt={fullName ? `${fullName} applicant photo` : 'Student applicant photo'}
                   className="w-full h-full object-cover"
                   onError={() => setPhotoLoadFailed(true)}
                 />
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300">
                   <User className="w-16 h-16" />
                   <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">No Photo</span>
                 </div>
               )}
               {/* Removed Bio-ID and Biometric tags as requested */}
            </div>
            <h2 className="text-xl font-black text-philsa-navy tracking-tight leading-tight">{fullName || 'Student Applicant'}</h2>
            <p className="text-philsa-red text-[10px] font-black uppercase tracking-widest mt-1 mb-4 flex items-center gap-1.5">
               Digital Identity {displayId}
            </p>
            {isLoadingApplication && (
              <p className="text-[10px] font-black uppercase tracking-widest text-philsa-gray mb-4">Loading registered information...</p>
            )}
            <div className={cn(
               "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border shadow-sm",
               STATUS_BADGES[status as keyof typeof STATUS_BADGES] || 'bg-blue-50 text-blue-700'
            )}>
              {status.replace('_', ' ')}
            </div>

            <div className="pt-2 mt-4 space-y-4">
              {/* Risk Level and Biometrics section removed */}
            </div>
          </div>
        </div>

        {/* Right Details/Tabs */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex bg-philsa-bg p-1 rounded-2xl w-fit">
            {[
              { id: 'DETAILS', label: 'Student Bio', icon: User },
              { id: 'BIOMETRICS', label: 'Biometric Logs', icon: Fingerprint },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold tracking-tight transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-philsa-navy shadow-lg shadow-black/5 scale-105 z-10' 
                    : 'text-philsa-gray hover:text-philsa-navy'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-philsa-red' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'DETAILS' && (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card-philsa p-10 bg-white border border-philsa-border relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <User className="w-32 h-32 text-philsa-navy" />
                </div>
                <div className="space-y-10 relative z-10 text-philsa-navy">
                  {/* SECTION 1: Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#00563F]" /> Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                      <DataRow label="First Name" value={currentApp.firstName} />
                      <DataRow label="Middle Name" value={currentApp.middleName || 'None'} />
                      <DataRow label="Last Name" value={currentApp.lastName} />
                      <DataRow label="Suffix" value={currentApp.suffix || "None"} />
                      <DataRow label="Date of Birth" value={currentApp.dob} />
                      <DataRow label="Gender" value={currentApp.gender || 'Unspecified'} />
                      <DataRow label="Place of Birth" value={currentApp.birthPlace || 'Unspecified'} />
                      <DataRow label="Nationality" value={currentApp.nationality || 'Filipino'} />
                      <DataRow label="Email Address" value={currentApp.email} />
                      <DataRow label="Mobile Number" value={currentApp.mobile} />
                    </div>
                  </div>

                  {/* SECTION 2: Registry & Educational Background */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#00563F]" /> Registry & Educational Background
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 font-sans">
                      <DataRow label="Learner Reference Number (LRN)" value={currentApp.lrn} />
                      <DataRow label="School ID" value={currentApp.schoolId || 'Unspecified'} />
                      <DataRow label="High School Name" value={currentApp.schoolName} />
                      <DataRow label="High School Address" value={currentApp.schoolAddress} />
                      <DataRow label="Academic Track" value={currentApp.academicTrack} />
                      <DataRow label="Grade Level" value={currentApp.gradeLevel} />
                      <DataRow label="Enrollment Status" value={currentApp.enrollmentStatus || 'Unspecified'} />
                      <DataRow label="School Year" value={currentApp.schoolYear || 'Unspecified'} />
                      <DataRow label="GWA" value={String(currentApp.gwa || 'Unspecified')} />
                      {additionalRegistrationFields.map(([field, value]) => (
                        <DataRow key={field} label={field} value={value} />
                      ))}
                    </div>
                  </div>

                  {pwdRegistrationFields.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#00563F]" /> PWD Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 font-sans">
                        {pwdRegistrationFields.map(([field, value]) => (
                          <DataRow key={field} label={field} value={value || 'Unspecified'} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Biometric logs moved to the top-level Biometric Logs tab. */}
                  <div className="hidden">
                    <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-[#00563F]" /> Biometric & Identity Verification Logs
                    </h3>
                    <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60 font-sans space-y-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            Registry and hardware level failure trace logs recorded during biometric, LRN validation, and facial matches.
                          </p>
                        </div>
                      </div>

                      {/* Filter controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
                        <div className="flex flex-wrap gap-1.5">
                          {(['ALL', 'LRN_VERIFICATION', 'FACIAL_RECOGNITION', 'SELFIE_VERIFICATION'] as const).map((t) => {
                            const count = t === 'ALL' 
                              ? verificationLogs.length 
                              : verificationLogs.filter(l => l.type === t).length;
                            const label = t === 'ALL' ? 'All Failures' : t.replace('_', ' ');
                            const isSelected = logFilterType === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setLogFilterType(t)}
                                className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                  isSelected 
                                    ? "bg-slate-800 text-white shadow-xs" 
                                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                                )}
                              >
                                {label}
                                <span className={cn(
                                  "px-1.5 py-0.2 rounded-full text-[8px] font-mono",
                                  isSelected ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Search input */}
                        <div className="relative max-w-xs w-full sm:w-64">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                          <input
                            type="text"
                            placeholder="Filter details or log code..."
                            value={logSearch}
                            onChange={(e) => setLogSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-philsa-blue text-slate-800 bg-white"
                          />
                        </div>
                      </div>

                      {/* Log Trace List Table */}
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
                            <tbody className="divide-y divide-slate-100 font-sans">
                              {filteredLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                                    No matched verification failures found for this filter.
                                  </td>
                                </tr>
                              ) : (
                                filteredLogs.map((log) => (
                                  <tr 
                                    key={log.id} 
                                    className="hover:bg-red-50/5 transition-colors"
                                  >
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
                </div>

                <div className="pt-10 border-t border-philsa-border mt-10">
                  <h3 className="text-[10px] font-black text-philsa-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-philsa-red" /> Official Reviewer Directives
                  </h3>
                  <textarea 
                    className={cn(
                      "w-full bg-philsa-bg border-none rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-philsa-red/10 outline-none min-h-[160px] resize-none shadow-inner",
                      isDecisionFinal && "cursor-not-allowed text-philsa-gray"
                    )}
                    placeholder={isDecisionFinal ? "Application decision is final. Reviewer directives are read-only." : "Provide detailed compliance notes or remediation instructions..."}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    readOnly={isDecisionFinal}
                    aria-readonly={isDecisionFinal}
                  />
                  <div className="mt-10 flex flex-col md:flex-row justify-end gap-4 p-8 bg-philsa-bg/30 rounded-3xl border border-philsa-border border-dashed">
                      {status === 'REJECTED' && (
                        <div className="w-full rounded-2xl border border-philsa-red/20 bg-philsa-red/5 px-5 py-4 text-left">
                          <p className="text-[9px] font-black uppercase tracking-widest text-philsa-red mb-1">Rejection Reason</p>
                          <p className="text-xs font-bold text-philsa-navy leading-relaxed">{rejectionReason}</p>
                        </div>
                      )}
                      {!isDecisionFinal && (
                        <div className="flex flex-wrap gap-3">
                          <button 
                            onClick={() => handleAction('REJECT')}
                            className="bg-white border border-philsa-red/20 text-philsa-red font-black py-3 px-5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-red hover:text-white active:scale-[0.98] shadow-sm transition-all flex items-center gap-2"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button 
                            onClick={() => handleAction('APPROVE')}
                            className="bg-philsa-red text-white font-black py-3 px-7 rounded-xl text-[10px] uppercase tracking-widest hover:bg-philsa-red/90 active:scale-[0.98] shadow-lg shadow-philsa-red/20 transition-all flex items-center gap-2"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'BIOMETRICS' && (
              <motion.div
                key="biometrics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card-philsa p-10 bg-white border border-philsa-border relative overflow-hidden"
              >
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8A1538] uppercase tracking-wider pb-1.5 border-b border-[#8A1538]/20 flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-[#00563F]" /> Biometric & Identity Verification Logs
                  </h3>
                  <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60 font-sans space-y-6">
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Registry and hardware level failure trace logs recorded during biometric, LRN validation, and facial matches.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
                      <div className="flex flex-wrap gap-1.5">
                        {(['ALL', 'LRN_VERIFICATION', 'FACIAL_RECOGNITION', 'SELFIE_VERIFICATION'] as const).map((t) => {
                          const count = t === 'ALL'
                            ? verificationLogs.length
                            : verificationLogs.filter(l => l.type === t).length;
                          const label = t === 'ALL' ? 'All Failures' : t.replace('_', ' ');
                          const isSelected = logFilterType === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setLogFilterType(t)}
                              className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                isSelected
                                  ? "bg-slate-800 text-white shadow-xs"
                                  : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                              )}
                            >
                              {label}
                              <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[8px] font-mono",
                                isSelected ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative max-w-xs w-full sm:w-64">
                        <input
                          type="text"
                          placeholder="Filter details or log code..."
                          value={logSearch}
                          onChange={(e) => setLogSearch(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-philsa-blue text-slate-800 bg-white"
                        />
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                      <div className="max-h-[520px] overflow-y-auto">
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
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {filteredLogs.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                                  No matched verification failures found for this filter.
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
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      

      {/* Return for Correction Modal */}
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
                       onChange={(e) => setCorrectionReason(e.target.value)}
                       placeholder="Please specify exactly what the student needs to update (e.g., Blurred Birth Certificate, Invalid LRN, Missing Transcripts)..."
                       className="w-full bg-philsa-bg border border-philsa-border rounded-3xl p-6 text-xs font-bold text-philsa-navy focus:ring-4 focus:ring-philsa-red/5 outline-none shadow-inner"
                     />
                     <p className="text-[9px] text-philsa-gray font-medium italic">* This message will be sent directly to the student via email and portal dashboard.</p>
                  </div>
               </div>

               <div className="p-8 bg-philsa-bg/30 border-t border-philsa-border flex gap-3">
                  <button onClick={() => setIsCorrectionModalOpen(false)} className="flex-1 py-4 bg-white border border-philsa-border text-philsa-navy text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-philsa-bg transition-all">Cancel</button>
                  <button 
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

      {/* Success Feedback Modal */}
      <SuccessModal 
        isOpen={successConfig.isOpen}
        onClose={() => {
          setSuccessConfig(prev => ({ ...prev, isOpen: false }));
          navigate('/admin/reviewer/applications');
        }}
        type={successConfig.type}
        title={successConfig.title}
        message={successConfig.message}
        actionLabel={successConfig.actionLabel}
      />
    </div>
  );
}

function DataRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-philsa-navy leading-snug">{value}</p>
    </div>
  );
}


