import { Context, Effect, Layer } from 'effect'
import { db, isActive } from './db'
import { memberTagNames, tagRefFor, touched, withoutMember } from './sync-meta'

export class CustomTagsService extends Context.Tag('CustomTagsService')<
  CustomTagsService,
  {
    readonly getCustomTags: (worldId: string) => Effect.Effect<string[], Error>
    readonly setCustomTags: (
      worldId: string,
      tags: string[],
    ) => Effect.Effect<string[], Error>
    readonly getTagsByCount: () => Effect.Effect<string[], Error>
    readonly getAuthorsByCount: () => Effect.Effect<string[], Error>
  }
>() {}

export const CustomTagsServiceLive = Layer.succeed(CustomTagsService, {
  getCustomTags: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        const record = await db.customTags.get(worldId)
        if (record === undefined || !isActive(record)) {
          return []
        }
        return memberTagNames(record.tagRefs)
      },
      catch: (e) => new Error(`Failed to get custom tags: ${e}`),
    }),

  setCustomTags: (worldId, tags) =>
    Effect.tryPromise({
      try: async () => {
        const existing = await db.customTags.get(worldId)
        const now = Date.now()
        const wanted = new Set(tags)

        // The caller hands over the whole list it wants, but it is stored as
        // per-tag additions and removals: a tag another device added while this
        // one was editing survives instead of being wiped by a stale list.
        let tagRefs = existing?.tagRefs ?? []
        for (const ref of tagRefs) {
          if (!wanted.has(ref.name)) {
            tagRefs = withoutMember(
              tagRefs,
              (candidate) => candidate.name === ref.name,
              now,
            )
          }
        }
        const known = new Set(tagRefs.map((ref) => ref.name))
        for (const name of tags) {
          if (known.has(name)) {
            tagRefs = tagRefs.map((ref) =>
              ref.name === name
                ? { ...ref, addedAt: now, removedAt: null }
                : ref,
            )
          } else {
            tagRefs = [...tagRefs, tagRefFor(name, now)]
          }
        }

        await db.customTags.put({ worldId, tagRefs, ...(await touched()) })
        return tags
      },
      catch: (e) => new Error(`Failed to set custom tags: ${e}`),
    }),

  getTagsByCount: () =>
    Effect.tryPromise({
      try: async () => {
        const records = (await db.customTags.toArray()).filter(isActive)
        const tagCounts = new Map<string, number>()
        for (const record of records) {
          for (const tag of memberTagNames(record.tagRefs)) {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
          }
        }
        return Array.from(tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([tag]) => tag)
      },
      catch: (e) => new Error(`Failed to get tags by count: ${e}`),
    }),

  getAuthorsByCount: () =>
    Effect.tryPromise({
      try: async () => {
        const allWorlds = (await db.worlds.toArray()).filter(isActive)
        const authorCounts = new Map<string, number>()
        for (const world of allWorlds) {
          authorCounts.set(
            world.authorName,
            (authorCounts.get(world.authorName) ?? 0) + 1,
          )
        }
        return Array.from(authorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([author]) => author)
      },
      catch: (e) => new Error(`Failed to get authors by count: ${e}`),
    }),
})
