import { Context, Effect, Layer } from 'effect'
import type { BackupMetaData, WorldDisplayData, FolderData } from '@/lib/types'
import { db, FOLDER_ORDER_KEY, isActive, isMember } from './db'
import {
  activeFolders,
  deviceId,
  folderNamesById,
  folderNamesOf,
  memberTagNames,
  tagRefFor,
  touched,
} from './sync-meta'

interface BackupData {
  metadata: BackupMetaData
  worlds: WorldDisplayData[]
  folders: FolderData[]
  hiddenWorlds: string[]
  memos: Record<string, string>
  customTags: Record<string, string[]>
}

export class BackupService extends Context.Tag('BackupService')<
  BackupService,
  {
    readonly createBackup: () => Effect.Effect<void, Error>
    readonly restoreFromBackup: (file: File) => Effect.Effect<void, Error>
    readonly getBackupMetadataFromFile: (
      file: File,
    ) => Effect.Effect<BackupMetaData, Error>
    readonly exportToPortalLibrarySystem: (
      folders: string[],
      sortField: string,
      sortDirection: string,
    ) => Effect.Effect<void, Error>
  }
>() {}

function download(contents: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(contents, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const BackupServiceLive = Layer.succeed(BackupService, {
  createBackup: () =>
    Effect.tryPromise({
      try: async () => {
        const folders = await activeFolders()
        const nameById = folderNamesById(folders)
        const worlds = (await db.worlds.toArray()).filter(isActive)
        const hiddenWorlds = (await db.hiddenWorlds.toArray())
          .filter(isActive)
          .map((h) => h.worldId)

        const memos: Record<string, string> = {}
        for (const memo of (await db.memos.toArray()).filter(isActive)) {
          memos[memo.worldId] = memo.memo
        }

        const customTags: Record<string, string[]> = {}
        for (const record of (await db.customTags.toArray()).filter(isActive)) {
          customTags[record.worldId] = memberTagNames(record.tagRefs)
        }

        const worldDisplayData: WorldDisplayData[] = worlds.map((w) => ({
          worldId: w.worldId,
          name: w.name,
          thumbnailUrl: w.thumbnailUrl,
          authorName: w.authorName,
          favorites: w.favorites,
          lastUpdated: w.lastUpdated,
          visits: w.visits,
          dateAdded: w.dateAdded,
          platform: w.platform,
          folders: folderNamesOf(w, nameById),
          tags: w.tags,
          capacity: w.capacity,
        }))

        const foldersData: FolderData[] = folders.map((folder) => ({
          name: folder.name,
          world_count: worlds.filter((world) =>
            world.folderRefs.some(
              (ref) => ref.folderId === folder.id && isMember(ref),
            ),
          ).length,
        }))

        const backup: BackupData = {
          metadata: {
            date: new Date().toISOString(),
            number_of_folders: foldersData.length,
            number_of_worlds: worldDisplayData.length,
            app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
          },
          worlds: worldDisplayData,
          folders: foldersData,
          hiddenWorlds,
          memos,
          customTags,
        }

        download(
          backup,
          `vrcww-backup-${new Date().toISOString().slice(0, 10)}.json`,
        )
      },
      catch: (e) => new Error(`Failed to create backup: ${e}`),
    }),

  restoreFromBackup: (file) =>
    Effect.tryPromise({
      try: async () => {
        const text = await file.text()
        const backup = JSON.parse(text) as BackupData
        const meta = await touched()
        const now = Date.now()
        const origin = await deviceId()

        await db.transaction(
          'rw',
          [
            db.worlds,
            db.foldersById,
            db.folderOrder,
            db.hiddenWorlds,
            db.memos,
            db.customTags,
          ],
          async () => {
            await db.worlds.clear()
            await db.foldersById.clear()
            await db.folderOrder.clear()
            await db.hiddenWorlds.clear()
            await db.memos.clear()
            await db.customTags.clear()

            const folderIdByName = new Map<string, string>()
            for (const folder of backup.folders) {
              if (!folderIdByName.has(folder.name)) {
                folderIdByName.set(folder.name, crypto.randomUUID())
              }
            }
            // A world may name a folder the folder list forgot to mention.
            for (const world of backup.worlds) {
              for (const name of world.folders) {
                if (!folderIdByName.has(name)) {
                  folderIdByName.set(name, crypto.randomUUID())
                }
              }
            }

            for (const [name, id] of folderIdByName) {
              await db.foldersById.put({ id, name, ...meta })
            }
            await db.folderOrder.put({
              key: FOLDER_ORDER_KEY,
              ids: backup.folders.map(
                (folder) => folderIdByName.get(folder.name) as string,
              ),
              updatedAt: now,
              origin,
            })

            for (const world of backup.worlds) {
              await db.worlds.put({
                worldId: world.worldId,
                name: world.name,
                thumbnailUrl: world.thumbnailUrl,
                authorName: world.authorName,
                favorites: world.favorites,
                lastUpdated: world.lastUpdated,
                visits: world.visits,
                dateAdded: world.dateAdded,
                platform: world.platform,
                folderRefs: world.folders.map((name) => ({
                  folderId: folderIdByName.get(name) as string,
                  addedAt: now,
                  removedAt: null,
                })),
                tags: world.tags,
                capacity: world.capacity,
                ...meta,
              })
            }

            for (const worldId of backup.hiddenWorlds) {
              await db.hiddenWorlds.put({ worldId, ...meta })
            }

            for (const [worldId, memo] of Object.entries(backup.memos)) {
              await db.memos.put({
                worldId,
                memo,
                conflictBackup: null,
                ...meta,
              })
            }

            for (const [worldId, tags] of Object.entries(backup.customTags)) {
              await db.customTags.put({
                worldId,
                tagRefs: tags.map((name) => tagRefFor(name, now)),
                ...meta,
              })
            }
          },
        )
      },
      catch: (e) => new Error(`Failed to restore backup: ${e}`),
    }),

  getBackupMetadataFromFile: (file) =>
    Effect.tryPromise({
      try: async () => {
        const text = await file.text()
        const backup = JSON.parse(text) as BackupData
        return backup.metadata
      },
      catch: (e) => new Error(`Failed to read backup metadata: ${e}`),
    }),

  exportToPortalLibrarySystem: (folders, sortField, sortDirection) =>
    Effect.tryPromise({
      try: async () => {
        const nameById = folderNamesById(await activeFolders())
        const allWorlds = (await db.worlds.toArray()).filter(isActive)

        const categories = []
        for (const folderName of folders) {
          const worlds = allWorlds
            .filter((w) => folderNamesOf(w, nameById).includes(folderName))
            .sort((a, b) => {
              const dir = sortDirection === 'asc' ? 1 : -1
              switch (sortField) {
                case 'name':
                  return dir * a.name.localeCompare(b.name)
                case 'visits':
                  return dir * (a.visits - b.visits)
                default:
                  return (
                    dir *
                    (new Date(a.dateAdded).getTime() -
                      new Date(b.dateAdded).getTime())
                  )
              }
            })

          categories.push({
            Category: folderName,
            Worlds: worlds.map((w) => ({
              ID: w.worldId,
              Name: w.name,
              Author: w.authorName,
              Platform: {
                PC: w.platform.includes('standalonewindows'),
                Android: w.platform.includes('android'),
                iOS: w.platform.includes('ios'),
              },
            })),
          })
        }

        download({ Categorys: categories }, 'pls-export.json')
      },
      catch: (e) => new Error(`Failed to export: ${e}`),
    }),
})
