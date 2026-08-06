import { sharedApiClient, type ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export type ExamSetStatus =
  | 'DRAFT'
  | 'ACADEMIC_REVIEW'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export interface ExamSetQuestionSummary {
  id: string;
  questionCode: string;
  questionType: string;
  questionTypeCode: string;
  subject: string;
  topic: string;
  difficulty: string;
  status: string;
  points: number;
}

export interface ExamSetItem {
  id: string;
  displayOrder: number;
  points: number;
  selectionMethod: string;
  selectedBy: string;
  selectedAt: string;
  blueprintSectionId: string | null;
  question: ExamSetQuestionSummary;
}

export interface ExamSetValidationResult {
  id: string;
  validationCode: string;
  validationName: string;
  result: string;
  expectedValue: string;
  actualValue: string;
  message: string;
  validatedAt: string;
}

export interface ExamSetWorkflowEntry {
  id: string;
  previousStatus: ExamSetStatus | null;
  newStatus: ExamSetStatus;
  action: string;
  remarks: string;
  initiatedBy: string;
  createdAt: string;
}

export interface ExamSetAssemblyRunItem {
  id: string;
  question: { id: string; questionCode: string; questionText: string };
  wasSelected: boolean;
  rejectionReason: string;
  createdAt: string;
}

export interface ExamSetAssemblyRun {
  id: string;
  algorithmVersion: string;
  status: string;
  selectedItemCount: number;
  rejectedItemCount: number;
  initiatedBy: string;
  startedAt: string;
  completedAt: string | null;
  notes: string;
  items: ExamSetAssemblyRunItem[];
}

export interface ExamSetRecord {
  id: string;
  examCode: string;
  title: string;
  examinationPeriod: string;
  examType: string;
  instructions: string;
  durationMinutes: number;
  status: ExamSetStatus;
  blueprintVersion: {
    id: string;
    specCode: string;
    name: string;
    versionNumber: string;
    status: string;
  };
  academicYear: string;
  clonedFromExamSetId: string | null;
  createdBy: string;
  approvedBy: string;
  publishedBy: string;
  archivedBy: string;
  approvedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  publishedHash: string | null;
  items: ExamSetItem[];
  validationResults: ExamSetValidationResult[];
  assemblyRuns: ExamSetAssemblyRun[];
  workflowHistory: ExamSetWorkflowEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ExamSetDraftItem {
  questionId: string;
  displayOrder: number;
  points: number;
  blueprintSectionId?: string | null;
  selectionMethod?: string;
}

export interface ExamSetDraft {
  title: string;
  blueprintVersionId: string;
  academicYear: string;
  durationMinutes: number;
  examinationPeriod?: string;
  examType?: string;
  instructions?: string;
  items: ExamSetDraftItem[];
}

export interface ExamSetTransitionInput {
  status: ExamSetStatus;
  remarks?: string;
}

interface ApiExamSet {
  id: string;
  exam_code: string;
  title: string;
  examination_period: string;
  exam_type: string;
  instructions: string;
  duration_minutes: number;
  status: string;
  blueprint_version: {
    id: string;
    spec_code: string;
    name: string;
    version_number: string;
    status: string;
  };
  academic_year: string;
  cloned_from_exam_set: string | null;
  created_by: string;
  approved_by: string;
  published_by: string;
  archived_by: string;
  approved_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  published_hash: string | null;
  items: ApiExamSetItem[];
  validation_results: ApiExamSetValidationResult[];
  assembly_runs: ApiExamSetAssemblyRun[];
  workflow_history: ApiExamSetWorkflowEntry[];
  created_at: string;
  updated_at: string;
}

interface ApiExamSetItem {
  id: string;
  display_order: number;
  points: number;
  selection_method: string;
  selected_by: string;
  selected_at: string;
  blueprint_section: string | null;
  question: {
    id: string;
    question_code: string;
    question_type: string;
    question_type_code: string;
    subject: string;
    topic: string;
    difficulty: string;
    status: string;
    points: number;
  };
}

interface ApiExamSetValidationResult {
  id: string;
  validation_code: string;
  validation_name: string;
  result: string;
  expected_value: string;
  actual_value: string;
  message: string;
  validated_at: string;
}

interface ApiExamSetWorkflowEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  action: string;
  remarks: string;
  initiated_by: string;
  created_at: string;
}

interface ApiExamSetAssemblyRun {
  id: string;
  algorithm_version: string;
  status: string;
  selected_item_count: number;
  rejected_item_count: number;
  initiated_by: string;
  started_at: string;
  completed_at: string | null;
  notes: string;
  items: Array<{
    id: string;
    question: { id: string; question_code: string; question_text: string };
    was_selected: boolean;
    rejection_reason: string;
    created_at: string;
  }>;
}

type ApiItemResult = ServiceResult<ApiExamSet>;

export class BackendExamSetService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listExamSets(): Promise<ServiceResult<ExamSetRecord[]>> {
    const result = await this.apiClient.request<ApiExamSet[]>('/api/v1/exams/exam-sets/');
    if (result.ok === false) {
      return result;
    }
    return { ...result, data: result.data.map((record) => this.fromApi(record)) };
  }

  async createExamSet(draft: ExamSetDraft): Promise<ServiceResult<ExamSetRecord>> {
    return this.mapItem(await this.apiClient.request<ApiExamSet>('/api/v1/exams/exam-sets/', {
      method: 'POST',
      body: JSON.stringify(this.toApiDraft(draft)),
    }));
  }

  async updateExamSet(id: string, draft: ExamSetDraft): Promise<ServiceResult<ExamSetRecord>> {
    return this.mapItem(await this.apiClient.request<ApiExamSet>(`/api/v1/exams/exam-sets/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(this.toApiDraft(draft)),
    }));
  }

  async cloneExamSet(id: string): Promise<ServiceResult<ExamSetRecord>> {
    return this.mapItem(await this.apiClient.request<ApiExamSet>(`/api/v1/exams/exam-sets/${id}/clone/`, {
      method: 'POST',
    }));
  }

  async transitionExamSet(id: string, input: ExamSetTransitionInput): Promise<ServiceResult<ExamSetRecord>> {
    return this.mapItem(await this.apiClient.request<ApiExamSet>(`/api/v1/exams/exam-sets/${id}/transition/`, {
      method: 'POST',
      body: JSON.stringify({ status: input.status, remarks: input.remarks ?? '' }),
    }));
  }

  deleteExamSet(id: string): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(`/api/v1/exams/exam-sets/${id}/`, { method: 'DELETE' });
  }

  private mapItem(result: ApiItemResult): ServiceResult<ExamSetRecord> {
    if (result.ok === false) {
      return result;
    }
    return { ...result, data: this.fromApi(result.data) };
  }

  private toApiDraft(draft: ExamSetDraft): Record<string, unknown> {
    return {
      title: draft.title,
      examination_period: draft.examinationPeriod ?? '',
      exam_type: draft.examType ?? '',
      instructions: draft.instructions ?? '',
      blueprint_version_id: draft.blueprintVersionId,
      academic_year: draft.academicYear,
      duration_minutes: draft.durationMinutes,
      items: draft.items.map((item) => ({
        question_id: item.questionId,
        display_order: item.displayOrder,
        points: item.points,
        ...(item.blueprintSectionId ? { blueprint_section_id: item.blueprintSectionId } : {}),
        ...(item.selectionMethod ? { selection_method: item.selectionMethod } : {}),
      })),
    };
  }

  private fromApi(record: ApiExamSet): ExamSetRecord {
    return {
      id: record.id,
      examCode: record.exam_code,
      title: record.title,
      examinationPeriod: record.examination_period,
      examType: record.exam_type,
      instructions: record.instructions,
      durationMinutes: record.duration_minutes,
      status: this.normalizeStatus(record.status),
      blueprintVersion: {
        id: record.blueprint_version.id,
        specCode: record.blueprint_version.spec_code,
        name: record.blueprint_version.name,
        versionNumber: record.blueprint_version.version_number,
        status: record.blueprint_version.status.toUpperCase(),
      },
      academicYear: record.academic_year,
      clonedFromExamSetId: record.cloned_from_exam_set,
      createdBy: record.created_by,
      approvedBy: record.approved_by,
      publishedBy: record.published_by,
      archivedBy: record.archived_by,
      approvedAt: record.approved_at,
      publishedAt: record.published_at,
      archivedAt: record.archived_at,
      publishedHash: record.published_hash,
      items: record.items.map((item) => ({
        id: item.id,
        displayOrder: item.display_order,
        points: item.points,
        selectionMethod: item.selection_method,
        selectedBy: item.selected_by,
        selectedAt: item.selected_at,
        blueprintSectionId: item.blueprint_section,
        question: {
          id: item.question.id,
          questionCode: item.question.question_code,
          questionType: item.question.question_type,
          questionTypeCode: item.question.question_type_code,
          subject: item.question.subject,
          topic: item.question.topic,
          difficulty: item.question.difficulty,
          status: item.question.status.toUpperCase(),
          points: item.question.points,
        },
      })),
      validationResults: record.validation_results.map((result) => ({
        id: result.id,
        validationCode: result.validation_code,
        validationName: result.validation_name,
        result: result.result,
        expectedValue: result.expected_value,
        actualValue: result.actual_value,
        message: result.message,
        validatedAt: result.validated_at,
      })),
      assemblyRuns: record.assembly_runs.map((run) => ({
        id: run.id,
        algorithmVersion: run.algorithm_version,
        status: run.status,
        selectedItemCount: run.selected_item_count,
        rejectedItemCount: run.rejected_item_count,
        initiatedBy: run.initiated_by,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        notes: run.notes,
        items: run.items.map((item) => ({
          id: item.id,
          question: {
            id: item.question.id,
            questionCode: item.question.question_code,
            questionText: item.question.question_text,
          },
          wasSelected: item.was_selected,
          rejectionReason: item.rejection_reason,
          createdAt: item.created_at,
        })),
      })),
      workflowHistory: record.workflow_history.map((entry) => ({
        id: entry.id,
        previousStatus: entry.previous_status ? this.normalizeStatus(entry.previous_status) : null,
        newStatus: this.normalizeStatus(entry.new_status),
        action: entry.action,
        remarks: entry.remarks,
        initiatedBy: entry.initiated_by,
        createdAt: entry.created_at,
      })),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private normalizeStatus(value: string): ExamSetStatus {
    const status = value.toUpperCase().replace(/\s+/g, '_');
    if (status === 'ACADEMIC_REVIEW') return status;
    if (status === 'REVISION_REQUIRED') return status;
    if (status === 'APPROVED') return status;
    if (status === 'PUBLISHED') return status;
    if (status === 'ARCHIVED') return status;
    return 'DRAFT';
  }
}

export const examSetService = new BackendExamSetService();
