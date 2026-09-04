import { Context, Effect, Layer } from 'effect'
import { db } from './db'

export class AuthService extends Context.Tag('AuthService')<
  AuthService,
  {
    readonly isLoggedIn: () => Effect.Effect<boolean, Error>
    readonly setAuthToken: (
      key: string,
      value: string,
    ) => Effect.Effect<void, Error>
    readonly getAuthToken: (key: string) => Effect.Effect<string | null, Error>
    readonly clearAuth: () => Effect.Effect<void, Error>
  }
>() {}

export const AuthServiceLive = Layer.succeed(AuthService, {
  isLoggedIn: () =>
    Effect.tryPromise({
      try: async () => {
        const token = await db.authState.get('auth_cookie')
        return token !== undefined && token.value !== ''
      },
      catch: (e) => new Error(`Failed to check auth: ${e}`),
    }),

  setAuthToken: (key, value) =>
    Effect.tryPromise({
      try: async () => {
        await db.authState.put({ key, value })
      },
      catch: (e) => new Error(`Failed to set auth token: ${e}`),
    }),

  getAuthToken: (key) =>
    Effect.tryPromise({
      try: async () => {
        const record = await db.authState.get(key)
        return record?.value ?? null
      },
      catch: (e) => new Error(`Failed to get auth token: ${e}`),
    }),

  clearAuth: () =>
    Effect.tryPromise({
      try: async () => {
        await db.authState.clear()
      },
      catch: (e) => new Error(`Failed to clear auth: ${e}`),
    }),
})
