import { sharedApiClient, type ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export type QuestionStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'RETIRED' | 'ARCHIVED';

export interface QuestionChoice {
  id: string;
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface QuestionAnswer {
  id: string;
  answerText: string;
  isCaseSensitive: boolean;
  isPrimaryAnswer: boolean;
}

export interface EssayRubric {
  id: string;
  criterion: string;
  description: string;
  maximumPoints: number;
  displayOrder: number;
}

export interface QuestionAttachment {
  id: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface QuestionHistoryEntry {
  id: string;
  previousStatus: QuestionStatus | null;
  newStatus: QuestionStatus;
  action: string;
  remarks: string;
  initiatedBy: string;
  createdAt: string;
}

export interface QuestionBankItem {
  id: string;
  questionCode: string;
  questionType: string;
  questionTypeCode: string;
  subject: string;
  subjectCode: string;
  topic: string;
  topicCode: string;
  competency: string;
  competencyCode: string;
  difficulty: 'EASY' | 'MODERATE' | 'DIFFICULT';
  questionText: string;
  explanation: string;
  points: number;
  status: QuestionStatus;
  createdBy: string;
  reviewedBy: string;
  approvedBy: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  retiredAt: string | null;
  archivedAt: string | null;
  choices: QuestionChoice[];
  answers: QuestionAnswer[];
  rubrics: EssayRubric[];
  tags: string[];
  attachments: QuestionAttachment[];
  workflowHistory: QuestionHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionTransitionInput {
  status: QuestionStatus;
  remarks?: string;
}

interface ApiQuestionChoice {
  id: string;
  option_label: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

interface ApiQuestionAnswer {
  id: string;
  answer_text: string;
  is_case_sensitive: boolean;
  is_primary_answer: boolean;
}

interface ApiEssayRubric {
  id: string;
  criterion: string;
  description: string;
  maximum_points: number;
  display_order: number;
}

interface ApiQuestionAttachment {
  id: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

interface ApiQuestionHistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  action: string;
  remarks: string;
  initiated_by: string;
  created_at: string;
}

interface ApiQuestion {
  id: string;
  question_code: string;
  question_type: string;
  question_type_code: string;
  subject: string;
  subject_code: string;
  topic: string;
  topic_code: string;
  competency: string;
  competency_code: string;
  difficulty: 'EASY' | 'MODERATE' | 'DIFFICULT';
  question_text: string;
  explanation: string;
  points: number;
  status: string;
  created_by: string;
  reviewed_by: string;
  approved_by: string;
  reviewed_at: string | null;
  approved_at: string | null;
  retired_at: string | null;
  archived_at: string | null;
  choices: ApiQuestionChoice[];
  answers: ApiQuestionAnswer[];
  rubrics: ApiEssayRubric[];
  tags: string[];
  attachments: ApiQuestionAttachment[];
  workflow_history: ApiQuestionHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface QuestionBankPayload {
  questionCode?: string;
  questionType?: string;
  subject?: string;
  topic?: string;
  competency?: string;
  difficulty?: 'EASY' | 'MODERATE' | 'DIFFICULT';
  questionText?: string;
  explanation?: string;
  points?: number;
  status?: QuestionStatus;
  choices?: Array<{ optionLabel?: string; optionText: string; isCorrect?: boolean; displayOrder?: number }>;
  answers?: Array<{ answerText: string; isCaseSensitive?: boolean; isPrimaryAnswer?: boolean }>;
  rubrics?: Array<{ criterion: string; description?: string; maximumPoints: number; displayOrder?: number }>;
  tags?: string[];
}

type QuestionListResult = ServiceResult<ApiQuestion[]>;
type QuestionItemResult = ServiceResult<ApiQuestion>;

export class BackendQuestionBankService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listQuestions(): Promise<ServiceResult<QuestionBankItem[]>> {
    return this.mapListResult(await this.apiClient.request<ApiQuestion[]>('/api/v1/exams/questions/'));
  }

  async createQuestion(question: QuestionBankPayload): Promise<ServiceResult<QuestionBankItem>> {
    return this.mapItemResult(
      await this.apiClient.request<ApiQuestion>('/api/v1/exams/questions/', {
        method: 'POST',
        body: JSON.stringify(this.toApiPayload(question)),
      }),
    );
  }

  async updateQuestion(questionId: string, question: QuestionBankPayload): Promise<ServiceResult<QuestionBankItem>> {
    return this.mapItemResult(
      await this.apiClient.request<ApiQuestion>(`/api/v1/exams/questions/${questionId}/`, {
        method: 'PUT',
        body: JSON.stringify(this.toApiPayload(question)),
      }),
    );
  }

  async transitionQuestion(questionId: string, input: QuestionTransitionInput): Promise<ServiceResult<QuestionBankItem>> {
    return this.mapItemResult(
      await this.apiClient.request<ApiQuestion>(`/api/v1/exams/questions/${questionId}/transition/`, {
        method: 'POST',
        body: JSON.stringify({
          status: input.status,
          remarks: input.remarks ?? '',
        }),
      }),
    );
  }

  deleteQuestion(questionId: string): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(`/api/v1/exams/questions/${questionId}/`, {
      method: 'DELETE',
    });
  }

  private mapListResult(result: QuestionListResult): ServiceResult<QuestionBankItem[]> {
    if (result.ok === false) {
      return result;
    }
    return { ...result, data: result.data.map((item) => this.fromApiQuestion(item)) };
  }

  private mapItemResult(result: QuestionItemResult): ServiceResult<QuestionBankItem> {
    if (result.ok === false) {
      return result;
    }
    return { ...result, data: this.fromApiQuestion(result.data) };
  }

  private fromApiQuestion(question: ApiQuestion): QuestionBankItem {
    return {
      id: question.id,
      questionCode: question.question_code,
      questionType: question.question_type,
      questionTypeCode: question.question_type_code,
      subject: question.subject,
      subjectCode: question.subject_code,
      topic: question.topic,
      topicCode: question.topic_code,
      competency: question.competency,
      competencyCode: question.competency_code,
      difficulty: question.difficulty,
      questionText: question.question_text,
      explanation: question.explanation,
      points: question.points,
      status: this.normalizeStatus(question.status),
      createdBy: question.created_by,
      reviewedBy: question.reviewed_by,
      approvedBy: question.approved_by,
      reviewedAt: question.reviewed_at,
      approvedAt: question.approved_at,
      retiredAt: question.retired_at,
      archivedAt: question.archived_at,
      choices: question.choices.map((choice) => ({
        id: choice.id,
        optionLabel: choice.option_label,
        optionText: choice.option_text,
        isCorrect: choice.is_correct,
        displayOrder: choice.display_order,
      })),
      answers: question.answers.map((answer) => ({
        id: answer.id,
        answerText: answer.answer_text,
        isCaseSensitive: answer.is_case_sensitive,
        isPrimaryAnswer: answer.is_primary_answer,
      })),
      rubrics: question.rubrics.map((rubric) => ({
        id: rubric.id,
        criterion: rubric.criterion,
        description: rubric.description,
        maximumPoints: rubric.maximum_points,
        displayOrder: rubric.display_order,
      })),
      tags: question.tags,
      attachments: question.attachments.map((attachment) => ({
        id: attachment.id,
        originalFilename: attachment.original_filename,
        storedFilename: attachment.stored_filename,
        filePath: attachment.file_path,
        mimeType: attachment.mime_type,
        fileSizeBytes: attachment.file_size_bytes,
        uploadedBy: attachment.uploaded_by,
        createdAt: attachment.created_at,
      })),
      workflowHistory: question.workflow_history.map((entry) => ({
        id: entry.id,
        previousStatus: entry.previous_status ? this.normalizeStatus(entry.previous_status) : null,
        newStatus: this.normalizeStatus(entry.new_status),
        action: entry.action,
        remarks: entry.remarks,
        initiatedBy: entry.initiated_by,
        createdAt: entry.created_at,
      })),
      createdAt: question.created_at,
      updatedAt: question.updated_at,
    };
  }

  private normalizeStatus(status: string | null): QuestionStatus {
    const normalized = (status ?? 'DRAFT').toUpperCase().replace(/\s+/g, '_');
    if (normalized === 'PENDING_REVIEW') return 'PENDING_REVIEW';
    if (normalized === 'APPROVED') return 'APPROVED';
    if (normalized === 'REJECTED') return 'REJECTED';
    if (normalized === 'RETIRED') return 'RETIRED';
    if (normalized === 'ARCHIVED') return 'ARCHIVED';
    return 'DRAFT';
  }

  private toApiPayload(question: QuestionBankPayload): Record<string, unknown> {
    return {
      question_code: question.questionCode ?? '',
      question_type: question.questionType ?? '',
      subject: question.subject ?? '',
      topic: question.topic ?? '',
      competency: question.competency ?? '',
      difficulty: question.difficulty ?? 'MODERATE',
      question_text: question.questionText ?? '',
      explanation: question.explanation ?? '',
      points: question.points ?? 1,
      status: question.status ? question.status.toLowerCase() : 'draft',
      choices: question.choices?.map((choice, index) => ({
        option_label: choice.optionLabel ?? String.fromCharCode(65 + index),
        option_text: choice.optionText,
        is_correct: choice.isCorrect ?? false,
        display_order: choice.displayOrder ?? index + 1,
      })) ?? [],
      answers: question.answers?.map((answer) => ({
        answer_text: answer.answerText,
        is_case_sensitive: answer.isCaseSensitive ?? false,
        is_primary_answer: answer.isPrimaryAnswer ?? true,
      })) ?? [],
      rubrics: question.rubrics?.map((rubric, index) => ({
        criterion: rubric.criterion,
        description: rubric.description ?? '',
        maximum_points: rubric.maximumPoints,
        display_order: rubric.displayOrder ?? index + 1,
      })) ?? [],
      tags: question.tags ?? [],
    };
  }
}

export const questionBankService = new BackendQuestionBankService();
