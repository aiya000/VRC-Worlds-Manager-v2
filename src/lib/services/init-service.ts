import { Context, Effect, Layer } from 'effect'
import { db, isActive } from './db'

export class InitService extends Context.Tag('InitService')<
  InitService,
  {
    readonly requireInitialSetup: () => Effect.Effect<boolean, Error>
    readonly checkFilesLoaded: () => Effect.Effect<boolean, Error>
    readonly checkExistingData: () => Effect.Effect<[boolean, boolean], Error>
    readonly createEmptyAuth: () => Effect.Effect<void, Error>
    readonly createEmptyFiles: () => Effect.Effect<void, Error>
    readonly deleteData: () => Effect.Effect<void, Error>
  }
>() {}

export const InitServiceLive = Layer.succeed(InitService, {
  requireInitialSetup: () =>
    Effect.tryPromise({
      try: async () => {
        if (typeof window === 'undefined') {
          return true
        }
        const setupDone = localStorage.getItem('setupComplete')
        return setupDone !== 'true'
      },
      catch: (e) => new Error(`Failed to check setup: ${e}`),
    }),

  checkFilesLoaded: () =>
    Effect.tryPromise({
      try: async () => {
        const worldCount = await db.worlds.count()
        return worldCount >= 0
      },
      catch: (e) => new Error(`Failed to check files loaded: ${e}`),
    }),

  checkExistingData: () =>
    Effect.tryPromise({
      try: async () => {
        // Deleted rows are kept as tombstones, so counting them would report
        // data the user cannot see any more.
        const worldCount = (await db.worlds.toArray()).filter(isActive).length
        const folderCount = (await db.foldersById.toArray()).filter(
          isActive,
        ).length
        return [worldCount > 0, folderCount > 0] as [boolean, boolean]
      },
      catch: (e) => new Error(`Failed to check existing data: ${e}`),
    }),

  createEmptyAuth: () =>
    Effect.tryPromise({
      try: async () => {
        await db.authState.clear()
      },
      catch: (e) => new Error(`Failed to create empty auth: ${e}`),
    }),

  createEmptyFiles: () =>
    Effect.tryPromise({
      try: async () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('setupComplete', 'true')
        }
      },
      catch: (e) => new Error(`Failed to create empty files: ${e}`),
    }),

  deleteData: () =>
    Effect.tryPromise({
      try: async () => {
        await db.worlds.clear()
        await db.worldDetails.clear()
        await db.foldersById.clear()
        await db.folderOrder.clear()
        await db.hiddenWorlds.clear()
        await db.memos.clear()
        await db.customTags.clear()
        // `syncState` is left alone: this device keeps the id it is known by,
        // so a later sync is not mistaken for a new device.
      },
      catch: (e) => new Error(`Failed to delete data: ${e}`),
    }),
})
