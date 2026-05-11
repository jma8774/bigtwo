# Integrations

## External services

**None in P1 or P2 MVP.** This product is deliberately self-contained — no analytics, no error reporting SaaS, no auth providers, no payments. Ever.

In P2, the only network dependency is the project's own Socket.IO server.

## Credentials and environment variables

P1: none required.

P2 (planned):
- `PORT` — server listen port.
- `CORS_ORIGIN` — origin allowed to connect to the Socket.IO server (e.g., the static SPA's URL).
- `ROOM_CODE_LENGTH` — optional, default 4.
- `NODE_ENV` — `development` | `production`.

No secrets in code. No `.env` committed. Provide a `.env.example` when the server lands.

## Webhooks

None.

## Failure handling

P2 client-side:
- Treat Socket.IO disconnects as transient. Show a "Reconnecting…" banner; attempt automatic rejoin using stored `bigTwoSession`.
- If rejoin fails with `ROOM_NOT_FOUND` or `SEAT_TOKEN_INVALID`, clear the local session and route the user to the home page.
- Don't show stack traces. Don't `alert()`. Use inline messages near the action bar.

P2 server-side:
- Validate every privileged event. On failure, emit `invalidMove({ reason })` to the sender only — never broadcast.
- Disconnected players: mark `connected: false`, start a 30s turn timer, broadcast `playerDisconnected`. On reconnect, broadcast `playerReconnected` and resend private state.

## Retry behavior

- Client auto-reconnect handled by Socket.IO with default backoff. Acceptable for MVP.
- No client-side retry of game intents — if `playCards` is dropped during a disconnect, the user can simply replay it after reconnecting; the server's authoritative state will tell them whether anything actually changed.

## Local development notes

- P1 dev: `npm run dev` (Vite). Static SPA reachable at `http://localhost:5173` (default).
- P2 dev (later): run the Node server alongside Vite. Suggested `concurrently` script or two terminals. Server on `:3001`, client on `:5173`, client points `socket.io-client` at `http://localhost:3001`.
- No sandbox or mock for external services — there aren't any.
