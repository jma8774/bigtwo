# TICKET-027: Cap nickname length server-side

## Status

Active

## Goal

Enforce a 20-character cap on nicknames at the server boundary so a client
that bypasses the UI can't push huge strings into broadcast traffic, logs,
and stored room state.

## Background

`makePlayer()` in `backend/src/rooms.ts` currently does
`(nickname ?? '').trim() || 'Player'` with no length cap. The frontend
input already has `maxlength="20"`, but the server must enforce the same
since the UI is untrusted.

## Requirements

- Truncate `nickname` to first 20 visible characters after trim.
- Strip control characters (`\x00–\x1F`, `\x7F`) — they have no use in a
  display name and could mess with logs.
- Apply on every entry point: `createRoom`, `joinRoom`. (Bot nicknames are
  server-generated, no need to sanitize.)

## Acceptance criteria

- A 5000-char nickname becomes a 20-char trimmed string in the room state.
- Newlines and control chars are stripped.
- Empty / whitespace-only nicknames still fall back to `'Player'`.

## Files

- `backend/src/rooms.ts` — `makePlayer()`

## Out of scope

- Profanity filtering, uniqueness enforcement.
