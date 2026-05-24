import { expect, test } from '@playwright/test';

test('browser environment is properly configured', async ({ page }) => {
  await page.setContent(`
    <main>
      <h1>VRChat Worlds Manager Web</h1>
      <p>E2E test environment is ready.</p>
    </main>
  `);

  await expect(
    page.getByRole('heading', { name: 'VRChat Worlds Manager Web' }),
  ).toBeVisible();
  await expect(page.getByText('E2E test environment is ready.')).toBeVisible();
});
