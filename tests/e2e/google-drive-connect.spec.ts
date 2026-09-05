import { expect, test, type Page } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'

const SETTINGS = '/listview/settings'

/**
 * Stands in for `https://accounts.google.com/gsi/client`.
 *
 * Real Google Identity Services needs a real Google account and a popup this
 * harness cannot drive, so the script itself is replaced with one that hands
 * back a token or an error without ever leaving the page. It defines the same
 * shape the real script does (`window.google.accounts.oauth2`), which is all
 * `GoogleAuthService` ever touches.
 */
async function stubGoogleIdentityServices(
  page: Page,
  outcome: { token: string } | { error: string },
) {
  const call =
    'token' in outcome
      ? `config.callback({ access_token: ${JSON.stringify(outcome.token)} })`
      : `config.callback({ error: ${JSON.stringify(outcome.error)} })`

  await page.route('https://accounts.google.com/gsi/client', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.google = {
          accounts: {
            oauth2: {
              initTokenClient: (config) => ({
                requestAccessToken: () => { ${call} },
              }),
              revoke: (_token, callback) => callback(),
            },
          },
        }
      `,
    })
  })
}

async function openSyncTab(page: Page) {
  await page.goto(SETTINGS)
  await page.addStyleTag({
    content: 'nextjs-portal { display: none !important; }',
  })
  await page
    .getByRole('tab', { name: jaJP['settings-page:section-sync'] })
    .click()
  await expect(
    page.getByText(jaJP['settings-page:google-drive-title'], {
      exact: true,
    }),
  ).toBeVisible()
}

test.describe('connecting to Google Drive', () => {
  test('starts out disconnected', async ({ page }) => {
    await stubGoogleIdentityServices(page, { token: 'unused' })
    await openSyncTab(page)

    await expect(
      page.getByRole('button', {
        name: jaJP['settings-page:google-drive-connect'],
      }),
    ).toBeVisible()
  })

  test('shows connected once the token comes back', async ({ page }) => {
    await stubGoogleIdentityServices(page, { token: 'a-fake-token' })
    await openSyncTab(page)

    await page
      .getByRole('button', { name: jaJP['settings-page:google-drive-connect'] })
      .click()

    await expect(
      page.getByText(jaJP['settings-page:google-drive-connected'], {
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: jaJP['settings-page:google-drive-disconnect'],
      }),
    ).toBeVisible()
  })

  test('stays connected across a reload', async ({ page }) => {
    await stubGoogleIdentityServices(page, { token: 'a-fake-token' })
    await openSyncTab(page)
    await page
      .getByRole('button', { name: jaJP['settings-page:google-drive-connect'] })
      .click()
    await expect(
      page.getByText(jaJP['settings-page:google-drive-connected'], {
        exact: true,
      }),
    ).toBeVisible()

    await page.reload()
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; }',
    })
    await page
      .getByRole('tab', { name: jaJP['settings-page:section-sync'] })
      .click()

    // The connection flag is what survives, not the token itself -- a fresh
    // token is asked for again the next time one is actually needed.
    await expect(
      page.getByText(jaJP['settings-page:google-drive-connected'], {
        exact: true,
      }),
    ).toBeVisible()
  })

  test('goes back to disconnected when asked', async ({ page }) => {
    await stubGoogleIdentityServices(page, { token: 'a-fake-token' })
    await openSyncTab(page)
    await page
      .getByRole('button', { name: jaJP['settings-page:google-drive-connect'] })
      .click()
    await expect(
      page.getByRole('button', {
        name: jaJP['settings-page:google-drive-disconnect'],
      }),
    ).toBeVisible()

    await page
      .getByRole('button', {
        name: jaJP['settings-page:google-drive-disconnect'],
      })
      .click()

    await expect(
      page.getByRole('button', {
        name: jaJP['settings-page:google-drive-connect'],
      }),
    ).toBeVisible()
  })

  test('surfaces the error rather than claiming a connection that failed', async ({
    page,
  }) => {
    await stubGoogleIdentityServices(page, { error: 'access_denied' })
    await openSyncTab(page)

    await page
      .getByRole('button', { name: jaJP['settings-page:google-drive-connect'] })
      .click()

    await expect(page.getByText('access_denied')).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: jaJP['settings-page:google-drive-connect'],
      }),
    ).toBeVisible()
  })
})
