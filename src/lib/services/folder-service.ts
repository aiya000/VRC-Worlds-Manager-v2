import { Context, Effect, Layer } from 'effect'
import type { FolderData } from '@/lib/types'
import { db } from './db'

export class FolderService extends Context.Tag('FolderService')<
  FolderService,
  {
    readonly getFolders: () => Effect.Effect<FolderData[], Error>
    readonly createFolder: (name: string) => Effect.Effect<string, Error>
    readonly deleteFolder: (name: string) => Effect.Effect<void, Error>
    readonly moveFolder: (
      folderName: string,
      newIndex: number,
    ) => Effect.Effect<void, Error>
    readonly renameFolder: (
      oldName: string,
      newName: string,
    ) => Effect.Effect<void, Error>
    readonly getFoldersForWorld: (
      worldId: string,
    ) => Effect.Effect<string[], Error>
  }
>() {}

export const FolderServiceLive = Layer.succeed(FolderService, {
  getFolders: () =>
    Effect.tryPromise({
      try: async () => {
        const folders = await db.folders.orderBy('order').toArray()
        const result: FolderData[] = []
        for (const folder of folders) {
          const worldCount = await db.worlds
            .filter((w) => w.folders.includes(folder.name))
            .count()
          result.push({ name: folder.name, world_count: worldCount })
        }
        return result
      },
      catch: (e) => new Error(`Failed to get folders: ${e}`),
    }),

  createFolder: (name) =>
    Effect.tryPromise({
      try: async () => {
        const existing = await db.folders.get(name)
        if (existing) {
          throw new Error(`Folder "${name}" already exists`)
        }
        const maxOrder = await db.folders.orderBy('order').last()
        const order = (maxOrder?.order ?? -1) + 1
        await db.folders.add({ name, order })
        return name
      },
      catch: (e) => new Error(`Failed to create folder: ${e}`),
    }),

  deleteFolder: (name) =>
    Effect.tryPromise({
      try: async () => {
        await db.folders.delete(name)
        const worldsInFolder = await db.worlds
          .filter((w) => w.folders.includes(name))
          .toArray()
        for (const world of worldsInFolder) {
          await db.worlds.update(world.worldId, {
            folders: world.folders.filter((f) => f !== name),
          })
        }
      },
      catch: (e) => new Error(`Failed to delete folder: ${e}`),
    }),

  moveFolder: (folderName, newIndex) =>
    Effect.tryPromise({
      try: async () => {
        const allFolders = await db.folders.orderBy('order').toArray()
        const currentIndex = allFolders.findIndex((f) => f.name === folderName)
        if (currentIndex === -1) {
          throw new Error(`Folder "${folderName}" not found`)
        }
        const [moved] = allFolders.splice(currentIndex, 1)
        allFolders.splice(newIndex, 0, moved)
        await db.transaction('rw', db.folders, async () => {
          for (let i = 0; i < allFolders.length; i++) {
            await db.folders.update(allFolders[i].name, { order: i })
          }
        })
      },
      catch: (e) => new Error(`Failed to move folder: ${e}`),
    }),

  renameFolder: (oldName, newName) =>
    Effect.tryPromise({
      try: async () => {
        const existing = await db.folders.get(oldName)
        if (!existing) {
          throw new Error(`Folder "${oldName}" not found`)
        }
        await db.transaction('rw', [db.folders, db.worlds], async () => {
          await db.folders.delete(oldName)
          await db.folders.add({ name: newName, order: existing.order })
          const worldsInFolder = await db.worlds
            .filter((w) => w.folders.includes(oldName))
            .toArray()
          for (const world of worldsInFolder) {
            await db.worlds.update(world.worldId, {
              folders: world.folders.map((f) => (f === oldName ? newName : f)),
            })
          }
        })
      },
      catch: (e) => new Error(`Failed to rename folder: ${e}`),
    }),

  getFoldersForWorld: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        const world = await db.worlds.get(worldId)
        return world?.folders ?? []
      },
      catch: (e) => new Error(`Failed to get folders for world: ${e}`),
    }),
})
