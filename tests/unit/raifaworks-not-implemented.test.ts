import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

import {
  ExternalDataService,
  ExternalDataServiceLive,
} from '@/lib/services/external-data-service'
import { ShareService, ShareServiceLive } from '@/lib/services/share-service'

/**
 * `data.raifaworks.com` never sends CORS headers for this app's origin, so
 * these features must fail immediately with an explanatory error instead of
 * attempting a `fetch()` that would be blocked by the browser and surface as
 * an alarming cross-origin error in devtools.
 */
async function expectNotImplementedBecauseOfCors(
  effect: Effect.Effect<unknown, Error>,
) {
  const error = await Effect.runPromise(Effect.flip(effect))
  expect(error.message).toMatch(/Not implemented/)
  expect(error.message).toMatch(/CORS/)
}

describe('ExternalDataServiceLive', () => {
  it('fetchPatreonData fails without attempting a cross-origin request', () =>
    expectNotImplementedBecauseOfCors(
      Effect.provide(
        Effect.gen(function* () {
          const svc = yield* ExternalDataService
          return yield* svc.fetchPatreonData()
        }),
        ExternalDataServiceLive,
      ),
    ))

  it('fetchPatreonVrchatNames fails without attempting a cross-origin request', () =>
    expectNotImplementedBecauseOfCors(
      Effect.provide(
        Effect.gen(function* () {
          const svc = yield* ExternalDataService
          return yield* svc.fetchPatreonVrchatNames()
        }),
        ExternalDataServiceLive,
      ),
    ))

  it('fetchBlacklist fails without attempting a cross-origin request', () =>
    expectNotImplementedBecauseOfCors(
      Effect.provide(
        Effect.gen(function* () {
          const svc = yield* ExternalDataService
          return yield* svc.fetchBlacklist()
        }),
        ExternalDataServiceLive,
      ),
    ))
})

describe('ShareServiceLive', () => {
  it('shareFolder fails without attempting a cross-origin request', () =>
    expectNotImplementedBecauseOfCors(
      Effect.provide(
        Effect.gen(function* () {
          const svc = yield* ShareService
          return yield* svc.shareFolder('My Folder')
        }),
        ShareServiceLive,
      ),
    ))

  it('updateFolderShare fails without attempting a cross-origin request', () =>
    expectNotImplementedBecauseOfCors(
      Effect.provide(
        Effect.gen(function* () {
          const svc = yield* ShareService
          return yield* svc.updateFolderShare('My Folder')
        }),
        ShareServiceLive,
      ),
    ))

  it('downloadFolder fails without attempting a cross-origin request', () =>
    expectNotImplementedBecauseOfCors(
      Effect.provide(
        Effect.gen(function* () {
          const svc = yield* ShareService
          return yield* svc.downloadFolder('some-share-id')
        }),
        ShareServiceLive,
      ),
    ))
})
