import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Cpu,
  Download,
  Filter,
  Layers,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  getScoreManagementBatches,
  getScoreManagementBatchResultPage,
  exportScoreManagementBatch,
  processScoreManagementBatch,
  releaseScoreManagementBatch,
  reprocessScoreManagementBatch,
  scoreBatchStatusLabel,
  scoreReleaseStatusLabel,
  type ScoreManagementBatch,
  type ScoreManagementResult,
  type ScoreReleaseStatus,
} from '../../services/scoreManagementService';

type ReleaseFilter = 'All' | ScoreReleaseStatus;
type SortDirection = 'asc' | 'desc';
type SortKey = 'candidateId' | 'candidateName' | 'examName' | 'finalScore' | 'percentile' | 'rank' | 'releaseStatus';

const RELEASE_FILTERS: Array<{ label: string; value: ReleaseFilter }> = [
  { label: 'All Release Statuses', value: 'All' },
  { label: 'Not Yet Released', value: 'NOT_RELEASED' },
  { label: 'Released', value: 'RELEASED' },
];
const PAGE_SIZE = 100;

export default function ScoreManagement() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<ScoreManagementBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [rows, setRows] = useState<ScoreManagementResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [releaseFilter, setReleaseFilter] = useState<ReleaseFilter>('All');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingScoring, setIsProcessingScoring] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resultRequestId = useRef(0);

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;
  const isBatchScoringReleased = selectedBatch?.status === 'RESULTS_RELEASED';
  const isBatchScoringProcessed = selectedBatch?.status === 'SCORING_PROCESSED' || isBatchScoringReleased;
  const scoringButtonLabel = isBatchScoringProcessed ? 'Reprocess Scoring' : 'Process Scoring';

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const resultQuery = (
    pageNumber: number,
    overrides: Partial<{
      sortKey: SortKey;
      sortDirection: SortDirection;
      search: string;
      releaseFilter: ReleaseFilter;
    }> = {},
  ) => {
    const nextReleaseFilter = overrides.releaseFilter ?? releaseFilter;
    return {
      page: pageNumber,
      pageSize: PAGE_SIZE,
      sortKey: overrides.sortKey ?? sortKey,
      sortDirection: overrides.sortDirection ?? sortDirection,
      search: overrides.search ?? searchTerm,
      releaseStatus: nextReleaseFilter === 'All' ? undefined : nextReleaseFilter,
    };
  };

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const loadedBatches = await getScoreManagementBatches();
        if (cancelled) return;
        setBatches(loadedBatches);
        const firstBatchId = loadedBatches[0]?.id ?? '';
        setSelectedBatchId(firstBatchId);
        if (firstBatchId) {
          const requestId = resultRequestId.current + 1;
          resultRequestId.current = requestId;
          const page = await getScoreManagementBatchResultPage(firstBatchId, {
            page: 1,
            pageSize: PAGE_SIZE,
            sortKey,
            sortDirection,
          });
          if (cancelled || requestId !== resultRequestId.current) return;
          setRows(page.results);
          setResultCount(page.count);
          setCurrentPage(page.page);
        } else {
          setRows([]);
          setResultCount(0);
          setCurrentPage(1);
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : 'Unable to load score management data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedBatchId) return undefined;

    const timeoutId = window.setTimeout(() => {
      const requestId = resultRequestId.current + 1;
      resultRequestId.current = requestId;
      setIsLoading(true);
      getScoreManagementBatchResultPage(selectedBatchId, resultQuery(1))
        .then((page) => {
          if (requestId !== resultRequestId.current) return;
          setRows(page.results);
          setResultCount(page.count);
          setCurrentPage(page.page);
        })
        .catch((error) => {
          if (requestId === resultRequestId.current) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to filter score results.');
          }
        })
        .finally(() => {
          if (requestId === resultRequestId.current) setIsLoading(false);
        });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, releaseFilter]);

  const refreshBatchState = async (batchId: string, pageNumber = currentPage) => {
    const [loadedBatches, loadedPage] = await Promise.all([
      getScoreManagementBatches(),
      getScoreManagementBatchResultPage(batchId, {
        ...resultQuery(pageNumber),
      }),
    ]);
    setBatches(loadedBatches);
    setRows(loadedPage.results);
    setResultCount(loadedPage.count);
    setCurrentPage(loadedPage.page);
  };

  const handleBatchChange = async (batchId: string) => {
    setSelectedBatchId(batchId);
    setSearchTerm('');
    setReleaseFilter('All');
    setSortKey('rank');
    setSortDirection('asc');
    setCurrentPage(1);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [loadedBatches, loadedPage] = await Promise.all([
        getScoreManagementBatches(),
        getScoreManagementBatchResultPage(batchId, {
          page: 1,
          pageSize: PAGE_SIZE,
          sortKey: 'rank',
          sortDirection: 'asc',
          search: '',
        }),
      ]);
      setBatches(loadedBatches);
      setRows(loadedPage.results);
      setResultCount(loadedPage.count);
      setCurrentPage(loadedPage.page);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load score results.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessScoring = async () => {
    if (!selectedBatch) return;

    setIsProcessingScoring(true);
    setErrorMessage(null);
    try {
      const result = isBatchScoringProcessed
        ? await reprocessScoreManagementBatch(selectedBatch.id)
        : await processScoreManagementBatch(selectedBatch.id);

      setBatches(await getScoreManagementBatches());
      await refreshBatchState(selectedBatch.id, 1);
      showToast(`${scoreBatchStatusLabel(result.batch.status)} for ${result.batch.label}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to process scoring.');
    } finally {
      setIsProcessingScoring(false);
    }
  };

  const handleMassRelease = async () => {
    if (!selectedBatch || !isBatchScoringProcessed) {
      setShowConfirmModal(false);
      showToast('Process scoring before releasing batch results.');
      return;
    }

    setIsSending(true);
    try {
      await releaseScoreManagementBatch(selectedBatch.id);
      setShowConfirmModal(false);
      await refreshBatchState(selectedBatch.id);
      showToast('All candidate results for the selected batch have been officially released.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to release batch results.');
    } finally {
      setIsSending(false);
    }
  };

  const handleViewCandidate = (candidateId: string) => {
    navigate(`/admin/reviewer/applications/${candidateId}`);
  };

  const handleExport = async () => {
    if (!selectedBatch) return;
    try {
      const blob = await exportScoreManagementBatch(selectedBatch.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedBatch.id}-score-results.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Results exported as CSV successfully.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to export score results.');
    }
  };

  const handlePageChange = async (nextPage: number) => {
    if (!selectedBatch || nextPage < 1) return;
    setIsLoading(true);
    try {
      await refreshBatchState(selectedBatch.id, nextPage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load score results.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (nextSortKey: SortKey) => {
    if (!isBatchScoringProcessed) {
      showToast('Process scoring before sorting computed score results.');
      return;
    }

    let nextDirection: SortDirection;
    if (sortKey === nextSortKey) {
      nextDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      nextDirection = nextSortKey === 'rank' || nextSortKey === 'candidateName' ? 'asc' : 'desc';
    }

    setSortKey(nextSortKey);
    setSortDirection(nextDirection);
    if (selectedBatch) {
      setIsLoading(true);
      getScoreManagementBatchResultPage(selectedBatch.id, {
        ...resultQuery(1, { sortKey: nextSortKey, sortDirection: nextDirection }),
      })
        .then((page) => {
          setRows(page.results);
          setResultCount(page.count);
          setCurrentPage(page.page);
        })
        .catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Unable to sort score results.'))
        .finally(() => setIsLoading(false));
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-philsa-navy">
            Examination Score Management
          </h1>
          <p className="text-sm font-medium text-philsa-gray">
            Coordinate final result audits, calculate percentile rankings, and manage candidate score releases.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleProcessScoring}
            disabled={!selectedBatch || isProcessingScoring || isBatchScoringReleased}
            title={isBatchScoringReleased ? 'Released results cannot be reprocessed.' : undefined}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              isBatchScoringProcessed ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-philsa-red hover:bg-philsa-red-hover'
            }`}
          >
            {isProcessingScoring ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Cpu className="h-4 w-4" />
                {scoringButtonLabel}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void handleExport()}
            className="btn-secondary flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={!isBatchScoringProcessed || isBatchScoringReleased}
            className="flex items-center gap-2 rounded-xl bg-philsa-navy px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-philsa-navy/10 transition-all hover:bg-philsa-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Release Results
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-philsa-border bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl flex-1 space-y-1.5">
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-philsa-navy">
              <Layers className="h-4 w-4 text-philsa-red" />
              Select Examination Batch <span className="text-philsa-red">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedBatchId}
                onChange={(event) => void handleBatchChange(event.target.value)}
                className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-philsa-bg px-4 py-3 pr-10 text-sm font-bold text-philsa-navy shadow-xs transition-all focus:border-philsa-red focus:outline-none focus:ring-2 focus:ring-philsa-red/10"
              >
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-philsa-gray" />
            </div>
          </div>

          {selectedBatch && (
            <div className="flex items-center gap-6 py-1 sm:self-end">
              <SummaryMetric
                label="Batch Status"
                value={scoreBatchStatusLabel(selectedBatch.status)}
                tone={isBatchScoringProcessed ? 'success' : 'warning'}
              />
              <SummaryMetric label="Total Candidates" value={`${selectedBatch.totalCandidates} Candidates`} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-philsa-border bg-white p-6 shadow-xs">
        {errorMessage && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <div className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
          isBatchScoringProcessed ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-100 bg-amber-50/50'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isBatchScoringProcessed ? 'border-emerald-100 bg-white text-emerald-600' : 'border-amber-100 bg-white text-amber-600'
            }`}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-philsa-navy">
                {isBatchScoringProcessed ? 'Percentiles & Rankings Calculated' : 'Scores Ready For Processing'}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {isBatchScoringProcessed
                  ? 'Final score percentiles and ranks are processed for this batch.'
                  : 'Click Process Scoring to compute percentile rankings for all candidates in this batch.'}
              </p>
            </div>
          </div>

        </div>

        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-philsa-gray" />
              <input
                type="text"
                placeholder="Search candidate ID or name..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-xl border border-philsa-border bg-white py-2.5 pl-11 pr-4 text-xs font-medium text-philsa-navy shadow-xs focus:outline-none focus:ring-2 focus:ring-philsa-red/10"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={releaseFilter}
                  onChange={(event) => setReleaseFilter(event.target.value as ReleaseFilter)}
                  className="appearance-none rounded-xl border border-philsa-border bg-white px-4 py-2.5 pr-8 text-xs font-bold text-philsa-navy shadow-xs"
                >
                  {RELEASE_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-philsa-gray" />
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-xs"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 gap-4 overflow-hidden rounded-2xl border border-philsa-border bg-slate-50 p-4 text-xs md:grid-cols-3"
              >
                <FilterInput label="Min Score Threshold" placeholder="e.g. 15" type="number" />
                <FilterInput label="Rank Cutoff" placeholder="e.g. 100" type="number" />
                <FilterInput label="Region / Center" placeholder="e.g. NCR" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ScoreResultsTable
          rows={rows}
          isLoading={isLoading}
          batchLabel={selectedBatch?.label}
          isBatchScoringProcessed={isBatchScoringProcessed}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewCandidate={handleViewCandidate}
        />
        <div className="flex flex-col justify-between gap-3 text-xs font-bold text-philsa-gray sm:flex-row sm:items-center">
          <span>
            Showing {rows.length === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1}
            {'-'}
            {Math.min(currentPage * PAGE_SIZE, resultCount)} of {resultCount} processed records
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePageChange(currentPage - 1)}
              disabled={isLoading || currentPage <= 1}
              className="rounded-lg border border-philsa-border px-3 py-2 text-[11px] font-black uppercase text-philsa-navy disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 text-[11px] font-black uppercase text-philsa-navy">
              Page {currentPage}
            </span>
            <button
              type="button"
              onClick={() => void handlePageChange(currentPage + 1)}
              disabled={isLoading || currentPage * PAGE_SIZE >= resultCount}
              className="rounded-lg border border-philsa-border px-3 py-2 text-[11px] font-black uppercase text-philsa-navy disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-philsa-navy/60 p-4 font-sans backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg space-y-6 rounded-3xl border border-philsa-border bg-white p-8 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => !isSending && setShowConfirmModal(false)}
                className="absolute right-6 top-6 rounded-xl p-1.5 text-philsa-gray transition-all hover:bg-philsa-bg hover:text-philsa-red"
                disabled={isSending}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex gap-4">
                <div className="shrink-0 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                  <ShieldAlert className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-philsa-navy">
                    Confirm Results Release?
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-philsa-gray">
                    Official Results Transmission
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-philsa-border bg-philsa-bg/50 p-5">
                <p className="text-xs font-semibold uppercase leading-relaxed tracking-wide text-philsa-gray">
                  You are about to release official score sheets for candidates in{' '}
                  <span className="font-black text-philsa-red">{selectedBatch?.label}</span>.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSending}
                  className="flex-1 rounded-xl border border-philsa-border bg-white py-3.5 text-xs font-black uppercase tracking-widest text-philsa-navy transition-all hover:bg-philsa-bg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleMassRelease()}
                  disabled={isSending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-philsa-red py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-philsa-red-hover disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Releasing...
                    </>
                  ) : (
                    'Confirm Release'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
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
            <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'warning';
}) {
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-philsa-gray">{label}</span>
      <span className={`flex items-center gap-1.5 text-sm font-extrabold ${
        tone === 'success' ? 'text-emerald-700' : tone === 'warning' ? 'text-amber-700' : 'text-philsa-navy'
      }`}>
        {tone && <span className={`h-2.5 w-2.5 rounded-full ${tone === 'success' ? 'bg-emerald-600' : 'bg-amber-500'}`} />}
        {value}
      </span>
    </div>
  );
}

function ScoreResultsTable({
  rows,
  isLoading,
  batchLabel,
  isBatchScoringProcessed,
  sortKey,
  sortDirection,
  onSort,
  onViewCandidate,
}: {
  rows: ScoreManagementResult[];
  isLoading: boolean;
  batchLabel?: string;
  isBatchScoringProcessed: boolean;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (sortKey: SortKey) => void;
  onViewCandidate: (candidateId: string) => void;
}) {
  return (
    <div className="card-philsa !p-0 overflow-hidden border border-philsa-border shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-left">
          <thead className="border-b border-philsa-border bg-philsa-bg text-[11px] font-black uppercase tracking-wider text-philsa-navy">
            <tr>
              <SortableHeader label="Candidate ID" sortKey="candidateId" activeKey={sortKey} direction={sortDirection} disabled={!isBatchScoringProcessed} onSort={onSort} />
              <SortableHeader label="Candidate" sortKey="candidateName" activeKey={sortKey} direction={sortDirection} disabled={!isBatchScoringProcessed} onSort={onSort} />
              <SortableHeader label="Exam" sortKey="examName" activeKey={sortKey} direction={sortDirection} disabled={!isBatchScoringProcessed} onSort={onSort} />
              <SortableHeader label="Final Score" sortKey="finalScore" activeKey={sortKey} direction={sortDirection} disabled={!isBatchScoringProcessed} onSort={onSort} />
              <SortableHeader label="Percentile" sortKey="percentile" activeKey={sortKey} direction={sortDirection} disabled={!isBatchScoringProcessed} onSort={onSort} />
              <SortableHeader label="Rank" sortKey="rank" activeKey={sortKey} direction={sortDirection} disabled={!isBatchScoringProcessed} onSort={onSort} />
              <SortableHeader label="Release Status" sortKey="releaseStatus" activeKey={sortKey} direction={sortDirection} disabled={!isBatchScoringProcessed} onSort={onSort} />
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-philsa-border text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center italic text-slate-400">
                  Loading candidate examination records...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center italic text-slate-400">
                  No candidate examination records found for {batchLabel}.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-philsa-bg/40">
                  <td className="px-6 py-4 font-mono text-[11px] font-bold text-slate-600">{row.candidateId}</td>
                  <td className="px-6 py-4 font-bold text-philsa-navy">{row.candidateName}</td>
                  <td className="px-6 py-4 font-medium text-slate-600">{row.examName}</td>
                  <td className="px-6 py-4 font-extrabold text-philsa-navy">{row.finalScoreDisplay}</td>
                  <td className="px-6 py-4 font-black text-philsa-navy">
                    {row.percentile === null ? (
                      <span className="font-normal text-slate-400">N/A</span>
                    ) : (
                      <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">
                        {row.percentile.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-philsa-navy">
                    {row.rank === null ? (
                      <span className="font-normal text-slate-400">N/A</span>
                    ) : (
                      <span className="rounded-md border border-purple-100 bg-purple-50 px-2 py-0.5 text-purple-700">
                        {row.rank}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <ReleaseBadge status={row.releaseStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => onViewCandidate(row.candidateId)}
                      className="cursor-pointer text-xs font-bold text-philsa-navy hover:text-philsa-red"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  disabled,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  disabled: boolean;
  onSort: (sortKey: SortKey) => void;
}) {
  const active = sortKey === activeKey;

  return (
    <th className="px-6 py-4">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        disabled={disabled}
        aria-label={`Sort ${label} ${active && direction === 'asc' ? 'descending' : 'ascending'}`}
        className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-philsa-navy transition-colors hover:text-philsa-red disabled:cursor-not-allowed disabled:text-philsa-navy"
      >
        {label}
        {active ? (
          direction === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5 text-philsa-red" />
            : <ArrowDown className="h-3.5 w-3.5 text-philsa-red" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />
        )}
      </button>
    </th>
  );
}

function FilterInput({
  label,
  placeholder,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  type?: 'text' | 'number';
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase text-philsa-gray">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-philsa-border bg-white p-2 text-xs"
      />
    </div>
  );
}

function ReleaseBadge({ status }: { status: ScoreReleaseStatus }) {
  const released = status === 'RELEASED';

  return (
    <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
      released
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-amber-200 bg-amber-50 text-amber-800'
    }`}>
      {scoreReleaseStatusLabel(status)}
    </span>
  );
}
