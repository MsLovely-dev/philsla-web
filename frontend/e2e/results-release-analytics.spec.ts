import { expect, type Page, test } from '@playwright/test';

const examAdministrator = {
  id: 'results-release-admin',
  email: 'results.release.admin@example.test',
  firstName: 'Synthetic',
  lastName: 'Release Administrator',
  role: 'EXAM_ADMINISTRATOR',
};

const sessionId = 'SESSION-2027-SYNTHETIC';
const sessionName = 'Synthetic 2027 Examination Session';

async function useSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('philsa_user', JSON.stringify(session));
  }, examAdministrator);
}

async function mockResultsApis(page: Page) {
  let releaseState: 'READY_FOR_PROCESSING' | 'SCORING_PROCESSED' | 'RESULTS_RELEASED' = 'READY_FOR_PROCESSING';
  let processRequestCount = 0;
  let releaseRequestCount = 0;

  await page.route('**/api/v1/results/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith('/release-summary/') && request.method() === 'GET') {
      const processed = releaseState === 'READY_FOR_PROCESSING' ? 0 : 3;
      const released = releaseState === 'RESULTS_RELEASED' ? 3 : 0;
      await route.fulfill({
        json: {
          count: 1,
          page: 1,
          pageSize: 25,
          results: [{
            id: sessionId,
            name: sessionName,
            status: releaseState,
            isClosed: true,
            totalCandidates: 3,
            approvedScores: 3,
            excludedScores: 0,
            processedScores: processed,
            releasedScores: released,
            processedAt: processed ? '2026-08-07T00:00:00Z' : null,
            releasedAt: released ? '2026-08-07T01:00:00Z' : null,
            processingReady: releaseState === 'READY_FOR_PROCESSING',
            releaseReady: releaseState === 'SCORING_PROCESSED',
          }],
        },
      });
      return;
    }

    if (pathname.endsWith(`/batches/${sessionId}/process/`) && request.method() === 'POST') {
      processRequestCount += 1;
      releaseState = 'SCORING_PROCESSED';
      await route.fulfill({
        json: { id: sessionId, status: 'SCORING_PROCESSED', processingBatchId: 'PROCESS-SYNTHETIC', processedBy: 'results-release-admin', processedCount: 3, excludedCount: 0 },
      });
      return;
    }

    if (pathname.endsWith(`/batches/${sessionId}/release/`) && request.method() === 'POST') {
      releaseRequestCount += 1;
      releaseState = 'RESULTS_RELEASED';
      await route.fulfill({
        json: { id: sessionId, status: 'RESULTS_RELEASED', releasedCount: 3, notificationQueuedCount: 0, notificationSkippedCount: 3, notificationFailedCount: 0 },
      });
      return;
    }

    if (pathname.endsWith('/analytics/overview/') && request.method() === 'GET') {
      await route.fulfill({
        json: {
          releasedCandidates: 3,
          releasedSessions: 1,
          meanFinalScore: 82.5,
          scoreBands: [
            { label: '0-59.99', minimum: 0, maximum: 59.99, count: 0 },
            { label: '60-69.99', minimum: 60, maximum: 69.99, count: 0 },
            { label: '70-79.99', minimum: 70, maximum: 79.99, count: 1 },
            { label: '80-89.99', minimum: 80, maximum: 89.99, count: 1 },
            { label: '90-100', minimum: 90, maximum: 100, count: 1 },
          ],
          sessions: [{ sessionId, sessionName, releasedCandidates: 3, meanFinalScore: 82.5, releasedAt: '2026-08-07T01:00:00Z' }],
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'Synthetic route not found.', fields: {}, meta: {} } } });
  });

  return {
    expectExactlyOneMutationEach: () => {
      expect(processRequestCount).toBe(1);
      expect(releaseRequestCount).toBe(1);
    },
  };
}

test('an exam administrator processes and releases once, then sees privacy-safe aggregate reporting', async ({ page }) => {
  await useSession(page);
  const api = await mockResultsApis(page);

  await page.goto('/admin/hub/results-release');
  await expect(page.getByRole('heading', { name: 'Results Release' })).toBeVisible();
  await page.getByRole('button', { name: 'Process approved scores' }).click();
  await page.getByRole('button', { name: 'Confirm processing' }).click();
  await expect(page.getByRole('button', { name: 'Release results' })).toBeVisible();
  await page.getByRole('button', { name: 'Release results' }).click();
  await page.getByRole('button', { name: 'Confirm release' }).click();
  await expect(page.getByRole('table').getByText('Results released', { exact: true })).toBeVisible();
  api.expectExactlyOneMutationEach();

  await page.goto('/admin/results/matrix');
  await expect(page.getByRole('heading', { name: 'Released Results Overview' })).toBeVisible();
  await expect(page.getByText(sessionName, { exact: true })).toBeVisible();
  await expect(page.getByText(/candidate id|lrn/i)).toHaveCount(0);
});
