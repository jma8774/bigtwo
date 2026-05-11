# ADR-0002: Passing only skips the current turn — players can re-enter the trick

## Status

Accepted

## Context

Spec §10 ("Passing Rule") and §31 ("Open Product Decisions") describe two variants:

1. **Lock-out (spec-recommended MVP):** once a player passes during a trick, they cannot play again until the trick resets. Simpler to reason about.
2. **Re-entry:** passing only skips the current turn. When the turn comes back around, the player can play again. Supports bluffing — holding a high card, baiting an opponent into committing, then beating them.

The spec recommended (1), and TICKET-003's first implementation followed that rule.

## Decision

Adopt variant (2). Passing only skips the current turn. A player who passes is **not** removed from turn order — when the play comes back around, they can play, pass, or be passed again.

The trick still ends when every other still-in-the-round player passes **consecutively** since the last play. Any play resets the consecutive-pass count.

## Consequences

Benefits:
- Strategic depth: holding back, bluffing, baiting are all legal.
- Matches what a lot of casual house-rules tables play.
- More forgiving for newer players who pass too eagerly.

Tradeoffs:
- Trick-end detection is now based on a consecutive-pass count rather than a "who's locked out" set. Slightly more state to reason about (we use `passedPlayerIds` as the consecutive-pass list, cleared on any play).
- Players may feel the game drags if they keep passing and missing their window. UI should make it clear when it's your turn (sound + topbar hint already cover this).

Constraints this locks in:
- `nextActivePlayer` in `rules.ts` does **not** skip players in `passedPlayerIds`. It only skips empty-handed players.
- `applyPlay` clears `passedPlayerIds` to `[]`.
- `applyPass` appends to `passedPlayerIds`; trick resets when the list length equals (active players − 1).

## Alternatives considered

- **Stay with spec (lock-out):** rejected. User explicitly requested the bluff-friendly variant during P1 playtesting.
- **Hybrid (lock-out, but one mulligan):** more complex, not requested, no clear benefit.
- **Configurable via room setting:** premature. Add later if multiple house rules emerge.
