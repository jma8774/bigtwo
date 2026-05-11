# ADR-0004: 3-player deal — 18+17+17, no discards

## Status

Accepted. Supersedes ADR-0003.

## Context

ADR-0003 chose the "17 each + discard the 52nd card" variant for 3-player Big Two, knowing it had a ~2% edge case where 3♦ would land on the discard and crash `startRound`. We never handled the case because the user was playing exclusively 4-player at the time.

Switching to "deal all 52" eliminates the bug class entirely and matches a more common house rule for 3-player: one player gets the leftover card.

## Decision

3-player Big Two deals **18 + 17 + 17**:

- All 52 cards are dealt.
- Distribution is round-robin starting from a random seat (`offset = Math.floor(Math.random() * 3)`), so the seat that gets the extra 18th card varies game-to-game.
- 4-player flow is unchanged: 13 cards each.

Implementation lives in `src/game/deck.ts::deal`.

## Consequences

Benefits:
- No more 3♦-in-discard crash; the unreachable error path in `startRound` truly cannot fire.
- Random offset means the human seat isn't permanently advantaged or disadvantaged.
- More natural-feeling deal — no card silently disappears.
- One more card on the table = a slightly longer and slightly higher-variance game, which feels good with 3 players.

Tradeoffs:
- Asymmetric starting hands. The 18-card player starts with one extra unit to dump. In scoring terms it's no different (scoring is per remaining card), but psychologically it's a small handicap.
- Random `offset` adds non-determinism beyond the shuffle. Tests should inject the RNG when this matters (not yet plumbed through `deal`, but is for `shuffle`).

Constraints this locks in:
- `deal(deck, 3)` always returns 3 hands totaling 52 cards.
- One hand has 18, two have 17. Tests enforce this.

## Alternatives considered

- **Keep ADR-0003 (17 + discard):** the easy default, but the edge case is real and the user has now hit it in practice testing. Move on.
- **Deal 16 each with a 4-card kitty given to the trick-1 winner:** more complex, adds a new mechanic, no demand for it.
- **Phantom 4th bot:** rejected in ADR-0003; remains the worst option for UI complexity.
