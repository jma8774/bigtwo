# TICKET-020: Keyboard navigation for the hand

## Status

Backlog

## Goal

Let players play the entire game from the keyboard. Arrow keys move focus through hand cards, Space toggles selection, Enter plays the selected hand, P passes. Improves accessibility and is faster than mousing for power users.

## Background

Today the hand is mouse/touch-only. Each `PlayingCard` is a `<button>` element so it's individually tab-able, but there's no useful keyboard model for the row (Tab cycles one card at a time; Space toggles a single button's click; no concept of "currently focused" beyond browser focus ring).

## Requirements

### Focus model

- Single tab stop on the hand area (the `<TransitionGroup>` container). Tabbing into the area focuses the first non-selected card (or last-focused card if user returns).
- Within the hand, arrow keys move focus:
  - `←` / `→` → previous / next card in current order
  - `Home` / `End` → first / last card
- `Space` toggles selection of the focused card.
- `Enter` triggers Play Selected when `canPlay` is true; no-op otherwise (shake the panel like an invalid click).
- `P` (or `Esc`?) passes the turn when `canPass` is true.

### Sort + drag accessibility

- Sort buttons (rank/suit/smart) get standard button focus rings, already Tab-able.
- Drag-to-reorder via keyboard: `Alt+←` / `Alt+→` moves the focused card one slot in that direction. Skip for v1 if it complicates things.

### Visual focus indicator

- Focused card gets a `ring-2 ring-brand-300 ring-offset-2` (distinct from the selected card's `ring-2 ring-brand-500`).
- Focus state persists across re-renders so reordering doesn't dump it.

### Screen reader hints

- `aria-label` on each card: `"3 of diamonds, selected"` / `"3 of diamonds, not selected"`.
- The hand container gets a `role="listbox"` and each card `role="option"` with `aria-selected`. (Or `application` role if listbox interferes with arrow-key handling — the standard listbox pattern uses arrow keys to move focus.)
- Live region announces successful plays and errors (the shake currently has no a11y signal).

## Acceptance criteria

- A keyboard-only user can:
  - Tab into the hand
  - Use arrow keys to move through cards
  - Space-toggle multiple selections
  - Enter to play, P to pass
  - Tab back out to the action bar
- Screen readers announce focus changes and selection state.
- Sighted-keyboard users see a distinct focus ring on the active card.
- Mouse and touch flows are unaffected.

## Files likely involved

- `src/components/HandArea.vue` — bulk of the change (keydown handler, focus tracking, role attributes)
- `src/components/PlayingCard.vue` — focus styles, aria-label
- `src/pages/GamePage.vue` — wire `P` shortcut at page level, maybe `Enter` if not caught by hand
- Possibly a small a11y live-region component for play/error announcements

## Out of scope

- Keyboard navigation across the rest of the app (modals, lobby, etc.). Those use native focusable elements and already work.
- Drag-to-reorder via keyboard if scope creeps — fine to ship without and add later.
- Voice control / switch control specific support beyond standard ARIA.

## Notes for implementation

- Vue's `@keydown.left.prevent` / etc. shortcuts make this readable. Bind on the container, not individual cards.
- Maintain a `focusedIndex: ref<number>` that the renderer uses to apply a `tabindex="0"` to the current card and `tabindex="-1"` to others (roving tabindex pattern).
- When a card leaves the hand mid-game (play / reorder), reset focusedIndex to a safe value.
- Don't conflict with existing pointer-event drag handlers — keyboard interaction is independent.
