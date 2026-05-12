# TICKET-029: Per-socket rate limit on gameplay commands

## Status

Active

## Goal

Cap the rate at which a single socket can fire `playCards`, `passTurn`,
`readyForNextRound`, and `startGame`. The engine already rejects illegal
moves, so spam can't corrupt state — but it can waste CPU on `canPlay`
checks and log-spam.

## Background

Found in the security review. Today these handlers run validation on
every emit with no per-socket throttle.

## Requirements

- Simple token-bucket per socket: 10 messages/sec for gameplay events,
  shared bucket across the four event names listed.
- Over-budget emits ack `{ ok: false, error: 'RATE_LIMITED' }` and log
  a debug line (not warn — legitimate latency could trip this).
- Reset the bucket on socket connect; no persistence needed.

## Acceptance criteria

- 100 `playCards` emits in a tight loop → first ~10 ok-acked / rejected
  on game rules, rest get `RATE_LIMITED`.
- Normal play (1 action every few seconds) never trips the limit.
- Test in vitest with a fake socket.

## Files

- `backend/src/socket.ts` — middleware-style wrapper around the four
  handlers, or a `withRateLimit()` helper.

## Out of scope

- HTTP rate limiting (Cloudflare can handle that).
- Chat (already has its own 200ms rate limit).
