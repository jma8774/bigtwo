# Coding Conventions

## File organization

- Route-level Vue components go in `src/pages/`. One page per route.
- Reusable, dumb UI components go in `src/components/`. PascalCase filenames.
- Pure game logic goes in `src/game/`. **Never import Vue, Pinia, sockets, or DOM APIs from `src/game/`.** This is the rule that keeps logic testable.
- Pinia stores go in `src/stores/`, suffixed `Store.ts` (e.g., `gameStore.ts`).
- Assets in `src/assets/`. Sounds in `src/assets/sounds/`.
- Type-only shared definitions can live next to their owning module (e.g., `GameState` in `src/game/gameState.ts`) and be re-exported.

## Naming conventions

- **Files:** Vue components `PascalCase.vue`. TS modules `camelCase.ts`. Tests `camelCase.test.ts`.
- **Types:** `PascalCase`. Prefer `type` aliases for data shapes (see spec §9, §12 — `Card`, `PlayedHand`, `GameState`).
- **Constants:** `camelCase` for lookup tables (e.g., `rankValue`, `suitValue`). Reserve `SCREAMING_SNAKE` for true compile-time constants.
- **Card IDs:** `${rank}-${suit}` (e.g., `3-diamonds`, `2-spades`). Stable, unique, used everywhere a card is referenced over the wire.
- **PlayerId:** opaque string (`p_123` style). Never assume format.
- **Room codes:** 4–5 uppercase alphanumerics (e.g., `AB7K`). Server-generated.

## API conventions (P2)

- Socket event names use camelCase verbs: `createRoom`, `joinRoom`, `playCards`, `passTurn`, `gameUpdated`, `invalidMove`.
- Client → server payloads always include `roomCode`.
- Server → client `gameUpdated` carries the **private** per-player state — current player's actual hand + opponents' card counts only.
- On failure, server replies with `invalidMove({ reason })` to the sender, never an exception or broadcast.

## State management

- All shared game/UI state goes through Pinia.
- **Hand sort order and card selection are local UI state** in the store — they never leave the client. In P2, the server doesn't care how the client arranges its own hand.
- Persist *only* user preferences (sound, last nickname) and the P2 `bigTwoSession` to localStorage. Never persist game state itself.

## Error handling

- Pure game functions return tagged results: `{ ok: true, state }` or `{ ok: false, reason }`. No exceptions for expected outcomes (illegal moves, wrong turn, etc.).
- Unexpected programmer errors (e.g., invariant violations) may `throw` — they shouldn't be reachable.
- UI never shows raw reasons. Map `reason` codes to friendly strings (spec §25).

## Logging

- P1: keep `console.*` out of shipped builds. Use a tiny debug helper if needed during development.
- P2 server: structured logs at `info`/`warn`/`error`. Never log `seatToken`, hand contents of opponents, or full game state at info level.

## Testing expectations

- New functions in `src/game/` ship with unit tests. The game rules are the whole product — they get the most coverage.
- Reducer-style transitions (`applyPlay`, `applyPass`, `nextTurn`) should be tested via concrete `GameState` fixtures, not by reaching into internals.
- Bot policy gets tests for: must beat current play, must play lowest, must pass when no legal move, cannot pass when controlling the table.
- Components get tests only when interaction logic is non-trivial (drag-reorder is the obvious candidate).

## Dependency rules

- Default answer to "should we add a library?" is no.
- Acceptable to add: `vue-router`, `pinia`, `tailwindcss`, `vitest`, `@vue/test-utils`, `socket.io` / `socket.io-client` (P2).
- Anything else needs a one-line justification in the PR / ticket.
- **Do not add:** UI component libraries (build cards in DOM/CSS), animation libraries (CSS transitions suffice), state-management alternatives to Pinia, analytics, error-reporting SaaS.

## Styling

- Tailwind utility classes in templates. Reserve component-scoped `<style>` for things Tailwind genuinely can't express.
- Animate only `transform` and `opacity` (spec §16). Never animate `top`, `left`, `width`, `height`, `margin`.
- Light theme only. White cards, subtle borders/shadows. No dark casino aesthetic.

## Copy and tone

- Friendly, neutral. See spec §33 for examples.
- Allowed: "Table money", "Score", "Round complete", "Start Game", "Friendly game for friends".
- Forbidden: "Bet now", "Jackpot", "Buy chips", "Cash out", "High roller", any urgency/scarcity framing.
- Footer on every screen: "No real money — friendly score tracking only."

## What not to do

- Do not refactor unrelated code while implementing a ticket.
- Do not add new dependencies without a clear reason.
- Do not duplicate existing helpers or API clients.
- Do not put game rules inside Vue components or stores.
- Do not use Canvas or Phaser.
- Do not send opponent hands to clients in P2, even hidden behind UI. Browser inspection would reveal them.
- Do not introduce new architectural patterns without an ADR.
- Do not implement real-money or account features.
