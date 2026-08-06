import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';
import { BackendExamBlueprintService } from './backendExamBlueprintService';

const apiBlueprint = {
  id: '17',
  current_version_id: '42',
  code: 'BP-SYNTHETIC',
  name: 'Synthetic Blueprint',
  description: 'Synthetic test fixture.',
  exam_type: 'Admission',
  academic_year: '2026-2027',
  institution: 'Synthetic Institution',
  exam_category: 'Synthetic Category',
  status: 'APPROVED',
  version: '1.0',
  owner: 'Synthetic Owner',
  created_at: '2026-08-05T00:00:00Z',
  effective_date: '2026-08-05',
  expiration_date: null,
  sections: [],
  rules: {
    total_items: 1,
    total_marks: 1,
    total_time_limit: 60,
    shared_stimulus_requirement: { required: false, min_count: 0, questions_per_stimulus: 0 },
    randomization_rules: { shuffle_questions: true, shuffle_choices: true, fixed_sequence: false },
    max_reuse_limit: 1,
    version_compatibility: '>= 1.0',
    active_item_only: true,
  },
  history: [],
};

describe('BackendExamBlueprintService', () => {
  it('maps the current Blueprint Version id used by Exam Sets', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([apiBlueprint]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const service = new BackendExamBlueprintService(new ApiClient({ baseUrl: 'http://backend.test', fetcher }));

    const result = await service.listBlueprints();

    expect(result.ok && result.data[0]).toMatchObject({ id: '17', currentVersionId: '42' });
  });
});
