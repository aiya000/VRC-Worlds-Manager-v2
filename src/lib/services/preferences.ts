import { Context, Effect, Layer } from 'effect';
import type {
  CardSize,
  FilterItemSelectorStarredType,
  FolderRemovalPreference,
  InstanceRegion,
} from '@/lib/types';

export class PreferencesService extends Context.Tag('PreferencesService')<
  PreferencesService,
  {
    readonly getTheme: () => Effect.Effect<string>;
    readonly setTheme: (theme: string) => Effect.Effect<void>;
    readonly getLanguage: () => Effect.Effect<string>;
    readonly setLanguage: (language: string) => Effect.Effect<void>;
    readonly getCardSize: () => Effect.Effect<CardSize>;
    readonly setCardSize: (cardSize: CardSize) => Effect.Effect<void>;
    readonly getRegion: () => Effect.Effect<InstanceRegion>;
    readonly setRegion: (region: InstanceRegion) => Effect.Effect<void>;
    readonly getStarredFilterItems: (
      id: FilterItemSelectorStarredType,
    ) => Effect.Effect<string[]>;
    readonly setStarredFilterItems: (
      id: FilterItemSelectorStarredType,
      values: string[],
    ) => Effect.Effect<void>;
    readonly getFolderRemovalPreference: () => Effect.Effect<FolderRemovalPreference>;
    readonly setFolderRemovalPreference: (
      pref: FolderRemovalPreference,
    ) => Effect.Effect<void>;
    readonly getSortPreferences: () => Effect.Effect<[string, string]>;
    readonly setSortPreferences: (
      sortField: string,
      sortDirection: string,
    ) => Effect.Effect<void>;
  }
>() {}

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

function setItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

export const PreferencesServiceLive = Layer.succeed(PreferencesService, {
  getTheme: () => Effect.succeed(getItem<string>('theme', 'system')),
  setTheme: (theme) => Effect.sync(() => setItem('theme', theme)),
  getLanguage: () => Effect.succeed(getItem<string>('language', 'ja-JP')),
  setLanguage: (language) => Effect.sync(() => setItem('language', language)),
  getCardSize: () =>
    Effect.succeed(getItem<CardSize>('cardSize', 'Normal')),
  setCardSize: (cardSize) => Effect.sync(() => setItem('cardSize', cardSize)),
  getRegion: () =>
    Effect.succeed(getItem<InstanceRegion>('region', 'us')),
  setRegion: (region) => Effect.sync(() => setItem('region', region)),
  getStarredFilterItems: (id) =>
    Effect.succeed(getItem<string[]>(`starredFilterItems_${id}`, [])),
  setStarredFilterItems: (id, values) =>
    Effect.sync(() => setItem(`starredFilterItems_${id}`, values)),
  getFolderRemovalPreference: () =>
    Effect.succeed(
      getItem<FolderRemovalPreference>('folderRemovalPreference', 'ask'),
    ),
  setFolderRemovalPreference: (pref) =>
    Effect.sync(() => setItem('folderRemovalPreference', pref)),
  getSortPreferences: () =>
    Effect.succeed(
      getItem<[string, string]>('sortPreferences', ['dateAdded', 'desc']),
    ),
  setSortPreferences: (sortField, sortDirection) =>
    Effect.sync(() => setItem('sortPreferences', [sortField, sortDirection])),
});
