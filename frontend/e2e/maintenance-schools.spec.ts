import { expect, Page, test } from '@playwright/test';

/**
 * Smoke test for the List of DepEd SHS / Schools maintenance table.
 *
 * Runs in the default prototype mode (`npm run dev`), so it drives the real
 * `SchoolService` interface backed by the in-memory Mock implementation — it
 * validates the screen <-> service contract (list, create, edit, delete), not
 * the Django backend or cross-reload persistence. Schools is a single entity
 * (no nested drill-down), so the flow is flat. The Mock service resets on a
 * full page load, so the whole flow stays within one page session (no reload).
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

const SCHOOL_NAME = 'E2E Smoke High School';
const SCHOOL_RENAMED = 'E2E Smoke High School (Renamed)';
const EMPTY_SCHOOLS = 'No schools match your search and filter criteria.';

test('system admin can manage the list of schools end to end', async ({ page }) => {
  await useSession(page, systemAdmin);
  await page.goto('/admin/maintenance/schools');

  await expect(page.getByRole('heading', { name: 'List of Schools' })).toBeVisible();
  await expect(page.getByText(EMPTY_SCHOOLS)).toBeVisible();

  // Create a school (name is the only required text field; capacity/region/classification default).
  await page.getByRole('button', { name: 'Add New School' }).click();
  await page.locator('form').getByPlaceholder('Official name of school...').fill(SCHOOL_NAME);
  await page.getByRole('button', { name: 'Save School Record' }).click();

  await expect(page.getByText(EMPTY_SCHOOLS)).toHaveCount(0);
  await expect(page.getByText(SCHOOL_NAME, { exact: true })).toBeVisible();

  // Edit the school (rename) and confirm the update round-trips.
  await page.getByRole('button', { name: 'Edit School Details' }).click();
  await page.locator('form').getByPlaceholder('Official name of school...').fill(SCHOOL_RENAMED);
  await page.getByRole('button', { name: 'Save School Record' }).click();

  await expect(page.getByText(SCHOOL_NAME, { exact: true })).toHaveCount(0);
  await expect(page.getByText(SCHOOL_RENAMED, { exact: true })).toBeVisible();

  // Delete the school through the confirmation dialog.
  await page.getByRole('button', { name: 'Remove School' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Agree' }).click();

  await expect(page.getByText(SCHOOL_RENAMED, { exact: true })).toHaveCount(0);
  await expect(page.getByText(EMPTY_SCHOOLS)).toBeVisible();
});
