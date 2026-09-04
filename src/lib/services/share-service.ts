import { Context, Effect, Layer } from 'effect'
import type { WorldDisplayData } from '@/lib/types'

/**
 * `data.raifaworks.com` is the desktop app author's own server and does not
 * send `Access-Control-Allow-Origin` for this app's origin, so browser
 * requests to it are always blocked by CORS. Rather than issuing a doomed
 * `fetch()` (which surfaces as an alarming cross-origin error in devtools),
 * folder sharing fails fast with an explanatory error.
 */
function notImplementedBecauseOfCors(feature: string): Error {
  return new Error(
    `Not implemented because ${feature} requires data.raifaworks.com, which does not allow cross-origin requests from the browser (CORS)`,
  )
}

export class ShareService extends Context.Tag('ShareService')<
  ShareService,
  {
    readonly shareFolder: (folderName: string) => Effect.Effect<string, Error>
    readonly updateFolderShare: (
      folderName: string,
    ) => Effect.Effect<string | null, Error>
    readonly downloadFolder: (
      shareId: string,
    ) => Effect.Effect<[string, WorldDisplayData[]], Error>
  }
>() {}

export const ShareServiceLive = Layer.succeed(ShareService, {
  shareFolder: () =>
    Effect.fail(notImplementedBecauseOfCors('sharing a folder')),

  updateFolderShare: () =>
    Effect.fail(notImplementedBecauseOfCors('updating a shared folder')),

  downloadFolder: () =>
    Effect.fail(notImplementedBecauseOfCors('downloading a shared folder')),
})
