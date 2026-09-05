import { expect, type Page } from '@playwright/test'

/**
 * Put folders straight into the database Dexie creates on the first visit,
 * rather than driving the folder-creation UI once per folder.
 *
 * Opening the database without a version number creates an empty one if Dexie
 * has not got there first, and then there is no store to write to -- which is a
 * race the page load does not always win. So wait for the store to appear
 * instead of assuming it is there.
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
        if (
          db.objectStoreNames.contains('foldersById') &&
          db.objectStoreNames.contains('folderOrder')
        ) {
          return db
        }
        db.close()
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      throw new Error('the folder stores never appeared')
    }

    const db = await openWithFolders()
    const ids = seeded.map(() => crypto.randomUUID())

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        ['foldersById', 'folderOrder'],
        'readwrite',
      )
      const folders = transaction.objectStore('foldersById')
      seeded.forEach((name, index) => {
        folders.put({
          id: ids[index],
          name,
          updatedAt: Date.now(),
          deletedAt: null,
          origin: 'test',
        })
      })
      // The list is ordered by this row now, not by a number on each folder.
      transaction.objectStore('folderOrder').put({
        key: 'default',
        ids,
        updatedAt: Date.now(),
        origin: 'test',
      })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  }, names)
}
