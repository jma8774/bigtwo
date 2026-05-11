# TICKET-013: Public lobby browser

## Status

Backlog (P2 follow-up, depends on TICKET-007)

## Goal

Add a browser for active public rooms so players can join games without needing a code. Private rooms remain hidden. Joining a listed room takes the player through the same lobby flow as code-based joining.

## Background

In P1 every room has a code and `settings.isPublic` defaults to true, but there's no way to discover other public rooms. Once P2 multiplayer ships (TICKET-007), we want a list view: "here are some open tables, jump in."

Spec §3 lists "public matchmaking" as a P1 non-goal but doesn't forbid it forever. This isn't matchmaking — it's a transparent list of human-hosted public rooms. No skill ranking, no auto-pairing, no waiting queue.

## Requirements

### Server (P2)

- Track every public room in the in-memory store with: `roomCode`, `host nickname`, `playerCount`, `seatsTaken`, `seatsAvailable`, `isPublic`, `inProgress: boolean`, `createdAt`.
- New event `listPublicRooms()` → returns an array of the above. No private rooms. Cap response at ~50 rooms (paginate later if needed).
- Push `publicRoomsChanged` broadcast whenever a public room is created, fills up, or ends.
- Honor a room's `isPublic = false` setting — never include in the list, never broadcast for it.

### Client

- New route `/browse` (or `/rooms`). Reuse the existing `Rooms (Soon)` nav entry by removing the "Soon" badge and pointing it at this route.
- Layout: card grid or list with one row per room showing host nickname, room code, seats taken / total, status (`Waiting` / `In progress`), and a `Join` button.
- Empty state: "No public rooms right now. Create your own."
- "Refresh" button + automatic refresh on `publicRoomsChanged`.
- Join flow: clicking `Join` from the list is equivalent to filling in the room code on Join Room — same target lobby, same seat-assignment path. Nickname is captured before joining (modal or inline).
- A room that has started (`inProgress === true`) shows a `Join` button but on server-side that just rejects with `GAME_ALREADY_STARTED`. UI surfaces the error inline.

### Privacy boundaries

- Server never sends private room metadata to the list endpoint. Even leaking the existence of a private room is a no.
- Public rooms expose only what's needed for the join decision: nickname, code, seat counts, status. Not the hand state, not opponent nicknames beyond the host.

## Acceptance criteria

- Creating a public room makes it appear in another browser's `/browse` view within a few seconds.
- Creating a private room does **not** make it appear in `/browse`.
- Toggling `isPublic` (if we let hosts change it later) updates the list accordingly. (Or just lock visibility at creation time for MVP.)
- Joining from the list lands the player in the same lobby they'd reach via code-entry.
- Full rooms either disappear from the list or show a disabled `Full` badge.

## Out of scope

- Filtering / sorting controls (by card value, player count, etc.). Add when there are enough rooms to justify it.
- Pagination.
- Private rooms with a "join by request" flow.
- Spectator joins.
- Persistent room history.

## Files likely involved

- `server/src/rooms.ts` — add `listPublicRooms`, broadcast on changes
- `server/src/socket.ts` — wire the new events
- New `src/pages/BrowseRoomsPage.vue`
- `src/router/index.ts` — add `/browse` route
- `src/pages/HomePage.vue` — remove `Soon` from the Rooms nav item; route it to `/browse`

## Notes for implementation

- The MVP of this lives entirely on top of TICKET-007's infrastructure. Don't start until TICKET-007 lands.
- Server-side broadcasts can use a single Socket.IO room (`'public-lobby-list'`) that any client subscribes to when viewing `/browse`. Saves cycles vs. broadcasting to everyone.
