# TICKET-017: Richer bot "thinking" indicator during the 700ms turn delay

## Status

Done

## Goal

Make the wait between a bot's turn starting and their play resolving feel intentional. Today the active opponent gets a small pulsing dot + "Their turn" pill (good) but during the 700ms `setTimeout` inside `gameStore.scheduleBotIfNeeded` nothing additional changes. Add a brief "thinking" affordance so the player perceives the bot as deliberating.

## Background

The bot delay (`BOT_TURN_DELAY_MS = 700`) exists so plays don't fire too fast to follow. Adding a visual cue during that window — a typing-style ellipsis, a progress bar, or a subtle shimmer — sells the moment. Spec §14 hints at this but doesn't specify the indicator.

## Requirements

- During the 700ms delay between a bot becoming the current player and `applyPlay` / `applyPass` resolving, surface a "thinking" state on that bot's `PlayerPanel`.

### Suggested indicators (pick one or combine)

1. **Animated ellipsis** next to "Their turn": `Their turn .` → `..` → `...` → `.` cycling every ~200ms.
2. **Subtle shimmer** on the panel border or card-count number.
3. **Tiny linear progress bar** under the panel that fills over the 700ms, then resets.

Option 1 is the lightest. Option 3 is the most "deliberate" but might feel like loading UI. Recommend starting with option 1; reach for 2 or 3 if it isn't enough.

### Implementation sketch

- `gameStore` exposes a `botThinkingId: PlayerId | null` ref that's set when the delay starts and cleared when the move applies.
- `PlayerPanel` accepts a `thinking?: boolean` prop. When true and `status === 'turn'`, the indicator activates.
- GamePage's `opponents` computed flips `thinking` to true for the player whose id matches `botThinkingId`.
- Indicator is a small component or inline CSS animation (transform/opacity only per conventions).

### Honest constraints

- The indicator only runs while the bot is "thinking." It must clear cleanly when `applyPlay` / `applyPass` fires or when the round ends.
- Reduced-motion (`prefers-reduced-motion: reduce`) should disable any animation — static "…" is fine.
- Don't extend the existing 700ms. Visual cue runs concurrently; play resolves on schedule.

## Acceptance criteria

- During the 700ms delay before a bot plays, their `PlayerPanel` shows a visible "thinking" affordance.
- The indicator clears when the bot's move applies (no lingering animation).
- Human's turn never triggers the thinking indicator.
- Reduced-motion gracefully degrades.

## Files likely involved

- `src/stores/gameStore.ts` — `botThinkingId` ref, set/clear inside `scheduleBotIfNeeded`
- `src/components/PlayerPanel.vue` — new `thinking?: boolean` prop, indicator markup
- `src/pages/GamePage.vue` — thread the ref through `opponents` computed

## Out of scope

- Variable bot "think time" based on difficulty (Basic always 700ms for now).
- Sound during the wait.
- Showing what the bot is considering (no!).

## Notes for implementation

- Tailwind has `animate-pulse` already; consider a custom keyframe for the ellipsis (cycling through `.` / `..` / `...` via content swap is cleaner).
- Don't overuse the brand color — keep the indicator slate so it reads as "system" not "alert."
