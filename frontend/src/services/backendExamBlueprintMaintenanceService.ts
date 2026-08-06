import { sharedApiClient, type ApiClient } from './apiClient';
import { serviceSuccess, type ServiceResult } from './serviceResult';

export interface CatalogRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPayload {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface TopicRecord {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TopicPayload {
  subjectId?: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

interface ApiCatalogRecord {
  id: number | string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiTopicRecord {
  id: number | string;
  subjectId: number | string;
  subjectCode: string;
  subjectName: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SUBJECTS_ENDPOINT = '/api/v1/exams/admin/subjects/';
const QUESTION_TYPES_ENDPOINT = '/api/v1/exams/admin/question-types/';
const TOPICS_ENDPOINT = '/api/v1/exams/admin/topics/';

function fromApiCatalogRecord(item: ApiCatalogRecord): CatalogRecord {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    description: item.description,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toApiCatalogPayload(payload: CatalogPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.code !== undefined) body.code = payload.code;
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.isActive !== undefined) body.is_active = payload.isActive;
  return body;
}

function fromApiTopicRecord(item: ApiTopicRecord): TopicRecord {
  return {
    id: String(item.id),
    subjectId: String(item.subjectId),
    subjectCode: item.subjectCode,
    subjectName: item.subjectName,
    code: item.code,
    name: item.name,
    description: item.description,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toApiTopicPayload(payload: TopicPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.subjectId !== undefined) body.subject_id = payload.subjectId;
  if (payload.code !== undefined) body.code = payload.code;
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.isActive !== undefined) body.is_active = payload.isActive;
  return body;
}

export interface ExamBlueprintMaintenanceService {
  listSubjects(): Promise<ServiceResult<CatalogRecord[]>>;
  createSubject(payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>>;
  updateSubject(id: string, payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>>;
  listQuestionTypes(): Promise<ServiceResult<CatalogRecord[]>>;
  createQuestionType(payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>>;
  updateQuestionType(id: string, payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>>;
  listTopics(): Promise<ServiceResult<TopicRecord[]>>;
  createTopic(payload: TopicPayload): Promise<ServiceResult<TopicRecord>>;
  updateTopic(id: string, payload: TopicPayload): Promise<ServiceResult<TopicRecord>>;
}

export class BackendExamBlueprintMaintenanceService implements ExamBlueprintMaintenanceService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listSubjects(): Promise<ServiceResult<CatalogRecord[]>> {
    const result = await this.apiClient.request<ApiCatalogRecord[]>(SUBJECTS_ENDPOINT);
    if (!result.ok) return result as ServiceResult<CatalogRecord[]>;
    return serviceSuccess(result.data.map(fromApiCatalogRecord));
  }

  async createSubject(payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>> {
    const result = await this.apiClient.request<ApiCatalogRecord>(SUBJECTS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(toApiCatalogPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<CatalogRecord>;
    return serviceSuccess(fromApiCatalogRecord(result.data));
  }

  async updateSubject(id: string, payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>> {
    const result = await this.apiClient.request<ApiCatalogRecord>(`${SUBJECTS_ENDPOINT}${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toApiCatalogPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<CatalogRecord>;
    return serviceSuccess(fromApiCatalogRecord(result.data));
  }

  async listQuestionTypes(): Promise<ServiceResult<CatalogRecord[]>> {
    const result = await this.apiClient.request<ApiCatalogRecord[]>(QUESTION_TYPES_ENDPOINT);
    if (!result.ok) return result as ServiceResult<CatalogRecord[]>;
    return serviceSuccess(result.data.map(fromApiCatalogRecord));
  }

  async createQuestionType(payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>> {
    const result = await this.apiClient.request<ApiCatalogRecord>(QUESTION_TYPES_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(toApiCatalogPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<CatalogRecord>;
    return serviceSuccess(fromApiCatalogRecord(result.data));
  }

  async updateQuestionType(id: string, payload: CatalogPayload): Promise<ServiceResult<CatalogRecord>> {
    const result = await this.apiClient.request<ApiCatalogRecord>(`${QUESTION_TYPES_ENDPOINT}${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toApiCatalogPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<CatalogRecord>;
    return serviceSuccess(fromApiCatalogRecord(result.data));
  }

  async listTopics(): Promise<ServiceResult<TopicRecord[]>> {
    const result = await this.apiClient.request<ApiTopicRecord[]>(TOPICS_ENDPOINT);
    if (!result.ok) return result as ServiceResult<TopicRecord[]>;
    return serviceSuccess(result.data.map(fromApiTopicRecord));
  }

  async createTopic(payload: TopicPayload): Promise<ServiceResult<TopicRecord>> {
    const result = await this.apiClient.request<ApiTopicRecord>(TOPICS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(toApiTopicPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<TopicRecord>;
    return serviceSuccess(fromApiTopicRecord(result.data));
  }

  async updateTopic(id: string, payload: TopicPayload): Promise<ServiceResult<TopicRecord>> {
    const result = await this.apiClient.request<ApiTopicRecord>(`${TOPICS_ENDPOINT}${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(toApiTopicPayload(payload)),
    });
    if (!result.ok) return result as ServiceResult<TopicRecord>;
    return serviceSuccess(fromApiTopicRecord(result.data));
  }
}

export const examBlueprintMaintenanceService = new BackendExamBlueprintMaintenanceService();
