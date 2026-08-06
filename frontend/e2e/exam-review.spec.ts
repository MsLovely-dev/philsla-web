import { expect, type Page, test } from '@playwright/test';

const systemAdmin = {
  id: 'exam-review-admin',
  email: 'exam.review.admin@example.test',
  firstName: 'Synthetic',
  lastName: 'Administrator',
  role: 'SYSTEM_ADMIN',
};

const gradedReview = {
  id: 'review-id',
  attemptCode: 'SYNTHETIC-ATTEMPT-001',
  candidateId: 'PHL-2026-SYN001',
  candidateName: 'Synthetic Candidate',
  examSetCode: 'ES-BP0001',
  submittedAt: '2026-08-06T01:00:00Z',
  status: 'GRADED',
  totalScore: 84,
  systemInitialScore: 76,
  maxScore: 120,
  pendingSubjectiveItems: 0,
  reviewedBy: 'EXAM_ADMINISTRATOR',
  reviewedAt: '2026-08-06T02:00:00Z',
  answerSheet: null,
  examItems: [],
};

async function useSystemAdminSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('philsa_user', JSON.stringify(session));
  }, systemAdmin);
}

test('releases a completed Exam Review to Score Management', async ({ page }) => {
  let releaseRequestCount = 0;
  await useSystemAdminSession(page);
  await page.route('**/api/v1/results/exam-reviews/review-id/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/release/') && request.method() === 'POST') {
      releaseRequestCount += 1;
      await route.fulfill({ json: { ...gradedReview, status: 'FINALIZED' } });
      return;
    }
    await route.fulfill({ json: gradedReview });
  });

  await page.goto('/admin/hub/review/review-id');
  await page.getByRole('button', { name: 'Release to Score Management' }).click();

  await expect(page.getByText('Released to Score Management')).toBeVisible();
  expect(releaseRequestCount).toBe(1);
});

test('keeps a graded review retryable when Score Management rejects the handoff', async ({ page }) => {
  await useSystemAdminSession(page);
  await page.route('**/api/v1/results/exam-reviews/review-id/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/release/') && request.method() === 'POST') {
      await route.fulfill({
        status: 409,
        json: {
          error: {
            code: 'EXAM_REVIEW_RELEASE_CONFLICT',
            message: 'Exam Review must match exactly one Score Management Exam Set.',
          },
        },
      });
      return;
    }
    await route.fulfill({ json: gradedReview });
  });

  await page.goto('/admin/hub/review/review-id');
  await page.getByRole('button', { name: 'Release to Score Management' }).click();

  await expect(page.getByText('Exam Review must match exactly one Score Management Exam Set.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Release to Score Management' })).toBeVisible();
  await expect(page.getByText('Released to Score Management')).toHaveCount(0);
});
