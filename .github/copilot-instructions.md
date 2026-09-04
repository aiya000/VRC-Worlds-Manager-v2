# Project Overview

This is a web application (PWA) built with **Next.js** (Static Generation) and **Effect-TS** for the service layer.
We follow **Test-Driven Development (TDD)**, keeping changes small and iterative.
The focus is on correctness, maintainability, and clarity.

## Folder Structure

- `/src`: Next.js frontend source code
- `/src/lib/services`: Effect-TS service layer (IndexedDB, localStorage, API calls)
- `/worker`: Cloudflare Worker (CORS proxy for VRChat API)
- `/public`: Static assets
- `/locales`: Localization files (en-US, ja-JP)

## Libraries and Frameworks

- Next.js 16 + React 19 (frontend)
- Tailwind CSS 4 for styling
- Shadcn/UI for UI components
- Effect-TS for service layer and error handling
- Dexie.js for IndexedDB
- `@/lib/services/logger` for logging

## Coding Standards

- TypeScript strict mode
- Functional components + hooks
- Arrow functions for callbacks
- **All logs must use `@/lib/services/logger` instead of `console.log`.**
- Git commits follow conventional commits
- Package manager: **Bun** (never npm/yarn/pnpm)

## Development Workflow

- Practice **TDD**: always write a failing test first, then code, then refactor.
- Apply **YAGNI**: only implement what is necessary for current requirements.
- Work in **baby steps**: make minimal changes, run tests, commit often.
- Strive for **pair programming** style thinking: explain decisions as if to a peer.
- Keep refactors incremental and supported by tests.

## Testing & QA

- Vitest + Testing Library for unit/integration tests
- `bun run typecheck` for type checking
- `bun run build` for build verification

## UI Guidelines

- Provide light/dark mode toggle
- Favor grid-based layouts for clarity
- Maintain consistent padding, spacing, and modern design
