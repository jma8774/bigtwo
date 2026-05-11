# TICKET-005: Wire the game engine to the Vue UI

## Status

Done

## Goal

Replace the fake data in `GamePage.vue` (TICKET-002) with real state from `gameStore`, which orchestrates `src/game/` and `src/game/bot.ts`. The result is a fully playable single-player-vs-bots game from CreateRoomPage → GamePage → RoundSummary.

This is the "P1 backend-free playable" milestone — every UI element we mocked must drive off real game state so we can validate the design with real games before any server work.

## Background

Depends on TICKET-001, TICKET-002, TICKET-003, TICKET-004. This is the integration ticket where the static UI meets the pure engine.

## Requirements

- `gameStore` holds the current `GameState` and exposes:
  - `startGame(settings)` — calls `createInitialState` + `startRound`.
  - `selectCard(cardId)` / `unselectCard(cardId)` — local UI state, not game state.
  - `sortHandBy('rank' | 'suit')` — local UI state.
  - `playSelected()` — calls `rules.canPlay`; on success, commits via `rules.applyPlay`; on failure, sets an inline error message keyed by reason.
  - `pass()` — same pattern.
  - `advanceBots()` — if `currentPlayerId` is a bot, schedule a `setTimeout(~700ms)` then `chooseBotMove` → apply play/pass. Repeat until it's the human's turn or the round ends.
- `GamePage.vue` reads from the store and renders all components with real props.
- `RoundSummaryModal` appears when `state.status === 'roundOver'`. "Next Round" calls `startRound` (with the same 3♦ rule: whoever holds 3♦ leads).
- Invalid-move messages render inline near the action bar (spec §25).

## Acceptance criteria

- Full P1 acceptance criteria from spec §28:
  - Can create a local bot game.
  - Choose nickname, player count, bot fill, card value, round limit, sound on/off.
  - Cards dealt correctly.
  - 3♦ holder starts.
  - User can select cards and play valid hands.
  - Invalid plays rejected with useful messages.
  - Bots play/pass automatically.
  - Turn order and passing and trick reset work.
  - First empty hand wins.
  - Scores calculated correctly.
  - Round summary displays correctly.
  - UI remains clean and non-casino-like.
- Card-play and round-win sounds are deferred to a polish ticket (TICKET-006) but the store should expose the trigger points.

## Out of scope

- Sounds and animations beyond what's already in TICKET-002 (those go in TICKET-006).
- Drag-to-reorder hand (separate polish ticket).
- Multiplayer (P2).

## Files likely involved

- `src/stores/gameStore.ts`
- `src/pages/GamePage.vue`
- `src/pages/CreateRoomPage.vue` (Start Game button now actually starts a game)
- `src/components/*` (small prop-shape adjustments)

## Notes for implementation

- Keep `setTimeout` scheduling inside the store, not in components.
- Selection and sort are **local UI state** — never put them in `GameState`.
- When a user submits a play, validate optimistically in the store via `rules.canPlay` before committing. This lets the inline error message appear without any "loading" state.
