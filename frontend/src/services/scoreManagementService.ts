import { sharedApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export type ScoreBatchStatus = 'READY_FOR_PROCESSING' | 'PROCESSING' | 'SCORING_PROCESSED' | 'RESULTS_RELEASED';
export type ScoreReleaseStatus = 'NOT_RELEASED' | 'RELEASED';

export interface ScoreManagementBatch {
  id: string;
  label: string;
  examName: string;
  status: ScoreBatchStatus;
  totalCandidates: number;
  processingBatchId: string;
  processedAt: string | null;
  processedBy: string | null;
}

export interface ScoreManagementResult {
  id: string;
  candidateId: string;
  lrn: string;
  candidateName: string;
  examName: string;
  examSetId: string;
  rawScore: number;
  maxScore: number;
  finalScore: number;
  finalScoreDisplay: string;
  percentile: number | null;
  rank: number | null;
  releaseStatus: ScoreReleaseStatus;
  publishedAt: string | null;
}

export interface ScoreManagementReprocessResult {
  batch: ScoreManagementBatch;
  results: ScoreManagementResult[];
}

export interface ScoreManagementResultPage {
  count: number;
  page: number;
  pageSize: number;
  results: ScoreManagementResult[];
}

export interface ScoreManagementCandidateProfile {
  id: string;
  candidateId: string;
  status: string;
  photoUrl: string;
  personal: Record<string, unknown>;
  address: Record<string, unknown>;
  school: Record<string, unknown>;
  coursePreferences: Array<Record<string, unknown>>;
  reviewStep: Record<string, unknown>;
  activityLogs: ScoreManagementCandidateActivityLog[];
  examCycleId: string;
  submittedAt: string | null;
}

export interface ScoreManagementCandidateActivityLog {
  id: number;
  action: string;
  event: string;
  outcome: string;
  timestamp: string;
  sessionId: string;
  ipAddress: string;
  deviceBrowser: string;
  registrationId: string;
  applicantId: string;
  actorRole: string;
  correlationId: string;
}

export interface ScoreManagementCandidateProfileResponse {
  score: ScoreManagementResult;
  profile: ScoreManagementCandidateProfile | null;
}

export interface ScoreManagementResultQuery {
  page?: number;
  pageSize?: number;
  sortKey?: string;
  sortDirection?: string;
  search?: string;
  releaseStatus?: ScoreReleaseStatus;
}

interface BackendBatchListResponse {
  count: number;
  results: BackendScoreBatch[];
}

interface BackendScoreBatch {
  id: string;
  name: string;
  status: ScoreBatchStatus;
  isClosed: boolean;
  totalCandidates: number;
  approvedScores: number;
  excludedScores: number;
  processingBatchId?: string;
  processedAt?: string | null;
  processedBy?: string | null;
  processedCount?: number;
  processingProgress?: number;
}

interface BackendProcessResponse {
  id: string;
  status: ScoreBatchStatus;
  processingBatchId: string;
  processedBy: string;
  processedCount: number;
  excludedCount: number;
  processingProgress?: number;
}

interface BackendResultListResponse {
  count: number;
  page: number;
  pageSize: number;
  results: BackendScoreResult[];
}

interface BackendCandidateProfileResponse {
  score: BackendScoreResult;
  profile: ScoreManagementCandidateProfile | null;
}

interface BackendScoreResult {
  id: string;
  candidateId: string;
  lrn: string;
  candidateName: string;
  sessionId: string;
  rankingPopulationId: string;
  examSetId: string;
  rawScore: number;
  maxScore: number;
  finalScore: number;
  overallRank: number | null;
  percentile: number | null;
  releaseStatus: ScoreReleaseStatus;
  processingBatchId: string | null;
}

interface BackendReleaseResponse {
  id: string;
  status: 'RESULTS_RELEASED';
  releasedCount: number;
}

export async function getScoreManagementBatches(): Promise<ScoreManagementBatch[]> {
  const response = await sharedApiClient.request<BackendBatchListResponse>('/api/v1/results/score-management/batches/');
  return unwrap(response).results.map(mapBatch);
}

export async function getScoreManagementBatchResults(
  batchId: string,
  pagination: ScoreManagementResultQuery = {},
): Promise<ScoreManagementResult[]> {
  const response = await sharedApiClient.request<BackendResultListResponse>(
    `/api/v1/results/score-management/batches/${encodeURIComponent(batchId)}/results/?${scoreResultQueryString(pagination)}`,
  );
  return unwrap(response).results.map((row) => mapResult(row, batchId));
}

export async function getScoreManagementBatchResultPage(
  batchId: string,
  pagination: ScoreManagementResultQuery = {},
): Promise<ScoreManagementResultPage> {
  const response = await sharedApiClient.request<BackendResultListResponse>(
    `/api/v1/results/score-management/batches/${encodeURIComponent(batchId)}/results/?${scoreResultQueryString(pagination)}`,
  );
  const data = unwrap(response);
  return {
    count: data.count,
    page: data.page,
    pageSize: data.pageSize,
    results: data.results.map((row) => mapResult(row, batchId)),
  };
}

export async function getScoreManagementCandidateProfile(
  batchId: string,
  candidateId: string,
): Promise<ScoreManagementCandidateProfileResponse> {
  const response = await sharedApiClient.request<BackendCandidateProfileResponse>(
    `/api/v1/results/score-management/batches/${encodeURIComponent(batchId)}/results/${encodeURIComponent(candidateId)}/profile/`,
  );
  const data = unwrap(response);
  return {
    score: mapResult(data.score, batchId),
    profile: data.profile,
  };
}

function scoreResultQueryString(query: ScoreManagementResultQuery): string {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 100),
    sortKey: query.sortKey ?? 'rank',
    sortDirection: query.sortDirection ?? 'asc',
  });
  const search = query.search?.trim();
  if (search) params.set('search', search);
  if (query.releaseStatus) params.set('releaseStatus', query.releaseStatus);
  return params.toString();
}

export async function processScoreManagementBatch(batchId: string): Promise<ScoreManagementReprocessResult> {
  return processBatch(batchId, false);
}

export async function reprocessScoreManagementBatch(batchId: string): Promise<ScoreManagementReprocessResult> {
  return processBatch(batchId, true);
}

export async function releaseScoreManagementResult(_batchId: string, _candidateId: string): Promise<ScoreManagementResult> {
  throw new Error('Individual score release is not supported by the backend contract. Release the full processed batch.');
}

export async function releaseScoreManagementBatch(batchId: string): Promise<ScoreManagementResult[]> {
  const response = await sharedApiClient.request<BackendReleaseResponse>(
    `/api/v1/results/score-management/batches/${encodeURIComponent(batchId)}/release/`,
    { method: 'POST' },
  );
  return getScoreManagementBatchResults(unwrap(response).id);
}

export async function exportScoreManagementBatch(batchId: string): Promise<Blob> {
  const response = await sharedApiClient.requestBlob(
    `/api/v1/results/score-management/batches/${encodeURIComponent(batchId)}/export/`,
  );
  return unwrap(response);
}

export function scoreReleaseStatusLabel(status: ScoreReleaseStatus): string {
  return status === 'RELEASED' ? 'Released' : 'Not Yet Released';
}

export function scoreBatchStatusLabel(status: ScoreBatchStatus): string {
  if (status === 'RESULTS_RELEASED') return 'Results Released';
  if (status === 'SCORING_PROCESSED') return 'Scoring Processed';
  if (status === 'PROCESSING') return 'Processing';
  return 'Ready For Processing';
}

async function processBatch(batchId: string, allowReprocessing: boolean): Promise<ScoreManagementReprocessResult> {
  const processResponse = await sharedApiClient.request<BackendProcessResponse>(
    `/api/v1/results/score-management/batches/${encodeURIComponent(batchId)}/process/`,
    {
      method: 'POST',
      body: JSON.stringify({ allowReprocessing }),
    },
  );
  const processed = unwrap(processResponse);

  const [batches, results] = await Promise.all([
    getScoreManagementBatches(),
    getScoreManagementBatchResults(batchId),
  ]);
  return {
    batch: batches.find((batch) => batch.id === batchId) ?? mapProcessedBatch(processed),
    results,
  };
}

function unwrap<TData>(result: ServiceResult<TData>): TData {
  if ('error' in result) throw new Error(result.error.message);
  return result.data;
}

function mapBatch(batch: BackendScoreBatch): ScoreManagementBatch {
  return {
    id: batch.id,
    label: batch.name,
    examName: batch.name,
    status: batch.status,
    totalCandidates: batch.totalCandidates,
    processingBatchId: batch.processingBatchId ?? '',
    processedAt: batch.processedAt ?? null,
    processedBy: batch.processedBy ?? null,
  };
}

function mapProcessedBatch(batch: BackendProcessResponse): ScoreManagementBatch {
  return {
    id: batch.id,
    label: batch.id,
    examName: batch.id,
    status: batch.status,
    totalCandidates: batch.processedCount + batch.excludedCount,
    processingBatchId: batch.processingBatchId,
    processedAt: null,
    processedBy: batch.processedBy,
  };
}

function mapResult(row: BackendScoreResult, batchId: string): ScoreManagementResult {
  return {
    id: row.id,
    candidateId: row.candidateId,
    lrn: row.lrn,
    candidateName: row.candidateName,
    examName: batchId,
    examSetId: row.examSetId,
    rawScore: row.rawScore,
    maxScore: row.maxScore,
    finalScore: row.finalScore,
    finalScoreDisplay: `${row.rawScore} / ${row.maxScore}`,
    percentile: row.percentile,
    rank: row.overallRank,
    releaseStatus: row.releaseStatus,
    publishedAt: null,
  };
}
