import { afterEach, describe, expect, it, vi } from 'vitest'
import { Effect } from 'effect'
import {
  VRChatApiService,
  VRChatApiServiceLive,
} from '@/lib/services/vrchat-api'

// Safety: every test in this file mocks `global.fetch` and never lets a
// request escape to a real host. `purgeAllFavoriteWorlds` deletes real,
// irreversible data on a live VRChat account, so it must never be exercised
// against the real VRChat API in automated tests.

type Call = { url: string; method: string }

function runPurge(onProgress?: (done: number, total: number) => void) {
  return Effect.runPromise(
    Effect.provide(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.purgeAllFavoriteWorlds(onProgress)
      }),
      VRChatApiServiceLive,
    ),
  )
}

describe('VRChatApiService.purgeAllFavoriteWorlds', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes every favorite, reports progress, and never calls a real VRChat host', async () => {
    const favorites = [{ id: 'fav_0' }, { id: 'fav_1' }, { id: 'fav_2' }]
    const calls: Call[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        const method = init?.method ?? 'GET'
        calls.push({ url, method })

        if (method === 'GET') {
          return new Response(JSON.stringify(favorites), { status: 200 })
        }
        if (url.includes('fav_1')) {
          return new Response('server error', { status: 500 })
        }
        return new Response(null, { status: 200 })
      }),
    )

    const progressCalls: Array<[number, number]> = []
    const result = await runPurge((done, total) =>
      progressCalls.push([done, total]),
    )

    expect(result).toEqual({ deleted: 2, failed: 1 })
    expect(progressCalls[0]).toEqual([0, 3])
    expect(progressCalls.at(-1)).toEqual([3, 3])

    const deleteCalls = calls.filter((c) => c.method === 'DELETE')
    expect(deleteCalls).toHaveLength(3)
    expect(deleteCalls.map((c) => c.url).sort()).toEqual([
      expect.stringContaining('fav_0'),
      expect.stringContaining('fav_1'),
      expect.stringContaining('fav_2'),
    ])

    for (const call of calls) {
      expect(call.url).not.toMatch(/vrchat\.(com|cloud)/i)
    }
  })

  it('pages through favorites before deleting any of them', async () => {
    const pageOne = Array.from({ length: 100 }, (_, i) => ({ id: `p1_${i}` }))
    const pageTwo = [{ id: 'p2_0' }]
    const calls: Call[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        const method = init?.method ?? 'GET'
        calls.push({ url, method })

        if (method === 'GET') {
          const isSecondPage = url.includes('offset=100')
          return new Response(
            JSON.stringify(isSecondPage ? pageTwo : pageOne),
            { status: 200 },
          )
        }
        return new Response(null, { status: 200 })
      }),
    )

    const result = await runPurge()

    expect(result).toEqual({ deleted: 101, failed: 0 })
    const getCalls = calls.filter((c) => c.method === 'GET')
    expect(getCalls).toHaveLength(2)
    // All favorites must be collected before any DELETE is issued.
    const firstDeleteIndex = calls.findIndex((c) => c.method === 'DELETE')
    const lastGetIndex = calls.map((c) => c.method).lastIndexOf('GET')
    expect(firstDeleteIndex).toBeGreaterThan(lastGetIndex)
  })

  it('returns zero counts when there are no favorites to delete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
    )

    const progressCalls: Array<[number, number]> = []
    const result = await runPurge((done, total) =>
      progressCalls.push([done, total]),
    )

    expect(result).toEqual({ deleted: 0, failed: 0 })
    expect(progressCalls).toEqual([[0, 0]])
  })
})
