import { Context, Effect, Layer } from 'effect';
import type { BackupMetaData, WorldDisplayData, FolderData } from '@/lib/types';
import { db } from './db';

interface BackupData {
  metadata: BackupMetaData;
  worlds: WorldDisplayData[];
  folders: FolderData[];
  hiddenWorlds: string[];
  memos: Record<string, string>;
  customTags: Record<string, string[]>;
}

export class BackupService extends Context.Tag('BackupService')<
  BackupService,
  {
    readonly createBackup: () => Effect.Effect<void, Error>;
    readonly restoreFromBackup: (file: File) => Effect.Effect<void, Error>;
    readonly getBackupMetadataFromFile: (
      file: File,
    ) => Effect.Effect<BackupMetaData, Error>;
    readonly exportToPortalLibrarySystem: (
      folders: string[],
      sortField: string,
      sortDirection: string,
    ) => Effect.Effect<void, Error>;
  }
>() {}

export const BackupServiceLive = Layer.succeed(BackupService, {
  createBackup: () =>
    Effect.tryPromise({
      try: async () => {
        const worlds = await db.worlds.toArray();
        const folderRecords = await db.folders.orderBy('order').toArray();
        const hiddenWorlds = (await db.hiddenWorlds.toArray()).map(
          (h) => h.worldId,
        );
        const memoRecords = await db.memos.toArray();
        const tagRecords = await db.customTags.toArray();

        const memos: Record<string, string> = {};
        for (const m of memoRecords) {
          memos[m.worldId] = m.memo;
        }

        const customTags: Record<string, string[]> = {};
        for (const t of tagRecords) {
          customTags[t.worldId] = t.tags;
        }

        const foldersData: FolderData[] = [];
        for (const folder of folderRecords) {
          const count = worlds.filter((w) =>
            w.folders.includes(folder.name),
          ).length;
          foldersData.push({ name: folder.name, world_count: count });
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
          folders: w.folders,
          tags: w.tags,
          capacity: w.capacity,
        }));

        const backup: BackupData = {
          metadata: {
            date: new Date().toISOString(),
            number_of_folders: foldersData.length,
            number_of_worlds: worldDisplayData.length,
            app_version: '2.0.0',
          },
          worlds: worldDisplayData,
          folders: foldersData,
          hiddenWorlds,
          memos,
          customTags,
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vrcwm-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      catch: (e) => new Error(`Failed to create backup: ${e}`),
    }),

  restoreFromBackup: (file) =>
    Effect.tryPromise({
      try: async () => {
        const text = await file.text();
        const backup = JSON.parse(text) as BackupData;

        await db.transaction(
          'rw',
          [db.worlds, db.folders, db.hiddenWorlds, db.memos, db.customTags],
          async () => {
            await db.worlds.clear();
            await db.folders.clear();
            await db.hiddenWorlds.clear();
            await db.memos.clear();
            await db.customTags.clear();

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
                folders: world.folders,
                tags: world.tags,
                capacity: world.capacity,
              });
            }

            for (let i = 0; i < backup.folders.length; i++) {
              await db.folders.put({
                name: backup.folders[i].name,
                order: i,
              });
            }

            for (const worldId of backup.hiddenWorlds) {
              await db.hiddenWorlds.put({ worldId });
            }

            for (const [worldId, memo] of Object.entries(backup.memos)) {
              await db.memos.put({ worldId, memo });
            }

            for (const [worldId, tags] of Object.entries(backup.customTags)) {
              await db.customTags.put({ worldId, tags });
            }
          },
        );
      },
      catch: (e) => new Error(`Failed to restore backup: ${e}`),
    }),

  getBackupMetadataFromFile: (file) =>
    Effect.tryPromise({
      try: async () => {
        const text = await file.text();
        const backup = JSON.parse(text) as BackupData;
        return backup.metadata;
      },
      catch: (e) => new Error(`Failed to read backup metadata: ${e}`),
    }),

  exportToPortalLibrarySystem: (folders, sortField, sortDirection) =>
    Effect.tryPromise({
      try: async () => {
        const allWorlds = await db.worlds.toArray();

        const categories = [];
        for (const folderName of folders) {
          const worlds = allWorlds
            .filter((w) => w.folders.includes(folderName))
            .sort((a, b) => {
              const dir = sortDirection === 'asc' ? 1 : -1;
              switch (sortField) {
                case 'name':
                  return dir * a.name.localeCompare(b.name);
                case 'visits':
                  return dir * (a.visits - b.visits);
                default:
                  return (
                    dir *
                    (new Date(a.dateAdded).getTime() -
                      new Date(b.dateAdded).getTime())
                  );
              }
            });

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
          });
        }

        const plsData = { Categorys: categories };
        const blob = new Blob([JSON.stringify(plsData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pls-export.json';
        a.click();
        URL.revokeObjectURL(url);
      },
      catch: (e) => new Error(`Failed to export: ${e}`),
    }),
});
