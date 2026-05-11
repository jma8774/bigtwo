# TICKET-010: Round counter, round limit, and end-of-match handling

## Status

Done

## Goal

Show the round counter accurately in the topbar (e.g., "Round 4 of 10" or "Round 4" when unlimited), increment it as rounds resolve, and end the match when the round limit is reached — displaying a final summary instead of a normal Round Summary.

## Background

Currently the topbar shows `Round 4` as fake data and there is no notion of a round limit being enforced. CreateRoomPage exposes a Round Limit setting (5/10/20/Unlimited) but it isn't wired to anything. Real games need:
1. The round number to come from `GameState.roundNumber`.
2. The "of N" suffix when `settings.roundLimit !== null`.
3. End-of-match detection: when `roundNumber === roundLimit` and the round ends, switch into a final state with a "Match Complete" summary instead of "Next Round."

## Requirements

- `AppTopBar` accepts `roundNumber` and `roundLimit?: number | null` props (or just shows what the parent computes).
- GamePage reads `gameStore.state.roundNumber` and `gameStore.state.settings.roundLimit` and passes them through.
- Topbar renders:
  - `Round 4` when `roundLimit == null`
  - `Round 4 of 10` when `roundLimit == 10`
- `gameStore` increments `roundNumber` on Round Summary's "Next Round."
- When `roundNumber === roundLimit` and the round resolves, set `state.status` to a new value `'matchOver'` (or repurpose Round Summary with a final-state flag).
- A `MatchSummaryModal` (or extend `RoundSummaryModal` with an `isFinal` prop) shows:
  - Final standings (sorted by total score, winner highlighted)
  - Total rounds played
  - "Leave Table" button (and maybe "Play Again" which resets to round 1)

## Acceptance criteria

- Setting Round Limit = 5 in CreateRoomPage means the match ends after 5 rounds; the topbar counts up correctly.
- Setting Round Limit = Unlimited shows just "Round N" with no "of …" suffix and never auto-ends.
- The final summary differs visually from a normal round summary so it's clear the match is over.
- `gameStore.state.roundNumber` increments only when Next Round fires; it doesn't tick during a round.

## Files likely involved

- `src/components/AppTopBar.vue`
- `src/components/RoundSummaryModal.vue` (or new `MatchSummaryModal.vue`)
- `src/stores/gameStore.ts`
- `src/game/gameState.ts` (status enum may grow)
- `src/pages/GamePage.vue`

## Out of scope

- Persistent match history (excluded by spec §3).
- Leaderboards, achievements.
- Custom round limit beyond the existing 5/10/20/Unlimited options.

## Notes for implementation

- If you reuse `RoundSummaryModal` with a flag, the title swaps from "Round complete" to "Match complete" and "Next Round" becomes "Play Again."
- Keep the round counter logic inside the store, not the component, so it stays serializable for P2.
