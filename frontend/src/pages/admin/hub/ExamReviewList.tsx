import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Clock, Download, FileSpreadsheet, ScanLine, Search, Upload, UserCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { ConfirmationDialog } from '../../../components/ui';
import {
  backendExamReviewService,
  type ExamReviewQueueItem,
  type ExamReviewTemplateSource,
} from '../../../services/backendExamReviewService';
import {
  buildExamReviewExportRows,
  exportExamReviewBatch,
  type ExamReviewExportFormat,
} from '../../../services/examReviewExportService';

const templateSources: Array<{
  value: ExamReviewTemplateSource;
  label: string;
  description: string;
  icon: typeof FileSpreadsheet;
}> = [
  { value: 'STANDARD_CSV', label: 'Standard CSV', description: 'Regular digital CSV templates', icon: FileSpreadsheet },
  { value: 'HANDWRITTEN_OCR', label: 'Handwritten OCR', description: 'PDF scanned handwriting bubble papers', icon: ScanLine },
  { value: 'OMR_TEMPLATE_PAPER', label: 'OMR Template Paper', description: 'Direct hardware sheet recognition', icon: ScanLine },
];

function gradingActionTitle(attempt: ExamReviewQueueItem): string {
  if (attempt.status === 'FINALIZED') return 'Released records are locked';
  if (attempt.pendingSubjectiveItems > 0) {
    const noun = attempt.pendingSubjectiveItems === 1 ? 'item' : 'items';
    return `Open this review to score ${attempt.pendingSubjectiveItems} pending subjective ${noun}`;
  }
  return 'Check and mark as Graded';
}

export default function ExamReviewList() {
  const navigate = useNavigate();
  const [examAttempts, setExamAttempts] = useState<ExamReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'GRADED'>('ALL');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExamReviewExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [updatingAttemptId, setUpdatingAttemptId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadReviewId, setUploadReviewId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTemplateSource, setUploadTemplateSource] = useState<ExamReviewTemplateSource | ''>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    attempt: ExamReviewQueueItem;
    kind: 'GRADE' | 'OPEN_REVIEW' | 'RETURN_TO_PENDING';
  } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadExamReviews = async () => {
      setIsLoading(true);
      setLoadError(null);
      const result = await backendExamReviewService.list();
      if (isCancelled) return;
      if ('error' in result) {
        setLoadError(result.error.message);
      } else {
        setExamAttempts(result.data);
      }
      setIsLoading(false);
    };

    void loadExamReviews();
    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredAttempts = useMemo(() => examAttempts.filter(attempt => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || attempt.candidateName.toLowerCase().includes(query) || attempt.candidateId.toLowerCase().includes(query);
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PENDING') return matchesSearch && attempt.status === 'SUBMITTED';
    return matchesSearch && attempt.status === statusFilter;
  }), [examAttempts, searchTerm, statusFilter]);
  const uploadableAttempts = useMemo(
    () => examAttempts.filter(attempt => attempt.status !== 'FINALIZED'),
    [examAttempts],
  );

  const handleBatchExport = async (format: ExamReviewExportFormat) => {
    const rows = filteredAttempts.map(attempt => ({
        candidateId: attempt.candidateId,
        candidateName: attempt.candidateName,
        submittedAt: attempt.submittedAt,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        status: attempt.status,
        pendingSubjectiveItems: attempt.pendingSubjectiveItems,
      }));

    setExportError(null);
    setExportingFormat(format);
    try {
      await exportExamReviewBatch(buildExamReviewExportRows(rows), format);
      setIsExportMenuOpen(false);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'The export could not be generated.');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleGradingStatus = async (attempt: ExamReviewQueueItem, status: 'SUBMITTED' | 'GRADED') => {
    if (attempt.status === 'FINALIZED' || attempt.status === status) return;
    setActionError(null);
    setUpdatingAttemptId(attempt.id);
    const result = await backendExamReviewService.setGradingStatus(attempt.id, status);
    if ('error' in result) {
      setActionError(result.error.message);
    } else {
      setExamAttempts(current => current.map(item => item.id === result.data.id ? result.data : item));
    }
    setUpdatingAttemptId(null);
    setPendingAction(null);
  };

  const openUploadDialog = () => {
    setUploadReviewId(current => current || uploadableAttempts[0]?.id || '');
    setUploadFile(null);
    setUploadTemplateSource('');
    setUploadError(null);
    setIsUploadDialogOpen(true);
  };

  const handleAnswerSheetUpload = async () => {
    if (!uploadReviewId || !uploadTemplateSource || !uploadFile) {
      setUploadError('Select an examinee, template source, and answer-sheet file before uploading.');
      return;
    }
    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    const result = await backendExamReviewService.uploadAnswerSheet(uploadReviewId, uploadFile, uploadTemplateSource);
    if ('error' in result) {
      setUploadError(result.error.message);
    } else {
      setExamAttempts(current => current.map(item => item.id === result.data.id ? result.data : item));
      setUploadSuccess(`${uploadFile.name} was uploaded for ${result.data.candidateName}.`);
      setIsUploadDialogOpen(false);
      setUploadFile(null);
    }
    setIsUploading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy tracking-tight mb-2">Exam Review Queue</h1>
          <p className="text-philsa-gray text-xs font-black uppercase tracking-[0.2em] opacity-60">PhilSLA Evaluation Control Unit</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            title="No exam review data source is configured."
            className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm cursor-not-allowed opacity-60"
          >
            Audit Logs
          </button>
          <div className="relative mr-1">
            <button
              type="button"
              disabled={isLoading || filteredAttempts.length === 0 || exportingFormat !== null}
              aria-haspopup="menu"
              aria-expanded={isExportMenuOpen}
              onClick={() => {
                setExportError(null);
                setIsExportMenuOpen(open => !open);
              }}
              className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              {exportingFormat ? `Exporting ${exportingFormat}` : 'Export Batch'}
            </button>
            {isExportMenuOpen && (
              <div role="menu" aria-label="Export format" className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <button type="button" role="menuitem" onClick={() => void handleBatchExport('PDF')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">Export as PDF</button>
                <button type="button" role="menuitem" onClick={() => void handleBatchExport('EXCEL')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">Export as Excel (.xlsx)</button>
                {exportError && <p role="alert" className="px-3 py-2 text-[10px] font-semibold text-rose-600">{exportError}</p>}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openUploadDialog}
            disabled={isLoading || uploadableAttempts.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" /> Upload Student Answer Sheet
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search student or ID..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-400/10 outline-none transition-all"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'PENDING', 'GRADED'] as const).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn('px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all', statusFilter === status ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        {actionError && (
          <p role="alert" className="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-6 py-3 text-xs font-semibold text-rose-600">
            <AlertCircle className="h-4 w-4" /> {actionError}
          </p>
        )}
        {uploadSuccess && (
          <p role="status" className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {uploadSuccess}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Examinee</th>
                <th className="px-6 py-4">Submission</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttempts.map(attempt => (
                  <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/hub/review/${attempt.id}`)}
                        aria-label={`View exam for ${attempt.candidateName}`}
                        className="group flex items-center gap-3 text-left"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-philsa-navy text-xs font-black text-white shadow-sm ring-2 ring-slate-100 transition-transform group-hover:scale-105">
                          {getCandidateInitials(attempt.candidateName)}
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-slate-800 group-hover:text-philsa-navy group-hover:underline">{attempt.candidateName}</span>
                          <span className="block text-[10px] text-slate-400 font-mono tracking-tighter">{attempt.candidateId}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">{new Date(attempt.submittedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-800">{attempt.totalScore} / {attempt.maxScore}</td>
                    <td className="px-6 py-4 text-center">
                      {attempt.status === 'FINALIZED' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700"><UserCheck className="w-3 h-3" /> Released</span>
                      ) : attempt.status === 'GRADED' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Graded</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[9px] font-bold uppercase text-amber-600"><Clock className="w-3 h-3" /> Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (attempt.pendingSubjectiveItems > 0) {
                              setPendingAction({ attempt, kind: 'OPEN_REVIEW' });
                              return;
                            }
                            setPendingAction({ attempt, kind: 'GRADE' });
                          }}
                          disabled={attempt.status === 'GRADED' || attempt.status === 'FINALIZED' || updatingAttemptId === attempt.id}
                          title={gradingActionTitle(attempt)}
                          aria-label={attempt.pendingSubjectiveItems > 0
                            ? `Review ${attempt.candidateName} pending subjective items`
                            : `Mark ${attempt.candidateName} as Graded`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingAction({ attempt, kind: 'RETURN_TO_PENDING' })}
                          disabled={attempt.status === 'SUBMITTED' || attempt.status === 'FINALIZED' || updatingAttemptId === attempt.id}
                          title={attempt.status === 'FINALIZED' ? 'Released records are locked' : 'Reject grading and return to Pending'}
                          aria-label={`Reject grading for ${attempt.candidateName} and return to Pending`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-sm font-bold text-slate-500">Loading exam review records...</td>
                </tr>
              )}
              {!isLoading && loadError && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <AlertCircle className="mx-auto mb-3 h-7 w-7 text-rose-400" />
                    <p className="text-sm font-bold text-rose-600">Unable to load Exam Review records.</p>
                    <p className="mt-1 text-xs text-slate-400">{loadError}</p>
                  </td>
                </tr>
              )}
              {!isLoading && !loadError && filteredAttempts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <AlertCircle className="mx-auto mb-3 h-7 w-7 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No exam review records available.</p>
                    <p className="mt-1 text-xs text-slate-400">Run the local Exam Review seed command to add synthetic development records.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isUploadDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="answer-sheet-upload-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="answer-sheet-upload-title" className="text-xl font-black text-philsa-navy">Upload Student Answer Sheet</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Choose the exam record that owns this PDF, JPEG, or PNG answer sheet.</p>
              </div>
              <button type="button" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading} aria-label="Close upload dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Examinee</span>
                <select value={uploadReviewId} onChange={event => setUploadReviewId(event.target.value)} disabled={isUploading} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400">
                  {uploadableAttempts.map(attempt => <option key={attempt.id} value={attempt.id}>{attempt.candidateName} · {attempt.candidateId}</option>)}
                </select>
              </label>
              <fieldset>
                <legend className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Template Source &amp; Paper Layout</legend>
                <div className="mt-2 grid gap-2">
                  {templateSources.map(source => {
                    const Icon = source.icon;
                    return (
                      <label key={source.value} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors', uploadTemplateSource === source.value ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                        <input type="radio" name="template-source" value={source.value} checked={uploadTemplateSource === source.value} onChange={() => setUploadTemplateSource(source.value)} disabled={isUploading} className="sr-only" />
                        <span className={cn('rounded-lg p-2', uploadTemplateSource === source.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}><Icon className="h-4 w-4" /></span>
                        <span>
                          <span className="block text-xs font-black text-slate-700">{source.label}</span>
                          <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{source.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {uploadTemplateSource && (
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choose file</span>
                  <input aria-label="Student answer sheet file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event => setUploadFile(event.target.files?.[0] ?? null)} disabled={isUploading} className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-[10px] file:font-black file:uppercase file:text-white" />
                </label>
              )}
              {uploadError && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600"><AlertCircle className="h-4 w-4" /> {uploadError}</p>}
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading} className="btn-secondary disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void handleAnswerSheetUpload()} disabled={isUploading || !uploadReviewId || !uploadTemplateSource || !uploadFile} className="btn-primary flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                <Upload className="h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload Answer Sheet'}
              </button>
            </div>
          </section>
        </div>
      )}
      <ConfirmationDialog
        isOpen={pendingAction !== null}
        title={pendingAction?.kind === 'GRADE' ? 'Confirm exam check?' : pendingAction?.kind === 'OPEN_REVIEW' ? 'Review pending scores?' : 'Reject grading?'}
        message={pendingAction?.kind === 'GRADE'
          ? `This will mark ${pendingAction.attempt.candidateName}'s exam as Graded.`
          : pendingAction?.kind === 'OPEN_REVIEW'
            ? `${pendingAction.attempt.candidateName}'s exam still has ${pendingAction.attempt.pendingSubjectiveItems} pending subjective ${pendingAction.attempt.pendingSubjectiveItems === 1 ? 'item' : 'items'}. Open the review to score them before grading.`
            : `This will reject the grading for ${pendingAction?.attempt.candidateName ?? 'this examinee'} and return the exam to Pending.`}
        confirmLabel={pendingAction?.kind === 'GRADE' ? 'Confirm Check' : pendingAction?.kind === 'OPEN_REVIEW' ? 'Open Review' : 'Reject'}
        tone={pendingAction?.kind === 'RETURN_TO_PENDING' ? 'danger' : 'default'}
        isConfirming={pendingAction !== null && updatingAttemptId === pendingAction.attempt.id}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction.kind === 'OPEN_REVIEW') {
            navigate(`/admin/hub/review/${pendingAction.attempt.id}`);
            setPendingAction(null);
            return;
          }
          void handleGradingStatus(pendingAction.attempt, pendingAction.kind === 'GRADE' ? 'GRADED' : 'SUBMITTED');
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

function getCandidateInitials(candidateName: string): string {
  return candidateName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';
}
