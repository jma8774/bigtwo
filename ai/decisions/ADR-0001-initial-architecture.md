# ADR-0001: Vue 3 SPA, DOM-based cards, pure-TS game engine

## Status

Accepted

## Context

BigTwo is a 3–4 player climbing card game. It's almost entirely UI: cards, room settings, scoreboard, move log, modals. There's no realtime physics, no sprite animation budget, no need for off-thread rendering. Phase 1 ships without a backend; Phase 2 adds online multiplayer.

We need to choose:

1. The frontend rendering approach (DOM vs Canvas/Phaser).
2. Where game rules live (inside components vs separated).
3. The state-management approach.
4. Whether to ship multiplayer in Phase 1.

## Decision

1. **Vue 3 + Vite + TypeScript + Tailwind + Vue Router + Pinia for the SPA.** Standard, well-supported, fast iteration.
2. **DOM/CSS for card rendering, not Canvas or Phaser.** Cards are interactive elements (click-to-select, drag-to-reorder, lift-on-select); the DOM gives us accessibility, hit testing, and CSS transitions for free.
3. **Game logic lives in pure TypeScript under `src/game/`.** No Vue imports there. Components and stores call into it; never the other way around. This gives us:
   - Unit-testable rules (the most failure-prone surface).
   - A clean path to share the engine with the P2 server (which is server-authoritative and must run the same rules).
4. **Pinia for state orchestration.** Stores wire UI events to game functions, manage selection/sort/UI-local state, schedule bot turns, trigger sounds.
5. **Phase 1 ships single-player vs bots, no backend.** Phase 2 adds Node + Socket.IO with server-authoritative state. We design types and data shapes from day one so that the P1 store and the P2 server can share the same `GameState` model.
6. **Server-authoritative model for P2.** Clients only see their own hand; opponent hands never leave the server. Per-seat `seatToken` in `localStorage` handles seat ownership without login.

## Consequences

Benefits:
- Fast Phase 1 — no server work blocks the playable game.
- Game rules are tested independently of the UI.
- The same engine can run client-side (P1) and server-side (P2).
- DOM accessibility is "free" — keyboard focus, screen-reader hints, etc.
- No 3rd-party heavyweights (no Phaser, no UI kit) means small bundle and simple deploys.

Tradeoffs:
- DOM cards mean we can't easily do FLIP-style flying-card animations across containers. The spec explicitly defers those, so this is fine for now.
- Sharing code between `src/game/` and `server/` will require a small monorepo or path-mapped import strategy when P2 lands. Defer the decision until then; tracked as a Phase 2 concern.
- Pinia rather than a more opinionated framework means we have to be disciplined about not stuffing game rules into stores.

Constraints this locks in:
- No Canvas/Phaser without revisiting this ADR.
- No state-management migration (e.g., to a different store library) without an ADR.
- Vue components are render-only. Any meaningful logic in a component is a smell and should be moved to a store or to `src/game/`.

## Alternatives considered

- **Canvas / Phaser:** rejected. Overkill for a mostly-form-and-text UI, hurts accessibility, adds a large dependency, removes CSS animation simplicity. Would only be worth it if we shifted toward heavy table animation, which the spec explicitly says no to.
- **React or Svelte instead of Vue:** equivalent on technical merits. Vue 3 chosen because the spec calls it out and the user picked it.
- **Server-authoritative from day one:** rejected for Phase 1 because it blocks the playable single-player experience on backend work that adds no user value for solo play.
- **Game rules inside Vue components:** rejected. Untestable, drags Vue runtime into the part of the code that needs to also run on the server in Phase 2.
