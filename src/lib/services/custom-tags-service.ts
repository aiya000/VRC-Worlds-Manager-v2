import { Context, Effect, Layer } from 'effect';
import { db } from './db';

export class CustomTagsService extends Context.Tag('CustomTagsService')<
  CustomTagsService,
  {
    readonly getCustomTags: (worldId: string) => Effect.Effect<string[], Error>;
    readonly setCustomTags: (
      worldId: string,
      tags: string[],
    ) => Effect.Effect<string[], Error>;
    readonly getTagsByCount: () => Effect.Effect<string[], Error>;
    readonly getAuthorsByCount: () => Effect.Effect<string[], Error>;
  }
>() {}

export const CustomTagsServiceLive = Layer.succeed(CustomTagsService, {
  getCustomTags: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        const record = await db.customTags.get(worldId);
        return record?.tags ?? [];
      },
      catch: (e) => new Error(`Failed to get custom tags: ${e}`),
    }),

  setCustomTags: (worldId, tags) =>
    Effect.tryPromise({
      try: async () => {
        await db.customTags.put({ worldId, tags });
        return tags;
      },
      catch: (e) => new Error(`Failed to set custom tags: ${e}`),
    }),

  getTagsByCount: () =>
    Effect.tryPromise({
      try: async () => {
        const allTags = await db.customTags.toArray();
        const tagCounts = new Map<string, number>();
        for (const record of allTags) {
          for (const tag of record.tags) {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
          }
        }
        return Array.from(tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([tag]) => tag);
      },
      catch: (e) => new Error(`Failed to get tags by count: ${e}`),
    }),

  getAuthorsByCount: () =>
    Effect.tryPromise({
      try: async () => {
        const allWorlds = await db.worlds.toArray();
        const authorCounts = new Map<string, number>();
        for (const world of allWorlds) {
          authorCounts.set(
            world.authorName,
            (authorCounts.get(world.authorName) ?? 0) + 1,
          );
        }
        return Array.from(authorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([author]) => author);
      },
      catch: (e) => new Error(`Failed to get authors by count: ${e}`),
    }),
});
