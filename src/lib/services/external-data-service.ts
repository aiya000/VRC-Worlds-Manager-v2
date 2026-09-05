import { Context, Effect, Layer } from 'effect'
import type {
  PatreonData,
  PatreonVRChatNames,
  WorldBlacklist,
} from '@/lib/types'

/**
 * `data.raifaworks.com` is the desktop app author's own server and does not
 * send `Access-Control-Allow-Origin` for this app's origin, so browser
 * requests to it are always blocked by CORS. Rather than issuing a doomed
 * `fetch()` (which surfaces as an alarming cross-origin error in devtools),
 * these endpoints fail fast with an explanatory error.
 */
function notImplementedBecauseOfCors(feature: string): Error {
  return new Error(
    `Not implemented because ${feature} requires data.raifaworks.com, which does not allow cross-origin requests from the browser (CORS)`,
  )
}

export class ExternalDataService extends Context.Tag('ExternalDataService')<
  ExternalDataService,
  {
    readonly fetchPatreonData: () => Effect.Effect<PatreonData, Error>
    readonly fetchPatreonVrchatNames: () => Effect.Effect<
      PatreonVRChatNames,
      Error
    >
    readonly fetchBlacklist: () => Effect.Effect<WorldBlacklist, Error>
  }
>() {}

export const ExternalDataServiceLive = Layer.succeed(ExternalDataService, {
  fetchPatreonData: () =>
    Effect.fail(notImplementedBecauseOfCors('fetching Patreon supporter data')),

  fetchPatreonVrchatNames: () =>
    Effect.fail(
      notImplementedBecauseOfCors('fetching Patreon-linked VRChat names'),
    ),

  fetchBlacklist: () =>
    Effect.fail(notImplementedBecauseOfCors('fetching the world blacklist')),
})
