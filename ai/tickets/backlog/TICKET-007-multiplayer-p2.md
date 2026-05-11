# TICKET-007: Multiplayer foundation (P2 Milestone 5)

## Status

Backlog

## Goal

Stand up the Node + Socket.IO server, move authoritative game state server-side, and ship JoinRoomPage / LobbyPage on the client. End-to-end: two browsers can connect to the same room, the host starts the game, and play proceeds with server validation.

## Background

P2 of the spec. Depends on a stable P1 (TICKET-001 through TICKET-006). Spec §18–§22 govern this work. ADR-0002 should be written during this ticket (or before it) to capture how the game engine is shared between client and server.

## Requirements

- `server/` workspace with Node + TS + Socket.IO. In-memory room store.
- Share the engine code: client and server both import from a common location (a workspace package or `tsconfig` path mapping). No duplicated rules.
- Implement client → server events: `createRoom`, `joinRoom`, `rejoinRoom`, `startGame`, `playCards`, `passTurn`, `leaveRoom`.
- Implement server → client events: `roomUpdated`, `gameUpdated` (private per-player), `invalidMove`, `roundEnded`, `playerDisconnected`, `playerReconnected`.
- Server validates every move using the shared engine. Anti-cheat checks from spec §21.
- Per-seat tokens: server generates on `createRoom`/`joinRoom`. Client stores `bigTwoSession` in `localStorage` and rejoins on reload.
- Build `JoinRoomPage.vue` (matches `references/joining_a_game_room_screen.png`) and `LobbyPage.vue` (matches `references/big_two_game_lobby_interface.png`).
- HomePage "Create Room" button now creates an online room (via server) and routes to the lobby.
- **Public/private rooms:** honor `settings.isPublic`. Private rooms are joinable only by code. Public rooms are joinable by code **and** by selection from a public lobby browser (the browser itself is a follow-up — see TICKET-013).
- Server-issued `roomCode`: 4–5 uppercase alphanumerics, unique per active room. Replaces the client-side generator used in P1.
- **Ready check between rounds:** add `readyForNextRound` / `playerReady` / `readyCheckSatisfied` events. The server gates `startRound` (and post-match `playAgain`) on every seated player having marked ready. Disconnected players auto-ready when their 30s grace timer expires so a single offline player can't stall the table. See `ai/context/api-contracts.md` for the full semantics.

## Acceptance criteria

Spec §29 P2 MVP criteria:
- User can create a room with a room code.
- Another user can join with nickname + room code.
- Host can start the game.
- Server deals cards.
- Server sends each player only their own hand.
- Opponents only show card counts.
- Server validates all moves.
- Users cannot act out of turn.
- Users cannot play cards they don't own.
- Scores calculated server-side.
- Disconnect/reconnect: leaves the player seated, browser refresh rejoins via stored session.

Disconnect timer / auto-action is TICKET-008.

## Out of scope

- Auto-pass / auto-play for disconnected players on their turn (TICKET-008).
- Host transfer, room expiration cleanup, deployment automation (TICKET-008).
- Chat, settings updates after room creation, add/remove bot during play.

## Files likely involved

- `server/src/socket.ts`, `server/src/rooms.ts`
- `src/stores/gameStore.ts` (becomes a thin remote-state holder)
- `src/pages/JoinRoomPage.vue`, `src/pages/LobbyPage.vue`
- `src/components/ConnectionStatus.vue`
- Shared engine path resolution

## Notes for implementation

- Decide engine-sharing strategy first and capture it in an ADR. Options: pnpm/npm workspace with a `packages/engine` package; tsconfig path mapping; symlink. Workspaces are cleanest if everything else is fine.
- Never send opponent hands to a client, even hidden. Strip server state per-recipient before emitting `gameUpdated`.
- Treat `rejoinRoom` as the only privileged event that re-binds a socket to a seat. Always require `seatToken`.
