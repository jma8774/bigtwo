# TICKET-024: Ready check between rounds over WebSockets

## Status

Backlog (depends on TICKET-023)

## Goal

Move the ready-check gate to the server. Between rounds (and after the final round of a match), the server holds the game in `roundOver` / `matchOver` until every seated player has emitted `readyForNextRound`. UI is already built (see TICKET-011-era ready check); just needs the network plumbing.

## Background

P1 fakes the ready check: human clicks Ready, bots auto-ready with a 220ms stagger, then `startRound` runs. P2 needs the server as source of truth so two human players actually wait on each other.

Spec hooks: `ai/context/api-contracts.md` already documents the contract under "Ready check semantics."

## Requirements

### Server-side events

Client → server:

```ts
readyForNextRound({ roomCode })
```

Server → client (room-scoped):

```ts
playerReady({ playerId })            // broadcast on each readyForNextRound
readyCheckSatisfied()                // all players ready; next round about to start
```

### Server behavior

- Track `readyPlayerIds: Set<PlayerId>` per room, reset on each `startRound`.
- On `readyForNextRound`:
  1. Validate sender is in the room and game is in `roundOver` or `matchOver`.
  2. Add their `playerId` to the set; broadcast `playerReady`.
  3. If set covers every seated player, emit `readyCheckSatisfied`, then run `startRound` (for `roundOver`) or reset+start round 1 (for `matchOver`) and emit the resulting `gameUpdated` to each client.
- Bots auto-ready on the server immediately (or with a small stagger for visual consistency — pick one).
- Disconnected players auto-ready after their 30s grace timer expires (overlap with TICKET-008's disconnect handling).

### Frontend changes

- `gameStore.onReady` emits `readyForNextRound` instead of locally marking the human ready + manually staggering bots.
- Listen on `playerReady` and `readyCheckSatisfied`:
  - `playerReady` → add the player id to local `readyIds`.
  - `readyCheckSatisfied` → modal closes once the next `gameUpdated` lands.
- Local stagger logic in `gameStore.onReady` is removed; the visual stagger comes from the server's sequence of `playerReady` events (which already arrive with realistic latency).

### Match-over flow

The match-over path still goes home via the modal's `Back to Home` button (no ready check, per the earlier decision). `readyForNextRound` only applies to `roundOver`. `playAgain` becomes a fresh `createRoom` + same settings via the client.

## Acceptance criteria

- Two humans in the same room finish a round; the next round doesn't start until both have clicked Ready.
- One human + bots: bots auto-ready on the server; human sees their checkmarks populate and the round advances.
- Disconnected player → 30s passes → auto-ready fires → round advances.
- Match-over modal goes straight to "Back to Home" (no ready check, no auto-ready).

## Files likely involved

- `backend/src/rooms.ts` — `readyPlayerIds` per room
- `backend/src/socket.ts` — events
- `frontend/src/stores/gameStore.ts` — drop local stagger, emit + listen
- `frontend/src/pages/GamePage.vue` — simplify `onReady`

## Out of scope

- Disconnect grace timer wiring (TICKET-008 owns this; this ticket just consumes the auto-ready hook).
- Mid-round leave / forfeit (separate concern, not ticketed yet).

## Notes for implementation

- Test the disconnect + auto-ready interaction carefully — easy to get the timer and the readyIds Set out of sync.
- Keep the visual stagger by letting the server emit `playerReady` events one at a time as bots' "decisions" come in, rather than batching them. Looks more natural.
