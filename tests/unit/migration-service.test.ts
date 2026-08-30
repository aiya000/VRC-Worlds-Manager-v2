import { describe, expect, it } from 'vitest'

import { parseV2MigrationData } from '@/lib/services/migration-service'

function v2World(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'wrld_1',
    name: 'Test World',
    imageUrl: 'https://example.com/image.png',
    authorName: 'Author',
    capacity: 16,
    tags: ['tag-a'],
    updatedAt: '2024-05-01T12:34:56.000Z',
    visits: 100,
    favorites: 5,
    platform: ['standalonewindows', 'android'],
    dateAdded: '2024-01-01T00:00:00.000Z',
    memo: '',
    hidden: false,
    customTags: [],
    ...overrides,
  }
}

describe('parseV2MigrationData', () => {
  it('parses VRC Worlds Manager v2 worlds and folders into app records', () => {
    const worldsText = JSON.stringify([
      v2World({
        id: 'wrld_1',
        memo: 'a memo',
        hidden: true,
        customTags: ['custom-tag'],
      }),
      v2World({ id: 'wrld_2', name: 'Second World' }),
    ])
    const foldersText = JSON.stringify([
      { name: 'Favorites', worlds: ['wrld_1', 'wrld_2'] },
      { name: 'Empty Folder', worlds: [] },
    ])

    const result = parseV2MigrationData(worldsText, foldersText)

    expect(result.worlds).toHaveLength(2)
    expect(result.folders).toEqual(['Favorites', 'Empty Folder'])

    const world1 = result.worlds.find((w) => w.worldId === 'wrld_1')
    expect(world1).toMatchObject({
      worldId: 'wrld_1',
      name: 'Test World',
      thumbnailUrl: 'https://example.com/image.png',
      authorName: 'Author',
      favorites: 5,
      lastUpdated: '2024-05-01',
      visits: 100,
      dateAdded: '2024-01-01T00:00:00.000Z',
      platform: ['standalonewindows', 'android'],
      folders: ['Favorites'],
      capacity: 16,
    })
    expect(world1?.tags).toEqual(
      expect.arrayContaining(['tag-a', 'custom-tag']),
    )

    expect(result.memos).toEqual([{ worldId: 'wrld_1', memo: 'a memo' }])
    expect(result.hiddenWorldIds).toEqual(['wrld_1'])
    expect(result.customTags).toEqual([
      { worldId: 'wrld_1', tags: ['custom-tag'] },
    ])
  })

  it('normalizes legacy platform aliases from older v2 data', () => {
    const worldsText = JSON.stringify([
      v2World({ id: 'wrld_1', platform: ['pc', 'quest', 'quest'] }),
    ])
    const foldersText = JSON.stringify([])

    const result = parseV2MigrationData(worldsText, foldersText)

    expect(result.worlds[0].platform).toEqual(['standalonewindows', 'android'])
  })

  it('defaults dateAdded when the field is missing', () => {
    const worldsText = JSON.stringify([v2World({ dateAdded: undefined })])
    const foldersText = JSON.stringify([])

    const result = parseV2MigrationData(worldsText, foldersText)

    expect(result.worlds[0].dateAdded).not.toBe('')
    expect(() =>
      new Date(result.worlds[0].dateAdded).toISOString(),
    ).not.toThrow()
  })

  it('rejects the old v1 desktop worlds.json shape with a clear error', () => {
    const v1WorldsText = JSON.stringify([
      {
        worldId: 'wrld_1',
        name: 'Old World',
        thumbnailUrl: 'https://example.com/image.png',
        authorName: 'Author',
        favorites: 5,
        lastUpdated: '2024-05-01',
        visits: 100,
        platform: ['standalonewindows'],
      },
    ])
    const foldersText = JSON.stringify([])

    expect(() => parseV2MigrationData(v1WorldsText, foldersText)).toThrow(
      /VRC Worlds Manager v2/,
    )
  })

  it('rejects a folders file missing the v2 "worlds" array field', () => {
    const worldsText = JSON.stringify([v2World()])
    const v1FoldersText = JSON.stringify({ Favorites: ['wrld_1'] })

    expect(() => parseV2MigrationData(worldsText, v1FoldersText)).toThrow()
  })

  it('rejects non-JSON input with a descriptive error', () => {
    expect(() => parseV2MigrationData('not json', '[]')).toThrow(
      /not valid JSON/,
    )
  })
})
