# Architecture Diagram: VRChat Worlds Manager Web

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Interface                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React Components (Next.js 16 + React 19)                  │  │
│  │  - Pages: Setup, Login, Listview, Settings, About          │  │
│  │  - Hooks: useWorlds, useFolders, useWorldFilters, etc.     │  │
│  │  - UI: Shadcn/UI + Tailwind CSS 4                          │  │
│  └────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Commands Facade (src/lib/commands.ts)            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  commands.getAllWorlds()    → Promise<Result<T, E>>        │  │
│  │  commands.getFolders()     → Promise<Result<T, E>>        │  │
│  │  commands.createBackup()   → Promise<Result<T, E>>        │  │
│  │  ... (same API as old bindings.ts)                         │  │
│  │                                                              │  │
│  │  Internally: Effect.runPromise(                             │  │
│  │    effect.pipe(Effect.provide(AppLayer))                    │  │
│  │  )                                                          │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                            │                                      │
│  ┌────────────────────────▼───────────────────────────────────┐  │
│  │  events (EventTarget-based)                                 │  │
│  │  - taskStatusChanged                                        │  │
│  │  - updateProgress                                           │  │
│  │  - worldsUpdated                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                Effect-TS Service Layer                            │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  PreferencesService │  │  WorldService                    │  │
│  │  (localStorage)      │  │  (IndexedDB + CF Worker)        │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  FolderService      │  │  AuthService                     │  │
│  │  (IndexedDB)         │  │  (IndexedDB + CF Worker)        │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  BackupService      │  │  MigrationService                │  │
│  │  (File API / Blob)   │  │  (File Upload → IndexedDB)     │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  MemoService        │  │  CustomTagsService               │  │
│  │  (IndexedDB)         │  │  (IndexedDB)                    │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  ShareService       │  │  ExternalDataService             │  │
│  │  (Fetch API)         │  │  (Fetch API)                    │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  TaskService        │  │  QuotaService                    │  │
│  │  (EventTarget)       │  │  (localStorage + headers)       │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  VRChatApiService   │  │  InitService                     │  │
│  │  (CF Worker proxy)   │  │  (IndexedDB + localStorage)    │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│                                                                  │
│  All services: Context.Tag + Layer (dependency injection)       │
│  All composed via AppLayer (src/lib/services/layers.ts)         │
└──────────────────────────────────────────────────────────────────┘
                     │                    │
                     ▼                    ▼
┌──────────────────────────┐  ┌────────────────────────────────┐
│   Browser Storage         │  │   External Services             │
│  ┌─────────────────────┐ │  │  ┌─────────────────────────┐  │
│  │  IndexedDB (Dexie)  │ │  │  │  Cloudflare Worker      │  │
│  │  - worlds           │ │  │  │  (CORS Proxy)            │  │
│  │  - worldDetails     │ │  │  │  ┌───────────────────┐  │  │
│  │  - folders          │ │  │  │  │ VRChat API         │  │  │
│  │  - hiddenWorlds     │ │  │  │  │ api.vrchat.cloud   │  │  │
│  │  - memos            │ │  │  │  └───────────────────┘  │  │
│  │  - customTags       │ │  │  │  KV: Quota tracking     │  │
│  │  - authState        │ │  │  └─────────────────────────┘  │
│  └─────────────────────┘ │  │  ┌─────────────────────────┐  │
│  ┌─────────────────────┐ │  │  │  raifaworks API         │  │
│  │  localStorage       │ │  │  │  - Patreon data          │  │
│  │  - theme            │ │  │  │  - Folder sharing        │  │
│  │  - language         │ │  │  │  - Blacklist              │  │
│  │  - cardSize         │ │  │  └─────────────────────────┘  │
│  │  - sortPreferences  │ │  └────────────────────────────────┘
│  │  - quota tracking   │ │
│  └─────────────────────┘ │
└──────────────────────────┘
```

## Data Flow: Sort Preferences

### On App Startup:

```
App Start
  → Frontend initializes
  → useWorldFilters hook runs
  → useEffect calls getSortPreferences()
  → PreferencesService reads localStorage
  → Returns (sortField, sortDirection)
  → Frontend updates store state
  → Worlds are filtered & sorted
  → UI displays sorted worlds
```

### On Sort Change:

```
User clicks sort option
  → Frontend calls setSortField() or setSortDirection()
  → Action calls commands.setSortPreferences()
  → PreferencesService writes to localStorage
  → Frontend store updates
  → UI re-renders with new sort
```

### On Export:

```
User triggers export
  → Frontend calls exportToPortalLibrarySystem()
  → BackupService reads worlds from IndexedDB
  → For each folder:
      Get worlds → Apply sort → Add to export
  → Generate Blob download
  → User saves sorted data matching UI
```

## Key Design Decisions

1. **Effect-TS Service Layer**: All logic uses Effect-TS Context.Tag for
   dependency injection, making services testable and composable.

2. **Commands Facade**: Same API as the old Tauri bindings.ts, so UI components
   needed only import path changes.

3. **IndexedDB via Dexie**: Structured data in browser storage, supporting
   complex queries needed for world filtering and folder management.

4. **Cloudflare Worker**: CORS proxy with quota management for VRChat API
   access from the browser.

5. **PWA**: Service Worker for offline caching and installability.
