import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendExamSetService, type ExamSetDraft } from './backendExamSetService';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const apiExamSet = {
  id: '7',
  exam_code: 'EXAM-BP-SYNTHETIC-2026',
  title: 'Synthetic Set',
  examination_period: '',
  exam_type: 'Admission',
  instructions: '',
  duration_minutes: 60,
  status: 'draft',
  blueprint_version: {
    id: '42',
    spec_code: 'BP-SYNTHETIC',
    name: 'Synthetic Blueprint',
    version_number: '1.0',
    status: 'approved',
  },
  academic_year: '2026-2027',
  cloned_from_exam_set: null,
  created_by: 'Synthetic Owner',
  approved_by: '',
  published_by: '',
  archived_by: '',
  approved_at: null,
  published_at: null,
  archived_at: null,
  items: [{
    id: '70',
    display_order: 1,
    points: 1,
    selection_method: 'MANUAL',
    selected_by: 'Synthetic Owner',
    selected_at: '2026-08-05T00:00:00Z',
    blueprint_section: null,
    question: {
      id: '101',
      question_code: 'Q-SYNTHETIC',
      question_type: 'Multiple Choice',
      question_type_code: 'MCQ',
      subject: 'Synthetic Subject',
      topic: 'Synthetic Topic',
      difficulty: 'EASY',
      status: 'APPROVED',
      points: 1,
    },
  }],
  validation_results: [{
    id: '71',
    validation_code: 'item_count',
    validation_name: 'Item count',
    result: 'PASSED',
    expected_value: '1',
    actual_value: '1',
    message: 'Synthetic validation passed.',
    validated_at: '2026-08-05T00:00:00Z',
  }],
  assembly_runs: [],
  workflow_history: [{
    id: '72',
    previous_status: null,
    new_status: 'draft',
    action: 'CREATED',
    remarks: 'Synthetic record created.',
    initiated_by: 'Synthetic Owner',
    created_at: '2026-08-05T00:00:00Z',
  }],
  created_at: '2026-08-05T00:00:00Z',
  updated_at: '2026-08-05T00:00:00Z',
};

const draft: ExamSetDraft = {
  title: 'Synthetic Set',
  blueprintVersionId: '42',
  academicYear: '2026-2027',
  durationMinutes: 60,
  items: [{ questionId: '101', displayOrder: 1, points: 1 }],
};

describe('BackendExamSetService', () => {
  it('maps list responses and sends exact request contracts for supported operations', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse([apiExamSet]))
      .mockResolvedValueOnce(jsonResponse(apiExamSet, 201))
      .mockResolvedValueOnce(jsonResponse(apiExamSet))
      .mockResolvedValueOnce(jsonResponse(apiExamSet, 201))
      .mockResolvedValueOnce(jsonResponse({ ...apiExamSet, status: 'ACADEMIC_REVIEW' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const service = new BackendExamSetService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const listed = await service.listExamSets();
    const created = await service.createExamSet(draft);
    await service.updateExamSet('7', draft);
    await service.cloneExamSet('7');
    const transitioned = await service.transitionExamSet('7', {
      status: 'ACADEMIC_REVIEW',
      remarks: 'Synthetic review',
    });
    await service.deleteExamSet('7');

    expect(listed.ok && listed.data[0]).toMatchObject({
      id: '7',
      status: 'DRAFT',
      blueprintVersion: { id: '42', status: 'APPROVED' },
      items: [{ question: { id: '101' }, displayOrder: 1 }],
      validationResults: [{ validationCode: 'item_count' }],
      workflowHistory: [{ newStatus: 'DRAFT' }],
    });
    expect(created.ok && created.data.title).toBe('Synthetic Set');
    expect(transitioned.ok && transitioned.data.status).toBe('ACADEMIC_REVIEW');

    const payload = JSON.stringify({
      title: 'Synthetic Set',
      examination_period: '',
      exam_type: '',
      instructions: '',
      blueprint_version_id: '42',
      academic_year: '2026-2027',
      duration_minutes: 60,
      items: [{ question_id: '101', display_order: 1, points: 1 }],
    });
    expect(fetcher).toHaveBeenNthCalledWith(1, 'http://backend.test/api/v1/exams/exam-sets/', expect.objectContaining({}));
    expect(fetcher).toHaveBeenNthCalledWith(2, 'http://backend.test/api/v1/exams/exam-sets/', expect.objectContaining({ method: 'POST', body: payload }));
    expect(fetcher).toHaveBeenNthCalledWith(3, 'http://backend.test/api/v1/exams/exam-sets/7/', expect.objectContaining({ method: 'PUT', body: payload }));
    expect(fetcher).toHaveBeenNthCalledWith(4, 'http://backend.test/api/v1/exams/exam-sets/7/clone/', expect.objectContaining({ method: 'POST' }));
    expect(fetcher).toHaveBeenNthCalledWith(5, 'http://backend.test/api/v1/exams/exam-sets/7/transition/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ status: 'ACADEMIC_REVIEW', remarks: 'Synthetic review' }),
    }));
    expect(fetcher).toHaveBeenNthCalledWith(6, 'http://backend.test/api/v1/exams/exam-sets/7/', expect.objectContaining({ method: 'DELETE' }));
  });

  it('propagates a conflict failure without remapping it', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'INVALID_TRANSITION', message: 'Synthetic transition conflict.' },
    }, 409));
    const service = new BackendExamSetService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.transitionExamSet('7', { status: 'PUBLISHED' });

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'CONFLICT', code: 'INVALID_TRANSITION', message: 'Synthetic transition conflict.' },
    });
  });
});
