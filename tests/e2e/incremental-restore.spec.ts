import { expect, test, type Page } from '@playwright/test'
import jaJP from '../../locales/ja-JP.json'
import { seedFolders } from './seed-folders'

const LIST_VIEW = '/listview/folders/special/all'
const SETTINGS = '/listview/settings'

/**
 * A backup in the shape every release so far has written: no timestamps, no
 * record of anything having been deleted. Restoring one of these is what #78 is
 * about.
 */
const LEGACY_BACKUP = {
  metadata: {
    date: '2025-03-01T00:00:00.000Z',
    number_of_folders: 1,
    number_of_worlds: 1,
    app_version: '2.0.0',
  },
  worlds: [
    {
      worldId: 'wrld_from_backup',
      name: 'World From Backup',
      thumbnailUrl: 'https://example.invalid/thumb.png',
      authorName: 'someone',
      favorites: 1,
      lastUpdated: '2025-02-01',
      visits: 2,
      dateAdded: '2025-02-01T00:00:00.000Z',
      platform: ['standalonewindows'],
      folders: ['バックアップにだけあるフォルダ'],
      tags: [],
      capacity: 16,
    },
  ],
  folders: [{ name: 'バックアップにだけあるフォルダ', world_count: 1 }],
  hiddenWorlds: [],
  memos: {},
  customTags: {},
}

async function openSettings(page: Page) {
  await page.goto(SETTINGS)
  await page.addStyleTag({
    content: 'nextjs-portal { display: none !important; }',
  })
  // Backups live under their own tab.
  await page
    .getByRole('tab', { name: jaJP['settings-page:section-data-management'] })
    .click()
  await expect(
    page.getByRole('button', { name: jaJP['settings-page:restore-backup'] }),
  ).toBeVisible()
}

function modeButton(page: Page, mode: 'merge' | 'replace') {
  return page.locator('button[aria-pressed]').nth(mode === 'merge' ? 0 : 1)
}

/**
 * Drives the real dialog, handing it the file through the input it opens, so
 * the mode the dialog passes along is the one under test.
 */
async function restore(page: Page, mode: 'merge' | 'replace') {
  await page
    .getByRole('button', { name: jaJP['settings-page:restore-backup'] })
    .click()

  const chooser = page.waitForEvent('filechooser')
  await page
    .getByRole('button', { name: jaJP['settings-page:select-backup'] })
    .click()
  await (
    await chooser
  ).setFiles({
    name: 'vrcww-backup-2025-03-01.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(LEGACY_BACKUP)),
  })

  // The mode buttons carry their explanation inside them, so their accessible
  // name is the whole block; `aria-pressed` is what actually identifies them.
  await expect(
    page.getByText(jaJP['settings-page:restore-mode-label']),
  ).toBeVisible()
  await modeButton(page, mode).click()
  await expect(modeButton(page, mode)).toHaveAttribute('aria-pressed', 'true')

  const label =
    mode === 'merge'
      ? jaJP['settings-page:restore-mode-merge']
      : jaJP['settings-page:restore-mode-replace']
  // The confirm button says what it is about to do.
  await page.getByRole('button', { name: label, exact: true }).click()

  await expect(
    page.getByText(jaJP['settings-page:restore-success-title']),
  ).toBeVisible()
}

async function folderNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('VRChatWorldsManager')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const rows = await new Promise<
      { name: string; deletedAt: number | null }[]
    >((resolve, reject) => {
      const request = db
        .transaction('foldersById', 'readonly')
        .objectStore('foldersById')
        .getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return rows
      .filter((row) => row.deletedAt === null)
      .map((row) => row.name)
      .sort()
  })
}

test.describe('restoring a backup taken before today', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LIST_VIEW)
    await seedFolders(page, ['今日作ったフォルダ'])
  })

  test('adds what the backup holds without removing what came after it', async ({
    page,
  }) => {
    await openSettings(page)
    await restore(page, 'merge')

    // The whole point of #78: a backup that predates today's folder cannot
    // take that folder away.
    expect(await folderNames(page)).toEqual([
      'バックアップにだけあるフォルダ',
      '今日作ったフォルダ',
    ])
  })

  test('shows the world the backup carried', async ({ page }) => {
    await openSettings(page)
    await restore(page, 'merge')

    await page.goto(LIST_VIEW)
    await expect(page.getByText('World From Backup')).toBeVisible()
  })

  test('still replaces everything when that is what was asked for', async ({
    page,
  }) => {
    await openSettings(page)
    await restore(page, 'replace')

    expect(await folderNames(page)).toEqual(['バックアップにだけあるフォルダ'])
  })

  test('warns only about the mode that can destroy something', async ({
    page,
  }) => {
    await openSettings(page)
    await page
      .getByRole('button', { name: jaJP['settings-page:restore-backup'] })
      .click()

    const chooser = page.waitForEvent('filechooser')
    await page
      .getByRole('button', { name: jaJP['settings-page:select-backup'] })
      .click()
    await (
      await chooser
    ).setFiles({
      name: 'vrcww-backup-2025-03-01.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(LEGACY_BACKUP)),
    })

    const warning = page.getByText(jaJP['settings-page:warning-text-1'])
    await expect(warning).toHaveCount(0)

    await modeButton(page, 'replace').click()
    await expect(warning).toBeVisible()
  })
})
