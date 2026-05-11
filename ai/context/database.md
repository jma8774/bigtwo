# Database

## Database overview

There is no database in P1 or P2 MVP. State is in-memory only.

- **P1:** Pinia store in the browser. Lost on refresh by design.
- **P2:** In-memory room store on the Node server (a `Map<roomCode, Room>`). Lost on server restart. Acceptable for MVP because rooms are ephemeral and there are no accounts.

Persistence may be added later (Redis is mentioned in the spec for horizontal scaling). Any move toward persistence requires an ADR — it changes the failure mode of the product (currently: a server restart ends all active games; a database means restarts are survivable but introduce schema migrations, cleanup, and backup concerns).

## Local persistence (browser)

Two `localStorage` keys are in use:

| Key | Owner | Shape | Purpose |
|---|---|---|---|
| `bigTwoSettings` | `settingsStore` | `{ soundEnabled: boolean, nickname?: string }` | Remember user preferences across sessions. |
| `bigTwoSession` | `gameStore` (P2 only) | `{ roomCode, playerId, seatToken }` | Reclaim a seat on reconnect. |

Conventions:
- Wrap all `localStorage` access. Don't sprinkle `JSON.parse(localStorage.getItem(...))` across the codebase.
- Treat both keys as best-effort. Always degrade gracefully if missing or malformed.
- Never store hands, opponent state, or anything sensitive in `localStorage`. `seatToken` is the only secret-shaped value, and it's scoped to a single ephemeral room.

## Server-side in-memory store (P2)

A single `Map<roomCode, Room>` where `Room` includes:
- Full `GameState` (with all hands).
- Per-player socket bindings.
- Per-player disconnect timers.
- Last-activity timestamp for room expiration.

Room cleanup is a background sweep on a timer; exact policy TBD (spec §23). Suggested starting policy:
- Waiting rooms expire after 30 minutes of inactivity.
- Active rooms expire after all players have been disconnected for 10 minutes.
- Completed rooms expire 5 minutes after the final round.

## Migration rules

N/A — no schema, no migrations. When persistence arrives, add migration guidance here.

## Indexing / data integrity

N/A.

## Common queries

N/A. For server-side debugging during P2, expose an admin route or CLI that can dump `room.publicState()` (no hands).
