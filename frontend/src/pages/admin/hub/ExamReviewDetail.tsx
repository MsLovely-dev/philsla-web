import { useEffect, useRef, useState, type ChangeEvent, type ComponentType } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Atom,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Info,
  MessageSquare,
  Percent,
  Save,
  Upload,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { ConfirmationDialog } from '../../../components/ui';
import {
  backendExamReviewService,
  type ExamReviewDetailItem,
  type ExamReviewItem,
  type ExamReviewSubject,
} from '../../../services/backendExamReviewService';

const subjects: Array<{ id: ExamReviewSubject; name: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'MATH', name: 'Math', icon: Calculator },
  { id: 'ENGLISH', name: 'English', icon: BookOpen },
  { id: 'FILIPINO', name: 'Filipino', icon: MessageSquare },
  { id: 'SCIENCE', name: 'Science', icon: Atom },
];

export default function ExamReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<ExamReviewDetailItem | null>(null);
  const [activeSubject, setActiveSubject] = useState<ExamReviewSubject>('MATH');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [isGradeConfirmationOpen, setIsGradeConfirmationOpen] = useState(false);
  const [isMarkingGraded, setIsMarkingGraded] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadReview = async () => {
      if (!id) {
        setLoadError('The Exam Review identifier is missing.');
        setIsLoading(false);
        return;
      }

      const result = await backendExamReviewService.get(id);
      if (isCancelled) return;
      if ('error' in result) {
        setLoadError(result.error.message);
      } else {
        setReview(result.data);
      }
      setIsLoading(false);
    };

    void loadReview();
    return () => {
      isCancelled = true;
    };
  }, [id]);

  const handleRelease = async () => {
    if (!review || review.status !== 'GRADED' || review.pendingSubjectiveItems > 0) return;
    setReleaseError(null);
    setIsReleasing(true);
    const result = await backendExamReviewService.release(review.id);
    if ('error' in result) {
      setReleaseError(result.error.message);
    } else {
      setReview(result.data);
    }
    setIsReleasing(false);
  };

  const handleMarkGraded = async () => {
    if (!review || review.status !== 'SUBMITTED' || review.pendingSubjectiveItems > 0) return;
    setGradingError(null);
    setIsMarkingGraded(true);
    const result = await backendExamReviewService.setGradingStatus(review.id, 'GRADED');
    if ('error' in result) {
      setGradingError(result.error.message);
    } else {
      setReview(current => current ? { ...current, ...result.data } : current);
      setIsGradeConfirmationOpen(false);
    }
    setIsMarkingGraded(false);
  };

  const handleAnswerSheetSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!review || !file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    const result = await backendExamReviewService.uploadAnswerSheet(review.id, file);
    if ('error' in result) {
      setUploadError(result.error.message);
    } else {
      setReview(result.data);
      setUploadSuccess(`${file.name} was uploaded successfully.`);
    }
    setIsUploading(false);
  };

  const handleSaveItemScore = async (item: ExamReviewItem, points: number) => {
    if (!review || review.status === 'FINALIZED') return;
    setScoreError(null);
    setSavingItemId(item.id);
    const result = await backendExamReviewService.scoreItem(review.id, item.id, points);
    if ('error' in result) {
      setScoreError(result.error.message);
    } else {
      setReview(result.data);
    }
    setSavingItemId(null);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center text-sm font-bold text-slate-500">
        Loading exam review record...
      </div>
    );
  }

  if (loadError || !review) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
        <h2 className="text-lg font-bold text-slate-800">Exam Review unavailable</h2>
        <p className="mt-1 text-sm text-slate-500">{loadError ?? 'The requested record could not be found.'}</p>
        <button type="button" onClick={() => navigate('/admin/hub/review')} className="mt-6 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900">
          Back to Review Queue
        </button>
      </div>
    );
  }

  const manualScore = Math.max(0, review.totalScore - review.systemInitialScore);
  const isReadyToMarkGraded = review.status === 'SUBMITTED' && review.pendingSubjectiveItems === 0;
  const isReleaseReady = review.status === 'GRADED' && review.pendingSubjectiveItems === 0;
  const activeSubjectItems = review.examItems.filter(item => item.subject === activeSubject);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/hub/review')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          <ChevronLeft className="h-5 w-5" /> Back to List
        </button>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-3">
            {isReadyToMarkGraded && (
              <button
                type="button"
                onClick={() => setIsGradeConfirmationOpen(true)}
                disabled={isMarkingGraded}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-700/10 transition-all hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-50"
              >
                <CheckCircle2 className="h-3 w-3" />
                Mark as Graded
              </button>
            )}
            {isReleaseReady && (
              <button
                type="button"
                onClick={() => void handleRelease()}
                disabled={isReleasing}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
              >
                <ArrowRight className="h-3 w-3 text-red-500" />
                {isReleasing ? 'Releasing...' : 'Release to Score Management'}
              </button>
            )}
            <StatusBadge status={review.status} />
            <div className="whitespace-nowrap rounded-xl bg-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Session ID: {review.attemptCode}
            </div>
          </div>
          {releaseError && (
            <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-500">
              <Info className="h-3 w-3" /> {releaseError}
            </p>
          )}
          {gradingError && (
            <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-500">
              <Info className="h-3 w-3" /> {gradingError}
            </p>
          )}
          {review.status === 'GRADED' && review.pendingSubjectiveItems > 0 && (
            <p role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              <Info className="h-4 w-4" />
              {review.pendingSubjectiveItems} subjective {review.pendingSubjectiveItems === 1 ? 'item still requires' : 'items still require'} an official score before release.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:flex-row">
        <div className="flex flex-1 gap-6 border-b border-slate-100 p-8 md:border-b-0 md:border-r">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold text-slate-500">
            {getCandidateInitials(review.candidateName)}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">{review.candidateName}</h2>
            <p className="text-sm font-medium text-slate-500">Submitted {new Date(review.submittedAt).toLocaleString()}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {review.candidateId}
              </span>
              <span className="rounded border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {review.examSetCode}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-6 border-t border-slate-100 bg-slate-50/30 p-8 md:w-96 md:border-l md:border-t-0">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aggregate Examination Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tighter text-slate-800">{review.totalScore}</span>
              <span className="text-xl font-bold text-slate-300">/ {review.maxScore}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Auto-Graded</p>
              <p className="text-sm font-bold text-slate-600">{review.systemInitialScore} pts</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-rose-500">Manual Gradings</p>
              <p className="text-sm font-bold text-slate-800">{manualScore} pts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
          <Percent className="h-4 w-4 text-red-500" /> Subject Performance Breakdown
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {subjects.map(({ id, name }) => {
            const items = review.examItems.filter(item => item.subject === id);
            const score = items.reduce((total, item) => total + (item.pointsAwarded ?? 0), 0);
            const maxScore = items.reduce((total, item) => total + item.maxPoints, 0);
            const pendingItems = items.filter(item => item.itemType === 'SUBJECTIVE' && item.pointsAwarded === null).length;
            const accuracy = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            return (
              <div key={id} className="flex flex-col justify-between space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{name}</span>
                  <span className="text-xs font-black text-slate-500">{score} / {maxScore} pts</span>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-slate-700" style={{ width: `${accuracy}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>Accuracy</span>
                    <span>{accuracy}%</span>
                  </div>
                  <p
                    aria-label={`${name} subject pending status`}
                    className={cn('text-[9px] font-black uppercase tracking-wider', pendingItems > 0 ? 'text-amber-700' : 'text-emerald-700')}
                  >
                    {pendingItems > 0
                      ? `${pendingItems} pending subjective ${pendingItems === 1 ? 'item' : 'items'}`
                      : 'All subjective items scored'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 rounded-full bg-slate-800" />
            <div>
              <h3 className="text-base font-bold text-slate-800">Final Answer Sheet Mappings</h3>
              <p className="text-[10px] font-medium text-slate-500">Scanned paper OMR mappings &amp; active digital answers across subjects</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="rounded-xl bg-slate-100 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
              {review.pendingSubjectiveItems} pending subjective items
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={event => void handleAnswerSheetSelected(event)}
              className="sr-only"
              aria-label="Choose student answer sheet"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || review.status === 'FINALIZED'}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploading ? 'Uploading...' : review.status === 'FINALIZED' ? 'Upload locked after release' : 'Upload Student Answer Sheet'}
            </button>
          </div>
        </div>

        {(uploadError || uploadSuccess || review.answerSheet) && (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs shadow-sm">
            {uploadError && <p role="alert" className="flex items-center gap-2 font-semibold text-rose-600"><AlertCircle className="h-4 w-4" /> {uploadError}</p>}
            {uploadSuccess && <p role="status" className="flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> {uploadSuccess}</p>}
            {review.answerSheet && (
              <p className="text-slate-500">
                Latest answer sheet: <span className="font-bold text-slate-700">{answerSheetLabel(review.answerSheet.contentType)}</span>
                {' · '}{formatFileSize(review.answerSheet.size)}{' · '}{new Date(review.answerSheet.uploadedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 border-b border-slate-100 pb-2 md:flex-row">
          {subjects.map(({ id, name, icon: Icon }) => {
            const isSelected = activeSubject === id;
            const items = review.examItems.filter(item => item.subject === id);
            const score = items.reduce((total, item) => total + (item.pointsAwarded ?? 0), 0);
            const maxScore = items.reduce((total, item) => total + item.maxPoints, 0);
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSubject(id)}
                className={cn(
                  'flex flex-1 cursor-pointer items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none',
                  isSelected
                    ? 'scale-[1.02] border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-950/10'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('rounded-xl p-2', isSelected ? 'bg-white/10 text-red-400' : 'bg-slate-100 text-slate-500')}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn('text-xs font-black uppercase tracking-wider leading-none', isSelected ? 'text-white' : 'text-slate-800')}>{name}</p>
                    <p className={cn('mt-1 text-[10px] font-medium leading-none', isSelected ? 'text-slate-300' : 'text-slate-400')}>Core Competency</p>
                  </div>
                </div>
                <span className={cn('rounded-lg px-2.5 py-1 text-xs font-black', isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500')}>{score} / {maxScore}</span>
              </button>
            );
          })}
        </div>

        {activeSubjectItems.length > 0 ? (
          <div className="space-y-4">
            {scoreError && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600"><AlertCircle className="h-4 w-4" /> {scoreError}</p>}
            {activeSubjectItems.map(item => (
              <ExamItemCard
                key={item.id}
                item={item}
                isSaving={savingItemId === item.id}
                isLocked={review.status === 'FINALIZED'}
                onSave={points => void handleSaveItemScore(item, points)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <Info className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">No review items available</h3>
            <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-500">This subject has no persisted answer data.</p>
          </div>
        )}
      </div>
      <ConfirmationDialog
        isOpen={isGradeConfirmationOpen}
        title="Mark exam as Graded?"
        message={`This confirms that ${review.candidateName}'s subjective items are fully scored and makes the exam ready for release to Score Management.`}
        confirmLabel="Confirm Grading"
        isConfirming={isMarkingGraded}
        onConfirm={() => void handleMarkGraded()}
        onCancel={() => setIsGradeConfirmationOpen(false)}
      />
    </div>
  );
}

function ExamItemCard({
  item,
  isSaving,
  isLocked,
  onSave,
}: {
  item: ExamReviewItem;
  isSaving: boolean;
  isLocked: boolean;
  onSave: (points: number) => void;
}) {
  const isPending = item.reviewStatus === 'PENDING_REVIEW';
  const [officialScore, setOfficialScore] = useState(item.pointsAwarded ?? 0);
  const subjectLabel = subjects.find(subject => subject.id === item.subject)?.name ?? item.subject;

  useEffect(() => {
    setOfficialScore(item.pointsAwarded ?? 0);
  }, [item.pointsAwarded]);

  return (
    <article className={cn('rounded-2xl border bg-white p-6 shadow-sm', isPending ? 'border-amber-200' : 'border-slate-200')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Question {item.itemNumber} <span className="text-slate-300">•</span> {subjectLabel}</p>
          <h4 className="mt-3 text-base font-bold leading-relaxed text-slate-800">{item.question}</h4>
        </div>
        <p className="shrink-0 text-xs font-bold text-slate-400">{item.responseSeconds}s taken to answer</p>
      </div>

      <div className="mt-5">
        <ReviewStatusBadge status={item.reviewStatus} />
      </div>

      {item.itemType === 'OBJECTIVE' ? (
        <div className="mt-4 space-y-2" role="list" aria-label={`Answer choices for question ${item.itemNumber}`}>
          {item.answerOptions.map(option => {
            const isSelected = option === item.studentAnswer;
            const isExpected = option === item.expectedAnswer;
            return (
              <div
                key={option}
                role="listitem"
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold',
                  isSelected && isExpected && 'border-emerald-300 bg-emerald-50 text-emerald-800',
                  isSelected && !isExpected && 'border-rose-300 bg-rose-50 text-rose-800',
                  !isSelected && isExpected && 'border-emerald-200 bg-white text-slate-700',
                  !isSelected && !isExpected && 'border-slate-100 bg-slate-50 text-slate-600',
                )}
              >
                <span className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  isSelected ? 'border-current' : 'border-slate-300',
                )}>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-current" />}
                </span>
                <span>{option}</span>
                {isExpected && <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-emerald-600">Correct answer</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="whitespace-pre-line text-sm font-medium leading-7 text-slate-700">{item.studentAnswer}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-3 text-[10px] font-bold text-slate-400">
              {item.wordCount !== null && <span>Word Count: {item.wordCount} words</span>}
              {item.responseSubmittedAt && <span>Submission Timestamp: {new Date(item.responseSubmittedAt).toLocaleString()}</span>}
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
            <h5 className="text-xs font-black uppercase tracking-widest text-slate-700">Grading Rubric &amp; Automated Recommendation</h5>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Official Rubric</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{item.rubric.trim() || 'No rubric provided for this item.'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">AI System Proposed Score</p>
                <p className="mt-2 text-2xl font-black text-blue-700">{item.aiProposedScore ?? '—'} <span className="text-sm text-slate-400">pts</span></p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h5 className="text-xs font-black uppercase tracking-widest text-slate-700">Manual Evaluation Terminal</h5>
            <p className="mt-1 text-xs text-slate-500">Official score override. This value will determine the final result.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Points</span>
                <input
                  type="number"
                  min={0}
                  max={item.maxPoints}
                  value={officialScore}
                  onChange={event => setOfficialScore(Math.min(item.maxPoints, Math.max(0, Number(event.target.value))))}
                  disabled={isLocked || isSaving}
                  aria-label={`Official score for question ${item.itemNumber}`}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-100"
                />
              </label>
              <p className="pb-3 text-sm font-bold text-slate-400">Maximum / {item.maxPoints} pts</p>
              <button
                type="button"
                onClick={() => onSave(officialScore)}
                disabled={isLocked || isSaving}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs">
        <div>
          <p className="font-black text-slate-700">{item.itemType === 'OBJECTIVE' ? 'Objective Response' : 'Subjective Response'}</p>
          <p className="mt-0.5 font-medium text-slate-400">took {item.responseSeconds} seconds</p>
        </div>
        <p className="font-black text-slate-700">Points: {item.pointsAwarded ?? '—'} / {item.maxPoints}</p>
      </div>
    </article>
  );
}

function ReviewStatusBadge({ status }: { status: ExamReviewItem['reviewStatus'] }) {
  const label = {
    PENDING_REVIEW: 'Pending Check',
    CORRECT: 'Correct',
    INCORRECT: 'Incorrect',
    PARTIAL: 'Partial Credit',
    GRADED: 'Graded',
  }[status];
  return (
    <span className={cn(
      'rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider',
      status === 'PENDING_REVIEW' && 'border-amber-200 bg-amber-50 text-amber-700',
      status === 'CORRECT' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
      status === 'INCORRECT' && 'border-rose-200 bg-rose-50 text-rose-700',
      status === 'PARTIAL' && 'border-blue-200 bg-blue-50 text-blue-700',
      status === 'GRADED' && 'border-blue-200 bg-blue-50 text-blue-700',
    )}>{label}</span>
  );
}

function StatusBadge({ status }: { status: ExamReviewDetailItem['status'] }) {
  if (status === 'FINALIZED') {
    return <span className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Released to Score Management</span>;
  }
  if (status === 'GRADED') {
    return <span className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Fully Graded</span>;
  }
  return <span className="flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-600"><Clock className="h-3 w-3" /> Pending Review</span>;
}

function getCandidateInitials(candidateName: string): string {
  return candidateName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';
}

function answerSheetLabel(contentType: string): string {
  if (contentType === 'application/pdf') return 'PDF';
  if (contentType === 'image/png') return 'PNG';
  return 'JPEG';
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
