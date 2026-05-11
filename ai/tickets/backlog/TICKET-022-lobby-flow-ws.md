# TICKET-022: Lobby flow over WebSockets

## Status

Backlog (depends on TICKET-021)

## Goal

Move the lobby-side of the room lifecycle off the client. Two browsers can connect, one creates a room, the other joins by code, both see the live player list update. Host can start the game (just flips state for now — actual gameplay is TICKET-023).

## Background

Today `createRoom` and `joinRoom` only exist client-side in `gameStore`. P1 fakes it because there's no real multiplayer. P2 makes them socket events with the server as source of truth.

## Requirements

### Server-side events (in `backend/`)

Client → server:

```ts
createRoom({ nickname, settings }) → ack { roomCode, playerId, seatToken }
joinRoom({ roomCode, nickname }) → ack { roomCode, playerId, seatToken } | { error }
rejoinRoom({ roomCode, playerId, seatToken }) → ack { ok: true } | { error }
leaveRoom({ roomCode })
updateSettings({ roomCode, settings })   // host only, lobby only
```

Server → client (room-scoped broadcast):

```ts
roomUpdated(roomPublicState)
playerJoined({ playerId, nickname })
playerLeft({ playerId })
```

`roomPublicState` shape:

```ts
{
  roomCode: string
  status: 'waiting'    // game status — always 'waiting' until TICKET-023
  hostId: PlayerId
  players: Array<{ id: PlayerId; nickname: string; isBot: boolean; connected: boolean }>
  settings: RoomSettings
}
```

No hands, no scores yet (lobby only).

### Seat token model

- Generated server-side on `createRoom` / `joinRoom`. ~32-byte random hex.
- Client stores `{ roomCode, playerId, seatToken }` in `localStorage` under `bigTwoSession`.
- `rejoinRoom` requires all three; server rejects mismatches with `SEAT_TOKEN_INVALID`.
- Never logged at info level.

### Room code generation

- 4 characters, uppercase alphanumeric, excluding ambiguous chars (`0`, `1`, `I`, `O`).
- Must be unique among active rooms; retry on collision.

### Public / private

- Honor `settings.isPublic`. Private rooms are joinable only by code (client supplies code, server checks). Public rooms join by code too; the public-lobby-list emission lives in TICKET-013.

### Frontend wiring

- `frontend/src/utils/socket.ts` (created in TICKET-021) gets event helpers.
- `gameStore` gains:
  - `createRoomOnline(settings, nickname)` — emits `createRoom`, stores session in localStorage, routes to `/lobby`.
  - `joinRoomOnline(roomCode, nickname)` — emits `joinRoom`, stores session, routes to `/lobby`.
  - `rejoinOnline()` — called on app boot if `bigTwoSession` exists; emits `rejoinRoom`, restores state.
  - Listens for `roomUpdated` and rebuilds `state.players` / `state.settings`.
- `CreateRoomPage` calls `createRoomOnline` instead of the local `createRoom`.
- `JoinRoomPage` calls `joinRoomOnline`.
- `LobbyPage` reads live data from `gameStore.state` (already structured for this).
- `ConnectionStatus` in topbar lights green when socket is connected.

### Bots in P2 lobby

- Bots stay client-side for now (added by the host's gameStore when `fillWithBots` is true). The server doesn't simulate bots; it sees them as part of the player list synced via `roomUpdated`.
- (When TICKET-023 lands, bots get rethought — likely server-managed so all clients see consistent bot behavior.)

## Acceptance criteria

- Two browser tabs (or two devices) can both open the app:
  - Browser A creates a room → sees a room code.
  - Browser B enters the code → joins → both see the same player list.
- Refresh either tab → seat is restored from localStorage via `rejoinRoom`.
- Host leaves → `playerLeft` fires; remaining seat sees the update.
- Bad seat token → server replies with error; client clears local session.
- Lobby UI matches P1 mock: room code, copy/share, players list, "Public/Private Room" badge.

## Files likely involved

- `backend/src/rooms.ts` — real room store with full lifecycle
- `backend/src/socket.ts` — event handlers
- `backend/src/codes.ts` — room-code generator
- `frontend/src/utils/socket.ts` — typed event helpers
- `frontend/src/stores/gameStore.ts` — online room actions, listeners
- `frontend/src/pages/CreateRoomPage.vue`, `JoinRoomPage.vue`, `LobbyPage.vue`
- `frontend/src/components/AppTopBar.vue` — ConnectionStatus indicator

## Out of scope

- Gameplay events — TICKET-023
- Ready check — TICKET-024
- Disconnect timers — TICKET-008
- Public lobby browser — TICKET-013

## Notes for implementation

- Use Socket.IO's room feature: `socket.join(roomCode)` so broadcasts to a room are targeted.
- Document the `invalidMove` reason codes in `ai/context/api-contracts.md` as you add them.
- Keep `gameStore`'s local-mode actions (`createRoom`, `startGame` without bots needing socket) around or fold them — decision pointer in this ticket's PR.
