# Big Two

A clean, friendly online Big Two card game (also known as Chinese Poker / 锄大地 / 大老二) — built as a Vue 3 SPA. No real money. No accounts. Just a web table for friends.

**Phase 1** (current): single-player vs bots, no backend.
**Phase 2** (later): multiplayer with room codes and WebSockets.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # run Vitest
npm run build    # type-check + production build
```

## Project context for AI agents

Read [`ai/SKILL.md`](./ai/SKILL.md) first. It points to:

- `ai/project.md` — what we're building and why
- `ai/architecture.md` — module layout and data flow
- `ai/conventions.md` — coding rules
- `ai/workflows.md` — feature / bug / test flows
- `ai/context/` — domain model, API contracts, deployment notes
- `ai/decisions/` — ADRs
- `ai/tickets/active/` — current work

The full product spec lives in `references/big_two_online_game_spec.md`. UI mockups are in `references/*.png`.

## Tech stack

Vue 3 · Vite · TypeScript · Tailwind · Vue Router · Pinia · Vitest

DOM-based card rendering. No Canvas. No Phaser.

Game rules live as pure TypeScript in `src/game/` — independent of Vue, Pinia, sockets, and the DOM. This is the most testable surface and the part shared with the P2 server.

---

No real money — friendly score tracking only.
