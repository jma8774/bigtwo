# TICKET-003: Implement pure-TS game engine in src/game/

## Status

Done

## Goal

Implement Milestone 2 of the spec: deck creation, shuffle, deal, hand evaluation, rules, scoring, and game state transitions — as pure TypeScript with no Vue, Pinia, sockets, or DOM. Comprehensive unit tests. No bots yet (TICKET-004), no UI wiring (TICKET-005).

## Background

Per ADR-0001, the game engine is the highest-leverage testing surface and must be reusable between the P1 client and the P2 server. Building it as standalone pure TypeScript first lets us verify rules with tests rather than by playing.

Authoritative references:
- Spec §9 Card Model
- Spec §10 Rule Defaults
- Spec §11 Scoring Rules
- Spec §12 Game State Model
- Spec §13 Game Engine Modules
- `ai/context/domain-model.md` for the consolidated types and edge cases

## Requirements

Implement and test:

### `src/game/cards.ts`
- `Suit`, `Rank`, `Card` types.
- `rankValue`, `suitValue` lookups (spec §10).
- `suitSymbol` map (spec §9).
- `compareCards(a, b)` — by rank then suit.
- `sortByRank(cards)`, `sortBySuit(cards)`.
- `isRedSuit(suit)`.

### `src/game/deck.ts`
- `createDeck(): Card[]` — 52 unique cards with stable IDs (`${rank}-${suit}`).
- `shuffle(deck, rng)` — accepts an injected RNG for testability. Don't call `Math.random` from inside.
- `deal(deck, playerCount): Card[][]` — for 4 players, 13 each. 3-player MVP behavior: throw, with a note that 3-player mode fills the 4th seat with a bot upstream.

### `src/game/handEvaluation.ts`
- `evaluate(cards: Card[]): PlayedHand | null` — returns the hand type and a numeric `strength` suitable for tie-breaking *within the same type*. Returns `null` for invalid combinations.
- Support: single, pair, triple, straight, flush, full house, four of a kind + kicker, straight flush.
- MVP rules: no wrap-around straights, 2 cannot appear in a straight.

### `src/game/rules.ts`
- `canPlay(state, playerId, cards): { ok: true } | { ok: false, reason: string }`.
- Checks: it's their turn; they own the cards; cards form a valid hand; if `currentPlay` exists, same type/count and `strength` is higher; if first play of round, includes 3♦; controller cannot pass.
- `applyPlay(state, playerId, cards): GameState` — pure, returns a new state.
- `applyPass(state, playerId): GameState` — pure, returns a new state. Throws/returns error if not allowed.
- `nextTurn(state)` and trick-reset logic.
- `detectRoundWinner(state): PlayerId | null`.

### `src/game/legalMoves.ts`
- `generateLegalMoves(state, playerId): Card[][]` — used by bots and a possible future hint system.

### `src/game/scoring.ts`
- `calculateRoundDelta(state): Record<PlayerId, number>` using Simple mode (`cardsRemaining × cardValue`).
- `applyRoundResult(state, delta): GameState` — updates `roundDelta` and `scores`.

### `src/game/gameState.ts`
- `GameState`, `Player`, `PlayedHand`, `PlayedHandType`, `MoveLogEntry`, `RoomSettings` types.
- `createInitialState(settings, players): GameState`.
- `startRound(state): GameState` — deals, sets `currentPlayerId` to the 3♦ holder.

## Acceptance criteria

- All modules pass `vue-tsc --noEmit` with no `any`.
- Vitest tests cover, at minimum:
  - Deck has exactly 52 unique cards.
  - Shuffle with the same seed produces the same order; with different seeds produces different orders (probabilistically).
  - 4-player deal gives 13 cards each, no overlap.
  - `evaluate` recognizes all eight hand types and rejects invalid combinations (e.g., 4 cards, mixed-count five-card hands, straights including 2, A-2-3-4-5).
  - `evaluate` strength comparisons satisfy: same-type higher beats lower; different-type within five-card category respects the ladder (straight < flush < full house < four of a kind < straight flush).
  - `canPlay` rejects: not-your-turn, doesn't-own-cards, wrong type/count, doesn't beat, missing-3♦-on-first-play, controller passing.
  - `applyPlay` advances turn, updates `currentPlay`, `lastPlayerToPlay`, removes cards from hand.
  - `applyPass` handles trick reset when all non-controller players have passed.
  - `detectRoundWinner` returns the player as soon as their hand is empty.
  - `calculateRoundDelta` sums to zero across all players.
- No imports from `vue`, `pinia`, `socket.io-client`, or DOM APIs anywhere in `src/game/`. (A lint rule or simple grep check is fine.)

## Files likely involved

- `src/game/cards.ts` + `cards.test.ts`
- `src/game/deck.ts` + `deck.test.ts`
- `src/game/handEvaluation.ts` + `handEvaluation.test.ts`
- `src/game/rules.ts` + `rules.test.ts`
- `src/game/legalMoves.ts` + `legalMoves.test.ts`
- `src/game/scoring.ts` + `scoring.test.ts`
- `src/game/gameState.ts` + `gameState.test.ts`

## Out of scope

- Bot AI (TICKET-004).
- Wiring the engine to the Vue store / UI (TICKET-005).
- Any multiplayer code.

## Notes for implementation

- Use small, named fixture states in tests. Don't reach into internals — drive everything through the public API.
- Prefer `readonly` arrays in type signatures where you can. Treat `GameState` as immutable; return new objects from transitions.
- Five-card hand strength: encode as a single number so comparisons are cheap. One workable scheme: `strength = typeRank * 1e6 + primaryTie * 1e4 + secondaryTie * 1e2 + suit`.
- 3♦ on first play: enforce by checking `state.roundNumber > 0 ? 'normal' : 'mustInclude3D'` (or however you choose to mark "first play of round" — a `state.firstPlayOfRound: boolean` flag is also fine).
- Open product decisions in spec §31: stick with MVP defaults; capture any deviation in a new ADR.
