import { Context, Effect, Layer } from 'effect'
import type { FolderData } from '@/lib/types'
import { db, FOLDER_ORDER_KEY, isActive, isMember } from './db'
import {
  activeFolderByName,
  activeFolders,
  deviceId,
  folderNamesById,
  folderNamesOf,
  tombstoned,
  touched,
  withoutMember,
} from './sync-meta'

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

async function writeFolderOrder(ids: string[]): Promise<void> {
  await db.folderOrder.put({
    key: FOLDER_ORDER_KEY,
    ids,
    updatedAt: Date.now(),
    origin: await deviceId(),
  })
}

export const FolderServiceLive = Layer.succeed(FolderService, {
  getFolders: () =>
    Effect.tryPromise({
      try: async () => {
        const folders = await activeFolders()
        const worlds = (await db.worlds.toArray()).filter(isActive)

        return folders.map((folder) => ({
          name: folder.name,
          world_count: worlds.filter((world) =>
            world.folderRefs.some(
              (ref) => ref.folderId === folder.id && isMember(ref),
            ),
          ).length,
        }))
      },
      catch: (e) => new Error(`Failed to get folders: ${e}`),
    }),

  createFolder: (name) =>
    Effect.tryPromise({
      try: async () => {
        const existing = await db.foldersById.where('name').equals(name).first()
        if (existing !== undefined && isActive(existing)) {
          throw new Error(`Folder "${name}" already exists`)
        }

        // A folder deleted earlier still holds the name, because its tombstone
        // has to outlive it for other devices. Reusing the row keeps the world
        // memberships that pointed at it.
        if (existing !== undefined) {
          await db.foldersById.update(existing.id, { ...(await touched()) })
          const order = await db.folderOrder.get(FOLDER_ORDER_KEY)
          const ids = order?.ids ?? []
          if (!ids.includes(existing.id)) {
            await writeFolderOrder([...ids, existing.id])
          }
          return name
        }

        const id = crypto.randomUUID()
        await db.foldersById.add({ id, name, ...(await touched()) })
        const order = await db.folderOrder.get(FOLDER_ORDER_KEY)
        await writeFolderOrder([...(order?.ids ?? []), id])
        return name
      },
      catch: (e) => new Error(`Failed to create folder: ${e}`),
    }),

  deleteFolder: (name) =>
    Effect.tryPromise({
      try: async () => {
        const folder = await activeFolderByName(name)
        if (folder === undefined) {
          return
        }
        const gone = await tombstoned()
        const now = Date.now()

        await db.transaction(
          'rw',
          [db.foldersById, db.folderOrder, db.worlds],
          async () => {
            await db.foldersById.update(folder.id, { ...gone })

            const order = await db.folderOrder.get(FOLDER_ORDER_KEY)
            if (order !== undefined) {
              await writeFolderOrder(order.ids.filter((id) => id !== folder.id))
            }

            const worlds = await db.worlds.toArray()
            for (const world of worlds) {
              if (
                !world.folderRefs.some(
                  (ref) => ref.folderId === folder.id && isMember(ref),
                )
              ) {
                continue
              }
              await db.worlds.update(world.worldId, {
                ...(await touched()),
                folderRefs: withoutMember(
                  world.folderRefs,
                  (ref) => ref.folderId === folder.id,
                  now,
                ),
              })
            }
          },
        )
      },
      catch: (e) => new Error(`Failed to delete folder: ${e}`),
    }),

  moveFolder: (folderName, newIndex) =>
    Effect.tryPromise({
      try: async () => {
        const folders = await activeFolders()
        const currentIndex = folders.findIndex((f) => f.name === folderName)
        if (currentIndex === -1) {
          throw new Error(`Folder "${folderName}" not found`)
        }

        const ids = folders.map((folder) => folder.id)
        const [moved] = ids.splice(currentIndex, 1)
        ids.splice(newIndex, 0, moved)
        await writeFolderOrder(ids)
      },
      catch: (e) => new Error(`Failed to move folder: ${e}`),
    }),

  renameFolder: (oldName, newName) =>
    Effect.tryPromise({
      try: async () => {
        const folder = await activeFolderByName(oldName)
        if (folder === undefined) {
          throw new Error(`Folder "${oldName}" not found`)
        }
        const clash = await db.foldersById.where('name').equals(newName).first()
        if (clash !== undefined && clash.id !== folder.id) {
          throw new Error(`Folder "${newName}" already exists`)
        }

        // Renaming is now one field on one row. It used to delete the folder
        // and add another, which lost the row's identity along with any record
        // that the two were ever the same folder.
        await db.foldersById.update(folder.id, {
          name: newName,
          ...(await touched()),
        })
      },
      catch: (e) => new Error(`Failed to rename folder: ${e}`),
    }),

  getFoldersForWorld: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        const world = await db.worlds.get(worldId)
        if (world === undefined || !isActive(world)) {
          return []
        }
        return folderNamesOf(world, folderNamesById(await activeFolders()))
      },
      catch: (e) => new Error(`Failed to get folders for world: ${e}`),
    }),
})
