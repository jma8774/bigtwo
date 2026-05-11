# TICKET-016: Show 1st / 2nd / 3rd / 4th rankings in the Match Summary

## Status

Done

## Goal

When the match ends (`status === 'matchOver'`), the `RoundSummaryModal` currently labels every row "Final standing" with the cumulative score. Replace that secondary label with the player's **rank** (1st, 2nd, 3rd, 4th) sorted by total score. Tied scores share the same rank (e.g., two players at "2nd").

## Background

Round-end view shows per-round math (`8 × $10`) and a "Cleared the hand" badge for the round winner — useful, specific. Match-end currently shows a generic label that doesn't tell you much. Rankings make it clear who came out on top across the whole match.

## Requirements

- Compute ranks in `GamePage.vue`'s `summary` computed (or push the logic into the modal — caller's choice).
- Standard competition ranking ("1224"): tied players share a rank, the next rank skips. E.g., two players at 50, two at 30 → ranks 1, 1, 3, 3.
- Match Summary rows already sort by score descending in the existing computed. Add the rank to each row before passing to the modal.
- Modal renders the rank prominently:
  - Replace "Final standing" with `1st place`, `2nd place`, `3rd place`, `4th place`.
  - Optional: highlight 1st with the existing emerald tint (already in place when `isWinner`).
- Round Summary view is unchanged — rankings only apply when `isFinal`.

### Visual

```
1st place · You          +$320
2nd place · Alex         +$80
3rd place · Riley        -$60
4th place · Ming         -$340
```

## Acceptance criteria

- Match Summary shows correct rank for each player.
- Ties handled with competition ranking (shared rank + skip).
- Winner row still tinted emerald.
- Round Summary unchanged (no rank labels).
- The "Cleared the hand" label still appears for the round winner during round-over (not match-over).

## Files likely involved

- `src/pages/GamePage.vue` — extend `summary.rows` with a `rank?: number` field when `isFinal`
- `src/components/RoundSummaryModal.vue` — render rank in the secondary label slot when `isFinal && row.rank`

## Out of scope

- Confetti / fireworks / trophy icons for the winner — keep the friendly-and-clean tone.
- Per-round leaderboards mid-match (the topbar score in PlayerPanels is enough during play).
- Tiebreakers beyond shared-rank.

## Notes for implementation

- "X1st place" / "X2nd place" / etc. — use plain English with the ordinal suffix. Compute via a tiny helper to handle 11th–13th edge cases properly (in case round limits ever exceed 10 or scoring becomes weird).
