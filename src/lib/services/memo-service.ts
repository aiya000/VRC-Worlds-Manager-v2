import { Context, Effect, Layer } from 'effect'
import { db } from './db'

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
        return record?.memo ?? ''
      },
      catch: (e) => new Error(`Failed to get memo: ${e}`),
    }),

  setMemoAndSave: (worldId, memo) =>
    Effect.tryPromise({
      try: async () => {
        await db.memos.put({ worldId, memo })
      },
      catch: (e) => new Error(`Failed to save memo: ${e}`),
    }),

  searchMemoText: (searchText) =>
    Effect.tryPromise({
      try: async () => {
        const lower = searchText.toLowerCase()
        const matching = await db.memos
          .filter((m) => m.memo.toLowerCase().includes(lower))
          .toArray()
        return matching.map((m) => m.worldId)
      },
      catch: (e) => new Error(`Failed to search memos: ${e}`),
    }),
})
