# TICKET-001: Scaffold Vue 3 + Vite + TS + Tailwind project

## Status

Done

## Goal

Stand up an empty but runnable Vue 3 SPA with the directory structure described in `ai/architecture.md`, configured with TypeScript, Tailwind, Vue Router, Pinia, and Vitest. No game logic yet — just the chassis that all subsequent tickets build on.

## Background

The repo is currently empty except for `ai/` and `references/`. We need a working `npm run dev` before any feature work makes sense. Spec §4 fixes the stack; spec §13 fixes the directory layout. Lock both in now so later tickets don't have to argue about them.

## Requirements

- Initialize a Vite + Vue 3 + TypeScript project at the repo root.
- Add and configure Tailwind CSS.
- Install and wire `vue-router` with placeholder routes for `/`, `/create`, `/game`, `/rules`.
- Install and wire `pinia` with an empty `gameStore` and `settingsStore` (just the skeleton).
- Install and configure Vitest. Add `npm test` and `npm run test:watch` scripts. Include one trivial passing test in `src/game/cards.test.ts` to prove the harness works.
- Create empty (but typed) module files for each entry in the planned `src/game/` and `src/components/` lists from `ai/architecture.md`. Each should `export {}` or export a minimal placeholder so imports don't break later.
- Add the standard Vite `.gitignore`.
- Commit a `README.md` with: project name, one-line description, `npm install` / `npm run dev` / `npm test` instructions, and a link to `ai/SKILL.md`.

## Acceptance criteria

- `npm install` succeeds on a clean clone.
- `npm run dev` serves the SPA at the default Vite port.
- `npm run build` produces a `dist/` with no errors.
- `npm test` runs Vitest and the one placeholder test passes.
- `npm run type-check` (or `vue-tsc --noEmit`) passes with zero errors.
- The directory structure matches `ai/architecture.md`.
- No game logic, no styled UI yet — just placeholders.

## Files likely involved

- `package.json`
- `vite.config.ts`
- `tsconfig.json`, `tsconfig.node.json`
- `tailwind.config.js`, `postcss.config.js`, `src/style.css`
- `index.html`, `src/main.ts`, `src/App.vue`
- `src/router/index.ts`
- `src/stores/gameStore.ts`, `src/stores/settingsStore.ts`
- `src/game/*.ts` (placeholders)
- `src/components/*.vue` (placeholders)
- `src/pages/*.vue` (placeholders)
- `vitest.config.ts`
- `.gitignore`
- `README.md`

## Out of scope

- Any actual game logic — that's TICKET-003.
- Any actual styled UI — that's TICKET-002.
- Sounds, animations, bots, multiplayer.

## Notes for implementation

- Use Tailwind v3 unless v4 is the obvious choice at install time. Don't overthink it.
- Don't add ESLint/Prettier in this ticket unless install is one command — keep this ticket fast.
- Keep dependencies minimal. Re-read `ai/conventions.md` "Dependency rules" before adding anything.
- The placeholder `src/game/cards.test.ts` can just assert `1 + 1 === 2`. Its job is to prove the test harness runs, nothing more.
