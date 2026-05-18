import { expect, test } from '@playwright/test';

test('runs a browser-based smoke check', async ({ page }) => {
  await page.goto(
    'data:text/html,<main><h1>VRC%20Worlds%20Manager</h1><p>Playwright%20setup%20works.</p></main>',
  );

  await expect(
    page.getByRole('heading', { name: 'VRC Worlds Manager' }),
  ).toBeVisible();
  await expect(page.getByText('Playwright setup works.')).toBeVisible();
});
