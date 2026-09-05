import { Context, Effect, Layer } from 'effect'
import { db, isActive } from './db'
import { touched } from './sync-meta'

export class MemoService extends Context.Tag('MemoService')<
  MemoService,
  {
    readonly getMemo: (worldId: string) => Effect.Effect<string, Error>
    readonly setMemoAndSave: (
      worldId: string,
      memo: string,
    ) => Effect.Effect<void, Error>
    readonly searchMemoText: (
      searchText: string,
    ) => Effect.Effect<string[], Error>
  }
>() {}

export const MemoServiceLive = Layer.succeed(MemoService, {
  getMemo: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        const record = await db.memos.get(worldId)
        if (record === undefined || !isActive(record)) {
          return ''
        }
        return record.memo
      },
      catch: (e) => new Error(`Failed to get memo: ${e}`),
    }),

  setMemoAndSave: (worldId, memo) =>
    Effect.tryPromise({
      try: async () => {
        const existing = await db.memos.get(worldId)
        await db.memos.put({
          worldId,
          memo,
          // Whatever the user just typed wins over anything a merge had set
          // aside, so the note they are looking at is the one that is kept.
          conflictBackup: existing?.conflictBackup ?? null,
          ...(await touched()),
        })
      },
      catch: (e) => new Error(`Failed to save memo: ${e}`),
    }),

  searchMemoText: (searchText) =>
    Effect.tryPromise({
      try: async () => {
        const lower = searchText.toLowerCase()
        const matching = await db.memos
          .filter((m) => isActive(m) && m.memo.toLowerCase().includes(lower))
          .toArray()
        return matching.map((m) => m.worldId)
      },
      catch: (e) => new Error(`Failed to search memos: ${e}`),
    }),
})
