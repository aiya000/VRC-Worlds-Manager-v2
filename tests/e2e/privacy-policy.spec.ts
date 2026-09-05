import { expect, test } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'

const PRIVACY = '/privacy'
const ABOUT = '/listview/about'

test('the privacy policy page states where each kind of data goes', async ({
  page,
}) => {
  await page.goto(PRIVACY)

  await expect(
    page.getByRole('heading', { name: jaJP['privacy-policy:title'] }),
  ).toBeVisible()

  for (const section of [
    'privacy-policy:local-data-title',
    'privacy-policy:vrchat-title',
    'privacy-policy:google-drive-title',
    'privacy-policy:analytics-title',
    'privacy-policy:third-party-title',
    'privacy-policy:deletion-title',
  ] as const) {
    await expect(page.getByText(jaJP[section], { exact: true })).toBeVisible()
  }

  await expect(
    page.getByRole('link', {
      name: 'https://myaccount.google.com/permissions',
    }),
  ).toHaveAttribute('href', 'https://myaccount.google.com/permissions')
})

test('the About footer links to the privacy policy', async ({ page }) => {
  await page.goto(ABOUT)

  await expect(
    page.getByRole('link', { name: jaJP['privacy-policy:link-label'] }),
  ).toHaveAttribute('href', PRIVACY)
})

/**
 * Google's brand verification fetches the home page and looks for the privacy
 * policy linked from it. It is not a browser session: nothing waits for the
 * redirect on `/` to run, so the link has to be in the markup the server hands
 * back. Fetching without a page is what makes that the thing being checked.
 */
test('the home page links to the privacy policy without running any script', async ({
  request,
}) => {
  const response = await request.get('/')

  expect(response.ok()).toBe(true)
  expect(await response.text()).toContain(`href="${PRIVACY}"`)
})

test('the privacy policy fits a narrow panel', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await page.goto(PRIVACY)

  await expect(
    page.getByRole('heading', { name: jaJP['privacy-policy:title'] }),
  ).toBeVisible()

  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  )
  expect(overflows).toBe(false)
})
