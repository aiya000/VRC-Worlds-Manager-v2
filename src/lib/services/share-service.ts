import { Context, Effect, Layer } from 'effect';
import type { WorldDisplayData } from '@/lib/types';
import { db } from './db';

const SHARE_API_URL = 'https://data.raifaworks.com/api';

export class ShareService extends Context.Tag('ShareService')<
  ShareService,
  {
    readonly shareFolder: (folderName: string) => Effect.Effect<string, Error>;
    readonly updateFolderShare: (
      folderName: string,
    ) => Effect.Effect<string | null, Error>;
    readonly downloadFolder: (
      shareId: string,
    ) => Effect.Effect<[string, WorldDisplayData[]], Error>;
  }
>() {}

export const ShareServiceLive = Layer.succeed(ShareService, {
  shareFolder: (folderName) =>
    Effect.tryPromise({
      try: async () => {
        const worlds = await db.worlds
          .filter((w) => w.folders.includes(folderName))
          .toArray();

        const worldData = worlds.map((w) => ({
          worldId: w.worldId,
          name: w.name,
          thumbnailUrl: w.thumbnailUrl,
          authorName: w.authorName,
          platform: w.platform,
        }));

        const res = await fetch(`${SHARE_API_URL}/folders/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: folderName,
            worlds: worldData,
          }),
        });

        if (!res.ok) {
          throw new Error(`Share failed: ${res.status}`);
        }

        const data = (await res.json()) as { id: string };
        return data.id;
      },
      catch: (e) => new Error(`Failed to share folder: ${e}`),
    }),

  updateFolderShare: (folderName) =>
    Effect.tryPromise({
      try: async () => {
        const worlds = await db.worlds
          .filter((w) => w.folders.includes(folderName))
          .toArray();

        const worldData = worlds.map((w) => ({
          worldId: w.worldId,
          name: w.name,
          thumbnailUrl: w.thumbnailUrl,
          authorName: w.authorName,
          platform: w.platform,
        }));

        const res = await fetch(`${SHARE_API_URL}/folders/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: folderName,
            worlds: worldData,
          }),
        });

        if (!res.ok) {
          return null;
        }

        const data = (await res.json()) as { id: string };
        return data.id;
      },
      catch: (e) => new Error(`Failed to update folder share: ${e}`),
    }),

  downloadFolder: (shareId) =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(`${SHARE_API_URL}/folders/${shareId}`);
        if (!res.ok) {
          throw new Error(`Download failed: ${res.status}`);
        }

        const data = (await res.json()) as {
          name: string;
          worlds: WorldDisplayData[];
        };

        const hiddenWorldIds = (await db.hiddenWorlds.toArray()).map(
          (h) => h.worldId,
        );

        const folderName = data.name;
        const existing = await db.folders.get(folderName);
        if (!existing) {
          const maxOrder = await db.folders.orderBy('order').last();
          await db.folders.add({
            name: folderName,
            order: (maxOrder?.order ?? -1) + 1,
          });
        }

        const hiddenInImport: WorldDisplayData[] = [];
        for (const world of data.worlds) {
          const existingWorld = await db.worlds.get(world.worldId);
          if (!existingWorld) {
            await db.worlds.put({
              worldId: world.worldId,
              name: world.name,
              thumbnailUrl: world.thumbnailUrl,
              authorName: world.authorName,
              favorites: world.favorites ?? 0,
              lastUpdated: world.lastUpdated ?? new Date().toISOString(),
              visits: world.visits ?? 0,
              dateAdded: world.dateAdded ?? new Date().toISOString(),
              platform: world.platform ?? [],
              folders: [folderName],
              tags: world.tags ?? [],
              capacity: world.capacity ?? 0,
            });
          } else {
            if (!existingWorld.folders.includes(folderName)) {
              await db.worlds.update(world.worldId, {
                folders: [...existingWorld.folders, folderName],
              });
            }
          }

          if (hiddenWorldIds.includes(world.worldId)) {
            hiddenInImport.push(world);
          }
        }

        return [folderName, hiddenInImport] as [string, WorldDisplayData[]];
      },
      catch: (e) => new Error(`Failed to download folder: ${e}`),
    }),
});
