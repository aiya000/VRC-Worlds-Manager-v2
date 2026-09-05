import { expect, test, type Page } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'

const LIST_VIEW = '/listview/folders/special/all'
const REORDER = '/listview/folders/reorder'

const SEEDED = ['Chill', 'Home', 'Game', 'Horror']

/**
 * A fresh browser has no folders, so put some in the database Dexie creates on
 * the first visit. Writing them directly keeps this about the reordering rather
 * than about driving the folder-creation UI.
 */
async function seedFolders(page: Page) {
  await page.goto(LIST_VIEW)
  await expect(page.locator('[data-sidebar="trigger"]')).toBeVisible()

  await page.evaluate(async (names: string[]) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('VRChatWorldsManager')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('folders', 'readwrite')
      const store = transaction.objectStore('folders')
      names.forEach((name, order) => store.put({ name, order }))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }, SEEDED)
}

function folderNames(page: Page) {
  return page.locator('li span.truncate')
}

function moveUpButton(page: Page, row: number) {
  return page.locator('li').nth(row).locator('button').first()
}

test.describe('reorder folders', () => {
  test('moves a folder up and keeps the new order', async ({ page }) => {
    await seedFolders(page)
    await page.goto(REORDER)
    await expect(folderNames(page)).toHaveText(SEEDED)

    await moveUpButton(page, 2).click()

    await expect(folderNames(page)).toHaveText([
      'Chill',
      'Game',
      'Home',
      'Horror',
    ])

    // The order is only actually reordered if it outlives the page.
    await page.reload()
    await expect(folderNames(page)).toHaveText([
      'Chill',
      'Game',
      'Home',
      'Horror',
    ])
  })

  test('cannot move the first folder up or the last one down', async ({
    page,
  }) => {
    await seedFolders(page)
    await page.goto(REORDER)
    await expect(folderNames(page)).toHaveText(SEEDED)

    const rows = page.locator('li')
    await expect(rows.first().locator('button').first()).toBeDisabled()
    await expect(rows.last().locator('button').last()).toBeDisabled()
  })

  test('is reachable from the sidebar', async ({ page }) => {
    // A phone, where the sidebar is a drawer and this entry point is the only
    // way to the page.
    await page.setViewportSize({ width: 390, height: 844 })
    await seedFolders(page)
    await page.goto(LIST_VIEW)
    // Wait for the seeded folders to arrive: the entry point only appears once
    // there is more than one folder to put in an order.
    await expect(page.locator('[data-sidebar="trigger"]')).toBeVisible()
    await page.locator('[data-sidebar="trigger"]').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page
      .getByRole('dialog')
      .getByRole('button', { name: jaJP['app-sidebar:reorder-folders'] })
      .click()

    await expect(page).toHaveURL(/\/listview\/folders\/reorder/)
  })
})
