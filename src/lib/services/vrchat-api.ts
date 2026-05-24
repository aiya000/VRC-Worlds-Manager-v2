import { Context, Effect, Layer } from 'effect'
import type {
  WorldDetails,
  WorldDisplayData,
  InstanceInfo,
  UserGroup,
  GroupInstancePermissionInfo,
} from '@/lib/types'

const CF_WORKER_URL =
  typeof window !== 'undefined'
    ? (localStorage.getItem('cf_worker_url') ?? '')
    : ''

const CF_ACCESS_CLIENT_ID = process.env.NEXT_PUBLIC_CF_ACCESS_CLIENT_ID ?? ''
const CF_ACCESS_CLIENT_SECRET =
  process.env.NEXT_PUBLIC_CF_ACCESS_CLIENT_SECRET ?? ''

function apiUrl(path: string): string {
  return `${CF_WORKER_URL}/api/1${path}`
}

async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (CF_ACCESS_CLIENT_ID) {
    headers['CF-Access-Client-Id'] = CF_ACCESS_CLIENT_ID
  }
  if (CF_ACCESS_CLIENT_SECRET) {
    headers['CF-Access-Client-Secret'] = CF_ACCESS_CLIENT_SECRET
  }

  const res = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res
}

export class VRChatApiService extends Context.Tag('VRChatApiService')<
  VRChatApiService,
  {
    readonly tryLogin: () => Effect.Effect<void, Error>
    readonly loginWithCredentials: (
      username: string,
      password: string,
    ) => Effect.Effect<void, Error>
    readonly loginWith2fa: (
      code: string,
      twoFactorType: string,
    ) => Effect.Effect<void, Error>
    readonly logout: () => Effect.Effect<void, Error>
    readonly getFavoriteWorlds: () => Effect.Effect<void, Error>
    readonly getWorld: (worldId: string) => Effect.Effect<WorldDetails, Error>
    readonly checkWorldInfo: (
      worldId: string,
    ) => Effect.Effect<WorldDetails, Error>
    readonly getRecentlyVisitedWorlds: () => Effect.Effect<
      WorldDisplayData[],
      Error
    >
    readonly searchWorlds: (
      sort: string,
      tags: string[],
      excludeTags: string[],
      search: string,
      page: number,
    ) => Effect.Effect<WorldDisplayData[], Error>
    readonly createWorldInstance: (
      worldId: string,
      instanceTypeStr: string,
      regionStr: string,
    ) => Effect.Effect<InstanceInfo, Error>
    readonly getUserGroups: () => Effect.Effect<UserGroup[], Error>
    readonly getPermissionForCreateGroupInstance: (
      groupId: string,
    ) => Effect.Effect<GroupInstancePermissionInfo, Error>
    readonly createGroupInstance: (
      worldId: string,
      groupId: string,
      instanceTypeStr: string,
      allowedRoles: string[] | null,
      regionStr: string,
      queueEnabled: boolean,
    ) => Effect.Effect<InstanceInfo, Error>
    readonly openInstanceInClient: (
      worldId: string,
      instanceId: string,
    ) => Effect.Effect<string, Error>
  }
>() {}

export const VRChatApiServiceLive = Layer.succeed(VRChatApiService, {
  tryLogin: () =>
    Effect.tryPromise({
      try: async () => {
        await apiFetch('/auth/user')
      },
      catch: (e) => new Error(`Login check failed: ${e}`),
    }),

  loginWithCredentials: (username, password) =>
    Effect.tryPromise({
      try: async () => {
        await apiFetch('/auth/user', {
          headers: {
            Authorization: `Basic ${btoa(`${username}:${password}`)}`,
          },
        })
      },
      catch: (e) => new Error(`Login failed: ${e}`),
    }),

  loginWith2fa: (code, twoFactorType) =>
    Effect.tryPromise({
      try: async () => {
        const endpoint =
          twoFactorType === 'totp'
            ? '/auth/twofactorauth/totp/verify'
            : twoFactorType === 'emailotp'
              ? '/auth/twofactorauth/emailotp/verify'
              : '/auth/twofactorauth/otp/verify'
        await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify({ code }),
        })
      },
      catch: (e) => new Error(`2FA failed: ${e}`),
    }),

  logout: () =>
    Effect.tryPromise({
      try: async () => {
        await apiFetch('/logout', { method: 'PUT' })
      },
      catch: (e) => new Error(`Logout failed: ${e}`),
    }),

  getFavoriteWorlds: () =>
    Effect.tryPromise({
      try: async () => {
        await apiFetch('/favorites?type=world&n=100')
      },
      catch: (e) => new Error(`Failed to get favorites: ${e}`),
    }),

  getWorld: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        const res = await apiFetch(`/worlds/${worldId}`)
        return (await res.json()) as WorldDetails
      },
      catch: (e) => new Error(`Failed to get world: ${e}`),
    }),

  checkWorldInfo: (worldId) =>
    Effect.tryPromise({
      try: async () => {
        const res = await apiFetch(`/worlds/${worldId}`)
        return (await res.json()) as WorldDetails
      },
      catch: (e) => new Error(`Failed to check world: ${e}`),
    }),

  getRecentlyVisitedWorlds: () =>
    Effect.tryPromise({
      try: async () => {
        const res = await apiFetch(
          '/worlds?sort=updated&user=me&releaseStatus=public&n=100',
        )
        return (await res.json()) as WorldDisplayData[]
      },
      catch: (e) => new Error(`Failed to get recent worlds: ${e}`),
    }),

  searchWorlds: (sort, tags, excludeTags, search, page) =>
    Effect.tryPromise({
      try: async () => {
        const params = new URLSearchParams({
          sort,
          n: '50',
          offset: String(page * 50),
        })
        if (search) {
          params.set('search', search)
        }
        if (tags.length > 0) {
          params.set('tag', tags.join(','))
        }
        if (excludeTags.length > 0) {
          params.set('notag', excludeTags.join(','))
        }
        const res = await apiFetch(`/worlds?${params.toString()}`)
        return (await res.json()) as WorldDisplayData[]
      },
      catch: (e) => new Error(`Failed to search worlds: ${e}`),
    }),

  createWorldInstance: (worldId, instanceTypeStr, regionStr) =>
    Effect.tryPromise({
      try: async () => {
        const res = await apiFetch('/instances', {
          method: 'POST',
          body: JSON.stringify({
            worldId,
            type: instanceTypeStr,
            region: regionStr,
          }),
        })
        return (await res.json()) as InstanceInfo
      },
      catch: (e) => new Error(`Failed to create instance: ${e}`),
    }),

  getUserGroups: () =>
    Effect.tryPromise({
      try: async () => {
        const userRes = await apiFetch('/auth/user')
        const user = (await userRes.json()) as { id: string }
        const res = await apiFetch(`/users/${user.id}/groups`)
        return (await res.json()) as UserGroup[]
      },
      catch: (e) => new Error(`Failed to get groups: ${e}`),
    }),

  getPermissionForCreateGroupInstance: (groupId) =>
    Effect.tryPromise({
      try: async () => {
        const res = await apiFetch(`/groups/${groupId}/instances/permissions`)
        return (await res.json()) as GroupInstancePermissionInfo
      },
      catch: (e) => new Error(`Failed to get permissions: ${e}`),
    }),

  createGroupInstance: (
    worldId,
    groupId,
    instanceTypeStr,
    allowedRoles,
    regionStr,
    queueEnabled,
  ) =>
    Effect.tryPromise({
      try: async () => {
        const res = await apiFetch('/instances', {
          method: 'POST',
          body: JSON.stringify({
            worldId,
            type: instanceTypeStr,
            region: regionStr,
            groupAccessType: instanceTypeStr,
            ownerId: groupId,
            roleIds: allowedRoles,
            queueEnabled,
          }),
        })
        return (await res.json()) as InstanceInfo
      },
      catch: (e) => new Error(`Failed to create group instance: ${e}`),
    }),

  openInstanceInClient: (worldId, instanceId) =>
    Effect.tryPromise({
      try: async () => {
        const launchUrl = `vrchat://launch?ref=vrchat.com&id=${worldId}:${instanceId}`
        window.open(launchUrl, '_blank')
        return launchUrl
      },
      catch: (e) => new Error(`Failed to open instance: ${e}`),
    }),
})
