# TICKET-009: Dynamic room creation — variable player count and bot fill

## Status

Done

## Goal

Make CreateRoomPage's controls actually shape the game. Today the form takes nickname, 3/4 players, bot fill, card value, and round limit — but the inputs aren't wired to anything. After this ticket, choosing "3 players + fill with bots" produces a 3-seat table with the right players (you + bots), and "4 players, bot fill off" leaves seats open (P2-relevant, but the configuration should be representable in state now). Variations like 1 human + 2 bots, 1 human + 3 bots, etc. all deal correctly and play through.

## Background

Spec §10 says 4-player is preferred but the product should support 3-player too. Spec §31 (Open Product Decisions) calls out "Should true 3-player mode exist, or should 3 players require a bot as 4th?" — MVP rule is "fill the 4th seat with a bot if only 3 humans are present." For P1, we want real 3-player support since we're testing the UI with bots.

Currently CreateRoomPage stores form values in local refs and `start()` just routes to `/game`. The store needs to take the settings and build the initial `GameState` with the correct number of seats and bots.

## Requirements

- `CreateRoomPage` writes its form output into `gameStore.startGame(settings)`.
- `gameStore.startGame` constructs `Player[]` based on `playerCount` + `fillWithBots`:
  - Always include the human first (using the nickname from the form).
  - Pad with bot `Player`s named "Alex", "Riley", "Ming", "Sam" (or similar) up to `playerCount` if `fillWithBots` is true.
  - If `fillWithBots` is false in P1, behave as if it were true (P1 has no remote humans). Note the deviation in the comment / and in `ai/context/domain-model.md`.
- `src/game/deck.ts` `deal()` supports both 3 and 4 player counts. For 3-player, decide what to do with the 13th card per seat (52 / 3 = 17 remainder 1). Two options:
  - Deal 17 each and discard the 4th-seat's worth ⇒ rejected per spec; spec says "Avoid implementing true 3-player deal rules until later."
  - **MVP rule:** when `playerCount === 3` and `fillWithBots`, deal 13 each and the bot for the empty seat doesn't play — just exists. This is the path we're taking for now.
  - Document the chosen rule in `ai/context/domain-model.md` and add an ADR if it stays.
- 3♦ rule still applies — whoever holds it leads. For 3 active seats, the empty-seat bot is skipped in turn order.
- `PlayerPanel` row in GamePage shows the right number of opponents (2 for 3-player, 3 for 4-player). `grid-cols-3` should become `grid-cols-{n-1}` or use auto-fit.

## Acceptance criteria

- 4-player game with 3 bots: 13 cards each, 3♦ holder leads, plays through correctly.
- 3-player game: dealt correctly per MVP rule, turn order skips the 4th seat, score calc works for 3 active players.
- CreateRoomPage's selected `playerCount` actually changes the table.
- Spec §31 deviations / decisions captured in `ai/context/domain-model.md` (and ADR if material).

## Files likely involved

- `src/stores/gameStore.ts`
- `src/pages/CreateRoomPage.vue` (Start button wires through to the store)
- `src/pages/GamePage.vue` (PlayerPanel row count is dynamic)
- `src/game/deck.ts`, `src/game/gameState.ts`, `src/game/rules.ts`
- `ai/context/domain-model.md`
- Possibly `ai/decisions/ADR-0002-three-player-deal.md`

## Out of scope

- Remote multiplayer player slots (P2 / TICKET-007).
- Custom bot names. Hard-coded list is fine.
- Difficulty tiers beyond Basic.

## Notes for implementation

- Decide turn order: with a phantom 4th bot in 3-player mode, do we still cycle through 4 seats? Cleanest: only 3 real Players in `state.players`, turn order naturally skips. The 13 leftover cards from the dealer's 4-of-52 just stay in the deck and never enter play.
- Bot identity is internal; the `Player` shape doesn't need new fields.
