import type { Page } from '@playwright/test'

/**
 * Stands in for `https://accounts.google.com/gsi/client`.
 *
 * Real Google Identity Services needs a real Google account and a popup this
 * harness cannot drive, so the script itself is replaced with one that hands
 * back a token or an error without ever leaving the page. It defines the same
 * shape the real script does (`window.google.accounts.oauth2`), which is all
 * `GoogleAuthService` ever touches.
 */
export async function stubGoogleIdentityServices(
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
