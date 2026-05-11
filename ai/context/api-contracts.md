# API Contracts

## API style

- **P1:** no remote API. All interactions are local function calls between Vue components, Pinia stores, and pure functions in `src/game/`.
- **P2:** Socket.IO. Bidirectional events. No REST. Authoritative state lives server-side; client emits intents and renders server-pushed snapshots.

## Authentication

No login. Per-seat trust model:
- `roomCode` — public, lets you find the room.
- `playerId` — server-issued, identifies a seat within a room.
- `seatToken` — server-issued secret stored in browser `localStorage`. Required for every action that should be tied to a seat (rejoin, plays, passes).

The server must verify on every privileged event that the socket has been associated with `(roomCode, playerId, seatToken)` and that the action is allowed for that player at that moment.

## Common request patterns (P2)

Every client → server event includes `roomCode`. Privileged actions also rely on the established socket-to-seat binding (set up at `createRoom`/`joinRoom`/`rejoinRoom` time).

```ts
createRoom({ nickname, settings })
joinRoom({ roomCode, nickname })
rejoinRoom({ roomCode, playerId, seatToken })
startGame({ roomCode })
playCards({ roomCode, cardIds })
passTurn({ roomCode })
readyForNextRound({ roomCode })   // ready check between rounds / after match
leaveRoom({ roomCode })
```

Optional / later:
```ts
sendChat({ roomCode, message })
updateSettings({ roomCode, settings })
addBot({ roomCode })
removeBot({ roomCode, botId })
```

## Common response patterns (P2)

```ts
roomUpdated(roomPublicState)        // lobby/seat info, no hands
gameUpdated(playerPrivateState)     // sent per-client; only this player's hand + opponents' counts
invalidMove({ reason })             // sender-only
roundEnded(roundSummary)
playerReady({ playerId })           // someone marked ready between rounds
readyCheckSatisfied()               // all players ready; new round about to start
playerDisconnected({ playerId })
playerReconnected({ playerId })
turnTimerUpdated({ playerId, deadlineAt })
autoActionTaken({ playerId, action })
```

### Ready check semantics

Between rounds (and after the final round of a match), the server holds the game in `roundOver` / `matchOver` until **every seated player** has emitted `readyForNextRound`. On each `readyForNextRound`, the server broadcasts `playerReady`. When the readiness set covers every player, the server emits `readyCheckSatisfied` and proceeds to `startRound` (or resets the match and starts round 1 for `matchOver`).

Disconnected players auto-ready after their disconnect grace timer (same 30s used for auto-pass — see spec §23). This prevents one offline player from stalling the table indefinitely. If a player reconnects mid-summary and hasn't readied, they get the modal as normal.

`gameUpdated` carries the **private** view:
- Current player: their actual `hand: Card[]`.
- Opponents: `{ playerId, nickname, cardCount, connected, score }`.
- Shared: `currentPlay`, `currentPlayerId`, `lastPlayerToPlay`, `passedPlayerIds`, `roundNumber`, `status`, `moveLog`, `scores`, `roundDelta`.

**Never send opponent hands to a client.** Even if hidden in the UI, browser inspection would reveal them.

## Error format (P2)

Server emits `invalidMove({ reason })` to the offending socket only. `reason` is a stable string enum that the client maps to friendly copy. Suggested initial set:

```
NOT_YOUR_TURN
EMPTY_SELECTION
INVALID_HAND
WRONG_TYPE              // e.g., must play a pair
DOES_NOT_BEAT           // your pair does not beat 9♣ 9♥
CANNOT_PASS             // you control the table
FIRST_PLAY_MUST_INCLUDE_3D
DOES_NOT_OWN_CARDS
ROOM_NOT_FOUND
SEAT_TOKEN_INVALID
NOT_HOST
GAME_ALREADY_STARTED
```

Add new codes as needed. Keep them stable once shipped.

## Endpoint reference

P1 has no endpoints. P2 endpoint list is exhaustive above and matches spec §22. The spec is canonical for now; this doc tracks live deltas.

## Backward compatibility rules

- Server can add new optional fields to outbound events without bumping anything.
- Server cannot remove or rename existing fields without versioning.
- Adding a new event is non-breaking; clients that ignore it keep working.
- Client cannot rely on server-side ordering of `gameUpdated` and `moveLog` arrivals; the server should ensure `gameUpdated` for a play arrives before the `playerDisconnected` event that depends on it, etc.
- Treat any breaking change as an ADR-worthy decision.
