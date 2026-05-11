# TICKET-008: Multiplayer reliability (P2 Milestone 6)

## Status

Backlog

## Goal

Make P2 robust: handle disconnects with a 30s turn timer and auto-pass / auto-play, surface disconnected status in the UI, expire idle rooms, and document the deploy.

## Background

P2 Milestone 6 from spec §23 and §27. Depends on TICKET-007.

## Requirements

- 30s disconnect timer per disconnected player. On expiry, if it's their turn: auto-pass when allowed, else auto-play the lowest legal move.
- `turnTimerUpdated({ playerId, deadlineAt })` and `autoActionTaken({ playerId, action })` events emitted as appropriate.
- Client renders "Disconnected · auto-pass in 24s" on the opponent panel.
- Room expiration sweep:
  - Waiting rooms expire after 30 min inactivity.
  - Active rooms expire after all players disconnected for 10 min.
  - Completed rooms expire 5 min after final round.
- Deployment doc: pick a host, document the steps, capture in `ai/context/deployment.md`.

## Acceptance criteria

- Disconnecting a player on their turn does not stall the game.
- Disconnected opponent panel reflects the countdown.
- Reconnecting cancels the disconnect timer and restores the seat.
- Idle rooms eventually disappear from the server's map.

## Out of scope

- Persistent storage (Redis, DB).
- Host transfer (later ticket if needed).
- Horizontal scaling.

## Files likely involved

- `server/src/rooms.ts` (timers, expiration)
- `server/src/socket.ts` (auto-action emission)
- `src/components/PlayerPanel.vue` (countdown display)
- `ai/context/deployment.md`
