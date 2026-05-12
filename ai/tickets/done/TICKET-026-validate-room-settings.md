# TICKET-026: Validate RoomSettings server-side in createRoom

## Status

Active

## Goal

Reject malformed `RoomSettings` payloads from `createRoom` (and `joinRoom`
where settings travel) so a hostile client can't push wild values through
the engine.

## Background

Found in the security review (this batch). Today `createRoom` accepts the
payload as-is and passes it into `Room.settings`. A client can send
`{ playerCount: 9999, fillWithBots: true, ... }`; `startGame` then loops
`while (room.players.length < 9999) push bot`, OOMing the process. Real DoS.

## Requirements

- Server-side schema check on every field:
  - `playerCount`: `3` or `4` (number, integer)
  - `fillWithBots`: boolean
  - `scoringMode`: literal `'simple'`
  - `cardValue`: number in `[1, 100]`, integer
  - `roundLimit`: `null` or integer in `[1, 50]`
  - `isPublic`: boolean
- Reject with ack `{ ok: false, error: 'BAD_SETTINGS' }`. Log a warn.
- Apply to `createRoom`. (`joinRoom` doesn't take settings, so just confirm.)
- Add a vitest covering each rejected shape.

## Acceptance criteria

- Sending `playerCount: 9999` to `createRoom` gets `BAD_SETTINGS`.
- Sending `playerCount: 3` succeeds.
- Sending non-boolean `fillWithBots` rejected.
- Tests cover at least one rejection per field.

## Files

- `backend/src/rooms.ts` (or new `backend/src/validation.ts`)
- `backend/src/socket.ts` — call the validator before passing through
- `backend/src/rooms.test.ts` — new

## Out of scope

- Frontend validation hardening (already constrained by inputs).
- Validating the `nickname` (separate ticket TICKET-027).
