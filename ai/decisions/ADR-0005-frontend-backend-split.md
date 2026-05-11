# ADR-0005: Repo layout — `frontend/` and `backend/` as siblings

## Status

Accepted

## Context

P1 shipped the Vue 3 SPA at the repo root: `src/`, `package.json`, `vite.config.ts`, etc. all lived next to `ai/` and `references/`. That was fine when there was nothing else.

P2 adds a Node + Socket.IO server. We now need to decide how the two halves share the filesystem. Realistic options:

1. **Sibling directories** — `frontend/` and `backend/` at the repo root. Each has its own `package.json`, `tsconfig.json`, `node_modules/`. The shared engine code lives in one and is imported via a tsconfig path or workspace package.
2. **Monorepo workspace** (npm/pnpm workspaces) — top-level `package.json` declares workspaces; `packages/engine`, `packages/frontend`, `packages/backend`. Engine becomes its own package consumed by both.
3. **Keep frontend at root, add `server/`** — minimal restructure but feels asymmetric ("server" is a special second-class citizen).

## Decision

Option 1: **sibling `frontend/` and `backend/` directories at the repo root.** Engine sharing strategy (path mapping vs npm workspaces with a `shared/` or `packages/engine/` directory) will be decided when the first cross-cutting code arrives, in a follow-up ADR alongside TICKET-007.

Result:

```
bigtwo/
  ai/                          # context, ADRs, tickets — unchanged
  references/                  # spec + mockups — unchanged
  frontend/                    # Vue 3 SPA (was the repo root)
    src/
    package.json
    vite.config.ts
    tsconfig.json
    tailwind.config.js
    postcss.config.js
    public/
    index.html
  backend/                     # Node + Socket.IO server (P2 — empty stub for now)
  README.md
  .gitignore
```

## Consequences

Benefits:
- Symmetric layout — neither half is privileged.
- Each side has independent dependency trees (`frontend/node_modules`, `backend/node_modules`). No accidental Vue imports in server code, no Socket.IO bloat in the client.
- Tooling configs (`vite.config.ts`, future server `tsconfig`) live next to the code they configure.
- Clear deploy boundaries — frontend builds to `frontend/dist/`, backend transpiles to `backend/dist/`.

Tradeoffs:
- Engine sharing requires a deliberate choice (workspace, path mapping, or copy). Decision deferred to the engine-sharing ADR.
- Two `npm install` steps. Acceptable; add a one-line root script later if it becomes a friction point.

Constraints this locks in:
- Vue SPA always lives under `frontend/`. Anything that imports Vue stays there.
- Node server always lives under `backend/`. Anything that imports Socket.IO or filesystem APIs stays there.
- `ai/` and `references/` stay at the repo root; both directories reference them.

## Alternatives considered

- **Monorepo workspace (option 2):** more powerful for engine sharing, but adds tooling complexity (workspace-aware install, hoisting quirks, type resolution edge cases) for a two-package repo. If the engine sharing pattern justifies it, ADR-0006 will introduce workspaces then.
- **`server/` next to `src/` at root (option 3):** feels temporary and unbalanced. Frontend code would still be at the root in a different way than backend, which is exactly the asymmetry we want to avoid before P2 grows.
