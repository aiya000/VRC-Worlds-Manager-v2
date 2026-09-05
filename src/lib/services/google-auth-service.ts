import { Context, Effect, Layer } from 'effect'
import { db } from './db'

/**
 * A public identifier, not a secret: it is meant to be embedded in code that
 * runs in the browser. Google tells apps apart by which origins are
 * registered against it, not by keeping this value hidden.
 */
const GOOGLE_CLIENT_ID =
  '673719548373-8q2i1u76gl4naso46hk2l4h63olsvfvt.apps.googleusercontent.com'

/**
 * `drive.file` rather than the broader Drive scopes: it only ever sees files
 * this app itself created, so a bug here cannot read anything else in
 * someone's Drive. See Issue #63 for why this was chosen over `drive.appdata`.
 */
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

const CONNECTED_KEY = 'connected'

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

interface TokenResponse {
  access_token?: string
  error?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }) => TokenClient
          revoke: (token: string, callback: () => void) => void
        }
      }
    }
  }
}

/**
 * The access token itself, kept only in memory. It is good for about an hour
 * and nothing here is meant to outlive a reload -- reconnecting always asks
 * Google for a fresh one, so there is nothing worth persisting.
 */
let currentAccessToken: string | null = null

let scriptLoadPromise: Promise<void> | null = null

function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Google Identity Services requires a browser'),
    )
  }
  if (window.google?.accounts.oauth2 !== undefined) {
    return Promise.resolve()
  }
  if (scriptLoadPromise === null) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GIS_SCRIPT_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        scriptLoadPromise = null
        reject(new Error('Failed to load Google Identity Services'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptLoadPromise
}

/**
 * Loads the sign-in script ahead of time, without asking for a token.
 *
 * Google requires `requestAccessToken()` to be called synchronously from a
 * user gesture (a click), and awaiting the script tag's own load would break
 * that chain. Called once when the settings screen that offers "Connect"
 * mounts, so that by the time someone actually clicks it, there is nothing
 * left to await before asking.
 */
export function preloadGoogleIdentityScript(): void {
  loadGisScript().catch(() => {
    // Swallowed: `connect()` below surfaces the same failure to the caller,
    // and there is no user-visible action to take from a background preload.
  })
}

export class GoogleAuthService extends Context.Tag('GoogleAuthService')<
  GoogleAuthService,
  {
    readonly isConnected: () => Effect.Effect<boolean, Error>
    readonly connect: () => Effect.Effect<void, Error>
    readonly disconnect: () => Effect.Effect<void, Error>
  }
>() {}

export const GoogleAuthServiceLive = Layer.succeed(GoogleAuthService, {
  isConnected: () =>
    Effect.tryPromise({
      try: async () => {
        const row = await db.googleAuthState.get(CONNECTED_KEY)
        return row?.value === 'true'
      },
      catch: (e) => new Error(`Failed to read connection state: ${e}`),
    }),

  connect: () =>
    Effect.tryPromise({
      try: async () => {
        await loadGisScript()

        const accessToken = await new Promise<string>((resolve, reject) => {
          const client = window.google!.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: DRIVE_FILE_SCOPE,
            callback: (response) => {
              if (
                response.error !== undefined ||
                response.access_token === undefined
              ) {
                reject(
                  new Error(response.error ?? 'No access token was returned'),
                )
                return
              }
              resolve(response.access_token)
            },
          })
          // Must run in the same tick as the click that led here -- see
          // `preloadGoogleIdentityScript`.
          client.requestAccessToken()
        })

        currentAccessToken = accessToken
        await db.googleAuthState.put({ key: CONNECTED_KEY, value: 'true' })
      },
      catch: (e) => new Error(`Failed to connect to Google Drive: ${e}`),
    }),

  /**
   * Clears this device's own record of being connected. It does not reach
   * into Google's side of the grant: doing that needs the access token, and
   * one only exists in memory for as long as the tab that requested it stays
   * open. A user who wants the permission itself gone can remove it from
   * https://myaccount.google.com/permissions, same as with any other app.
   */
  disconnect: () =>
    Effect.tryPromise({
      try: async () => {
        const token = currentAccessToken
        currentAccessToken = null
        await db.googleAuthState.delete(CONNECTED_KEY)

        if (token !== null && window.google !== undefined) {
          await new Promise<void>((resolve) => {
            window.google!.accounts.oauth2.revoke(token, () => resolve())
          })
        }
      },
      catch: (e) => new Error(`Failed to disconnect from Google Drive: ${e}`),
    }),
})
