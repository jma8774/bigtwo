# TICKET-015: Animate pile-card arrival

## Status

Done

## Goal

When a play resolves and the previous `currentPlay.cards` move into `playedPile`, animate them sliding/fading from their `CurrentPlay` slot into their pile position rather than popping in instantly. Subtle physical feel; no casino flourish.

## Background

Today `moveCurrentPlayToPile` mutates state synchronously: the cards disappear from the center and appear at their final pile coordinates in the same render tick. The pile already looks great once it grows, but the *transition* feels abrupt. A short slide+fade would sell the "card hits the table" moment.

## Requirements

- Each pile card carries `pileMeta` (xRatio, yRatio, rotation, zIndex) that's stable after entry. We'll animate the **first paint** of each pile card from "center / no rotation / no offset" to its stored meta.

### Approach (lightweight)

- Wrap each pile card render in a Vue `<Transition appear>` (or use a CSS `@keyframes` triggered on mount). On enter:
  - Start: `transform: translate(0, 0) rotate(0deg) scale(1)`, `opacity: 0.7`
  - End: `transform: translate(xRatio…) rotate(rotation) scale(0.9)`, `opacity: 0.8`
  - Duration ~250–320ms, ease-out

- The cards that move *together* (a pair, triple, five-card) should stagger their start by ~40–60ms so the play feels like cards being dropped one-by-one rather than as a single blob.

- Once landed, the pile card never animates again (per TICKET-012). Stability rules unchanged.

### Edge cases

- Round end / `startRound` clears the pile; no animation needed (the modal already covers the transition).
- Rapid bot turns: if a new play lands while previous pile entries are still mid-arrival, both should be fine — each pile card has its own transition lifecycle. Don't share state.
- Reorder of `playedPile` shouldn't happen, but if items are re-keyed for any reason, don't re-animate. Use `:key="pileCard.id"` (stable).

## Acceptance criteria

- Watch a play resolve: cards visibly drift from the center into their scattered pile positions over ~300ms.
- Staggered start within the same play (40–60ms apart).
- No re-animation on subsequent renders, regardless of what changes elsewhere (hand sort, chat open, bot turn, scoreboard, resize).
- Reduced-motion media query (`prefers-reduced-motion: reduce`) disables the transition — cards just appear at their final position.

## Files likely involved

- `src/components/PlayedCardPile.vue` — wrap each card in `<Transition appear>` or apply an enter animation
- Possibly a small CSS keyframe block

## Out of scope

- Animating cards back **out** of the pile (we never do).
- Animating the `currentPlay` cards being played from the player's hand to center — see TICKET-006 (already shipped for the human's hand cards; bots' plays come straight to center, separate animation if desired).
- Sound cue per pile card (the existing card-play sound already fires).

## Notes for implementation

- Stagger via `style="animation-delay: 40ms * index"` rather than per-card setTimeouts so Vue's render can stay declarative.
- Use `transform` + `opacity` only (per `ai/conventions.md`).
- If keyframe approach: define the destination as CSS custom properties (`--x`, `--y`, `--rot`) so the keyframe interpolates correctly.
