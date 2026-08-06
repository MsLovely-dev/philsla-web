import { describe, expect, it, vi } from 'vitest';
import { BackendQuestionBankService, type QuestionBankPayload, type QuestionTransitionInput } from './backendQuestionBankService';
import type { ApiClient } from './apiClient';

const apiQuestion = {
  id: 'Q-1001',
  question_code: 'Q-1001',
  question_type: 'MCQ',
  question_type_code: 'MCQ',
  subject: 'Math',
  subject_code: 'MATH',
  topic: 'Algebra',
  topic_code: 'ALG',
  competency: 'Solve linear equations',
  competency_code: 'COMP-1',
  difficulty: 'EASY' as const,
  question_text: 'What is 2x = 4?',
  explanation: 'Divide both sides by 2.',
  points: 2,
  status: 'draft',
  created_by: 'author-1',
  created_by_user_id: 'user-1',
  reviewed_by: '',
  approved_by: '',
  reviewed_at: null,
  approved_at: null,
  retired_at: null,
  archived_at: null,
  choices: [
    { id: 'CHOICE-1', option_label: 'A', option_text: '2', is_correct: true, display_order: 1 },
  ],
  answers: [],
  rubrics: [],
  tags: ['linear-equations'],
  attachments: [],
  workflow_history: [],
  created_at: '2026-08-05T00:00:00Z',
  updated_at: '2026-08-05T00:00:00Z',
};

function createService() {
  const request = vi.fn();
  const service = new BackendQuestionBankService({ request } as unknown as ApiClient);
  return { request, service };
}

const payload: QuestionBankPayload = {
  questionCode: 'Q-1001',
  questionType: 'MCQ',
  subject: 'Math',
  topic: 'Algebra',
  competency: 'Solve linear equations',
  difficulty: 'EASY',
  questionText: 'What is 2x = 4?',
  explanation: 'Divide both sides by 2.',
  points: 2,
  status: 'DRAFT',
  choices: [{ optionText: '2', isCorrect: true }],
  tags: ['linear-equations'],
};

describe('BackendQuestionBankService', () => {
  it('maps listQuestions results and normalizes backend draft status', async () => {
    const { request, service } = createService();
    request.mockResolvedValue({ ok: true, data: [apiQuestion] });

    const result = await service.listQuestions();

    expect(request).toHaveBeenCalledWith('/api/v1/exams/questions/');
    expect(result).toMatchObject({ ok: true, data: [{ questionCode: 'Q-1001', status: 'DRAFT', createdByUserId: 'user-1' }] });
  });

  it('normalizes backend correction status without collapsing it to pending review', async () => {
    const { request, service } = createService();
    request.mockResolvedValue({ ok: true, data: [{ ...apiQuestion, status: 'for_correction' }] });

    const result = await service.listQuestions();

    expect(result).toMatchObject({ ok: true, data: [{ questionCode: 'Q-1001', status: 'FOR_CORRECTION' }] });
  });

  it('maps createQuestion payload before calling the API', async () => {
    const { request, service } = createService();
    request.mockResolvedValue({ ok: true, data: apiQuestion });

    await service.createQuestion(payload);

    expect(request).toHaveBeenCalledWith('/api/v1/exams/questions/', {
      method: 'POST',
      body: JSON.stringify({
        question_code: 'Q-1001',
        question_type: 'MCQ',
        subject: 'Math',
        topic: 'Algebra',
        competency: 'Solve linear equations',
        difficulty: 'EASY',
        question_text: 'What is 2x = 4?',
        explanation: 'Divide both sides by 2.',
        points: 2,
        status: 'draft',
        choices: [{ option_label: 'A', option_text: '2', is_correct: true, display_order: 1 }],
        answers: [],
        rubrics: [],
        tags: ['linear-equations'],
      }),
    });
  });

  it('maps updateQuestion payload and response through the service boundary', async () => {
    const { request, service } = createService();
    request.mockResolvedValue({ ok: true, data: apiQuestion });

    const result = await service.updateQuestion('Q-1001', payload);

    expect(request).toHaveBeenCalledWith('/api/v1/exams/questions/Q-1001/', expect.objectContaining({ method: 'PUT' }));
    expect(result).toMatchObject({ ok: true, data: { questionCode: 'Q-1001', status: 'DRAFT' } });
  });

  it('maps transitionQuestion input to the transition endpoint', async () => {
    const { request, service } = createService();
    const input: QuestionTransitionInput = { status: 'PENDING_REVIEW', remarks: 'Ready for review' };
    request.mockResolvedValue({ ok: true, data: { ...apiQuestion, status: 'pending_review' } });

    const result = await service.transitionQuestion('Q-1001', input);

    expect(request).toHaveBeenCalledWith('/api/v1/exams/questions/Q-1001/transition/', {
      method: 'POST',
      body: JSON.stringify({ status: 'PENDING_REVIEW', remarks: 'Ready for review' }),
    });
    expect(result).toMatchObject({ ok: true, data: { status: 'PENDING_REVIEW' } });
  });

  it('sends correction transitions as the correction workflow status', async () => {
    const { request, service } = createService();
    const input: QuestionTransitionInput = { status: 'FOR_CORRECTION', remarks: 'Needs revision' };
    request.mockResolvedValue({ ok: true, data: { ...apiQuestion, status: 'for_correction' } });

    const result = await service.transitionQuestion('Q-1001', input);

    expect(request).toHaveBeenCalledWith('/api/v1/exams/questions/Q-1001/transition/', {
      method: 'POST',
      body: JSON.stringify({ status: 'FOR_CORRECTION', remarks: 'Needs revision' }),
    });
    expect(result).toMatchObject({ ok: true, data: { status: 'FOR_CORRECTION' } });
  });

  it('deletes a question through the service boundary', async () => {
    const { request, service } = createService();
    request.mockResolvedValue({ ok: true, data: null });

    const result = await service.deleteQuestion('Q-1001');

    expect(request).toHaveBeenCalledWith('/api/v1/exams/questions/Q-1001/', { method: 'DELETE' });
    expect(result).toEqual({ ok: true, data: null });
  });
});
