import React, { useEffect, useState } from 'react';
import {
  Search, Eye, CheckCircle,
  AlertTriangle,
  User,
  ExternalLink,
  Check, X, AlertCircle, ChevronDown, 
  Download,
  FileText,
  CalendarDays,
  School
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import {
  backendApplicationService,
  mapBackendApplicationsToReviewRows,
  type BulkUploadValidationSummary,
  type ReviewQueueFilters,
} from '../../services/backendApplicationService';
import { buildApplicationReviewExportRows, exportApplicationReviewBatch } from '../../services/applicationReviewExportService';

const STATUS_BADGES = {
  PENDING: 'bg-blue-50 text-blue-600 border-blue-200',
  VERIFIED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  FOR_CORRECTION: 'bg-amber-50 text-amber-600 border-amber-200',
  REASSIGNED: 'bg-purple-50 text-purple-600 border-purple-200',
  FRAUDULENT: 'bg-red-600 text-white border-philsa-red shadow-lg shadow-red-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  REJECTED: 'bg-slate-100 text-slate-500 border-slate-300'
};

export default function ReviewApplications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [schoolOptions, setSchoolOptions] = useState<Array<{ value: string; name: string; filter: Pick<ReviewQueueFilters, 'schoolId' | 'schoolName'> }>>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const [activeModal, setActiveModal] = useState<'APPROVE' | 'REASSIGN' | 'CORRECTION' | 'FRAUD' | 'BULK_UPLOAD' | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadBatch, setBulkUploadBatch] = useState<BulkUploadValidationSummary | null>(null);
  const [bulkUploadError, setBulkUploadError] = useState('');
  const [isBulkUploadBusy, setIsBulkUploadBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY'>('ALL');
  const [rejectionReason, setRejectionReason] = useState('Unverifiable or fraudulent documents');
  const [customRejectionDetail, setCustomRejectionDetail] = useState('');

  const pendingReviewCount = apps.filter(app => app.status === 'PENDING').length;
  const acceptedCount = apps.filter(app => app.status === 'ACCEPTED').length;
  const rejectedCount = apps.filter(app => app.status === 'REJECTED').length;
  const allCount = apps.length;

  const handleOpenAction = (app: any, type: typeof activeModal) => {
     setSelectedApp(app);
     setActiveModal(type);
  };

  const handleOpenView = (app: any) => {
    navigate(`/admin/reviewer/applications/${app.id}`);
  };

  const reviewQueueFilters = (): ReviewQueueFilters => ({
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(schoolOptions.find(school => school.value === schoolFilter)?.filter ?? {}),
    ...(dateFilter === 'TODAY' ? { submitted: 'today' } : {}),
  });

  const refreshReviewQueue = async () => {
    setIsLoadingQueue(true);
    setQueueError('');
    const result = await backendApplicationService.listReviewQueue(reviewQueueFilters());
    setIsLoadingQueue(false);
    if (result.ok === false) {
      setQueueError(result.error.message);
      return;
    }
    setApps(mapBackendApplicationsToReviewRows(result.data));
  };

  useEffect(() => {
    if (import.meta.env.VITE_AUTH_SERVICE_MODE !== 'backend') return;

    let cancelled = false;
    void backendApplicationService.listReviewQueue().then((result) => {
      if (cancelled || result.ok === false) return;
      const rows = mapBackendApplicationsToReviewRows(result.data);
      const schools = Array.from(
        new Map(
          rows
            .filter(app => app.schoolId || app.schoolName)
            .map(app => {
              const schoolName = String(app.schoolName || '').trim();
              const schoolId = String(app.schoolId || '').trim();
              const value = schoolName ? schoolName.toLowerCase() : `id:${schoolId}`;
              return [
                value,
                {
                  value,
                  name: schoolName || schoolId,
                  filter: schoolName ? { schoolName } : { schoolId },
                },
              ];
            }),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name));
      setSchoolOptions(schools);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.VITE_AUTH_SERVICE_MODE !== 'backend') return;

    let cancelled = false;
    setIsLoadingQueue(true);
    setQueueError('');

    void backendApplicationService.listReviewQueue(reviewQueueFilters()).then((result) => {
      if (cancelled) return;
      setIsLoadingQueue(false);

      if (result.ok === false) {
        setQueueError(result.error.message);
        return;
      }

      setApps(mapBackendApplicationsToReviewRows(result.data));
    });

    return () => {
      cancelled = true;
    };
  }, [searchTerm, statusFilter, schoolFilter, dateFilter]);

  useEffect(() => {
    if (import.meta.env.VITE_AUTH_SERVICE_MODE !== 'backend') return;

    let cancelled = false;
    const objectUrls: string[] = [];
    const appsWithPhotos = apps.filter(app => app.photoUrl);

    if (appsWithPhotos.length === 0) {
      setPhotoUrls({});
      return;
    }

    void Promise.all(
      appsWithPhotos.map(async (app) => {
        const result = await backendApplicationService.getApplicationPhoto(app.id);
        if (cancelled || result.ok === false) return null;
        const objectUrl = URL.createObjectURL(result.data);
        objectUrls.push(objectUrl);
        return [app.id, objectUrl] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setPhotoUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null)));
    });

    return () => {
      cancelled = true;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [apps]);

  const closeModal = () => {
     setActiveModal(null);
     setSelectedApp(null);
     setDecisionError('');
     setBulkUploadError('');
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBulkTemplate = async () => {
    setBulkUploadError('');
    const result = await backendApplicationService.downloadBulkUploadTemplate();
    if (result.ok === false) {
      setBulkUploadError(result.error.message);
      return;
    }
    downloadBlob(result.data, 'student-application-bulk-upload-template.csv');
  };

  const handleValidateBulkUpload = async () => {
    if (!bulkUploadFile) return;
    setIsBulkUploadBusy(true);
    setBulkUploadError('');
    const result = await backendApplicationService.validateBulkUploadCsv(bulkUploadFile);
    setIsBulkUploadBusy(false);
    if (result.ok === false) {
      setBulkUploadError(result.error.message);
      return;
    }
    if (result.data.status === 'FAILED') {
      setBulkUploadError('The CSV could not be read. Download the template and make sure the file keeps the exact header row.');
    }
    setBulkUploadBatch(result.data);
  };

  const handleDownloadBulkErrors = async () => {
    if (!bulkUploadBatch?.batchId) return;
    setBulkUploadError('');
    const result = await backendApplicationService.downloadBulkUploadErrors(bulkUploadBatch.batchId);
    if (result.ok === false) {
      setBulkUploadError(result.error.message);
      return;
    }
    downloadBlob(result.data, `student-application-bulk-upload-errors-${bulkUploadBatch.batchId}.csv`);
  };

  const handleConfirmBulkUpload = async () => {
    if (!bulkUploadBatch?.batchId) return;
    setIsBulkUploadBusy(true);
    setBulkUploadError('');
    const result = await backendApplicationService.confirmBulkUpload(bulkUploadBatch.batchId);
    setIsBulkUploadBusy(false);
    if (result.ok === false) {
      setBulkUploadError(result.error.message);
      return;
    }
    setBulkUploadBatch(result.data);
    await refreshReviewQueue();
  };

  const handleReviewerDecision = async (
    decision: 'APPROVE' | 'REQUEST_CORRECTION' | 'REJECT',
    options: { reason?: string; requiredCorrections?: string[]; seat?: string } = {},
  ) => {
    if (!selectedApp) return;

    if (import.meta.env.VITE_AUTH_SERVICE_MODE !== 'backend') {
      const nextStatus = decision === 'APPROVE' ? 'ACCEPTED' : decision === 'REQUEST_CORRECTION' ? 'FOR_CORRECTION' : 'REJECTED';
      setApps(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: nextStatus, seat: options.seat ?? a.seat } : a));
      if (options.seat) localStorage.setItem(`philsa_applicant_seat_${selectedApp.id}`, options.seat);
      closeModal();
      return;
    }

    setIsSavingDecision(true);
    setDecisionError('');
    const result = await backendApplicationService.decideApplication(selectedApp.id, decision, {
      reason: options.reason,
      requiredCorrections: options.requiredCorrections,
    });
    setIsSavingDecision(false);

    if (result.ok === false) {
      setDecisionError(result.error.message);
      return;
    }

    const [updated] = mapBackendApplicationsToReviewRows([result.data]);
    setApps(prev => prev.map(a => a.id === selectedApp.id ? { ...a, ...updated, seat: options.seat ?? a.seat } : a));
    if (options.seat) localStorage.setItem(`philsa_applicant_seat_${selectedApp.id}`, options.seat);
    closeModal();
  };

  const visibleApps = apps.filter(app => {
    const displayCandidateId = app.candidateId || app.id;
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      `${app.firstName} ${app.lastName}`.toLowerCase().includes(normalizedSearch) ||
      displayCandidateId.toLowerCase().includes(normalizedSearch) ||
      app.id.toLowerCase().includes(normalizedSearch) ||
      String(app.schoolName ?? '').toLowerCase().includes(normalizedSearch) ||
      String(app.universities?.[0] ?? '').toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING_STUDENT_COMPLETION'
        ? app.completionStatus === 'PENDING_STUDENT_COMPLETION'
        : app.status === statusFilter);
    const selectedSchool = schoolOptions.find(school => school.value === schoolFilter);
    const matchesSchool =
      !selectedSchool ||
      (selectedSchool.filter.schoolName
        ? String(app.schoolName ?? '').toLowerCase() === selectedSchool.filter.schoolName.toLowerCase()
        : app.schoolId === selectedSchool.filter.schoolId);
    const matchesDate =
      import.meta.env.VITE_AUTH_SERVICE_MODE === 'backend' ||
      dateFilter === 'ALL' ||
      app.submittedAt?.slice(0, 10) === new Date().toISOString().slice(0, 10);
    return matchesSearch && matchesStatus && matchesSchool && matchesDate;
  });

  const handleExportBatch = async () => {
    setExportError('');
    const count = visibleApps.length;
    if (count === 0) {
      setExportError('There are no applications to export.');
      return;
    }

    const confirmed = window.confirm(`Exporting ${count} application${count === 1 ? '' : 's'}. Continue?`);
    if (!confirmed) return;

    setIsExporting(true);
    try {
      await exportApplicationReviewBatch(buildApplicationReviewExportRows(visibleApps.map(app => ({
        candidateId: app.candidateId || app.id,
        applicantName: `${app.firstName ?? ''} ${app.lastName ?? ''}`.trim() || 'Unnamed applicant',
        status: app.status,
        submittedAt: app.submittedAt,
        schoolId: app.schoolId,
        schoolName: app.schoolName,
        mobile: app.mobile,
        email: app.email,
        preferredUniversity: app.universities?.[0],
        preferredCourse: app.courses?.[0],
      }))));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'The export could not be generated.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy mb-2 tracking-tight">Application Review Ledger</h1>
          <p className="text-philsa-gray text-xs font-black uppercase tracking-[0.2em] opacity-60">PhilSLA Admission Intelligence Unit</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <button
             onClick={() => setActiveModal('BULK_UPLOAD')}
             className="btn-secondary flex items-center gap-2"
           >
              <FileText className="w-4 h-4" /> Bulk Upload
           </button>
           <button
             onClick={handleExportBatch}
             disabled={isLoadingQueue || isExporting || visibleApps.length === 0}
             className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <Download className="w-4 h-4" /> {isExporting ? 'Exporting...' : 'Export Batch'}
           </button>
        </div>
      </div>
      {exportError && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
          {exportError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'All', value: String(allCount), color: 'navy' },
          { label: 'Pending Review', value: String(pendingReviewCount), color: 'amber' },
          { label: 'Accepted', value: String(acceptedCount), color: 'emerald' },
          { label: 'Rejected', value: String(rejectedCount), color: 'philsa-red' }
        ].map((stat, i) => (
          <div key={i} className="card-philsa !p-6 flex items-center gap-5 bg-white border border-philsa-border">
            <div className={`w-2 h-10 rounded-full ${
              stat.color === 'philsa-red' ? 'bg-philsa-red' : 
              stat.color === 'emerald' ? 'bg-emerald-500' :
              stat.color === 'amber' ? 'bg-amber-500' : 'bg-philsa-navy'
            }`} />
            <div>
              <p className="text-[10px] font-black text-philsa-gray uppercase tracking-widest mb-1 leading-none">{stat.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-philsa-navy tracking-tighter leading-none">{stat.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-philsa !p-0 overflow-hidden">
        {queueError && (
          <div className="mx-6 mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
            {queueError}
          </div>
        )}
        <div className="p-6 border-b border-philsa-border flex flex-wrap gap-4 items-center justify-between">
           <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
              <input 
                type="text" 
                placeholder="Search Candidate ID, Name, School, or University..." 
                className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
                <select
                  value={schoolFilter}
                  onChange={(event) => setSchoolFilter(event.target.value)}
                  className="w-full appearance-none bg-philsa-bg border border-transparent rounded-xl pl-10 pr-9 py-3 text-[10px] font-black uppercase tracking-widest text-philsa-navy focus:ring-2 focus:ring-philsa-red/10"
                >
                  <option value="">All Schools</option>
                  {schoolOptions.map(school => (
                    <option key={school.value} value={school.value}>{school.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
              </div>
              <div className="relative min-w-[160px]">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value as 'ALL' | 'TODAY')}
                  className="w-full appearance-none bg-philsa-bg border border-transparent rounded-xl pl-10 pr-9 py-3 text-[10px] font-black uppercase tracking-widest text-philsa-navy focus:ring-2 focus:ring-philsa-red/10"
                >
                  <option value="ALL">All Dates</option>
                  <option value="TODAY">Today</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
              </div>
              <div className="flex bg-philsa-bg p-1 rounded-xl">
                {[
                  ['ALL', 'ALL'],
                  ['PENDING', 'PENDING'],
                  ['PENDING_STUDENT_COMPLETION', 'PENDING STUDENT COMPLETION'],
                  ['REJECTED', 'REJECTED'],
                ].map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      statusFilter === status 
                        ? 'bg-white text-philsa-navy shadow-sm' 
                        : 'text-philsa-gray hover:text-philsa-navy'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-philsa-bg text-[10px] text-philsa-gray font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Applicant Information</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {isLoadingQueue && (
                <tr>
                  <td colSpan={3} className="px-8 py-10 text-center text-xs font-black uppercase tracking-widest text-philsa-gray">
                    Loading backend review queue...
                  </td>
                </tr>
              )}
              {!isLoadingQueue && visibleApps.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-10 text-center text-xs font-black uppercase tracking-widest text-philsa-gray">
                    No submitted applications found.
                  </td>
                </tr>
              )}
              {!isLoadingQueue && visibleApps.map((app) => {
                const isPendingStudentCompletion = app.completionStatus === 'PENDING_STUDENT_COMPLETION';
                const isDecisionFinal = ['ACCEPTED', 'APPROVED', 'REJECTED'].includes(app.status);
                const displayCandidateId = app.candidateId || app.id;

                return (
                <tr key={app.id} className="hover:bg-philsa-bg/40 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-philsa-border shadow-sm shrink-0 bg-philsa-bg relative">
                        {app.photoUrl ? (
                          <img referrerPolicy="no-referrer" src={photoUrls[app.id] ?? app.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        {app.duplicateScore > 70 && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-philsa-red rounded-full border-2 border-white flex items-center justify-center">
                            <AlertCircle className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-philsa-navy mb-0.5">{app.firstName} {app.lastName}</p>
                        <p className="text-[10px] text-philsa-gray font-bold tracking-wider uppercase">{displayCandidateId} • {app.mobile}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full tracking-widest border shadow-sm",
                      STATUS_BADGES[app.status as keyof typeof STATUS_BADGES] || 'bg-slate-100 text-slate-700'
                    )}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenView(app)}
                        className="p-2 text-philsa-navy hover:bg-philsa-bg rounded-lg transition-colors border border-philsa-border shadow-sm cursor-pointer"
                        title="View Application"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!isDecisionFinal && !isPendingStudentCompletion && (
                        <>
                          <button 
                             onClick={() => handleOpenAction(app, 'APPROVE')}
                             className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 shadow-sm cursor-pointer"
                             title="Approve Application"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenAction(app, 'FRAUD')}
                            className="p-2 text-philsa-red hover:bg-red-50 rounded-lg transition-colors border border-red-100 shadow-sm cursor-pointer"
                            title="Reject Application"
                            aria-label="Reject Application"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="px-8 py-4 bg-philsa-bg/50 border-t border-philsa-border flex items-center justify-between">
           <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">System Registry Active • Showing {visibleApps.length} applicants</p>
           <div className="flex gap-2">
             <button className="px-3 py-1 bg-white border border-philsa-border rounded text-xs font-bold text-philsa-gray disabled:opacity-50">Previous</button>
             <button className="px-3 py-1 bg-white border border-philsa-border rounded text-xs font-bold text-philsa-navy">1</button>
             <button className="px-3 py-1 bg-white border border-philsa-border rounded text-xs font-bold text-philsa-gray disabled:opacity-50">Next</button>
           </div>
        </div>
      </div>


      {/* --- MODALS & DRAWERS --- */}
      <AnimatePresence>
        {activeModal === 'BULK_UPLOAD' && (
          <ModalWrapper title="Bulk Upload Student Applications" onClose={closeModal}>
            <div className="space-y-6 text-philsa-navy">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadBulkTemplate}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Template
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBulkErrors}
                  disabled={!bulkUploadBatch || (bulkUploadBatch.failedRows ?? 0) === 0}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" /> Download Error CSV
                </button>
              </div>

              <div className="space-y-2">
                <label htmlFor="bulk-upload-csv" className="text-[10px] font-black uppercase tracking-widest text-philsa-gray">
                  CSV File
                </label>
                <input
                  id="bulk-upload-csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setBulkUploadFile(event.target.files?.[0] ?? null);
                    setBulkUploadBatch(null);
                    setBulkUploadError('');
                  }}
                  className="block w-full rounded-xl border border-philsa-border bg-philsa-bg px-4 py-3 text-xs font-bold text-philsa-navy"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleValidateBulkUpload}
                  disabled={!bulkUploadFile || isBulkUploadBusy}
                  className="px-5 py-2 bg-philsa-navy text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isBulkUploadBusy ? 'Processing...' : 'Validate'}
                </button>
              </div>

              {bulkUploadError && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-philsa-red">
                  {bulkUploadError}
                </div>
              )}

              {bulkUploadBatch && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      ['Total', bulkUploadBatch.totalRows],
                      ['Valid', bulkUploadBatch.validRows],
                      ['Failed', bulkUploadBatch.failedRows],
                      ['Conflicts', bulkUploadBatch.conflictRows],
                      ['Field Errors', bulkUploadBatch.fieldErrorRows],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-philsa-border bg-philsa-bg p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-philsa-gray">{label}</p>
                        <p className="text-xl font-black text-philsa-navy">{value}</p>
                      </div>
                    ))}
                  </div>

                  {(bulkUploadBatch.rows ?? []).some(row => row.errors.length > 0) && (
                    <div className="max-h-56 overflow-auto rounded-xl border border-philsa-border">
                      <table className="w-full text-left">
                        <thead className="bg-philsa-bg text-[9px] font-black uppercase tracking-widest text-philsa-gray">
                          <tr>
                            <th className="px-4 py-3">Row</th>
                            <th className="px-4 py-3">Field</th>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-philsa-border text-xs font-bold">
                          {(bulkUploadBatch.rows ?? []).flatMap(row =>
                            row.errors.map((error, index) => (
                              <tr key={`${row.rowNumber}-${error.field}-${index}`}>
                                <td className="px-4 py-3">{row.rowNumber}</td>
                                <td className="px-4 py-3">{error.field}</td>
                                <td className="px-4 py-3">{error.code}</td>
                                <td className="px-4 py-3">{error.reason}</td>
                              </tr>
                            )),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={handleConfirmBulkUpload}
                      disabled={!bulkUploadBatch || bulkUploadBatch.validRows === 0 || isBulkUploadBusy}
                      className="px-5 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Confirm Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ModalWrapper>
        )}

        {/* APPROVAL MODAL */}
        {activeModal === 'APPROVE' && selectedApp && (
          <ModalWrapper title="Confirm Application" onClose={closeModal}>
             <div className="space-y-6 text-philsa-navy">
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                   <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-slate-200">
                      {selectedApp.photoUrl ? (
                        <img referrerPolicy="no-referrer" src={photoUrls[selectedApp.id] ?? selectedApp.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                   </div>
                   <div>
                       <h3 className="text-sm font-bold text-philsa-navy leading-none mb-1">{selectedApp.firstName || selectedApp.name} {selectedApp.lastName || ''}</h3>
                       <p className="text-[10px] font-semibold text-slate-400 font-mono leading-none">{selectedApp.candidateId || selectedApp.id}</p>
                   </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                   Are you sure you want to approve this application? Approving confirms that the applicant has passed all admission verification requirements.
                </p>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                   {decisionError && <p className="mr-auto text-[10px] font-bold text-philsa-red">{decisionError}</p>}
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button disabled={isSavingDecision} onClick={() => {
                       const centerCode = selectedApp.center ? selectedApp.center.split(" ").map((w) => w[0]).join("").toUpperCase() : "UPD";
                       const applicantCode = String(selectedApp.candidateId || selectedApp.id || '').replace(/\W/g, '').slice(-3).padStart(3, '0');
                       const seatVal = `Seat ${centerCode}-${applicantCode}`;
                       void handleReviewerDecision('APPROVE', { reason: 'Verified by admissions reviewer.', seat: seatVal });
                   }} className="px-5 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-60">
                      {isSavingDecision ? 'Saving...' : 'Confirm'}
                   </button>
                </div>
             </div>
          </ModalWrapper>
        )}

        {/* REASSIGN MODAL */}
        {activeModal === 'REASSIGN' && selectedApp && (
          <ModalWrapper title="Relocation Protocol — Reassign Center" onClose={closeModal}>
             <div className="space-y-8 text-philsa-navy">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-philsa-bg rounded-3xl border border-philsa-border">
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">Assigned Facility</p>
                      <p className="text-xs font-black uppercase tracking-tight">{selectedApp.center}</p>
                   </div>
                   <div className="p-5 bg-philsa-bg rounded-3xl border border-philsa-border">
                      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1">Roster Allocation</p>
                      <p className="text-xs font-black uppercase tracking-tight">82% (High Capacity)</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-widest opacity-60">System-Targeted Centers</label>
                   <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
                      <select className="w-full bg-white border border-philsa-border rounded-2xl pl-12 pr-10 py-5 text-sm font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-philsa-navy/5 appearance-none group-hover:border-philsa-navy transition-all">
                         <option>PUP ICT Center — 142 Seats Avail (Operational)</option>
                         <option>UP Manila CMS — 12 Seats Avail (Near Full)</option>
                         <option disabled>UST Bldg A — 0 Seats (Under Maintenance)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
                   </div>
                   <div className="grid grid-cols-2 gap-4 mt-2">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" /> PC Availability: 100%
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                          <User className="w-3.5 h-3.5" /> Proctor Assignment: ACTIVE
                       </div>
                   </div>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
                   <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                   <div>
                      <p className="text-[11px] font-black uppercase tracking-tight text-amber-900 mb-1">Institutional Redistribution Triggered</p>
                      <p className="text-xs font-medium text-amber-800 leading-relaxed">
                         Reassigning this applicant will automatically invalidate their current physical permit and trigger an immediate notification dispatch.
                      </p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={closeModal} className="flex-1 py-4 bg-philsa-bg border border-philsa-border rounded-2xl text-philsa-navy font-black uppercase tracking-widest text-[10px]">Cancel</button>
                   <button onClick={closeModal} className="flex-1 py-4 bg-philsa-navy text-white shadow-xl shadow-philsa-navy/20 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all">Finalize Relocation</button>
                </div>
             </div>
          </ModalWrapper>
        )}

        {/* CORRECTION MODAL */}
        {activeModal === 'CORRECTION' && selectedApp && (
          <ModalWrapper title="For Correction Request" onClose={closeModal}>
             <div className="space-y-6 text-philsa-navy">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Identity Compliance Categories</label>
                   <div className="grid grid-cols-2 gap-2">
                      {['Incorrect Philsys Number', 'Blurry Document Upload', 'Missing LRN Trace', 'Profile Image Mismatch', 'Duplicate ID Detection'].map(cat => (
                        <label key={cat} className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-150 transition-all group">
                           <input type="checkbox" className="w-4 h-4 rounded text-philsa-navy focus:ring-philsa-red cursor-pointer" />
                           <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{cat}</span>
                        </label>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reviewer Directives</label>
                   <textarea 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none h-24 resize-none"
                     placeholder="Provide precise instructions for documentation remediation..."
                   />
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                   {decisionError && <p className="mr-auto text-[10px] font-bold text-philsa-red">{decisionError}</p>}
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button disabled={isSavingDecision} onClick={() => {
                       void handleReviewerDecision('REQUEST_CORRECTION', {
                         reason: 'Applicant must correct the selected identity compliance items.',
                         requiredCorrections: ['identityDocumentation'],
                       });
                   }} className="px-5 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/10 hover:bg-amber-700 transition-all cursor-pointer disabled:opacity-60">
                      {isSavingDecision ? 'Saving...' : 'For Correction Request'}
                   </button>
                </div>
             </div>
          </ModalWrapper>
        )}

        {/* FRAUD MODAL (Rejection) */}
        {activeModal === 'FRAUD' && selectedApp && (
          <ModalWrapper title="For Rejection" onClose={closeModal}>
             <div className="space-y-6 text-philsa-navy">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reason for Rejection *</label>
                   <div className="space-y-2">
                      {[
                        "Unverifiable or fraudulent documents",
                        "Falsified personal information",
                        "Photo identification mismatch",
                        "Duplicate registration attempt",
                        "Ineligible academic criteria"
                      ].map((reason) => (
                        <label key={reason} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-all block">
                           <input 
                             type="radio" 
                             name="rejection-reason"
                             value={reason}
                             checked={rejectionReason === reason}
                             onChange={(e) => setRejectionReason(e.target.value)}
                             className="w-4 h-4 accent-philsa-red cursor-pointer" 
                           />
                           <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">{reason}</span>
                        </label>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Additional Details (Optional)</label>
                   <textarea 
                     value={customRejectionDetail}
                     onChange={(e) => setCustomRejectionDetail(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold focus:bg-white focus:border-philsa-navy focus:ring-1 focus:ring-philsa-navy/10 outline-none h-20 resize-none"
                     placeholder="Add any specific comments about the rejection decision..."
                   />
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                   {decisionError && <p className="mr-auto text-[10px] font-bold text-philsa-red">{decisionError}</p>}
                   <button onClick={closeModal} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                      Cancel
                   </button>
                   <button disabled={isSavingDecision} onClick={() => {
                       void handleReviewerDecision('REJECT', {
                         reason: customRejectionDetail ? `${rejectionReason}: ${customRejectionDetail}` : rejectionReason,
                       });
                   }} className="px-5 py-2 bg-philsa-red text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-philsa-red/10 hover:bg-philsa-red/90 transition-all cursor-pointer disabled:opacity-60">
                      {isSavingDecision ? 'Saving...' : 'Confirm'}
                   </button>
                </div>
             </div>
          </ModalWrapper>
        )}

      </AnimatePresence>
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

function DocCard({ title, status, timestamp }: any) {
  return (
    <div className="card-philsa p-6 flex flex-col justify-between group hover:border-philsa-red/30 transition-all cursor-pointer bg-philsa-bg/40">
       <div className="mb-4">
          <div className="p-3 bg-white rounded-xl border border-philsa-border transition-colors group-hover:bg-philsa-navy/5 group-hover:border-philsa-navy/20 shadow-sm w-fit mb-4">
             <FileText className="w-5 h-5 text-philsa-navy" />
          </div>
          <h5 className="text-sm font-bold text-philsa-navy group-hover:text-philsa-red transition-all">{title}</h5>
          <p className="text-[9px] text-philsa-gray font-bold uppercase tracking-widest mt-1">Verified: {timestamp}</p>
       </div>
       <div className="flex items-center justify-between pt-4 border-t border-philsa-border/50">
          <span className={`text-[8px] font-black px-2 py-0.5 rounded tracking-widest uppercase ${
            status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {status}
          </span>
          <Download className="w-3.5 h-3.5 text-philsa-gray hover:text-philsa-navy transition-all" />
       </div>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[9px] font-black text-philsa-gray uppercase tracking-widest mb-1.5 opacity-70 leading-none">{label}</p>
      <p className="text-sm font-bold text-philsa-navy uppercase tracking-tight truncate">{value || 'UNSPECIFIED'}</p>
    </div>
  );
}

function ArtifactItem({ label, status, isWarn }: { label: string; status: string; isWarn?: boolean }) {
  return (
    <div className="flex flex-col gap-3 p-5 bg-philsa-bg rounded-3xl border border-philsa-border group hover:bg-white hover:border-philsa-navy/20 transition-all">
       <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-philsa-navy uppercase tracking-widest">{label}</p>
          <ExternalLink className="w-3 h-3 text-philsa-gray group-hover:text-philsa-navy" />
       </div>
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
             <div className={cn("w-1.5 h-1.5 rounded-full", isWarn ? "bg-amber-500" : "bg-emerald-500")} />
             <span className={cn("text-[8px] font-black uppercase tracking-widest", isWarn ? "text-amber-600" : "text-emerald-600")}>{status}</span>
          </div>
       </div>
    </div>
  );
}

function ModalWrapper({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(30,41,59,0.3)] overflow-hidden"
      >
        <div className="px-10 py-8 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
           <h2 className="text-lg font-black text-philsa-navy uppercase tracking-tighter">{title}</h2>
           <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-philsa-bg flex items-center justify-center transition-colors">
              <X className="w-5 h-5 text-philsa-gray" />
           </button>
        </div>
        <div className="p-10">
           {children}
        </div>
      </motion.div>
    </div>
  );
}


