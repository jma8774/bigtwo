# TICKET-014: 3-player deal — one player gets 18 cards, no discard

## Status

Done

## Goal

Switch the 3-player deal from "17 cards each + discard the 52nd" (current behavior per ADR-0003) to "17 cards to two players, 18 to one." Every card is dealt, nothing is wasted, and the 3♦-on-discard edge case (~2% probability) disappears.

## Background

ADR-0003 picked the discard variant for MVP simplicity. The unhandled edge case where 3♦ lands on the discard pile would crash `startRound`. Dealing all 52 cards eliminates that class of bug entirely. The cost is asymmetric starting hand sizes, which is a fine and common house rule for 3-player Big Two.

## Requirements

- Update `src/game/deck.ts`:

  ```ts
  export function deal(deck: Card[], playerCount: 3 | 4): Card[][] {
    if (playerCount === 4) {
      // unchanged: 13 each
    }
    // 3-player: deal all 52 cards round-robin. One seat ends up with 18, others 17.
    // Randomize which seat gets the extra so the human isn't always advantaged/disadvantaged.
    const offset = Math.floor(Math.random() * 3)
    const hands: Card[][] = [[], [], []]
    for (let i = 0; i < 52; i++) hands[(i + offset) % 3].push(deck[i])
    return hands
  }
  ```

  (If we add a seeded RNG later, plumb it through here too instead of `Math.random`.)

- `startRound` already finds the 3♦ holder via `hands[p.id].some(c => c.id === '3-diamonds')`. With every card dealt, there's always a holder — remove the "unreachable" error path (or replace it with a defensive `throw` that genuinely shouldn't fire).

- The player with 18 cards still leads the first trick if they hold 3♦. Same 3♦ first-play rule.

- Scoring is unchanged: `cardsRemaining × cardValue`. The player starting with 18 carries the slight disadvantage if they don't shed them.

## Acceptance criteria

- 3-player game deals 18 + 17 + 17 = 52 cards. Sum equals deck size.
- The seat that gets 18 cards varies across games (random offset).
- 3♦ is always in someone's hand; no crash possible from the discard variant.
- 4-player flow unchanged: still 13 each, 52 used.
- Existing tests still pass; ideally add a quick test that 3-player deal sums to 52 with one hand having 18.

## Files likely involved

- `src/game/deck.ts`
- `src/game/gameState.ts` (`startRound` — review the "unreachable" error path)
- `src/game/deck.test.ts` (new — quick property test)
- `ai/decisions/ADR-0003-three-player-deal.md` — mark superseded by a new ADR, OR rewrite ADR-0003 with the new variant
- `ai/context/domain-model.md` — update the Round step about dealing

## Out of scope

- Seeded RNG plumbing for deterministic shuffles (separate concern).
- Compensating the 18-card player with bonus scoring or anything fancy. They just have to dump faster.

## Notes for implementation

- Author a new ADR (ADR-0004) that supersedes ADR-0003 rather than rewriting history. Keep the chain readable.
- This implicitly closes the "3♦-in-discard edge case" follow-up I'd mentioned in the open-tickets list.
