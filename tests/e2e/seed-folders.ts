import { expect, type Page } from '@playwright/test'

/**
 * Put folders straight into the database Dexie creates on the first visit,
 * rather than driving the folder-creation UI once per folder.
 *
 * Opening the database without a version number creates an empty one if Dexie
 * has not got there first, and then there is no `folders` store to write to --
 * which is a race the page load does not always win. So wait for the store to
 * appear instead of assuming it is there.
 */
export async function seedFolders(page: Page, names: string[]) {
  await expect(page.locator('[data-sidebar="trigger"]')).toBeVisible()

  await page.evaluate(async (seeded: string[]) => {
    const openWithFolders = async (): Promise<IDBDatabase> => {
      for (let attempt = 0; attempt < 100; attempt++) {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('VRChatWorldsManager')
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        if (db.objectStoreNames.contains('folders')) {
          return db
        }
        db.close()
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      throw new Error('the "folders" store never appeared')
    }

    const db = await openWithFolders()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('folders', 'readwrite')
      const store = transaction.objectStore('folders')
      seeded.forEach((name, order) => store.put({ name, order }))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }, names)
}
