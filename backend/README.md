# BigTwo Backend

Node + TypeScript + Express + Socket.IO. Multiplayer server for BigTwo.

## Quick start

```bash
cd backend
npm install
npm run dev          # listens on http://localhost:3001
```

Smoke test:

```bash
curl http://localhost:3001/healthz
# → { "ok": true }
```

Open the frontend in a browser; devtools → Network → WS should show a connection to `http://localhost:3001/socket.io/`.

## Scripts

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Run with hot-reload (tsx watch)                 |
| `npm run build`    | Emit JS to `dist/` via `tsc`                    |
| `npm start`        | Run the built JS (after `build`)                |
| `npm run type-check` | Type-check only, no emit                      |

## Environment

| Variable        | Default                  | Notes                                       |
| --------------- | ------------------------ | ------------------------------------------- |
| `PORT`          | `3001`                   | HTTP + WS port                              |
| `CORS_ORIGIN`   | `http://localhost:5173`  | Allowed origin for Socket.IO + REST         |

## Layout

```
backend/
  package.json
  tsconfig.json
  src/
    index.ts      # entry: boot http + io, wire shutdown
    server.ts     # http server + io server construction
    socket.ts     # connection handler, event registration
    rooms.ts      # in-memory room store (stub)
    config.ts     # env-derived constants
```

## Where we are

- **TICKET-021** (this scaffold): healthz + smoke ping/pong, no game logic
- Next: **TICKET-022** — `createRoom` / `joinRoom` / `roomUpdated`, real lobby flow

Game logic moves server-side in **TICKET-023**.
