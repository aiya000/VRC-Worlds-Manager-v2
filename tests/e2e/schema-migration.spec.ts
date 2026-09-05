import { expect, test, type Page } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'

const DB_NAME = 'VRChatWorldsManager'

/** The IndexedDB version Dexie wrote for the schema that predates sync. */
const LEGACY_IDB_VERSION = 10

/**
 * Builds the database exactly as the released app left it, before the app has
 * had a chance to open one. Nothing here may be reshaped by hand afterwards:
 * the point is to make the real upgrade path run.
 */
async function seedLegacyDatabase(page: Page) {
  await page.evaluate(
    ({ name, version }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name, version)

        request.onupgradeneeded = () => {
          const db = request.result
          for (const store of [
            'worlds',
            'worldDetails',
            'hiddenWorlds',
            'memos',
            'customTags',
          ]) {
            if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: 'worldId' })
            }
          }
          if (!db.objectStoreNames.contains('folders')) {
            db.createObjectStore('folders', { keyPath: 'name' })
          }
          if (!db.objectStoreNames.contains('authState')) {
            db.createObjectStore('authState', { keyPath: 'key' })
          }
        }

        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction(
            ['worlds', 'folders', 'memos', 'customTags', 'hiddenWorlds'],
            'readwrite',
          )
          const world = (
            worldId: string,
            worldName: string,
            folders: string[],
          ) => ({
            worldId,
            name: worldName,
            thumbnailUrl: 'https://example.invalid/thumb.png',
            authorName: 'someone',
            favorites: 1,
            lastUpdated: '2025-01-01',
            visits: 2,
            dateAdded: '2025-01-01T00:00:00.000Z',
            platform: ['standalonewindows'],
            folders,
            tags: [],
            capacity: 16,
          })

          tx.objectStore('folders').put({ name: '観光', order: 0 })
          tx.objectStore('folders').put({ name: 'ネタ', order: 1 })
          tx.objectStore('folders').put({ name: '空フォルダ', order: 2 })
          tx.objectStore('worlds').put(
            world('wrld_filed', 'Filed World', ['観光', 'ネタ']),
          )
          tx.objectStore('worlds').put(world('wrld_loose', 'Loose World', []))
          tx.objectStore('worlds').put(
            world('wrld_hidden', 'Hidden World', ['観光']),
          )
          tx.objectStore('memos').put({
            worldId: 'wrld_filed',
            memo: '大事なメモ',
          })
          tx.objectStore('customTags').put({
            worldId: 'wrld_filed',
            tags: ['静か', '広い'],
          })
          tx.objectStore('hiddenWorlds').put({ worldId: 'wrld_hidden' })

          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }

        request.onerror = () => reject(request.error)
      }),
    { name: DB_NAME, version: LEGACY_IDB_VERSION },
  )
}

async function readMigratedDatabase(page: Page) {
  // Opening without a version before Dexie has upgraded lands on the old
  // schema, so wait for the upgrade to have happened first.
  await page.waitForFunction(
    async () => {
      const databases = await indexedDB.databases()
      const found = databases.find((d) => d.name === 'VRChatWorldsManager')
      return found?.version === 30
    },
    undefined,
    { timeout: 20_000 },
  )

  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const all = <T>(store: string) =>
      new Promise<T[]>((resolve, reject) => {
        const request = db
          .transaction(store, 'readonly')
          .objectStore(store)
          .getAll()
        request.onsuccess = () => resolve(request.result as T[])
        request.onerror = () => reject(request.error)
      })

    const result = {
      stores: [...db.objectStoreNames],
      folders: await all<{
        id: string
        name: string
        updatedAt: number
        deletedAt: number | null
      }>('foldersById'),
      folderOrder: await all<{ ids: string[] }>('folderOrder'),
      worlds: await all<{
        worldId: string
        folderRefs?: { folderId: string }[]
        folders?: string[]
        updatedAt: number
      }>('worlds'),
      memos: await all<{ worldId: string; memo: string; updatedAt: number }>(
        'memos',
      ),
      customTags: await all<{
        worldId: string
        tagRefs?: { name: string }[]
        tags?: string[]
      }>('customTags'),
      hiddenWorlds: await all<{ worldId: string; deletedAt: number | null }>(
        'hiddenWorlds',
      ),
    }
    db.close()
    return result
  }, DB_NAME)
}

/**
 * A page on the app's own origin that does not boot the app.
 *
 * The database has to hold the old schema before anything opens it, and the app
 * opens Dexie the moment it loads -- deleting it afterwards only has the app
 * create the current schema again. So the seeding happens somewhere the app is
 * not running, and the real page is loaded after.
 */
const BLANK = '/e2e-blank-page-for-seeding'

async function openBlankPageOnTheAppsOrigin(page: Page) {
  await page.route(`**${BLANK}`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>seed</title>',
    }),
  )
  await page.goto(BLANK)
}

test.describe('upgrading a database written by the released app', () => {
  test.beforeEach(async ({ page }) => {
    await openBlankPageOnTheAppsOrigin(page)
    await seedLegacyDatabase(page)
    await page.unroute(`**${BLANK}`)
    await page.goto('/listview/folders/special/all')
  })

  test('replaces the folder store with one keyed by id', async ({ page }) => {
    const db = await readMigratedDatabase(page)

    // Dexie cannot change a primary key, so the folders moved to a new store
    // and the old one is dropped rather than reshaped.
    expect(db.stores).toContain('foldersById')
    expect(db.stores).not.toContain('folders')
    expect(db.folders.map((folder) => folder.name).sort()).toEqual([
      'ネタ',
      '空フォルダ',
      '観光',
    ])
    expect(db.folders.every((folder) => typeof folder.id === 'string')).toBe(
      true,
    )
  })

  test('leaves every migrated row marked as having no known timestamp', async ({
    page,
  }) => {
    const db = await readMigratedDatabase(page)

    // Stamping these with the migration time would make the first sync treat
    // every row as a fresh edit, and the device that migrated later would win
    // all of them.
    for (const row of [...db.folders, ...db.worlds, ...db.memos]) {
      expect(row.updatedAt).toBe(0)
    }
  })

  test('keeps the folder order the user had', async ({ page }) => {
    const db = await readMigratedDatabase(page)

    const nameById = new Map(db.folders.map((f) => [f.id, f.name]))
    expect(db.folderOrder[0].ids.map((id) => nameById.get(id))).toEqual([
      '観光',
      'ネタ',
      '空フォルダ',
    ])
  })

  test('keeps every world in the folders it was in', async ({ page }) => {
    const db = await readMigratedDatabase(page)

    const nameById = new Map(db.folders.map((f) => [f.id, f.name]))
    const foldersOf = (worldId: string) =>
      (db.worlds.find((w) => w.worldId === worldId)?.folderRefs ?? [])
        .map((ref) => nameById.get(ref.folderId))
        .sort()

    expect(foldersOf('wrld_filed')).toEqual(['ネタ', '観光'])
    expect(foldersOf('wrld_loose')).toEqual([])
    expect(foldersOf('wrld_hidden')).toEqual(['観光'])
    expect(db.worlds.every((world) => world.folders === undefined)).toBe(true)
  })

  test('keeps memos, custom tags and what was hidden', async ({ page }) => {
    const db = await readMigratedDatabase(page)

    expect(db.memos).toHaveLength(1)
    expect(db.memos[0].memo).toBe('大事なメモ')
    expect(db.customTags[0].tagRefs?.map((ref) => ref.name).sort()).toEqual([
      '広い',
      '静か',
    ])
    expect(db.customTags.every((record) => record.tags === undefined)).toBe(
      true,
    )
    expect(db.hiddenWorlds).toHaveLength(1)
    expect(db.hiddenWorlds[0].deletedAt).toBeNull()
  })

  test('renaming a migrated folder keeps the worlds filed in it', async ({
    page,
  }) => {
    const before = await readMigratedDatabase(page)
    const sightseeing = before.folders.find((f) => f.name === '観光')
    expect(sightseeing).toBeDefined()

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.reload()
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; }',
    })

    const row = page.getByText('観光', { exact: true }).first()
    await expect(row).toBeVisible()
    await row.click({ button: 'right' })
    await page.getByText(jaJP['app-sidebar:rename'], { exact: true }).click()

    const input = page.locator('input:focus')
    await input.fill('観光あらため')
    await input.press('Enter')

    await expect(
      page.getByText('観光あらため', { exact: true }).first(),
    ).toBeVisible()

    const after = await readMigratedDatabase(page)
    const renamed = after.folders.find((f) => f.name === '観光あらため')

    // The row keeps its id, so nothing that pointed at the folder had to be
    // rewritten. Renaming used to delete the folder and add another one.
    expect(renamed?.id).toBe(sightseeing?.id)
    expect(after.folders.filter((f) => f.deletedAt === null)).toHaveLength(3)
    expect(
      after.worlds
        .find((w) => w.worldId === 'wrld_filed')
        ?.folderRefs?.map((ref) => ref.folderId),
    ).toContain(sightseeing?.id)
  })

  test('shows the same worlds on screen as before the upgrade', async ({
    page,
  }) => {
    await readMigratedDatabase(page)
    await page.reload()

    await expect(page.getByText('Filed World')).toBeVisible()
    await expect(page.getByText('Loose World')).toBeVisible()
    // Hidden stays hidden: the tombstone is on the unhide, not the hide.
    await expect(page.getByText('Hidden World')).toHaveCount(0)
  })
})
