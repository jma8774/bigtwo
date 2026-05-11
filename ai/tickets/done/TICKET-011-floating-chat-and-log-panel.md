# TICKET-011: Floating chat + log panel (replaces scoreboard modal)

## Status

Done

## Goal

Replace the top-right Scoreboard modal with a single floating panel anchored to the bottom-right of the GamePage. The panel is collapsed by default (small floating tab/button) and expands on click to show two stacked sections:

1. **Game log** — system-generated move log entries ("Riley played pair 9♣ 9♥", "Alex passed", "Ming auto-passed", etc.). Same content as the existing `MoveLog` component.
2. **Player chat** — free-text messages from players. P1 has no remote players, so this is just self-chat for now (and bot canned remarks could land here later). P2 wires this to a real `sendChat` socket event.

Also: remove the current `ScoreboardModal` and the topbar Scoreboard button. Scores already live on `PlayerPanel`s (each opponent shows their total), so the dedicated scoreboard view is redundant.

## Background

The Scoreboard modal duplicates information already visible in the player panels. Meanwhile we have nowhere obvious for the move log to live (we removed it from the sidebar when reclaiming width), and chat (P2 feature) needs a home. A combined floating panel solves both.

Spec §3 lists chat as a P1/P2 non-goal but allows space for it; spec §22 lists `sendChat` as an optional P2 event. We're staging the UI now so P2 can drop the data in.

## Requirements

### Floating panel UI

- Fixed at the bottom-right of the viewport (e.g., `bottom-4 right-4`).
- Two states:
  - **Collapsed**: a small chip/button with a chat-bubble icon and an unread count (if any new log entries since last open). Maybe ~48px square.
  - **Expanded**: a card ~360px wide × 480px tall, with a header, tab switcher, content area, and (for chat) an input at the bottom.
- Click the chip to expand. Click the X / header to collapse.
- Smooth open/close transition (CSS, transform/opacity only).
- Tabs at the top: "Log" and "Chat". Default to "Log" when opened.

### Game log tab

- Reads from `gameStore.state.moveLog`.
- Same row design as the existing `MoveLog.vue` component (dot color by entry type, message, timestamp). Reuse the component if practical.
- Auto-scroll to the most recent entry when a new one appears while the panel is open.

### Chat tab

- Textarea or input at the bottom; Enter sends.
- Local-only in P1: messages get prepended with the player's nickname and appended to a local chat list.
- Visual treatment: bubbles or rows, with sender name and time.
- In P1, the chat is purely cosmetic — no bot replies, no remote players. P2 ticket TICKET-007 wires `sendChat` / `chatReceived` socket events.

### Removals

- Delete `src/components/ScoreboardModal.vue`.
- Remove the Scoreboard button from `AppTopBar.vue` (revert the `showScoreboard` prop and emit).
- Remove the scoreboard-related state from `GamePage.vue`.

## Acceptance criteria

- The Scoreboard modal is gone; opening the game shows only the player panels + current play + hand.
- A small chat chip is visible at the bottom-right. Clicking it expands the panel.
- The Log tab shows the same move-log content the old `MoveLog` showed.
- The Chat tab has a working local input; typing + Enter adds messages to a local list.
- New log entries while collapsed bump the unread count on the chip.
- Reopening the panel resets the unread count.

## Files likely involved

- New `src/components/ChatPanel.vue`
- `src/components/AppTopBar.vue` (remove scoreboard prop/button)
- `src/pages/GamePage.vue` (mount the new panel, remove scoreboard modal)
- Delete `src/components/ScoreboardModal.vue`
- Possibly refactor `src/components/MoveLog.vue` to be embeddable inside the panel

## Out of scope

- Bot chat / canned remarks. Defer.
- Remote chat (P2 / TICKET-007). UI is ready; wiring is later.
- Emoji picker, message reactions, moderation.

## Notes for implementation

- Keep all chat state local in the store for now; don't try to predict the P2 socket shape too tightly.
- "Unread" tracking can be as simple as `unreadLogCount: ref(0)` that increments on new `moveLog` entries when `!isOpen`, and resets when opened.
- The panel should not block clicks on cards behind it. Use `pointer-events-none` on the wrapper with `pointer-events-auto` on the chip / expanded card.
- This is the right place to address mobile concerns later: the floating panel can become a full-screen sheet on small screens.
