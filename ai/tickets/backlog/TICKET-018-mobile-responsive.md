# TICKET-018: Mobile / responsive layout (P3)

## Status

Backlog (P3 per spec §24 — defer until P2 multiplayer lands)

## Goal

Make the entire app usable on mobile devices (~360–430px viewports) without sacrificing the desktop experience. Spec §24 lays out the constraints; this ticket consolidates them into one frontend pass.

## Background

P1 was explicitly desktop-first. Mobile layouts will break in several places today:
- `GamePage` uses `h-screen overflow-hidden` + a tightly-packed three-section flex column; on small viewports the hand panel and player panels collide.
- `HandArea` flexes 13 cards in a single row inside `overflow-x-auto`; on phones you swipe a lot and the lift-on-select is cramped.
- `ChatPanel` is a fixed 360×480 floating card — doesn't fit on a 360px screen.
- `RulesModal` content stacks but the card-row examples are wide.
- `CurrentPlay`, `RoundSummaryModal`, `PlayerPanel` all assume desktop-sized real estate.

## Requirements

### Layout (GamePage)

- Switch the page layout below `md` (or `sm`) breakpoint so:
  - Top: condensed opponent row (smaller PlayerPanels, possibly 2-up grid that wraps).
  - Middle: `CurrentPlay` + pile shrink — smaller cards, tighter spread.
  - Bottom: sticky hand bar (always visible) + action bar pinned just above it.
- Drop `h-screen overflow-hidden` constraint on mobile in favor of natural scroll, or keep with `safe-area-inset` adjustments.

### Hand presentation

- Don't fan — user explicitly said no fanned hand.
- Horizontal scroll row works on mobile too, but with a slightly larger touch target. Bump card `sm` size on touch / narrow viewports.
- Lift-on-select stays a transform-only animation.

### Floating chat panel

- Below `sm`, expanded `ChatPanel` becomes a bottom sheet covering ~75% of viewport height instead of a floating 360×480 card. Chip stays bottom-right.
- Backdrop tap closes the sheet.

### Topbar

- Hide / collapse non-essential right-side buttons into an overflow menu (Sound / Rules / Leave / Scoreboard) below `sm`. Keep room code + round.

### CreateRoomPage, LobbyPage, JoinRoomPage, RulesPage

- These are forms / lists; they'll mostly reflow with existing utility classes. Audit padding and font sizes for mobile.
- LobbyPage's two-column layout collapses to single column.

### Action bar

- Buttons wrap; add `flex-wrap` and tighten paddings on narrow viewports.

### Touch interactions

- Drag-to-reorder uses pointer events already, so it works with touch in theory. Verify with a real device. Add `touch-action: none` already in place on each card wrapper.
- Long-press to drag (per spec) is nice-to-have but the existing tap-and-drag may suffice if it doesn't interfere with scrolling.

## Acceptance criteria

- App is fully playable on iPhone-size viewports (375px portrait).
- No horizontal overflow on any page.
- Hand cards stay readable (rank + suit visible without zooming).
- Chat panel doesn't cover essential UI when expanded.
- Tap targets meet the standard 44×44 minimum.
- Desktop experience is unchanged at `lg+`.

## Files likely involved

- `src/pages/GamePage.vue` — layout overhaul
- `src/components/HandArea.vue` — touch tuning
- `src/components/ChatPanel.vue` — sheet variant
- `src/components/AppTopBar.vue` — overflow menu
- `src/components/PlayerPanel.vue` — compact variant
- `src/components/CurrentPlay.vue` — smaller default sizes at sm

## Out of scope

- Native app shell.
- PWA installability.
- Offline gameplay.
- Fanned hand (explicit no).

## Notes for implementation

- Use Tailwind's `sm:` / `md:` / `lg:` prefixes for breakpoint-specific overrides; don't introduce a separate mobile component tree.
- Test on real devices early. Browser devtools "responsive mode" misses touch issues.
