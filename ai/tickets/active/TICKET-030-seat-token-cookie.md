# TICKET-030: Move seatToken from localStorage to an HttpOnly cookie

## Status

Active (defense-in-depth; lower urgency than 026–029)

## Goal

Stop persisting the seatToken in `localStorage`. Move it to an HttpOnly,
Secure, SameSite=Lax cookie scoped to the API origin. A future XSS would
then steal session state from JS-accessible cookies/storage but not the
auth-bearing one.

## Background

Today the client stores `bigTwoSession = { roomCode, playerId, seatToken }`
in `localStorage`. JS on the page can read it. There's no XSS surface
today (Vue escapes, no third-party scripts, no `v-html`), but defense in
depth would close the eventual case.

## Requirements

### Server

- New HTTP endpoint `POST /api/session` that issues a session cookie
  (`bigTwoSession`, HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=24h).
  Cookie value = opaque session id mapped server-side to
  `{ playerId, seatToken, roomCode }`. Mutated by `createRoom` /
  `joinRoom` events.
- Socket.IO middleware reads the cookie at connect time, populates the
  session record into `socket.data` if valid.
- `rejoinRoom` event no longer accepts `{ playerId, seatToken }` in
  payload — server reads from the bound session.
- Sessions purged on `leaveRoom` and on `roomClosed`.

### Frontend

- Stop writing to `localStorage` for `bigTwoSession`. Keep
  `roomCode` + `playerId` in localStorage for UX (e.g. re-enter the
  same room code in JoinPage), but never `seatToken`.
- Add `withCredentials: true` to the Socket.IO client.
- Call `POST /api/session` once on app boot if no cookie set.

### Operational

- Same-origin only (cookie path covers both static + /socket.io/).
  Cloudflare proxy already preserves cookies — verified for FileDrop.

## Acceptance criteria

- localStorage never contains `seatToken`.
- DevTools → Application → Cookies shows `bigTwoSession=…; HttpOnly`.
- Rejoin after refresh still works.
- A second tab inherits the cookie and can connect under the same
  identity (intended — same-origin / same browser).

## Files

- `backend/src/server.ts` — add cookie middleware + /api/session
- `backend/src/socket.ts` — Socket.IO middleware reads cookie
- `backend/src/sessions.ts` — new in-memory map
- `frontend/src/stores/gameStore.ts` — drop seatToken handling
- `frontend/src/utils/socket.ts` — withCredentials + session ping

## Out of scope

- Cookie rotation / refresh tokens.
- Server-side session persistence (in-memory map is fine; rooms are
  in-memory too, no point persisting one without the other).
- CSRF protection — the WS handshake is GET-only and authenticated by
  the cookie; no state-changing HTTP endpoints exist beyond the session
  init, which is idempotent.

## Notes for implementation

- This is the biggest of the security tickets — touches HTTP layer,
  Socket.IO middleware, store, and rejoin path. Consider doing it last.
- Test with curl + cookies first (`curl -c /tmp/c.txt -b /tmp/c.txt`).
