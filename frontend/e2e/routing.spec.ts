import { expect, Page, test } from '@playwright/test';

interface SyntheticSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  candidateId?: string;
}

const student: SyntheticSession = {
  id: 's1',
  email: 'student@example.com',
  firstName: 'Juan',
  lastName: 'Pangilinan',
  role: 'STUDENT',
  candidateId: 'PH-2026-0001',
};

const examEligibleStudent: SyntheticSession = {
  id: 'student-active',
  email: 'stud3takeexam@philsa.edu.ph',
  firstName: 'Juan Carlos',
  lastName: 'Villanueva',
  role: 'STUDENT',
  candidateId: 'CAND-2026-8803',
};

const systemAdmin: SyntheticSession = {
  id: 'a1',
  email: 'admin@philsa.gov.ph',
  firstName: 'Reynaldo',
  lastName: 'Velasco',
  role: 'SYSTEM_ADMIN',
};

async function useSession(page: Page, user: SyntheticSession) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('philsa_user', JSON.stringify(session));
  }, user);
}

test('direct protected navigation redirects a signed-out visitor to login', async ({ page }) => {
  await page.goto('/admin/users');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Exam Portal' })).toBeVisible();
});

test('a student cannot directly open a system-administration route', async ({ page }) => {
  await useSession(page, student);
  await page.goto('/admin/users');

  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByRole('heading', { name: 'You cannot open this page' })).toBeVisible();
});

test('an authorized nested route survives a browser refresh', async ({ page }) => {
  await useSession(page, systemAdmin);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'User & Role Settings' })).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'User & Role Settings' })).toBeVisible();
});

test('browser back and forward preserve application navigation', async ({ page }) => {
  await useSession(page, student);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Application', exact: true }).click();
  await expect(page).toHaveURL(/\/student\/application$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goForward();
  await expect(page).toHaveURL(/\/student\/application$/);
});

test('an eligible student can directly open the live exam route', async ({ page }) => {
  await useSession(page, examEligibleStudent);
  await page.goto('/exam/live');

  await expect(page).toHaveURL(/\/exam\/live$/);
  await expect(page.getByRole('heading', { name: 'Step 1: Terms of Use' })).toBeVisible();
});

test('an ineligible student is redirected away from the live exam', async ({ page }) => {
  await useSession(page, student);
  await page.goto('/exam/live');

  await expect(page).toHaveURL(/\/dashboard$/);
});

test('an unknown route renders the not-found page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(page).toHaveURL(/\/this-route-does-not-exist$/);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
