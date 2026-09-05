import { describe, expect, it } from 'vitest'
import {
  fromLegacyBackup,
  isLegacyBackup,
  type LegacyBackup,
} from '@/lib/sync/legacy-backup'
import { emptySnapshot, isMember, mergeSnapshot } from '@/lib/sync/merge'
import { SEED_TIMESTAMP, type Snapshot } from '@/lib/sync/types'

const DEVICE = 'device-phone'

/** Deterministic ids, so a test can name the folder it is talking about. */
function sequentialIds(): () => string {
  let next = 0
  return () => `restored-${next++}`
}

function legacyBackup(parts: Partial<LegacyBackup> = {}): LegacyBackup {
  return {
    metadata: {
      date: '2025-03-01T00:00:00.000Z',
      number_of_folders: 0,
      number_of_worlds: 0,
      app_version: '2.0.0',
    },
    worlds: [],
    folders: [],
    hiddenWorlds: [],
    memos: {},
    customTags: {},
    ...parts,
  }
}

function legacyWorld(
  worldId: string,
  folders: string[] = [],
): LegacyBackup['worlds'][number] {
  return {
    worldId,
    name: `World ${worldId}`,
    thumbnailUrl: 'https://example.invalid/thumb.png',
    authorName: 'someone',
    favorites: 1,
    lastUpdated: '2025-02-01T00:00:00.000Z',
    visits: 2,
    dateAdded: '2025-02-01T00:00:00.000Z',
    platform: ['standalonewindows'],
    folders,
    tags: [],
    capacity: 16,
  }
}

/** The state of a device that has been using the app since the backup was taken. */
function currentState(): Snapshot {
  return {
    ...emptySnapshot(DEVICE),
    folders: [
      {
        id: 'f-sight',
        name: '観光',
        updatedAt: SEED_TIMESTAMP,
        deletedAt: null,
        origin: '',
      },
      {
        id: 'f-new',
        name: '今日作ったフォルダ',
        updatedAt: 5_000,
        deletedAt: null,
        origin: DEVICE,
      },
    ],
    folderOrder: {
      ids: ['f-sight', 'f-new'],
      updatedAt: 5_000,
      origin: DEVICE,
    },
    worlds: [
      {
        worldId: 'wrld_kept',
        dateAdded: '2025-02-01T00:00:00.000Z',
        folderRefs: [
          { folderId: 'f-sight', addedAt: SEED_TIMESTAMP, removedAt: null },
          { folderId: 'f-new', addedAt: 5_000, removedAt: null },
        ],
        seed: null,
        updatedAt: 5_000,
        deletedAt: null,
        origin: DEVICE,
      },
    ],
    memos: [
      {
        worldId: 'wrld_kept',
        memo: '今日書いたメモ',
        conflictBackup: null,
        updatedAt: 5_000,
        deletedAt: null,
        origin: DEVICE,
      },
    ],
  }
}

describe('isLegacyBackup', () => {
  it('recognises a backup written before the sync format existed', () => {
    expect(isLegacyBackup(legacyBackup())).toBe(true)
  })

  it('does not mistake a sync snapshot for one', () => {
    expect(isLegacyBackup(emptySnapshot(DEVICE))).toBe(false)
  })

  it('rejects anything that is not a backup at all', () => {
    expect(isLegacyBackup(null)).toBe(false)
    expect(isLegacyBackup('{}')).toBe(false)
    expect(isLegacyBackup({ worlds: 'nope' })).toBe(false)
  })
})

describe('fromLegacyBackup', () => {
  it('marks every row as having no known timestamp', () => {
    const snapshot = fromLegacyBackup(
      legacyBackup({
        worlds: [legacyWorld('wrld_a', ['観光'])],
        folders: [{ name: '観光', world_count: 1 }],
        memos: { wrld_a: 'メモ' },
        hiddenWorlds: ['wrld_b'],
        customTags: { wrld_a: ['静か'] },
      }),
      { deviceId: DEVICE, newId: sequentialIds() },
    )

    const stamps = [
      ...snapshot.worlds,
      ...snapshot.folders,
      ...snapshot.memos,
      ...snapshot.hiddenWorlds,
      ...snapshot.customTags,
    ].map((row) => row.updatedAt)

    expect(stamps).not.toHaveLength(0)
    expect(stamps.every((stamp) => stamp === SEED_TIMESTAMP)).toBe(true)
  })

  it('recovers a folder that only a world remembered being in', () => {
    const snapshot = fromLegacyBackup(
      legacyBackup({ worlds: [legacyWorld('wrld_a', ['迷子のフォルダ'])] }),
      { deviceId: DEVICE, newId: sequentialIds() },
    )

    expect(snapshot.folders.map((f) => f.name)).toEqual(['迷子のフォルダ'])
    expect(snapshot.worlds[0].folderRefs).toHaveLength(1)
  })

  it('carries what VRChat said about each world, so a fresh device can draw it', () => {
    const snapshot = fromLegacyBackup(
      legacyBackup({ worlds: [legacyWorld('wrld_a')] }),
      { deviceId: DEVICE, newId: sequentialIds() },
    )

    expect(snapshot.worlds[0].seed?.name).toBe('World wrld_a')
  })
})

describe('restoring an old backup (#78)', () => {
  const backup = legacyBackup({
    folders: [{ name: '観光', world_count: 2 }],
    worlds: [
      legacyWorld('wrld_kept', ['観光']),
      legacyWorld('wrld_gone', ['観光']),
    ],
    memos: { wrld_kept: '' },
  })

  function restore() {
    return mergeSnapshot(
      currentState(),
      fromLegacyBackup(backup, { deviceId: DEVICE, newId: sequentialIds() }),
    )
  }

  it('adds back a world this device no longer has any record of', () => {
    const { snapshot } = restore()

    expect(
      snapshot.worlds
        .filter((w) => w.deletedAt === null)
        .map((w) => w.worldId)
        .sort(),
    ).toEqual(['wrld_gone', 'wrld_kept'])
  })

  it('does not resurrect a world the user deleted after the backup was taken', () => {
    const withTombstone = currentState()
    withTombstone.worlds.push({
      worldId: 'wrld_gone',
      dateAdded: '2025-02-01T00:00:00.000Z',
      folderRefs: [],
      seed: null,
      updatedAt: 6_000,
      deletedAt: 6_000,
      origin: DEVICE,
    })

    const { snapshot } = mergeSnapshot(
      withTombstone,
      fromLegacyBackup(backup, { deviceId: DEVICE, newId: sequentialIds() }),
    )

    const gone = snapshot.worlds.find((w) => w.worldId === 'wrld_gone')
    expect(gone?.deletedAt).toBe(6_000)
  })

  it('does not take away a folder created after the backup was made', () => {
    const { snapshot } = restore()

    expect(
      snapshot.folders
        .filter((f) => f.deletedAt === null)
        .map((f) => f.name)
        .sort(),
    ).toEqual(['今日作ったフォルダ', '観光'])
  })

  it('leaves the world in both the old folder and the new one', () => {
    const { snapshot } = restore()

    const kept = snapshot.worlds.find((w) => w.worldId === 'wrld_kept')
    expect(
      kept?.folderRefs
        .filter(isMember)
        .map((r) => r.folderId)
        .sort(),
    ).toEqual(['f-new', 'f-sight'])
  })

  it('folds the backup 観光 into the existing 観光 rather than making a second one', () => {
    const { snapshot, folderIdRemapping } = restore()

    expect(Object.values(folderIdRemapping)).toEqual(['f-sight'])
    expect(snapshot.folders.filter((f) => f.name === '観光')).toHaveLength(1)
  })

  it('does not overwrite a memo written after the backup with the backup blank', () => {
    const { snapshot, memoConflicts } = restore()

    expect(snapshot.memos[0].memo).toBe('今日書いたメモ')
    expect(memoConflicts).toEqual([])
  })

  it('restoring the same backup twice changes nothing the second time', () => {
    const once = restore().snapshot
    const twice = mergeSnapshot(
      once,
      fromLegacyBackup(backup, { deviceId: DEVICE, newId: sequentialIds() }),
    ).snapshot

    const shape = (snapshot: Snapshot) => ({
      worlds: snapshot.worlds.map((w) => ({
        worldId: w.worldId,
        deletedAt: w.deletedAt,
        folders: w.folderRefs
          .filter(isMember)
          .map((r) => r.folderId)
          .sort(),
      })),
      folders: snapshot.folders.map((f) => f.name).sort(),
      memos: snapshot.memos.map((m) => m.memo),
    })

    expect(shape(twice)).toEqual(shape(once))
  })
})
