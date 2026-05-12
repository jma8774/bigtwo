# TICKET-028: Global room cap (15) + visible count on Rooms page

## Status

Active

## Goal

Hard-cap concurrent rooms at 15 across the app. Surface the current
count + cap on the Browse Rooms page (e.g. "3 / 15") so users see when
the table is full.

## Background

`createRoom` has no rate limit and no global cap today. A script can
spam thousands of rooms in seconds; the sweeper only reaps after 30
min of idleness. Single 512 MB droplet — easy DoS.

User requested a flat 15-room cap (not per-socket rate limiting).

## Requirements

### Server

- Add `ROOM_CAP = 15` constant in `rooms.ts`.
- `createRoom` returns `{ error: 'ROOM_CAP_REACHED' }` when
  `rooms.size >= ROOM_CAP`. Log a warn.
- Add `getRoomCounts() → { total: number, cap: number }` helper.
- Extend `publicRoomsChanged` payload to:
  ```ts
  { rooms: PublicRoomSummary[], totalRooms: number, roomCap: number }
  ```
  (was a bare array). Ack of `subscribePublicRooms` mirrors the shape.

### Frontend

- `BrowseRoomsPage` shows `X / 15` near the page header.
- Update `socket.ts` types + the gameStore listener.
- If the cap is hit when the user clicks Create, the CreateRoom flow
  surfaces "Server is at capacity (15 rooms). Try again shortly."

## Acceptance criteria

- 16th createRoom is rejected with `ROOM_CAP_REACHED`.
- BrowseRoomsPage shows `3 / 15` and live-updates when rooms are
  created or swept.
- HomePage doesn't change — count is only shown on the Rooms page.

## Files

- `backend/src/rooms.ts` — cap constant + helper
- `backend/src/socket.ts` — error path + extended payload
- `frontend/src/utils/socket.ts` — type for the new payload shape
- `frontend/src/pages/BrowseRoomsPage.vue` — display
- `frontend/src/pages/CreateRoomPage.vue` — surface ROOM_CAP_REACHED

## Out of scope

- Per-socket rate limiting (TICKET-029 covers gameplay-command spam).
- Cap configurable via env (hard-code 15 for now).
