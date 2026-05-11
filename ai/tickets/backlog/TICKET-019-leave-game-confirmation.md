# TICKET-019: Confirm before leaving an active game

## Status

Backlog

## Goal

When a player clicks the topbar's **Leave** button (or any other path that ends the game) while a round is in progress, show a confirmation modal asking them to confirm. Don't prompt at all when the game has already ended or is in lobby state.

## Background

Today the Leave button silently calls `gameStore.endGame()` and routes home. One stray click during a hot trick and the whole table is gone. Adding a confirmation step is cheap insurance.

In P2, leaving an online table also affects other players — the confirmation language should reflect "you'll leave your seat" rather than just "the game will end."

## Requirements

- Add a small reusable `ConfirmModal.vue` component (or inline the modal in `GamePage.vue` if not used elsewhere yet) with:
  - Title (e.g., "Leave the table?")
  - Body (e.g., "The current round is still in progress. You can't rejoin this match.")
  - Two buttons: secondary `Stay` and primary `Leave`
- `GamePage.vue` intercepts `AppTopBar.@leave`:
  - If `state.status === 'playing'` → show the confirm modal
  - Otherwise (waiting, roundOver, matchOver, null) → leave immediately as today
- Confirm modal close paths:
  - `Stay` button → close, no action
  - Backdrop click / Escape → close, no action
  - `Leave` button → call `game.endGame()` + route to `/`

## Acceptance criteria

- Clicking Leave during `'playing'` opens a confirm dialog.
- Clicking Leave during `'roundOver'`, `'matchOver'`, or with no active game does not prompt.
- Confirming the dialog ends the game and routes home.
- Cancelling leaves the game state intact.
- Esc / backdrop tap dismisses without ending the game.
- No flicker on the modal.

## Files likely involved

- New `src/components/ConfirmModal.vue` (or inline)
- `src/pages/GamePage.vue` — hook the topbar `@leave` event
- Possibly `src/components/AppTopBar.vue` if we want the prompt logic centralized (probably not — keep AppTopBar dumb)

## Out of scope

- Confirmation on browser-tab close (`beforeunload`). Different surface, separate concern.
- Confirmation on `LobbyPage` Leave — there's nothing to lose pre-game.
- "Are you sure you want to forfeit?" gameplay penalty. We don't track forfeits.

## Notes for implementation

- Reuse the existing fade-up transition style from `RoundSummaryModal` so the modal feels consistent.
- Keep copy friendly: "Leave the table?" not "Quit?". Match the tone guide in `ai/conventions.md`.
