# TICKET-021: Backend scaffold (Express + Socket.IO)

## Status

Done

## Goal

Stand up a working Node + TypeScript + Socket.IO server under `backend/`. No game logic yet — just the framework, an in-memory room registry, a healthz, and a smoke-test event so we can see a frontend connect, exchange a ping, and see the connection in the server logs.

## Background

P1 ships as a static SPA. P2 needs a long-lived server. Get the bare bones in place before wiring real events. Per ADR-0005, the server lives under `backend/` as a sibling of `frontend/`.

## Requirements

### Stack

- Node 20+ (LTS), TypeScript strict mode, ESM modules to match the frontend.
- `express` for the HTTP layer (healthz + future static-serving option).
- `socket.io` for WebSockets (room semantics + auto-reconnect, per spec §22 and ADR-0001).
- `tsx` (or equivalent) for dev runtime; `tsc` for build.

### Directory layout

```
backend/
  package.json
  tsconfig.json
  src/
    index.ts          # entry — boots HTTP + Socket.IO, wires routes/events
    server.ts         # http server + io server construction
    rooms.ts          # in-memory room store (just types + map for now)
    socket.ts         # connection handler + event registration
    config.ts         # env vars (PORT, CORS_ORIGIN)
  README.md
```

### Behavior

- `GET /healthz` → `200 { ok: true }`. No game logic, just verifies the server is alive.
- Socket.IO listens on the same HTTP server. CORS allows `http://localhost:5173` (or `CORS_ORIGIN` env).
- On connection: log `socket connected: <id>`. On disconnect: log `socket disconnected: <id> (<reason>)`.
- Smoke event: client emits `ping`, server replies `pong { at: number }`. Used by the frontend's ConnectionStatus once wired (TICKET-022) but valuable now as a sanity check.
- Graceful shutdown on SIGTERM/SIGINT: stop accepting new connections, close existing, exit clean.

### Frontend hookup (small, optional in this ticket)

- Install `socket.io-client` in `frontend`.
- A small `src/utils/socket.ts` that lazy-creates a single io instance pointed at `import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'`.
- Verify in browser devtools that the WS handshake succeeds and ping/pong round-trips.

Don't wire any UI yet — that's TICKET-022.

### Scripts

```jsonc
// backend/package.json scripts
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "type-check": "tsc --noEmit"
}
```

Frontend gains:

```jsonc
{
  "dev:server": "cd ../backend && npm run dev",
  "dev:both": "concurrently \"npm run dev\" \"npm run dev:server\""
}
```

(or just two terminals; concurrently is optional.)

## Acceptance criteria

- `cd backend && npm install && npm run dev` boots a server on `:3001`.
- `curl http://localhost:3001/healthz` returns `{ "ok": true }`.
- Frontend (when pointed at the server) opens a Socket.IO connection visible in devtools.
- Sending `ping` from the frontend logs a response within ~50ms.
- Stopping the server with `Ctrl+C` exits cleanly (no orphaned handles).
- Type-check passes.

## Files likely involved

- New `backend/` tree as above
- `frontend/src/utils/socket.ts` (new)
- `frontend/package.json` (add `socket.io-client`)

## Out of scope

- Any real game events (`createRoom`, `playCards`, etc.) — TICKET-022 onward
- Engine sharing (defer to TICKET-023 when the server actually needs to evaluate moves)
- Persistence, Redis, horizontal scaling
- Auth (none in this product, ever)
- Deployment automation (manual for now)

## Notes for implementation

- Pin the Socket.IO server and client to compatible versions.
- Set `transports: ['websocket', 'polling']` (default) — keep polling as fallback for picky networks.
- Don't add `body-parser` etc. yet — the HTTP layer is healthz-only.
- The server should not need any environment config to boot in dev. Defaults: `PORT=3001`, `CORS_ORIGIN=http://localhost:5173`.
