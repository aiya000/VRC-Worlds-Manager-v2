import { afterEach, describe, expect, it, vi } from 'vitest'
import { Effect } from 'effect'
import {
  EMAIL_TWO_FACTOR_REQUIRED_ERROR,
  INVALID_TWO_FACTOR_CODE_ERROR,
  TWO_FACTOR_REQUIRED_ERROR,
  VRChatApiService,
  VRChatApiServiceLive,
  twoFactorRequirementOf,
  twoFactorVerifyPath,
} from '@/lib/services/vrchat-api'

type Call = { url: string; method: string; headers: Record<string, string> }

function stubFetch(respond: (call: Call) => Response): { calls: Call[] } {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const call: Call = {
        url: typeof input === 'string' ? input : input.toString(),
        method: init?.method ?? 'GET',
        headers: (init?.headers as Record<string, string>) ?? {},
      }
      calls.push(call)
      return respond(call)
    }),
  )
  return { calls }
}

/** Mirrors how `commands.ts` surfaces a failed Effect to the login screens. */
function runToErrorMessage(
  effect: Effect.Effect<void, Error, VRChatApiService>,
): Promise<string | null> {
  return Effect.runPromise(
    Effect.provide(effect, VRChatApiServiceLive).pipe(
      Effect.map(() => null),
      Effect.catchAll((e: Error) => Effect.succeed(e.message)),
    ),
  )
}

function login(username: string, password: string) {
  return runToErrorMessage(
    Effect.gen(function* () {
      const svc = yield* VRChatApiService
      yield* svc.loginWithCredentials(username, password)
    }),
  )
}

function tryLogin() {
  return runToErrorMessage(
    Effect.gen(function* () {
      const svc = yield* VRChatApiService
      yield* svc.tryLogin()
    }),
  )
}

function verify2fa(code: string, twoFactorType: string) {
  return runToErrorMessage(
    Effect.gen(function* () {
      const svc = yield* VRChatApiService
      yield* svc.loginWith2fa(code, twoFactorType)
    }),
  )
}

describe('twoFactorRequirementOf', () => {
  it('reports an app-based requirement for a TOTP account', () => {
    expect(
      twoFactorRequirementOf({ requiresTwoFactorAuth: ['totp', 'otp'] }),
    ).toBe(TWO_FACTOR_REQUIRED_ERROR)
  })

  it('reports an e-mail requirement for VRChat spelling of emailOtp', () => {
    expect(
      twoFactorRequirementOf({ requiresTwoFactorAuth: ['emailOtp'] }),
    ).toBe(EMAIL_TWO_FACTOR_REQUIRED_ERROR)
  })

  it('reports no requirement for a fully authenticated user payload', () => {
    expect(
      twoFactorRequirementOf({ id: 'usr_0', displayName: 'Someone' }),
    ).toBe(null)
  })

  it('reports no requirement for an empty method list or a non-object body', () => {
    expect(twoFactorRequirementOf({ requiresTwoFactorAuth: [] })).toBe(null)
    expect(twoFactorRequirementOf(null)).toBe(null)
    expect(twoFactorRequirementOf('nope')).toBe(null)
  })
})

describe('twoFactorVerifyPath', () => {
  it('maps VRChat spelling of emailOtp to the e-mail endpoint', () => {
    expect(twoFactorVerifyPath('emailOtp')).toBe(
      '/auth/twofactorauth/emailotp/verify',
    )
  })

  it('maps totp to the authenticator endpoint', () => {
    expect(twoFactorVerifyPath('totp')).toBe('/auth/twofactorauth/totp/verify')
  })

  it('falls back to the recovery-code endpoint for anything else', () => {
    expect(twoFactorVerifyPath('otp')).toBe('/auth/twofactorauth/otp/verify')
  })
})

describe('VRChatApiService login with two-factor auth', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fails with the 2FA error code when VRChat answers 200 with requiresTwoFactorAuth', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ requiresTwoFactorAuth: ['totp'] }), {
          status: 200,
        }),
    )

    expect(await login('someone', 'secret')).toBe(TWO_FACTOR_REQUIRED_ERROR)
  })

  it('fails with the e-mail 2FA error code for an e-mail protected account', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ requiresTwoFactorAuth: ['emailOtp'] }), {
          status: 200,
        }),
    )

    expect(await login('someone', 'secret')).toBe(
      EMAIL_TWO_FACTOR_REQUIRED_ERROR,
    )
  })

  it('succeeds when VRChat returns the user without asking for a second factor', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ id: 'usr_0', displayName: 'Someone' }), {
          status: 200,
        }),
    )

    expect(await login('someone', 'secret')).toBe(null)
  })

  it('treats a session still awaiting its second factor as not logged in', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ requiresTwoFactorAuth: ['totp'] }), {
          status: 200,
        }),
    )

    expect(await tryLogin()).not.toBe(null)
  })

  it('verifies an e-mail code against the e-mail endpoint', async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ verified: true }), { status: 200 }),
    )

    expect(await verify2fa('123456', 'emailOtp')).toBe(null)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toContain('/auth/twofactorauth/emailotp/verify')
    expect(calls[0].method).toBe('POST')
  })

  it('fails when VRChat rejects the submitted code', async () => {
    stubFetch(
      () => new Response(JSON.stringify({ verified: false }), { status: 200 }),
    )

    expect(await verify2fa('000000', 'totp')).not.toBe(null)
  })
})

describe('VRChatApiService session token relay', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('replays the session VRChat issued, which cross-site cookies cannot carry', async () => {
    const { calls } = stubFetch((call) =>
      call.url.includes('/auth/twofactorauth/')
        ? new Response(JSON.stringify({ verified: true }), {
            status: 200,
            headers: { 'X-VRC-Two-Factor-Auth': 'twofactorauth_xyz' },
          })
        : new Response(
            JSON.stringify({ id: 'usr_0', displayName: 'Someone' }),
            {
              status: 200,
              headers: { 'X-VRC-Auth': 'authcookie_abc' },
            },
          ),
    )

    expect(await login('someone', 'secret')).toBe(null)
    expect(await verify2fa('123456', 'totp')).toBe(null)
    expect(await tryLogin()).toBe(null)

    expect(calls[0].headers['X-VRC-Auth']).toBeUndefined()
    expect(calls[1].headers['X-VRC-Auth']).toBe('authcookie_abc')
    expect(calls[2].headers['X-VRC-Auth']).toBe('authcookie_abc')
    expect(calls[2].headers['X-VRC-Two-Factor-Auth']).toBe('twofactorauth_xyz')
  })
})

describe('VRChatApiService.loginWith2fa rejected codes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // VRChat answers a wrong code with 400 rather than a 200 body, so without
  // this the raw `API error 400: {"verified":false}` reached the login screen.
  it('reports a plain code when VRChat rejects with 400', async () => {
    stubFetch(
      () => new Response(JSON.stringify({ verified: false }), { status: 400 }),
    )

    expect(await verify2fa('000000', 'totp')).toBe(
      INVALID_TWO_FACTOR_CODE_ERROR,
    )
  })

  it('reports the same code when VRChat rejects with 200', async () => {
    stubFetch(
      () => new Response(JSON.stringify({ verified: false }), { status: 200 }),
    )

    expect(await verify2fa('000000', 'totp')).toBe(
      INVALID_TWO_FACTOR_CODE_ERROR,
    )
  })

  it('does not disguise an unrelated failure as a bad code', async () => {
    stubFetch(() => new Response('gateway blew up', { status: 502 }))

    const message = await verify2fa('123456', 'totp')

    expect(message).not.toBe(INVALID_TWO_FACTOR_CODE_ERROR)
    expect(message).toContain('2FA failed')
  })
})
