import Dexie, { type EntityTable } from 'dexie'
import type { Platform } from '@/lib/types'

export interface WorldRecord {
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

export interface WorldDetailRecord {
  worldId: string
  name: string
  thumbnailUrl: string
  authorName: string
  authorId: string
  favorites: number
  lastUpdated: string
  visits: number
  platform: Platform[]
  description: string
  tags: string[]
  capacity: number
  recommendedCapacity: number | null
  publicationDate: string | null
}

export interface FolderRecord {
  name: string
  order: number
}

export interface HiddenWorldRecord {
  worldId: string
}

export interface MemoRecord {
  worldId: string
  memo: string
}

export interface CustomTagRecord {
  worldId: string
  tags: string[]
}

export interface AuthStateRecord {
  key: string
  value: string
}

/**
 * The schema version this bundle knows how to open. A browser holding a newer
 * database -- because another tab, or a cached older bundle, has already been
 * upgraded -- cannot be served by this code at all: IndexedDB refuses to open a
 * store at a version below the one on disk. `StaleBundleNotice` checks for that
 * and asks for a reload rather than letting every query fail.
 */
export const APP_DB_VERSION = 1

export const APP_DB_NAME = 'VRChatWorldsManager'

/**
 * The version IndexedDB itself records, which is not `APP_DB_VERSION`: Dexie
 * multiplies its own schema version by ten, so `version(1)` is version 10 on
 * disk. `indexedDB.databases()` reports that number, so anything comparing
 * against it has to use this one.
 */
export const APP_IDB_VERSION = APP_DB_VERSION * 10

export class AppDatabase extends Dexie {
  worlds!: EntityTable<WorldRecord, 'worldId'>
  worldDetails!: EntityTable<WorldDetailRecord, 'worldId'>
  folders!: EntityTable<FolderRecord, 'name'>
  hiddenWorlds!: EntityTable<HiddenWorldRecord, 'worldId'>
  memos!: EntityTable<MemoRecord, 'worldId'>
  customTags!: EntityTable<CustomTagRecord, 'worldId'>
  authState!: EntityTable<AuthStateRecord, 'key'>

  constructor() {
    super(APP_DB_NAME)
    this.version(APP_DB_VERSION).stores({
      worlds:
        'worldId, name, authorName, favorites, lastUpdated, visits, dateAdded, capacity',
      worldDetails: 'worldId',
      folders: 'name, order',
      hiddenWorlds: 'worldId',
      memos: 'worldId',
      customTags: 'worldId',
      authState: 'key',
    })
  }
}

export const db = new AppDatabase()
