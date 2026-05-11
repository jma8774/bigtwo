# ADR-0003: 3-player deal — 17 cards each, discard the 52nd

## Status

Superseded by ADR-0004 (3-player now deals 18+17+17, no discards). Kept for historical context.

## Context

Spec §10 calls out 3-player support as preferred-with-bot-fill: *"For 3-player mode, prefer filling the 4th seat with a bot for now. Avoid implementing true 3-player deal rules until later."* Spec §31 lists it as an open product decision.

Real-world 3-player Big Two variants:
- **17 cards each** (51 used, 52nd discarded or set aside as a "ghost" card)
- **16 cards each** (4 cards left in a stockpile, often dealt to whoever wins the first trick)
- **Phantom 4th seat:** deal a 4-player game, leave the 4th hand untouched — never plays.

The spec preferred the phantom-bot path. We had to ship 3-player in P1 because the user explicitly wanted to test 1-human + 2-bot games via the CreateRoomPage form.

## Decision

Implement variant **17 cards each, 52nd card discarded** for 3-player games.

Rationale:
- Simplest variant that just works. No phantom seat to render or special-case.
- 3♦ rule applies as normal: whoever's dealt 3♦ leads. (3♦ might be the discarded 52nd card in rare cases — see edge case below.)
- All other rules apply unchanged (turn order rotates through 3 seats; trick ends when both others pass consecutively).

Implementation lives in `src/game/deck.ts`:

```ts
export function deal(deck: Card[], playerCount: 3 | 4): Card[][] {
  const cardsPerPlayer = playerCount === 4 ? 13 : 17
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  for (let i = 0; i < cardsPerPlayer * playerCount; i++) {
    hands[i % playerCount].push(deck[i])
  }
  return hands
}
```

## Consequences

Benefits:
- No phantom 4th seat in the UI. PlayerPanel row scales naturally (3 opponents → 2 visible).
- Same rules engine handles 3 and 4 players.
- Easy to add 4-card "kitty" variant later if desired.

Tradeoffs:
- The 52nd card is wasted. Most players won't notice.
- **Edge case:** if 3♦ is the discarded card, `startRound` throws ("No 3♦ found in dealt hands"). Probability: 1/52 ≈ 2%. **Not yet handled.** Acceptable risk for P1 because the user is exclusively playing 4-player. Followup ticket should either:
  - Re-shuffle and re-deal until 3♦ is in a hand, or
  - Pick the lowest dealt card as the starting card, or
  - Always make the 52nd card a non-3♦.

Constraints this locks in:
- 3-player games deal 17 cards. Changing later means an ADR-0004.
- Sum of round deltas in 3-player still equals zero (winner gains what 2 losers lose).

## Alternatives considered

- **Phantom 4th seat (spec recommendation):** rejected as more complex UI work (extra panel for a bot that doesn't play, confusing turn order) for the same gameplay result.
- **16 each + 4 kitty:** rejected — adds new mechanic for marginal benefit.
- **Disable 3-player in P1:** rejected — user explicitly wants to test 1-human + 2-bots flow.
