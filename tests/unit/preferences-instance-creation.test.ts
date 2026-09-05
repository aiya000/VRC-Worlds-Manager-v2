import { Context, Effect } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  PreferencesService,
  PreferencesServiceLive,
} from '@/lib/services/preferences'
import type { InstanceRegion } from '@/lib/types'
import type { InstanceType } from '@/types/instances'

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

type Preferences = Context.Tag.Service<typeof PreferencesService>

function run<A>(effect: (service: Preferences) => Effect.Effect<A>) {
  return Effect.runSync(
    Effect.provide(
      Effect.gen(function* () {
        const service = yield* PreferencesService
        return yield* effect(service)
      }),
      PreferencesServiceLive,
    ),
  )
}

const getInstanceType = () => run((service) => service.getInstanceType())
const setInstanceType = (instanceType: InstanceType) =>
  run((service) => service.setInstanceType(instanceType))
const getRegion = () => run((service) => service.getRegion())
const setRegion = (region: InstanceRegion) =>
  run((service) => service.setRegion(region))

describe('instance creation preferences', () => {
  let stored: Map<string, string>

  beforeEach(() => {
    stored = installFakeStorage()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window')
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('starts on public until an instance type is stored', () => {
    expect(getInstanceType()).toBe('public')
  })

  it('reads back the instance type that was saved', () => {
    setInstanceType('friends+')

    expect(getInstanceType()).toBe('friends+')
    expect(stored.get('instanceType')).toBe(JSON.stringify('friends+'))
  })

  it('remembers group, which is the entry to the group creator', () => {
    setInstanceType('group')

    expect(getInstanceType()).toBe('group')
  })

  it('keeps the instance type and the region apart', () => {
    setInstanceType('invite')
    setRegion('jp')

    expect(getInstanceType()).toBe('invite')
    expect(getRegion()).toBe('jp')

    setInstanceType('friends')

    expect(getRegion()).toBe('jp')
  })
})
