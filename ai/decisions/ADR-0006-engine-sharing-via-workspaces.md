# ADR-0006: Share the game engine via npm workspaces + a `shared/` package

## Status

Accepted

## Context

P2 multiplayer (TICKET-023) requires the server to validate every play and pass using the same rules engine the frontend already runs. Per ADR-0001, the engine lives in pure TypeScript with no Vue / Pinia / DOM imports, so the code is shareable as-is. We just need to give both halves a way to import it.

Realistic options:

1. **npm workspaces + `shared/` package.** Root `package.json` declares `workspaces: ["frontend", "backend", "shared"]`. `shared/package.json` is `@bigtwo/shared` with `main: "./src/index.ts"`. Both `frontend` and `backend` depend on `"@bigtwo/shared": "*"`. npm symlinks `node_modules/@bigtwo/shared → shared/` automatically.
2. **TypeScript `paths` + Vite alias mapping.** Keep the engine in one location (e.g. `shared/src/`). Each side adds a tsconfig path and a build-tool alias pointing at the relative path.
3. **Copy on build.** A pre-build step copies the engine into each consumer. Last resort.

## Decision

Option 1: **npm workspaces with a `shared/` package.**

Layout:

```
bigtwo/
  package.json                # workspaces: [frontend, backend, shared]
  frontend/
    package.json              # dependencies: { "@bigtwo/shared": "*" }
  backend/
    package.json              # dependencies: { "@bigtwo/shared": "*" }
  shared/
    package.json              # name: "@bigtwo/shared", main: "./src/index.ts"
    tsconfig.json
    src/
      index.ts                # barrel re-export
      cards.ts                # all engine modules live here now
      deck.ts
      handEvaluation.ts
      rules.ts
      scoring.ts
      legalMoves.ts
      bot.ts
      gameState.ts
      *.test.ts               # tests stay with the code they test
```

Frontend imports become `import { ... } from '@bigtwo/shared'`. Backend imports the same package name. The engine's internal cross-references (`./cards`, `./gameState`, etc.) stay relative.

## Consequences

Benefits:
- Standard, well-understood tool — `npm install` at root sets everything up.
- Explicit public API via the barrel `index.ts`. Anything not exported there is internal.
- Each consumer's `node_modules` has a symlink to `shared/`, so Vite/tsx/tsc all resolve it via the regular Node module resolution path. No custom resolver config beyond declaring the dependency.
- Clean dependency boundary: if backend imports something Vue-flavored from `@/components/...` by accident, the workspace doesn't know that name and the build fails fast.
- One source of truth for the engine — no drift between client and server.

Tradeoffs:
- Two-step install (root + per-workspace `npm install` is replaced with a single `npm install` at root). Slightly more setup the first time.
- `shared/package.json` points `main` at `./src/index.ts` (raw TypeScript). Vite and tsx both compile TS on the fly, so this works in dev. For a production server build we'd need to either include shared in `tsc`'s build, or pre-compile shared and ship the JS. **Acceptable for P2 dev; revisit at deploy time.**
- Workspaces add one more thing for new contributors to learn, but it's a one-paragraph explanation.

Constraints this locks in:
- All engine code lives under `shared/src/`. Anything Vue/Pinia/socket-specific stays in `frontend/` or `backend/`.
- The public surface is whatever `shared/src/index.ts` re-exports. Other files are reachable via the package but should be considered internal.
- The engine remains pure TS (no Vue/Pinia/DOM imports), per ADR-0001 — this constraint is now structurally enforced because the `shared` package has no Vue dependency.

## Alternatives considered

- **Path mapping (option 2)** rejected because tsx's runtime path resolution and `tsc`'s emit behavior with `paths` would each need extra configuration, and the type-only path mapping breaks if either side does an actual build (vs `--noEmit`). Workspaces are cleaner.
- **Copy on build (option 3)** rejected — duplicates a class of bug we'd otherwise eliminate at the language level.
- **Single-package monorepo (everything in one `package.json`)** rejected — would force the backend to install Vue and the frontend to install Socket.IO server. Wasteful and confusing.

## Implementation notes

- Tests live with their source under `shared/src/*.test.ts`. Add Vitest as a devDependency of the shared package; its test runner picks them up locally. Root convenience: a top-level npm script can chain shared+frontend tests if/when we want that.
- After the move, frontend's existing `@/game/...` imports get rewritten to `@bigtwo/shared`. The `@/*` alias in `frontend/vite.config.ts` and `tsconfig.json` keeps mapping only to `frontend/src/*`.
- Backend's `tsx` runtime resolves `@bigtwo/shared` via the workspace symlink; no extra runtime config needed.
