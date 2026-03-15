import { Context, Effect, Layer } from 'effect';
import type { PreviousMetadata, WorldDisplayData } from '@/lib/types';
import { db } from './db';

interface OldWorldData {
  worldId: string;
  name: string;
  thumbnailUrl: string;
  authorName: string;
  favorites: number;
  lastUpdated: string;
  visits: number;
  dateAdded?: string;
  platform: string[];
  tags?: string[];
  capacity?: number;
}

interface OldFolderData {
  [folderName: string]: string[];
}

export class MigrationService extends Context.Tag('MigrationService')<
  MigrationService,
  {
    readonly getMigrationMetadata: (
      worldsFile: File,
      foldersFile: File,
    ) => Effect.Effect<PreviousMetadata, Error>;
    readonly migrateOldData: (
      worldsFile: File,
      foldersFile: File,
    ) => Effect.Effect<void, Error>;
  }
>() {}

export const MigrationServiceLive = Layer.succeed(MigrationService, {
  getMigrationMetadata: (worldsFile, foldersFile) =>
    Effect.tryPromise({
      try: async () => {
        const worldsText = await worldsFile.text();
        const foldersText = await foldersFile.text();
        const worlds = JSON.parse(worldsText) as OldWorldData[];
        const folders = JSON.parse(foldersText) as OldFolderData;
        return {
          number_of_worlds: worlds.length,
          number_of_folders: Object.keys(folders).length,
        };
      },
      catch: (e) => new Error(`Failed to read migration files: ${e}`),
    }),

  migrateOldData: (worldsFile, foldersFile) =>
    Effect.tryPromise({
      try: async () => {
        const worldsText = await worldsFile.text();
        const foldersText = await foldersFile.text();
        const oldWorlds = JSON.parse(worldsText) as OldWorldData[];
        const oldFolders = JSON.parse(foldersText) as OldFolderData;

        const folderToWorlds = new Map<string, string[]>();
        for (const [folderName, worldIds] of Object.entries(oldFolders)) {
          folderToWorlds.set(folderName, worldIds);
        }

        const worldFolderMap = new Map<string, string[]>();
        for (const [folderName, worldIds] of folderToWorlds) {
          for (const worldId of worldIds) {
            const existing = worldFolderMap.get(worldId) ?? [];
            existing.push(folderName);
            worldFolderMap.set(worldId, existing);
          }
        }

        await db.transaction(
          'rw',
          [db.worlds, db.folders],
          async () => {
            let folderOrder = 0;
            for (const folderName of Object.keys(oldFolders)) {
              await db.folders.put({
                name: folderName,
                order: folderOrder++,
              });
            }

            for (const world of oldWorlds) {
              const displayData: WorldDisplayData = {
                worldId: world.worldId,
                name: world.name,
                thumbnailUrl: world.thumbnailUrl,
                authorName: world.authorName,
                favorites: world.favorites,
                lastUpdated: world.lastUpdated,
                visits: world.visits,
                dateAdded: world.dateAdded ?? new Date().toISOString(),
                platform: world.platform as WorldDisplayData['platform'],
                folders: worldFolderMap.get(world.worldId) ?? [],
                tags: world.tags ?? [],
                capacity: world.capacity ?? 0,
              };

              await db.worlds.put({
                worldId: displayData.worldId,
                name: displayData.name,
                thumbnailUrl: displayData.thumbnailUrl,
                authorName: displayData.authorName,
                favorites: displayData.favorites,
                lastUpdated: displayData.lastUpdated,
                visits: displayData.visits,
                dateAdded: displayData.dateAdded,
                platform: displayData.platform,
                folders: displayData.folders,
                tags: displayData.tags,
                capacity: displayData.capacity,
              });
            }
          },
        );
      },
      catch: (e) => new Error(`Failed to migrate data: ${e}`),
    }),
});
