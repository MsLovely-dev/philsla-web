import { expect, test } from '@playwright/test';

test('student navigation works from the mobile menu', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('philsa_user', JSON.stringify({
      id: 's1',
      email: 'student@example.com',
      firstName: 'Juan',
      lastName: 'Pangilinan',
      role: 'STUDENT',
      candidateId: 'PH-2026-0001',
    }));
  });
  await page.goto('/dashboard');

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const mobileNavigation = page.locator('aside.md\\:hidden');
  await expect(mobileNavigation).toBeVisible();
  await mobileNavigation.getByRole('link', { name: 'Application', exact: true }).click();

  await expect(page).toHaveURL(/\/student\/application$/);
  await expect(mobileNavigation).toBeHidden();
});
