import { expect, Page, test } from '@playwright/test';

/**
 * Smoke test for the Universities & Courses maintenance table.
 *
 * Runs in the default prototype mode (`npm run dev`), so it drives the real
 * `UniversityService` interface backed by the in-memory Mock implementation —
 * it validates the screen <-> service contract (list, create, edit, nested
 * course CRUD, delete), not the Django backend or cross-reload persistence.
 * The Mock service resets on a full page load, so the whole flow stays within a
 * single page session (no `page.reload()`).
 */

interface SyntheticSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

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

const UNIVERSITY_NAME = 'E2E Smoke University';
const UNIVERSITY_RENAMED = 'E2E Smoke University (Renamed)';
const EMPTY_UNIVERSITIES = 'No universities match your search and filter criteria.';
const EMPTY_COURSES = 'No college courses match your search criteria.';

test('system admin can manage universities and their college courses end to end', async ({ page }) => {
  await useSession(page, systemAdmin);
  await page.goto('/admin/maintenance/universities');

  await expect(page.getByRole('heading', { name: 'List of Accredited Universities' })).toBeVisible();
  await expect(page.getByText(EMPTY_UNIVERSITIES)).toBeVisible();

  // Create a university (name + city are the required fields; other fields default).
  await page.getByRole('button', { name: 'Add University' }).click();
  const uniForm = page.locator('form');
  await uniForm.getByPlaceholder('Official name of university...').fill(UNIVERSITY_NAME);
  await uniForm.getByPlaceholder('e.g. Quezon City').fill('Quezon City');
  await page.getByRole('button', { name: 'Save University' }).click();

  await expect(page.getByText(EMPTY_UNIVERSITIES)).toHaveCount(0);
  await expect(page.getByText(UNIVERSITY_NAME, { exact: true })).toBeVisible();

  // Edit the university (rename) and confirm the update round-trips.
  await page.getByRole('button', { name: 'Edit University' }).click();
  await page.locator('form').getByPlaceholder('Official name of university...').fill(UNIVERSITY_RENAMED);
  await page.getByRole('button', { name: 'Save University' }).click();

  await expect(page.getByText(UNIVERSITY_NAME, { exact: true })).toHaveCount(0);
  await expect(page.getByText(UNIVERSITY_RENAMED, { exact: true })).toBeVisible();

  // Drill into the university's college courses.
  await page.getByText(UNIVERSITY_RENAMED, { exact: true }).click();
  await expect(page.getByRole('heading', { name: UNIVERSITY_RENAMED })).toBeVisible();
  await expect(page.getByText(EMPTY_COURSES)).toBeVisible();

  // Add a college course.
  await page.getByRole('button', { name: 'Add College Course' }).click();
  const courseForm = page.locator('form');
  await courseForm.getByPlaceholder('e.g. BSCS').fill('BSCS');
  await courseForm.getByPlaceholder('e.g. Bachelor of Science in Computer Science').fill('BS Computer Science');
  await courseForm.getByPlaceholder('e.g. College of Engineering').fill('College of Computing');
  await page.getByRole('button', { name: 'Save College Course' }).click();

  await expect(page.getByText(EMPTY_COURSES)).toHaveCount(0);
  await expect(page.getByText('BS Computer Science', { exact: true })).toBeVisible();

  // Delete the course through the confirmation dialog.
  await page.getByRole('button', { name: 'Delete Course' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Agree' }).click();
  await expect(page.getByText('BS Computer Science', { exact: true })).toHaveCount(0);
  await expect(page.getByText(EMPTY_COURSES)).toBeVisible();

  // Back to the list, then delete the university.
  await page.getByRole('button', { name: 'Back to All Universities' }).click();
  await expect(page.getByText(UNIVERSITY_RENAMED, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Delete University' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Agree' }).click();

  await expect(page.getByText(UNIVERSITY_RENAMED, { exact: true })).toHaveCount(0);
  await expect(page.getByText(EMPTY_UNIVERSITIES)).toBeVisible();
});
