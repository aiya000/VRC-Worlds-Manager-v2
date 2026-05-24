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

export class AppDatabase extends Dexie {
  worlds!: EntityTable<WorldRecord, 'worldId'>
  worldDetails!: EntityTable<WorldDetailRecord, 'worldId'>
  folders!: EntityTable<FolderRecord, 'name'>
  hiddenWorlds!: EntityTable<HiddenWorldRecord, 'worldId'>
  memos!: EntityTable<MemoRecord, 'worldId'>
  customTags!: EntityTable<CustomTagRecord, 'worldId'>
  authState!: EntityTable<AuthStateRecord, 'key'>

  constructor() {
    super('VRChatWorldsManager')
    this.version(1).stores({
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
