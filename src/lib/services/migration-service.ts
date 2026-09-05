import { Context, Effect, Layer } from 'effect'
import type { Platform, PreviousMetadata } from '@/lib/types'
import { db, FOLDER_ORDER_KEY, isActive } from './db'
import { deviceId, tagRefFor, touched } from './sync-meta'

/**
 * Entry of the desktop VRC Worlds Manager v2 `worlds.json`.
 * The v2 model flattens its API data and its user data into a single object.
 */
interface V2World {
  id: string
  name: string
  imageUrl: string
  authorName: string
  capacity: number
  tags: string[]
  updatedAt: string
  visits: number | null
  favorites: number
  platform: string[]
  dateAdded: string
  memo: string
  hidden: boolean
  customTags: string[]
}

/** Entry of the desktop VRC Worlds Manager v2 `folders.json`. */
interface V2Folder {
  name: string
  worlds: string[]
}

/**
 * What the desktop export contains, still described in folder names. Turning
 * those into folder ids is the service's job, not the parser's.
 */
export interface MigratedWorld {
  worldId: string
  name: string
  thumbnailUrl: string
  authorName: string
  favorites: number
  lastUpdated: string
  visits: number
  dateAdded: string
  platform: Platform[]
  folders: string[]
  tags: string[]
  capacity: number
}

export interface V2MigrationData {
  worlds: MigratedWorld[]
  folders: string[]
  memos: Array<{ worldId: string; memo: string }>
  hiddenWorldIds: string[]
  customTags: Array<{ worldId: string; tags: string[] }>
}

const platformAliases: Record<string, Platform> = {
  standalonewindows: 'standalonewindows',
  pc: 'standalonewindows',
  android: 'android',
  quest: 'android',
  ios: 'ios',
  unknownplatform: 'unknownplatform',
}

function parseJsonArray(text: string, fileLabel: string): unknown[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    throw new Error(`${fileLabel} is not valid JSON: ${e}`)
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      `${fileLabel} is not a VRC Worlds Manager v2 data file: expected a JSON array`,
    )
  }
  return parsed
}

function asRecord(value: unknown, fileLabel: string, index: number) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fileLabel}: entry #${index + 1} is not an object`)
  }
  return value as Record<string, unknown>
}

function requireString(
  entry: Record<string, unknown>,
  key: string,
  fileLabel: string,
  index: number,
): string {
  const value = entry[key]
  if (typeof value !== 'string') {
    throw new Error(
      `${fileLabel}: entry #${index + 1} is missing the "${key}" string field. ` +
        `Make sure the file comes from VRC Worlds Manager v2.`,
    )
  }
  return value
}

function optionalString(entry: Record<string, unknown>, key: string): string {
  const value = entry[key]
  return typeof value === 'string' ? value : ''
}

function optionalNumber(
  entry: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = entry[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function optionalStringArray(
  entry: Record<string, unknown>,
  key: string,
): string[] {
  const value = entry[key]
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function normalizePlatforms(rawPlatforms: string[]): Platform[] {
  const normalized: Platform[] = []
  for (const raw of rawPlatforms) {
    const platform = platformAliases[raw.toLowerCase()] ?? 'unknownplatform'
    if (!normalized.includes(platform)) {
      normalized.push(platform)
    }
  }
  return normalized
}

function mergeTags(tags: string[], customTags: string[]): string[] {
  const merged = [...tags]
  for (const tag of customTags) {
    if (!merged.includes(tag)) {
      merged.push(tag)
    }
  }
  return merged
}

function parseV2Folders(foldersText: string): V2Folder[] {
  const fileLabel = 'The folders file'
  return parseJsonArray(foldersText, fileLabel).map((value, index) => {
    const entry = asRecord(value, fileLabel, index)
    const worlds = entry['worlds']
    if (!Array.isArray(worlds)) {
      throw new Error(
        `${fileLabel}: entry #${index + 1} is missing the "worlds" array field. ` +
          `Make sure the file comes from VRC Worlds Manager v2.`,
      )
    }
    return {
      name: requireString(entry, 'name', fileLabel, index),
      worlds: worlds.filter((id): id is string => typeof id === 'string'),
    }
  })
}

function parseV2Worlds(worldsText: string): V2World[] {
  const fileLabel = 'The worlds file'
  return parseJsonArray(worldsText, fileLabel).map((value, index) => {
    const entry = asRecord(value, fileLabel, index)
    return {
      id: requireString(entry, 'id', fileLabel, index),
      name: requireString(entry, 'name', fileLabel, index),
      imageUrl: optionalString(entry, 'imageUrl'),
      authorName: optionalString(entry, 'authorName'),
      capacity: optionalNumber(entry, 'capacity', 0),
      tags: optionalStringArray(entry, 'tags'),
      updatedAt: optionalString(entry, 'updatedAt'),
      visits: optionalNumber(entry, 'visits', 0),
      favorites: optionalNumber(entry, 'favorites', 0),
      platform: optionalStringArray(entry, 'platform'),
      dateAdded: optionalString(entry, 'dateAdded'),
      memo: optionalString(entry, 'memo'),
      hidden: entry['hidden'] === true,
      customTags: optionalStringArray(entry, 'customTags'),
    }
  })
}

/**
 * Converts the desktop v2 `worlds.json` / `folders.json` pair into the records
 * this app stores. Kept pure so it can be exercised without IndexedDB.
 */
export function parseV2MigrationData(
  worldsText: string,
  foldersText: string,
): V2MigrationData {
  const v2Folders = parseV2Folders(foldersText)
  const v2Worlds = parseV2Worlds(worldsText)

  const worldIdToFolderNames = new Map<string, string[]>()
  for (const folder of v2Folders) {
    for (const worldId of folder.worlds) {
      const folderNames = worldIdToFolderNames.get(worldId) ?? []
      if (!folderNames.includes(folder.name)) {
        folderNames.push(folder.name)
      }
      worldIdToFolderNames.set(worldId, folderNames)
    }
  }

  const worlds: MigratedWorld[] = []
  const memos: Array<{ worldId: string; memo: string }> = []
  const hiddenWorldIds: string[] = []
  const customTags: Array<{ worldId: string; tags: string[] }> = []

  for (const world of v2Worlds) {
    worlds.push({
      worldId: world.id,
      name: world.name,
      thumbnailUrl: world.imageUrl,
      authorName: world.authorName,
      favorites: world.favorites,
      // v2 stores an RFC 3339 timestamp, the app displays a plain date.
      lastUpdated: world.updatedAt.slice(0, 10),
      visits: world.visits ?? 0,
      dateAdded:
        world.dateAdded === '' ? new Date().toISOString() : world.dateAdded,
      platform: normalizePlatforms(world.platform),
      folders: worldIdToFolderNames.get(world.id) ?? [],
      tags: mergeTags(world.tags, world.customTags),
      capacity: world.capacity,
    })

    if (world.memo !== '') {
      memos.push({ worldId: world.id, memo: world.memo })
    }
    if (world.hidden) {
      hiddenWorldIds.push(world.id)
    }
    if (world.customTags.length > 0) {
      customTags.push({ worldId: world.id, tags: world.customTags })
    }
  }

  return {
    worlds,
    folders: v2Folders.map((folder) => folder.name),
    memos,
    hiddenWorldIds,
    customTags,
  }
}

export class MigrationService extends Context.Tag('MigrationService')<
  MigrationService,
  {
    readonly getMigrationMetadata: (
      worldsFile: File,
      foldersFile: File,
    ) => Effect.Effect<PreviousMetadata, Error>
    readonly migrateData: (
      worldsFile: File,
      foldersFile: File,
    ) => Effect.Effect<void, Error>
  }
>() {}

export const MigrationServiceLive = Layer.succeed(MigrationService, {
  getMigrationMetadata: (worldsFile, foldersFile) =>
    Effect.tryPromise({
      try: async () => {
        const data = parseV2MigrationData(
          await worldsFile.text(),
          await foldersFile.text(),
        )
        return {
          number_of_worlds: data.worlds.length,
          number_of_folders: data.folders.length,
        }
      },
      catch: (e) => new Error(`Failed to read migration files: ${e}`),
    }),

  migrateData: (worldsFile, foldersFile) =>
    Effect.tryPromise({
      try: async () => {
        const data = parseV2MigrationData(
          await worldsFile.text(),
          await foldersFile.text(),
        )

        const meta = await touched()
        const now = Date.now()
        const origin = await deviceId()

        await db.transaction(
          'rw',
          [
            db.worlds,
            db.foldersById,
            db.folderOrder,
            db.hiddenWorlds,
            db.memos,
            db.customTags,
          ],
          async () => {
            const folderIdByName = new Map(
              (await db.foldersById.toArray())
                .filter(isActive)
                .map((folder) => [folder.name, folder.id] as const),
            )

            for (const name of data.folders) {
              if (folderIdByName.has(name)) {
                continue
              }
              const id = crypto.randomUUID()
              folderIdByName.set(name, id)
              await db.foldersById.put({ id, name, ...meta })
            }

            const order = await db.folderOrder.get(FOLDER_ORDER_KEY)
            const ids = [...(order?.ids ?? [])]
            for (const name of data.folders) {
              const id = folderIdByName.get(name) as string
              if (!ids.includes(id)) {
                ids.push(id)
              }
            }
            await db.folderOrder.put({
              key: FOLDER_ORDER_KEY,
              ids,
              updatedAt: now,
              origin,
            })

            for (const world of data.worlds) {
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
                folderRefs: world.folders.map((name) => ({
                  folderId: folderIdByName.get(name) as string,
                  addedAt: now,
                  removedAt: null,
                })),
                tags: world.tags,
                capacity: world.capacity,
                ...meta,
              })
            }

            for (const memo of data.memos) {
              await db.memos.put({ ...memo, conflictBackup: null, ...meta })
            }
            for (const record of data.customTags) {
              await db.customTags.put({
                worldId: record.worldId,
                tagRefs: record.tags.map((name) => tagRefFor(name, now)),
                ...meta,
              })
            }
            for (const worldId of data.hiddenWorldIds) {
              await db.hiddenWorlds.put({ worldId, ...meta })
            }
          },
        )
      },
      catch: (e) => new Error(`Failed to migrate data: ${e}`),
    }),
})
