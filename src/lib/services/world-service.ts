import { Context, Effect, Layer } from 'effect';
import type { WorldDisplayData, WorldDetails } from '@/lib/types';
import { db } from './db';

export class WorldService extends Context.Tag('WorldService')<
  WorldService,
  {
    readonly getAllWorlds: () => Effect.Effect<WorldDisplayData[], Error>;
    readonly getWorlds: (
      folderName: string,
    ) => Effect.Effect<WorldDisplayData[], Error>;
    readonly getUnclassifiedWorlds: () => Effect.Effect<
      WorldDisplayData[],
      Error
    >;
    readonly getHiddenWorlds: () => Effect.Effect<WorldDisplayData[], Error>;
    readonly deleteWorld: (worldId: string) => Effect.Effect<void, Error>;
    readonly hideWorld: (worldId: string) => Effect.Effect<void, Error>;
    readonly unhideWorld: (worldId: string) => Effect.Effect<void, Error>;
    readonly addWorldToFolder: (
      folderName: string,
      worldId: string,
    ) => Effect.Effect<void, Error>;
    readonly removeWorldFromFolder: (
      folderName: string,
      worldId: string,
    ) => Effect.Effect<void, Error>;
    readonly getWorld: (
      worldId: string,
      dontSaveToLocal: boolean | null,
    ) => Effect.Effect<WorldDetails, Error>;
    readonly putWorld: (world: WorldDisplayData) => Effect.Effect<void, Error>;
    readonly sortWorldsDisplay: (
      worlds: WorldDisplayData[],
      sortField: string,
      sortDirection: string,
    ) => Effect.Effect<WorldDisplayData[]>;
  }
>() {}

function toDisplayData(record: WorldDisplayData): WorldDisplayData {
  return {
    worldId: record.worldId,
    name: record.name,
    thumbnailUrl: record.thumbnailUrl,
    authorName: record.authorName,
    favorites: record.favorites,
    lastUpdated: record.lastUpdated,
    visits: record.visits,
    dateAdded: record.dateAdded,
    platform: record.platform,
    folders: record.folders,
    tags: record.tags,
    capacity: record.capacity,
  };
}

export const WorldServiceLive = Layer.succeed(WorldService, {
  getAllWorlds: () =>
    Effect.tryPromise({
      try: async () => {
        const hidden = new Set(
          (await db.hiddenWorlds.toArray()).map((h) => h.worldId),
        );
        const worlds = await db.worlds.toArray();
        return worlds.filter((w) => !hidden.has(w.worldId)).map(toDisplayData);
      },
      catch: (e) => new Error(`Failed to get all worlds: ${e}`),
    }),

  getWorlds: (folderName) =>
    Effect.tryPromise({
      try: async () => {
        const hidden = new Set(
          (await db.hiddenWorlds.toArray()).map((h) => h.worldId),
        );
        const worlds = await db.worlds
          .filter(
            (w) => w.folders.includes(folderName) && !hidden.has(w.worldId),
          )
          .toArray();
        return worlds.map(toDisplayData);
      },
      catch: (e) => new Error(`Failed to get worlds: ${e}`),
    }),

  getUnclassifiedWorlds: () =>
    Effect.tryPromise({
      try: async () => {
        const hidden = new Set(
          (await db.hiddenWorlds.toArray()).map((h) => h.worldId),
        );
        const worlds = await db.worlds
          .filter((w) => w.folders.length === 0 && !hidden.has(w.worldId))
          .toArray();
        return worlds.map(toDisplayData);
      },
      catch: (e) => new Error(`Failed to get unclassified worlds: ${e}`),
    }),

  getHiddenWorlds: () =>
    Effect.tryPromise({
      try: async () => {
        const hiddenIds = (await db.hiddenWorlds.toArray()).map(
          (h) => h.worldId,
        );
        const worlds = await db.worlds
          .filter((w) => hiddenIds.includes(w.worldId))
          .toArray();
        return worlds.map(toDisplayData);
      },
      catch: (e) => new Error(`Failed to get hidden worlds: ${e}`),
    }),

  deleteWorld: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        await db.worlds.delete(worldId);
        await db.worldDetails.delete(worldId);
        await db.memos.delete(worldId);
        await db.customTags.delete(worldId);
        await db.hiddenWorlds.delete(worldId);
      },
      catch: (e) => new Error(`Failed to delete world: ${e}`),
    }),

  hideWorld: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        await db.hiddenWorlds.put({ worldId });
      },
      catch: (e) => new Error(`Failed to hide world: ${e}`),
    }),

  unhideWorld: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        await db.hiddenWorlds.delete(worldId);
      },
      catch: (e) => new Error(`Failed to unhide world: ${e}`),
    }),

  addWorldToFolder: (folderName, worldId) =>
    Effect.tryPromise({
      try: async () => {
        const world = await db.worlds.get(worldId);
        if (world && !world.folders.includes(folderName)) {
          await db.worlds.update(worldId, {
            folders: [...world.folders, folderName],
          });
        }
      },
      catch: (e) => new Error(`Failed to add world to folder: ${e}`),
    }),

  removeWorldFromFolder: (folderName, worldId) =>
    Effect.tryPromise({
      try: async () => {
        const world = await db.worlds.get(worldId);
        if (world) {
          await db.worlds.update(worldId, {
            folders: world.folders.filter((f) => f !== folderName),
          });
        }
      },
      catch: (e) => new Error(`Failed to remove world from folder: ${e}`),
    }),

  getWorld: (worldId, _dontSaveToLocal) =>
    Effect.tryPromise({
      try: async () => {
        const detail = await db.worldDetails.get(worldId);
        if (detail) {
          return detail as WorldDetails;
        }
        throw new Error(`World ${worldId} not found locally`);
      },
      catch: (e) => new Error(`Failed to get world: ${e}`),
    }),

  putWorld: (world) =>
    Effect.tryPromise({
      try: async () => {
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
          folders: world.folders,
          tags: world.tags,
          capacity: world.capacity,
        });
      },
      catch: (e) => new Error(`Failed to put world: ${e}`),
    }),

  sortWorldsDisplay: (worlds, sortField, sortDirection) =>
    Effect.succeed(
      [...worlds].sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        switch (sortField) {
          case 'name':
            return dir * a.name.localeCompare(b.name);
          case 'visits':
            return dir * (a.visits - b.visits);
          case 'favorites':
            return dir * (a.favorites - b.favorites);
          case 'capacity':
            return dir * (a.capacity - b.capacity);
          case 'lastUpdated':
            return (
              dir *
              (new Date(a.lastUpdated).getTime() -
                new Date(b.lastUpdated).getTime())
            );
          case 'dateAdded':
          default:
            return (
              dir *
              (new Date(a.dateAdded).getTime() -
                new Date(b.dateAdded).getTime())
            );
        }
      }),
    ),
});
