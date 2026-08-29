import { afterEach, describe, expect, it, vi } from 'vitest'
import { Effect } from 'effect'
import {
  VRChatApiService,
  VRChatApiServiceLive,
} from '@/lib/services/vrchat-api'

type Call = { url: string; method: string }

function runGetFavoriteWorldIds() {
  return Effect.runPromise(
    Effect.provide(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.getFavoriteWorldIds()
      }),
      VRChatApiServiceLive,
    ),
  )
}

describe('VRChatApiService.getFavoriteWorldIds', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the favoriteId (world ID) of every favorite', async () => {
    const favorites = [
      { id: 'fav_0', favoriteId: 'wrld_0' },
      { id: 'fav_1', favoriteId: 'wrld_1' },
    ]
    const calls: Call[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        calls.push({ url, method: init?.method ?? 'GET' })
        return new Response(JSON.stringify(favorites), { status: 200 })
      }),
    )

    const result = await runGetFavoriteWorldIds()

    expect(result).toEqual(['wrld_0', 'wrld_1'])
    for (const call of calls) {
      expect(call.url).not.toMatch(/vrchat\.(com|cloud)/i)
    }
  })

  it('pages through favorites until a short page is returned', async () => {
    const pageOne = Array.from({ length: 100 }, (_, i) => ({
      id: `fav_${i}`,
      favoriteId: `wrld_${i}`,
    }))
    const pageTwo = [{ id: 'fav_100', favoriteId: 'wrld_100' }]
    const calls: Call[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        calls.push({ url, method: init?.method ?? 'GET' })
        const isSecondPage = url.includes('offset=100')
        return new Response(JSON.stringify(isSecondPage ? pageTwo : pageOne), {
          status: 200,
        })
      }),
    )

    const result = await runGetFavoriteWorldIds()

    expect(result).toHaveLength(101)
    expect(result[0]).toBe('wrld_0')
    expect(result.at(-1)).toBe('wrld_100')
    expect(calls).toHaveLength(2)
  })

  it('returns an empty array when there are no favorites', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
    )

    const result = await runGetFavoriteWorldIds()

    expect(result).toEqual([])
  })
})
