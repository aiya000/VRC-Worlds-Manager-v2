# VRC Worlds Manager v2 → VRChat Worlds Manager Web: Migration Report

## Architecture Comparison

| Item | Old (Tauri Desktop) | New (Web PWA) |
|---|---|---|
| Data Persistence | JSON files (filesystem) | IndexedDB (Dexie.js) |
| Logic Design | Rust (Tauri Commands) | Effect-TS (type-safe service layer) |
| API Calls | Rust HTTP client | Cloudflare Worker (CORS proxy) + Fetch API |
| Authentication | Rust-managed cookies | CF Worker cookie relay |
| Settings | preferences.json (file) | localStorage |
| Backup/Restore | Filesystem read/write | File API (Blob download / File upload) |
| App Updates | Tauri Updater | Service Worker (PWA updates) |
| Deep Links | Tauri plugin | URL query parameters (`?import=<shareId>`) |
| Logging | Tauri plugin → file | console.* wrapper |
| Package Manager | npm | Bun |
| CSS | Tailwind CSS 3.4 | Tailwind CSS 4 |
| Events | Tauri event system | EventTarget API |
| File Dialogs | Tauri plugin-dialog (native) | Browser File API (`<input type="file">`) |
| External Links | Tauri plugin-opener | `window.open()` |

## Key Design Decisions

### Effect-TS Service Layer
All backend logic is implemented as Effect-TS services using `Context.Tag` for dependency injection and `Layer` for composition. The `commands.ts` facade maintains the exact same API signatures as the old `bindings.ts`, so UI components required minimal changes (only import path updates).

### Data Compatibility
All data structures are preserved exactly for backup/restore/migration/export compatibility:
- `BackupMetaData`
- `WorldDisplayData`
- `FolderData`
- `Platform`
- PLS export format

### Cloudflare Worker Quota Management
The CF Worker tracks daily request counts in KV storage and reports remaining quota via `X-Quota-Remaining` response headers. The client reads these headers to warn users before large operations that might exceed the free tier limit.

## TODO (Post-Migration)

1. **PWA Icons**: Replace `app-icon.PNG` with properly sized variants (192px, 512px)
2. **GitHub Actions: Static Site Deployment**: `bun run build` → deploy `out/` to gh-pages or Cloudflare Pages (recommended: Cloudflare Pages for free unlimited bandwidth and preview deploys)
3. **GitHub Actions: CF Worker Deployment**: `wrangler deploy` in CI/CD
4. **Cloudflare Worker KV Setup**: Replace placeholder KV namespace ID in `worker/wrangler.toml` with actual KV ID after creating the namespace via `wrangler kv namespace create QUOTA`
5. **CF Worker ALLOWED_ORIGIN**: Update the `ALLOWED_ORIGIN` variable in `worker/wrangler.toml` to match the actual deployment domain
