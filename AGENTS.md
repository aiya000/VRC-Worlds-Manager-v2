# Agent Guidelines for VRChat Worlds Manager Web

This document provides guidelines for AI agents (GitHub Copilot, etc.) working on this project.

## Package Management

**IMPORTANT: This project uses Bun as the package manager.**

### ✅ DO:

- Use `bun install` to install dependencies
- Use `bun run <script>` to run scripts (e.g., `bun run dev`, `bun run build`)
- Reference `bun.lock` for dependency resolution
- Use Bun-specific commands when applicable

### ❌ DON'T:

- **Never use `npm install`, `npm run`, or any npm commands**
- **Never use `yarn` or `pnpm` commands**
- Do not generate `package-lock.json` or `yarn.lock` files
- Do not modify `bun.lock` manually

### Why Bun?

This project has chosen Bun for its speed and modern features. Using other package managers may cause:

- Lock file conflicts (`package-lock.json` vs `bun.lock`)
- Dependency resolution inconsistencies
- Unnecessary files being tracked in git

## Code Style

### Comments

- **Avoid obvious comments**: Don't add comments that merely restate what the code does
- **Good**: `// Workaround for Safari's viewport height bug`
- **Bad**: `// Update the document's lang attribute to match the detected locale` (when the code itself is `document.documentElement.lang = locale`)
- Use comments only when:
  - The code's intent is not immediately clear
  - There's a non-obvious reason for the implementation
  - Documenting a workaround or edge case

### Code Clarity

- Write self-documenting code with clear variable and function names
- Prefer code clarity over brevity
- Let the code speak for itself when possible

### Null/Undefined and Falsy Value Handling

When dealing with types that can be both falsy and null/undefined, use explicit checks to avoid unnecessary type narrowing:

**Good examples:**

```ts
const foo: string | null = something
if (foo === null) {
  // This allows empty string '' to pass through
  throw new Error('foo is null')
}
```

```ts
const bar: number | undefined = something
if (bar === undefined) {
  // This allows 0 to pass through
  throw new Error('bar is undefined')
}
```

**The principle:** Don't over-narrow types unnecessarily. If you mean to check only for `null`, use `foo === null`, not `!foo`.

**Exception:** You may use `!foo` when you explicitly want to check for all falsy values including null/undefined:

```ts
// OK: Intentionally checking for empty string OR null
if (!foo) {
  // handles '', null, undefined, 0, false, etc.
}
```

**Special case for null and undefined together:**
Always handle `null` and `undefined` separately with explicit checks:

```ts
// Required pattern
if (foo === null || foo === undefined) { ... }
if (foo !== null && foo !== undefined) { ... }

// Don't mix with falsy checks
// ❌ BAD: if (!foo || foo === null)
```

For types like `SomePrimitive | null | undefined`, separate all conditions with logical operators.

### Control Flow Braces

Always use braces with control flow statements, even for single-line bodies:

**Required:**

```ts
if (hoge) {
  ...
}
```

**Not allowed:**

```ts
if (hoge) ...
```

### Zod Schema Naming

Use lowerCamelCase for Zod schema variable names:

**Required:**

```ts
const fovSchema = z.number().int().min(1).max(179)
const userProfileSchema = z.object({ ... })
```

**Not allowed:**

```ts
const FovSchema = z.number().int().min(1).max(179)  // ❌ PascalCase
const UserProfileSchema = z.object({ ... })  // ❌ PascalCase
```

### Export Style

Use `export` prefix on declarations instead of separate export statements:

**Required:**

```ts
export const fovSchema = z.number().int().min(1).max(179)
export type Locale = z.infer<typeof localeSchema>
export interface Translations { ... }
export function detectLocale(): Locale { ... }
```

**Not allowed:**

```ts
const fovSchema = z.number().int().min(1).max(179)
type Locale = z.infer<typeof localeSchema>
interface Translations { ... }

export { fovSchema }
export type { Locale, Translations }
```

**Exception for `export default`:**
`export default` cannot be used as a prefix for `const`, so it must be on a separate line:

```ts
const config = { ... }
export default config
```

### ESLint Rules

**IMPORTANT: Do not disable ESLint rules without a very strong justification.**

- In principle, do not disable ESLint rules (using `eslint-disable` comments)
- If you must disable a rule, you **must** report it in:
  - The PR description, explaining why the rule was disabled
  - Or in responses to users/reviewers
- Always prefer fixing the code to comply with ESLint rules rather than disabling them
- If a rule consistently causes issues, discuss removing it from the ESLint configuration instead of adding inline disables

## Project Context

### Technology Stack

- **Framework**: Next.js 16 (with Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Package Manager**: Bun
- **Deployment**: Static Generation (`output: "export"`)

### i18n Strategy

- Default language: Japanese (`ja`)
- English support via client-side detection
- Dynamic `lang` attribute updates based on `navigator.language`

### SEO Considerations

- This is a static site (Static Generation)
- All metadata should be optimized for static export
- Use `export const dynamic = "force-static"` for route handlers when using `output: "export"`

## UI Target Environments

This app is meant to be used **while in VR**. When a UI decision trades one environment
off against another, resolve it in this order:

1. **VR overlays** (XSOverlay and the like) — the primary target
2. **Phones** — the layout should be genuinely pleasant here, not merely usable
3. **Desktop with a physical mouse** — important, but it yields to the two above

### What that implies

- **Assume a coarse pointer.** A VR controller aims a laser; there is no precise hover and
  no reliable drag. Anything that requires pixel-accurate aiming is effectively unusable.
  Hit targets must be large; a 1px drag handle is not a control
- **Assume a narrow panel.** An overlay window is small, and the user cannot casually resize
  it. Nothing may claim a fixed share of the width; panels must be collapsible
- **Assume text is read at a distance.** Prefer generous type and spacing over density
- **Do not rely on keyboard shortcuts** as the only way to reach a feature — there is usually
  no keyboard in VR. They are welcome as an addition
- Hover-only affordances need a tap-or-click equivalent

Phone and VR pull in the same direction almost everywhere, so a change made for one
usually serves the other.

## Testing Changes

### When Resolving Issues

When resolving an issue, **always write tests** that verify the fix unless there is a clear reason not to.
The test must demonstrate that the issue is resolved.

### Test Directory Structure

All tests live under a single `tests/` directory. Do not split by type (unit/integration/E2E) at the top level.
Organize by feature or module using subdirectories as needed.

```
tests/
  unit/          # unit tests
  integration/   # integration tests
  e2e/           # end-to-end tests
```

### File Naming Conventions

- Unit and integration tests: `*.test.ts` / `*.test.tsx`
- E2E tests: `*.spec.ts`

### Running E2E Tests

`bun install` does **not** fetch the browsers Playwright drives — those live in a
machine-wide cache (`~/.cache/ms-playwright`) and are tied to the Playwright version,
so run this once, and again after Playwright is upgraded:

```sh
bunx playwright install chromium
```

Without it, `bun run test:e2e` fails with `Executable doesn't exist at
.../chromium_headless_shell-<build>`. That is a missing download, not a version
conflict in `package.json`. (CI does the same thing in its own step.)

`bun run test:e2e` starts the dev server itself; nothing needs to be running first.

### When Implementing Features

- When you implement a new feature, **basically always add tests** for it
- Add tests whenever possible, even for small changes

### Test Scope Policy

- **Goal**: Tests within your PR's scope must pass. Tests outside your PR's scope must also pass (do not break existing tests).
- Before submitting, verify that all existing tests outside your change scope continue to pass.
- If a pre-existing test fails due to reasons unrelated to your changes, document it clearly in the PR.

### Before Committing

1. Run `bun run typecheck` to verify TypeScript types
2. Run `bun run build` to ensure the build succeeds
3. Check for any warnings in the build output
4. Test the generated static files in the `out/` directory

### Don't Skip

- Always validate changes compile and build successfully
- Ensure no new TypeScript errors are introduced
- Verify that static generation completes without errors

## Language

- All development-facing text must be written in **English**: code comments, commit messages, AGENTS.md, and other internal documentation
- Exception: Issue titles/bodies, PR titles/bodies must be written in **Japanese** (see below)

## GitHub Issues / Pull Requests

Issue names, issue bodies, PR names, and PR bodies must be written in **Japanese**.

### Work that comes from an Issue goes through a Pull Request

When the work you are doing resolves a GitHub Issue, do not commit it straight to
`develop`:

1. Branch (`feature/`, `fix/`, `chore/`, … as the change warrants)
2. Open a PR targeting `develop`, referencing the Issue it closes
3. Merge it yourself once the checks pass:

   ```sh
   gh pr merge <number> --merge --delete-branch
   ```

**Merge with `--merge`, not `--squash`.** Keeping the merge commit is what this
repository does.

**Expect `gh pr merge` to be refused, and do not treat that as a failure of the
work.** Claude Code's permission classifier has blocked it in both forms --
`--squash` in one session, and `--merge`, with and without `--delete-branch`, in
another -- so whether it goes through is not something an agent can predict or
work around. When it is refused, say so, give the exact command, and let the
user run it; the branch is pushed and the checks have passed, so nothing is
lost. Do not go looking for another route to the same merge.

The Issue tracker is how requests are kept; a PR is how each one is answered, so the
two stay tied together and the history shows which Issue a change came from.

**Work asked for directly in conversation does not need a PR** — commit it to `develop`
as usual. The rule is about Issues, not about change size.

## Commit Messages

Follow Conventional Commits format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for code style changes (formatting, etc.)
- `refactor:` for code refactoring
- `chore:` for maintenance tasks

Always write commit messages in English.

## Git Branching & Release Workflow

- **`develop` branch is the primary working branch**:
  - Direct pushes and feature PRs should target `develop`.
- **Do NOT routinely merge into `main` or create PRs targeting `main`**:
  - The `main` branch represents production releases (e.g. deployed to https://vrchat-worlds-manager-web.pages.dev/ ).
  - **Only merge `develop` into `main` (via PR) when explicitly instructed by the user** (i.e. when a production release is specifically desired).
- **Do not pass `--delete-branch` when merging a release PR** — the head branch is `develop`, and deleting it would remove the primary working branch.

### Releases are announced through GitHub Releases

After a release PR lands on `main`, tag the release and publish GitHub Release notes:

```sh
git tag v<version>
git push origin v<version>
gh release create v<version> --title 'v<version>' --notes '<what users should know>'
```

The release notes are the app's user-facing changelog — the About page links to
https://github.com/aiya000/VRChat-Worlds-Manager-Web/releases and the app ships no
changelog of its own. Write the notes for users, not for developers: what changed
that they will notice, not every commit.

## Remember

1. **Always use Bun, never npm/yarn/pnpm**
2. **Avoid redundant comments - let code be self-explanatory**
3. **Test with `bun run typecheck` and `bun run build` before committing**
4. **This is a static site - ensure all changes work with `output: "export"`**
5. **Develop on `develop`; never merge to `main` without explicit user instruction**
