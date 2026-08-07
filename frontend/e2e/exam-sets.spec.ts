import { expect, type Page, test } from '@playwright/test';

const systemAdmin = {
  id: 'exam-sets-admin',
  email: 'exam.sets.admin@example.test',
  firstName: 'Synthetic',
  lastName: 'Administrator',
  role: 'SYSTEM_ADMIN',
};

const blueprint = {
  id: '17',
  current_version_id: '42',
  code: 'BP-SYNTHETIC',
  name: 'Synthetic Blueprint',
  description: 'Synthetic browser fixture.',
  exam_type: 'Admission',
  academic_year: '2026-2027',
  institution: 'Synthetic Institution',
  exam_category: 'Synthetic Category',
  status: 'APPROVED',
  version: '1.0',
  owner: 'Synthetic Administrator',
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

const question = {
  id: '101',
  question_code: 'Q-SYNTHETIC',
  question_type: 'Multiple Choice',
  question_type_code: 'MCQ',
  subject: 'Synthetic Subject',
  subject_code: 'SYN',
  topic: 'Synthetic Topic',
  topic_code: 'SYN-TOPIC',
  competency: 'Synthetic competency',
  competency_code: 'SYN-COMP',
  difficulty: 'EASY',
  question_text: 'Synthetic assessment prompt.',
  explanation: '',
  points: 1,
  status: 'APPROVED',
  created_by: 'Synthetic Administrator',
  reviewed_by: 'Synthetic Reviewer',
  approved_by: 'Synthetic Reviewer',
  reviewed_at: '2026-08-05T00:00:00Z',
  approved_at: '2026-08-05T00:00:00Z',
  retired_at: null,
  archived_at: null,
  choices: [],
  answers: [],
  rubrics: [],
  tags: [],
  attachments: [],
  workflow_history: [],
  created_at: '2026-08-05T00:00:00Z',
  updated_at: '2026-08-05T00:00:00Z',
};

function examSet(id: string, title: string, status = 'DRAFT') {
  const items: unknown[] = [];
  return {
    id,
    exam_code: `EXAM-SYNTHETIC-${id}`,
    title,
    examination_period: 'Synthetic period',
    exam_type: 'Admission',
    instructions: '',
    duration_minutes: 60,
    status,
    blueprint_version: { id: '42', spec_code: 'BP-SYNTHETIC', name: 'Synthetic Blueprint', version_number: '1.0', status: 'APPROVED' },
    academic_year: '2026-2027',
    cloned_from_exam_set: null,
    created_by: 'Synthetic Administrator',
    approved_by: '',
    published_by: '',
    archived_by: '',
    approved_at: null,
    published_at: null,
    archived_at: null,
    items,
    validation_results: [],
    assembly_runs: [],
    workflow_history: [],
    published_hash: status === 'PUBLISHED' ? 'f'.repeat(64) : null,
    created_at: '2026-08-05T00:00:00Z',
    updated_at: '2026-08-05T00:00:00Z',
  };
}

async function useSystemAdminSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('philsa_user', JSON.stringify(session));
  }, systemAdmin);
}

test('lists, creates, and submits an authoritative Exam Set', async ({ page }) => {
  const examSets = [examSet('7', 'Remote Synthetic Set')];
  let createPayload: Record<string, unknown> | null = null;
  let transitionPayload: Record<string, unknown> | null = null;

  await useSystemAdminSession(page);
  await page.route('**/api/v1/exams/blueprints/', (route) => route.fulfill({ json: [blueprint] }));
  await page.route('**/api/v1/exams/questions/', (route) => route.fulfill({ json: [question] }));
  await page.route('**/api/v1/exams/exam-sets/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/v1/exams/exam-sets/' && request.method() === 'GET') {
      await route.fulfill({ json: examSets });
      return;
    }
    if (pathname === '/api/v1/exams/exam-sets/' && request.method() === 'POST') {
      createPayload = request.postDataJSON() as Record<string, unknown>;
      const created = examSet('8', String(createPayload.title));
      created.items = [{
        id: '801',
        display_order: 1,
        points: 1,
        selection_method: 'MANUAL',
        selected_by: 'Synthetic Administrator',
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
      }];
      examSets.unshift(created);
      await route.fulfill({ status: 201, json: created });
      return;
    }
    if (pathname === '/api/v1/exams/exam-sets/8/transition/' && request.method() === 'POST') {
      transitionPayload = request.postDataJSON() as Record<string, unknown>;
      examSets[0] = { ...examSets[0], status: String(transitionPayload.status) };
      await route.fulfill({ json: examSets[0] });
      return;
    }
    await route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'Synthetic route not found.' } } });
  });

  await page.goto('/admin/hub/exam-sets/content#dashboard');
  await expect(page.getByText('Remote Synthetic Set')).toBeVisible();

  await page.getByRole('button', { name: 'Create Exam Set' }).click();
  await page.getByLabel('Title').fill('Created Synthetic Set');
  await page.getByRole('checkbox', { name: /Q-SYNTHETIC/ }).check();
  await page.getByRole('button', { name: 'Save Exam Set' }).click();

  await expect(page.getByText('Created Synthetic Set')).toBeVisible();
  expect(createPayload).toMatchObject({
    blueprint_version_id: '42',
    items: [{ question_id: '101', display_order: 1, points: 1 }],
  });

  const createdRow = page.getByRole('article').filter({ hasText: 'Created Synthetic Set' });
  await createdRow.getByRole('button', { name: 'Submit for Review' }).click();
  await expect(createdRow.getByText('ACADEMIC REVIEW')).toBeVisible();
  expect(transitionPayload).toMatchObject({ status: 'ACADEMIC_REVIEW' });
});

test('auto-assembles and publishes an Exam Set', async ({ page }) => {
  // NOTE: the record starts as DRAFT (not APPROVED) so that "Run Auto-Selection" is actually
  // rendered — ExamSetAssemblyWorkspace only shows auto-assemble/item-mutation controls for
  // DRAFT/REVISION_REQUIRED records (EDITABLE_STATUSES in examSets/ExamSetAssemblyWorkspace.tsx),
  // matching the backend's own "Only draft or revision-required Exam Sets can be auto-assembled"
  // rule. Reaching PUBLISHED therefore requires walking the full lifecycle the UI exposes:
  // Submit for Review -> Approve -> Publish.
  const examSets = [examSet('7', 'Remote Synthetic Set', 'DRAFT')];
  let autoAssembleCalled = false;
  let publishPayload: Record<string, unknown> | null = null;

  await useSystemAdminSession(page);
  await page.route('**/api/v1/exams/blueprints/', (route) => route.fulfill({ json: [blueprint] }));
  await page.route('**/api/v1/exams/questions/', (route) => route.fulfill({ json: [question] }));
  await page.route('**/api/v1/exams/exam-sets/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/v1/exams/exam-sets/' && request.method() === 'GET') {
      await route.fulfill({ json: examSets });
      return;
    }
    if (pathname === '/api/v1/exams/exam-sets/7/auto-assemble/' && request.method() === 'POST') {
      autoAssembleCalled = true;
      examSets[0] = { ...examSets[0], assembly_runs: [{ id: '1', algorithm_version: 'v1', status: 'completed', selected_item_count: 1, rejected_item_count: 0, initiated_by: 'Synthetic Administrator', started_at: '2026-08-07T00:00:00Z', completed_at: '2026-08-07T00:00:00Z', notes: '', items: [] }] };
      await route.fulfill({ json: examSets[0] });
      return;
    }
    if (pathname === '/api/v1/exams/exam-sets/7/transition/' && request.method() === 'POST') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      const status = String(payload.status);
      examSets[0] = { ...examSets[0], status, ...(status === 'PUBLISHED' ? { published_hash: 'f'.repeat(64) } : {}) };
      if (status === 'PUBLISHED') publishPayload = payload;
      await route.fulfill({ json: examSets[0] });
      return;
    }
    await route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'Synthetic route not found.' } } });
  });

  await page.goto('/admin/hub/exam-sets/assembly');
  const row = page.getByRole('article').filter({ hasText: 'Remote Synthetic Set' });
  await row.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('button', { name: 'Back to Exam Sets' })).toBeVisible();

  await page.getByRole('button', { name: 'Run Auto-Selection' }).click();
  // No DOM change is observable purely from a successful auto-assemble in this fixture
  // (no assembly-run summary is rendered by ExamSetAssemblyWorkspace), so poll the
  // out-of-band flag instead of racing a UI assertion against the network round trip.
  await expect.poll(() => autoAssembleCalled).toBe(true);

  await page.getByRole('button', { name: 'Submit for Review' }).click();
  await expect(page.getByText('ACADEMIC REVIEW')).toBeVisible();

  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('APPROVED')).toBeVisible();

  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText('PUBLISHED', { exact: true })).toBeVisible();
  expect(publishPayload).toMatchObject({ status: 'PUBLISHED' });
});
