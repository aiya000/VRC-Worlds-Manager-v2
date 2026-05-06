import { Context, Effect, Layer } from 'effect';
import type {
  PatreonData,
  PatreonVRChatNames,
  WorldBlacklist,
  LocalizedChanges,
} from '@/lib/types';

const DATA_BASE_URL = 'https://data.raifaworks.com';

export class ExternalDataService extends Context.Tag('ExternalDataService')<
  ExternalDataService,
  {
    readonly fetchPatreonData: () => Effect.Effect<PatreonData, Error>;
    readonly fetchPatreonVrchatNames: () => Effect.Effect<
      PatreonVRChatNames,
      Error
    >;
    readonly fetchBlacklist: () => Effect.Effect<WorldBlacklist, Error>;
    readonly getChangelog: () => Effect.Effect<LocalizedChanges[], Error>;
  }
>() {}

export const ExternalDataServiceLive = Layer.succeed(ExternalDataService, {
  fetchPatreonData: () =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(`${DATA_BASE_URL}/api/supporters`);
        if (!res.ok) {
          throw new Error(`Failed to fetch supporters: ${res.status}`);
        }
        return (await res.json()) as PatreonData;
      },
      catch: (e) => new Error(`Failed to fetch Patreon data: ${e}`),
    }),

  fetchPatreonVrchatNames: () =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(`${DATA_BASE_URL}/api/supporters/vrchat`);
        if (!res.ok) {
          throw new Error(`Failed to fetch VRChat names: ${res.status}`);
        }
        return (await res.json()) as PatreonVRChatNames;
      },
      catch: (e) => new Error(`Failed to fetch Patreon VRChat names: ${e}`),
    }),

  fetchBlacklist: () =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(`${DATA_BASE_URL}/api/blacklist`);
        if (!res.ok) {
          throw new Error(`Failed to fetch blacklist: ${res.status}`);
        }
        return (await res.json()) as WorldBlacklist;
      },
      catch: (e) => new Error(`Failed to fetch blacklist: ${e}`),
    }),

  getChangelog: () =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch('/changelog.json');
        if (!res.ok) {
          return [];
        }
        return (await res.json()) as LocalizedChanges[];
      },
      catch: () => new Error('Failed to load changelog'),
    }),
});
