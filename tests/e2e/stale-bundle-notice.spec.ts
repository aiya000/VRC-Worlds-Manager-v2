import { expect, test, type Page } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'

const DB_NAME = 'VRChatWorldsManager'

// What Dexie writes for the next schema version: it multiplies its own version
// by ten, so a future `version(2)` is version 20 as far as IndexedDB is
// concerned. Using the real number keeps this test honest about the situation
// it is standing in for.
const NEXT_SCHEMA_IDB_VERSION = 40

/**
 * Puts the browser in the state a stale bundle finds itself in: a database
 * already upgraded past what this build knows how to open, which is what
 * happens to an offline shell, or to a tab left open across a release that
 * changed the schema.
 */
async function upgradeDatabaseBeyondThisBuild(page: Page) {
  await page.evaluate(
    ({ name, version }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name, version)
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('worlds')) {
            request.result.createObjectStore('worlds', { keyPath: 'worldId' })
          }
        }
        request.onsuccess = () => {
          request.result.close()
          resolve()
        }
        request.onerror = () => reject(request.error)
      }),
    { name: DB_NAME, version: NEXT_SCHEMA_IDB_VERSION },
  )
}

test('says nothing while the bundle and the database agree', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.locator('[role="alertdialog"]')).toHaveCount(0)
})

test('asks for a reload when the database is newer than the bundle', async ({
  page,
}) => {
  await page.goto('/')
  await upgradeDatabaseBeyondThisBuild(page)
  await page.reload()

  const notice = page.locator('[role="alertdialog"]')

  await expect(notice).toBeVisible()
  await expect(notice.getByText(jaJP['stale-bundle:title'])).toBeVisible()
  await expect(
    notice.getByRole('button', { name: jaJP['stale-bundle:reload'] }),
  ).toBeVisible()
})

test('keeps the notice reachable on a narrow VR panel', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await page.goto('/')
  await upgradeDatabaseBeyondThisBuild(page)
  await page.reload()

  const reload = page
    .locator('[role="alertdialog"]')
    .getByRole('button', { name: jaJP['stale-bundle:reload'] })

  await expect(reload).toBeVisible()

  // A VR controller aims a laser, so the one control here has to be a big target.
  const box = await reload.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(40)
})
