# TICKET-006: P1 polish — sounds, animations, sort, drag

## Status

Done

## Goal

Finish Milestone 4 polish: card-play sound, round-win sound, CSS transitions on card lift / fade-out, sort by rank, sort by suit, and (if feasible) drag-to-reorder hand.

## Background

The game should be playable after TICKET-005. This ticket makes it feel good. Spec §15 (sounds), §16 (animations), §17 (drag).

## Requirements

- Add `src/assets/sounds/card-play.mp3` and `round-win.mp3` (place actual files; if licensing is unclear, leave a `TODO:` and add a follow-up).
- `playSound(name)` helper that respects `settingsStore.soundEnabled`. Persist `soundEnabled` in `localStorage` under `bigTwoSettings`.
- Trigger `cardPlay` when human or bot successfully plays cards.
- Trigger `roundWin` when the Round Summary modal opens.
- CSS transitions:
  - Selected card lifts (transform: translateY(-14px), 140ms ease).
  - Played card fades+slides out of hand.
  - Current play fades+slides into center.
  - Round Summary modal fade-in.
- Animate only `transform` and `opacity`.
- Sort by Rank and Sort by Suit operate on local hand order in the store (already exposed by TICKET-005).
- Optional: drag-to-reorder for desktop. Tap/click for select, drag for reorder. If this is fiddly, defer to its own ticket; do not block on it.

## Acceptance criteria

- Sounds play during card plays and round-win, and respect the toggle.
- Setting persists across reloads.
- No layout thrash on selection or play — all animation via `transform`/`opacity`.
- Sort buttons work and re-order the rendered hand.
- If drag is included: it does not interfere with selection click, and it only changes local UI order.

## Out of scope

- Mobile-specific interactions (P3).
- Confetti, particles, casino effects.
- Sound for every interaction.

## Files likely involved

- `src/assets/sounds/`
- `src/stores/settingsStore.ts`
- `src/components/PlayingCard.vue` (transitions, drag handlers)
- `src/components/HandArea.vue` (sort)
- `src/components/RoundSummaryModal.vue` (modal transition)
- Some shared transition CSS

## Notes for implementation

- Use Vue `<Transition>` / `<TransitionGroup>` for enter/leave; keep selection lift as a pure CSS class toggle for performance.
- Browser autoplay policy: card-play and round-win both follow user gestures, so this should be fine. If audio fails the first time, swallow the error silently.
