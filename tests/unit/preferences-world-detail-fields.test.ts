import { Effect } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  PreferencesService,
  PreferencesServiceLive,
} from '@/lib/services/preferences'
import type { WorldDetailFieldVisibility } from '@/lib/types'

/**
 * The preferences service reads `window` and `localStorage` straight off the
 * global scope, and the unit tests run under node, so stand both up here.
 */
function installFakeStorage() {
  const entries = new Map<string, string>()
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    clear: () => {
      entries.clear()
    },
  }
  Object.assign(globalThis, { window: {}, localStorage: storage })
  return entries
}

function removeFakeStorage() {
  Reflect.deleteProperty(globalThis, 'window')
  Reflect.deleteProperty(globalThis, 'localStorage')
}

const get = () =>
  Effect.runSync(
    Effect.provide(
      Effect.gen(function* () {
        const service = yield* PreferencesService
        return yield* service.getWorldDetailFieldVisibility()
      }),
      PreferencesServiceLive,
    ),
  )

const set = (visibility: WorldDetailFieldVisibility) =>
  Effect.runSync(
    Effect.provide(
      Effect.gen(function* () {
        const service = yield* PreferencesService
        yield* service.setWorldDetailFieldVisibility(visibility)
      }),
      PreferencesServiceLive,
    ),
  )

describe('world detail field visibility', () => {
  let stored: Map<string, string>

  beforeEach(() => {
    stored = installFakeStorage()
  })

  afterEach(() => {
    removeFakeStorage()
  })

  it('shows every field until something is stored', () => {
    expect(get()).toEqual({
      visits: true,
      favorites: true,
      capacity: true,
      published: true,
      lastUpdated: true,
    })
  })

  it('reads back what was saved', () => {
    const visibility: WorldDetailFieldVisibility = {
      visits: false,
      favorites: false,
      capacity: true,
      published: false,
      lastUpdated: true,
    }

    set(visibility)

    expect(get()).toEqual(visibility)
    expect(stored.get('worldDetailFieldVisibility')).toBe(
      JSON.stringify(visibility),
    )
  })

  it('keeps the world card fields as a separate setting', () => {
    set({
      visits: false,
      favorites: false,
      capacity: false,
      published: false,
      lastUpdated: false,
    })

    const cardVisibility = Effect.runSync(
      Effect.provide(
        Effect.gen(function* () {
          const service = yield* PreferencesService
          return yield* service.getWorldCardFieldVisibility()
        }),
        PreferencesServiceLive,
      ),
    )

    expect(cardVisibility).toEqual({
      name: true,
      authorName: true,
      visits: true,
      lastUpdated: true,
      favorites: true,
    })
  })
})
